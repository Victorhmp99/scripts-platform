-- ============================================================
-- Vocabulário genérico no catálogo do portal
-- Projeto dckvprqsecaxaooppqfp → SQL Editor
--
-- A Central ainda mostra "Jornada do Paciente" e "Finanças da Clínica".
--
-- Por que escapou: a troca paciente→cliente e clínica→empresa foi feita
-- no código, e o que a Central exibe vem de portal_items, no banco. A
-- migração Green→Delta não pegou porque ela procurava a palavra "green",
-- e esses títulos nunca tiveram "green" dentro.
--
-- Os SLUGS não mudam. Eles são a chave de company_items (as liberações
-- por empresa) e aparecem nas rotas das páginas. Trocar o slug
-- desvincularia quem já tem acesso e quebraria links. O que muda é só o
-- texto que a pessoa lê.
--
-- Seguro rodar mais de uma vez.
-- ============================================================

-- ------------------------------------------------------------
-- ETAPA 0 — o que está fora do padrão hoje
-- ------------------------------------------------------------
SELECT slug, title, description
FROM portal_items
WHERE title       ~* '\m(paciente|pacientes|clínica|clínicas|tratamento|tratamentos|cadeira|cadeiras)\M'
   OR description ~* '\m(paciente|pacientes|clínica|clínicas|tratamento|tratamentos|cadeira|cadeiras)\M'
ORDER BY area, sort_order;


-- ------------------------------------------------------------
-- ETAPA 1 — cópia de segurança
-- ------------------------------------------------------------
DROP TABLE IF EXISTS _bkp_catalogo_generico;
CREATE TABLE _bkp_catalogo_generico AS SELECT * FROM portal_items;
ALTER TABLE _bkp_catalogo_generico ENABLE ROW LEVEL SECURITY;


-- ------------------------------------------------------------
-- ETAPA 2 — a troca de vocabulário
--
-- Mesma ordem de sempre: frases inteiras antes das palavras soltas,
-- senão a troca de palavra as desmonta e a frase nunca é encontrada.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.texto_catalogo(t TEXT) RETURNS TEXT
LANGUAGE sql IMMUTABLE AS $$
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
           'Jornada do Paciente',  'Jornada do Cliente'),
           'Finanças da Clínica',  'Finanças da Empresa'),
           -- a calculadora deixou de falar em cadeira: a unidade agora
           -- é escolhida por quem usa (sala, maca, baia, box…)
           'Custo da hora-cadeira', 'Custo da hora de atendimento'),
           '\mPacientes\M',    'Clientes',  'g'),
           '\mpacientes\M',    'clientes',  'g'),
           '\mPaciente\M',     'Cliente',   'g'),
           '\mpaciente\M',     'cliente',   'g'),
           '\mClínicas\M',     'Empresas',  'g'),
           '\mclínicas\M',     'empresas',  'g'),
           '\mClínica\M',      'Empresa',   'g'),
           '\mclínica\M',      'empresa',   'g')
$$;

UPDATE portal_items SET
  title       = public.texto_catalogo(title),
  description = public.texto_catalogo(description);

DROP FUNCTION IF EXISTS public.texto_catalogo(TEXT);


-- ------------------------------------------------------------
-- ETAPA 3 — conferência
--
-- A primeira consulta tem que voltar VAZIA.
-- A segunda mostra o catálogo como a pessoa vai ver.
-- ------------------------------------------------------------
SELECT 'ainda fora do padrão' AS aviso, slug, title, description
FROM portal_items
WHERE title       ~* '\m(paciente|pacientes|clínica|clínicas)\M'
   OR description ~* '\m(paciente|pacientes|clínica|clínicas)\M';

SELECT area, slug, title, padrao, description
FROM portal_items
WHERE active
ORDER BY area, sort_order, title;


-- ------------------------------------------------------------
-- ETAPA 4 — desfaz, se preciso
-- ------------------------------------------------------------
-- UPDATE portal_items p SET title = b.title, description = b.description
--   FROM _bkp_catalogo_generico b WHERE b.slug = p.slug;

-- ------------------------------------------------------------
-- ETAPA 5 — depois de conferir no site
-- ------------------------------------------------------------
-- DROP TABLE _bkp_catalogo_generico;
