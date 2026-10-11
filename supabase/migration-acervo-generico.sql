-- ============================================================
-- Biblioteca de criativos: nichos + vocabulário genérico
-- Projeto dckvprqsecaxaooppqfp → SQL Editor
--
-- Por que precisa de SQL: o criativos.json do repositório é só a
-- retaguarda. Quem o site lê é a linha única de `criativos_acervo`, com o
-- acervo publicado em JSON. Editar o arquivo não muda o que está no ar.
--
-- O código já aguenta o acervo antigo — normalizarAcervo() preenche o
-- nicho que falta e a ficha aceita `precisa_paciente`. Esta migração é o
-- conserto definitivo, para o dado parar de depender dessa compatibilidade.
--
-- A conversão é ESTRUTURAL, não troca de texto sobre o JSON inteiro.
-- A primeira tentativa foi por texto e corrompeu os caminhos de vídeo:
--   videos/full-face/bastidor-do-procedimento/... virava
--   videos/full-face/bastidor-do-servico/...
-- e os 68 vídeos passariam a dar 404. Aqui os campos src, slug, id, capa
-- e tipo são pulados pelo NOME da chave, que é a única proteção confiável.
--
-- Rode uma etapa por vez. Seguro repetir.
-- ============================================================


-- ------------------------------------------------------------
-- ETAPA 0 — o que existe hoje. Anote o número de serviços.
-- ------------------------------------------------------------
SELECT
  jsonb_array_length(dados -> 'procedimentos')     AS servicos,
  (dados ? 'nichos')                               AS ja_tem_nichos,
  (dados::text LIKE '%precisa_paciente%')          AS ficha_antiga,
  (dados::text LIKE '%Bastidor do Procedimento%')  AS formato_antigo,
  updated_at
FROM criativos_acervo WHERE id = 1;


-- ------------------------------------------------------------
-- ETAPA 1 — cópia de segurança
-- ------------------------------------------------------------
DROP TABLE IF EXISTS _bkp_acervo_generico;
CREATE TABLE _bkp_acervo_generico AS SELECT * FROM criativos_acervo;
ALTER TABLE _bkp_acervo_generico ENABLE ROW LEVEL SECURITY;

SELECT 'copia feita' AS ok, count(*) AS linhas FROM _bkp_acervo_generico;


-- ------------------------------------------------------------
-- ETAPA 2 — as funções de conversão
--
-- Testadas antes de chegar aqui, inclusive nos casos de borda:
--   "impaciente"            -> não muda
--   "Sala de procedimento"  -> "Sala de atendimento", e não "Sala de
--                              serviço", que em português é a lavanderia
--   src / slug              -> intactos
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.texto_generico(t TEXT) RETURNS TEXT
LANGUAGE sql IMMUTABLE AS $$
  -- as frases inteiras primeiro: depois da troca de palavra solta elas
  -- não existiriam mais para ser encontradas
  SELECT regexp_replace(
         regexp_replace(
         regexp_replace(
         regexp_replace(
         regexp_replace(
         regexp_replace(
         regexp_replace(
         regexp_replace(
         replace(
         replace(
         replace($1,
           'Bastidor do Procedimento', 'Bastidor do Serviço'),
           'Jornada da Paciente',      'Jornada do Cliente'),
           'Sala de procedimento',     'Sala de atendimento'),
           '\mProcedimentos\M', 'Serviços', 'g'),
           '\mprocedimentos\M', 'serviços', 'g'),
           '\mProcedimento\M',  'Serviço',  'g'),
           '\mprocedimento\M',  'serviço',  'g'),
           '\mPacientes\M',     'Clientes', 'g'),
           '\mpacientes\M',     'clientes', 'g'),
           '\mPaciente\M',      'Cliente',  'g'),
           '\mpaciente\M',      'cliente',  'g')
$$;

CREATE OR REPLACE FUNCTION public.acervo_generico(v JSONB, chave TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE r JSONB; k TEXT;
BEGIN
  IF jsonb_typeof(v) = 'object' THEN
    r := '{}'::jsonb;
    FOR k IN SELECT jsonb_object_keys(v) LOOP
      r := r || jsonb_build_object(
        CASE WHEN k = 'precisa_paciente' THEN 'precisa_cliente' ELSE k END,
        public.acervo_generico(v -> k, k));
    END LOOP;
    RETURN r;
  ELSIF jsonb_typeof(v) = 'array' THEN
    SELECT COALESCE(jsonb_agg(public.acervo_generico(e, NULL)), '[]'::jsonb)
      INTO r FROM jsonb_array_elements(v) e;
    RETURN r;
  ELSIF jsonb_typeof(v) = 'string'
        -- caminhos e identificadores não são texto para humano ler
        AND (chave IS NULL OR chave NOT IN ('src', 'slug', 'id', 'capa', 'tipo')) THEN
    RETURN to_jsonb(public.texto_generico(v #>> '{}'));
  ELSE
    RETURN v;
  END IF;
END $$;


-- ------------------------------------------------------------
-- ETAPA 3 — a conversão, mais o nível de nicho
-- ------------------------------------------------------------
UPDATE criativos_acervo SET dados = (
  WITH convertido AS (
    SELECT public.acervo_generico(dados) AS d FROM criativos_acervo WHERE id = 1
  )
  SELECT jsonb_set(
           jsonb_set(
             d,
             '{procedimentos}',
             (SELECT jsonb_agg(
                CASE WHEN p ? 'nicho' THEN p
                     ELSE p || '{"nicho":"saude-e-estetica"}'::jsonb END)
              FROM jsonb_array_elements(d -> 'procedimentos') p)
           ),
           '{nichos}',
           COALESCE(d -> 'nichos', '[
             {"slug":"saude-e-estetica","nome":"Saúde e estética","descricao":"Clínicas, consultórios e profissionais de saúde, estética e bem-estar."},
             {"slug":"negocio-local","nome":"Negócio local","descricao":"Quem vende para quem está perto: comércio de rua, serviços de bairro, food."},
             {"slug":"ecommerce","nome":"E-commerce","descricao":"Loja online, marketplace e venda de produto físico pela internet."},
             {"slug":"servicos-profissionais","nome":"Serviços profissionais","descricao":"Advocacia, contabilidade, arquitetura, consultoria e afins."},
             {"slug":"educacao-e-infoproduto","nome":"Educação e infoproduto","descricao":"Curso, mentoria, treinamento e conteúdo pago."},
             {"slug":"imobiliario","nome":"Imobiliário","descricao":"Corretagem, incorporação, locação e investimento em imóvel."}
           ]'::jsonb)
         )
  FROM convertido
) WHERE id = 1;

DROP FUNCTION IF EXISTS public.acervo_generico(JSONB, TEXT);
DROP FUNCTION IF EXISTS public.texto_generico(TEXT);


-- ------------------------------------------------------------
-- ETAPA 4 — conferência
--
-- servicos .............. tem que bater com a etapa 0
-- servicos_sem_nicho .... tem que ser 0
-- ficha_antiga .......... tem que ser false
-- caminhos_alterados .... TEM QUE SER 0. Se não for, rode a etapa 5:
--                         significa que algum caminho de vídeo mudou e
--                         os arquivos passariam a dar 404.
-- ------------------------------------------------------------
SELECT
  jsonb_array_length(a.dados -> 'procedimentos')   AS servicos,
  jsonb_array_length(a.dados -> 'nichos')          AS nichos,
  (a.dados::text LIKE '%precisa_paciente%')        AS ficha_antiga,
  (SELECT count(*) FROM jsonb_array_elements(a.dados -> 'procedimentos') p
     WHERE NOT (p ? 'nicho'))                      AS servicos_sem_nicho,
  (SELECT count(*) FROM
     jsonb_path_query_array(a.dados, '$.procedimentos[*].formatos[*].criativos[*].src') AS novo,
     jsonb_path_query_array(b.dados, '$.procedimentos[*].formatos[*].criativos[*].src') AS velho
   WHERE novo IS DISTINCT FROM velho)              AS caminhos_alterados
FROM criativos_acervo a, _bkp_acervo_generico b
WHERE a.id = 1 AND b.id = 1;


-- ------------------------------------------------------------
-- ETAPA 5 — desfaz, se a conferência acusar algo
-- ------------------------------------------------------------
-- UPDATE criativos_acervo c SET dados = b.dados
--   FROM _bkp_acervo_generico b WHERE b.id = c.id;


-- ------------------------------------------------------------
-- ETAPA 6 — depois de uns dias, com o site conferido
-- ------------------------------------------------------------
-- DROP TABLE _bkp_acervo_generico;
