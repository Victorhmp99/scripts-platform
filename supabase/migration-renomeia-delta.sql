-- ============================================================
-- Troca "Green Lab" / "Green Hub" por "Delta Soluções" nos dados
-- Rodar no SQL Editor do projeto dckvprqsecaxaooppqfp
--
-- Pega os textos que os clientes leem: nome da empresa, scripts de
-- atendimento, edições feitas por eles, catálogo do portal e respostas
-- dos módulos.
--
-- O domínio assessoriagreenlab.com.br é protegido: é um endereço real
-- que continua funcionando, então não pode virar "deltalab".
--
-- A etapa 1 guarda uma cópia de tudo antes de mexer, e a etapa 3
-- desfaz a partir dessa cópia. Rode uma etapa por vez.
-- ============================================================


-- ------------------------------------------------------------
-- ETAPA 0 — diagnóstico. Rode sozinha e leia antes de mudar nada.
-- Mostra cada trecho que a etapa 2 vai alterar.
-- ------------------------------------------------------------
SELECT 'companies.name'        AS onde, name AS trecho FROM companies      WHERE name ILIKE '%green%'
UNION ALL
SELECT 'companies (outros campos)', left(coalesce(industry,'')||' / '||coalesce(value_prop,''),140) FROM companies
  WHERE concat_ws(' ', industry, services, value_prop, pain_points, target_audience, sales_process, seller_name, tone) ILIKE '%green%'
UNION ALL
SELECT 'company_scripts.scripts', left(scripts::text,140) FROM company_scripts WHERE scripts::text ILIKE '%green%'
UNION ALL
SELECT 'company_scripts.qual',    left(qual::text,140)    FROM company_scripts WHERE qual::text    ILIKE '%green%'
UNION ALL
SELECT 'company_scripts.aq',      left(aq::text,140)      FROM company_scripts WHERE aq::text      ILIKE '%green%'
UNION ALL
SELECT 'script_edits',            left(content,140)       FROM script_edits    WHERE content       ILIKE '%green%'
UNION ALL
SELECT 'portal_items',            title||' — '||coalesce(description,'') FROM portal_items
  WHERE title ILIKE '%green%' OR description ILIKE '%green%'
UNION ALL
SELECT 'module_answers',          left(answers::text,140) FROM module_answers  WHERE answers::text ILIKE '%green%';


-- ------------------------------------------------------------
-- ETAPA 1 — cópia de segurança. Rode antes da etapa 2.
-- Cria tabelas _bkp_delta_* com o conteúdo atual.
-- ------------------------------------------------------------
DROP TABLE IF EXISTS _bkp_delta_companies, _bkp_delta_scripts,
                     _bkp_delta_edits, _bkp_delta_portal, _bkp_delta_answers;

CREATE TABLE _bkp_delta_companies AS SELECT * FROM companies;
CREATE TABLE _bkp_delta_scripts   AS SELECT * FROM company_scripts;
CREATE TABLE _bkp_delta_edits     AS SELECT * FROM script_edits;
CREATE TABLE _bkp_delta_portal    AS SELECT * FROM portal_items;
CREATE TABLE _bkp_delta_answers   AS SELECT * FROM module_answers;

-- as cópias não são servidas pela API, mas deixe explícito:
ALTER TABLE _bkp_delta_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE _bkp_delta_scripts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE _bkp_delta_edits     ENABLE ROW LEVEL SECURITY;
ALTER TABLE _bkp_delta_portal    ENABLE ROW LEVEL SECURITY;
ALTER TABLE _bkp_delta_answers   ENABLE ROW LEVEL SECURITY;

SELECT 'copia feita' AS ok,
       (SELECT count(*) FROM _bkp_delta_companies) AS empresas,
       (SELECT count(*) FROM _bkp_delta_scripts)   AS scripts,
       (SELECT count(*) FROM _bkp_delta_edits)     AS edicoes;


-- ------------------------------------------------------------
-- ETAPA 2 — a troca
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delta_rename(t TEXT) RETURNS TEXT AS $f$
  SELECT CASE WHEN $1 IS NULL THEN NULL ELSE
    replace(
      regexp_replace(
        regexp_replace(
          -- 1) esconde o domínio real para ele não ser tocado
          replace($1, 'assessoriagreenlab.com.br', '@@DOMINIO_PRESERVADO@@'),
          -- 2) "Green Lab" / "Green Hub" / "GreenLab", em qualquer caixa
          '\mGreen[[:space:]]*(Lab|Hub)\M', 'Delta Soluções', 'gi'),
        -- 3) "Green" que tenha sobrado sozinho (é sempre a marca)
        '\mGreen\M', 'Delta', 'gi'),
      -- 4) devolve o domínio
      '@@DOMINIO_PRESERVADO@@', 'assessoriagreenlab.com.br')
  END
$f$ LANGUAGE sql IMMUTABLE;

UPDATE companies SET
  name            = public.delta_rename(name),
  industry        = public.delta_rename(industry),
  services        = public.delta_rename(services),
  target_audience = public.delta_rename(target_audience),
  pain_points     = public.delta_rename(pain_points),
  value_prop      = public.delta_rename(value_prop),
  sales_process   = public.delta_rename(sales_process),
  seller_name     = public.delta_rename(seller_name),
  tone            = public.delta_rename(tone);

UPDATE company_scripts SET
  scripts    = public.delta_rename(scripts::text)::jsonb,
  qual       = public.delta_rename(qual::text)::jsonb,
  aq         = public.delta_rename(aq::text)::jsonb,
  updated_at = NOW();

UPDATE script_edits   SET content = public.delta_rename(content), updated_at = NOW();
UPDATE portal_items   SET title   = public.delta_rename(title),
                          description = public.delta_rename(description);
UPDATE module_answers SET answers = public.delta_rename(answers::text)::jsonb;

DROP FUNCTION public.delta_rename(TEXT);

-- Conferência: tem que voltar VAZIO.
-- (o domínio é descontado porque continuar "green" nele é o certo)
SELECT 'ainda tem green' AS aviso, name AS trecho FROM companies
  WHERE replace(name,'assessoriagreenlab.com.br','') ILIKE '%green%'
UNION ALL
SELECT 'ainda tem green', left(scripts::text,100) FROM company_scripts
  WHERE replace(scripts::text,'assessoriagreenlab.com.br','') ILIKE '%green%'
UNION ALL
SELECT 'ainda tem green', left(content,100) FROM script_edits
  WHERE replace(content,'assessoriagreenlab.com.br','') ILIKE '%green%';


-- ------------------------------------------------------------
-- ETAPA 3 — só se algo saiu errado: desfaz tudo
-- ------------------------------------------------------------
-- BEGIN;
-- UPDATE companies c SET
--   name = b.name, industry = b.industry, services = b.services,
--   target_audience = b.target_audience, pain_points = b.pain_points,
--   value_prop = b.value_prop, sales_process = b.sales_process,
--   seller_name = b.seller_name, tone = b.tone
--   FROM _bkp_delta_companies b WHERE b.id = c.id;
-- UPDATE company_scripts s SET scripts = b.scripts, qual = b.qual, aq = b.aq
--   FROM _bkp_delta_scripts b WHERE b.company_id = s.company_id;
-- UPDATE script_edits e SET content = b.content
--   FROM _bkp_delta_edits b WHERE b.id = e.id;
-- UPDATE portal_items p SET title = b.title, description = b.description
--   FROM _bkp_delta_portal b WHERE b.slug = p.slug;
-- UPDATE module_answers m SET answers = b.answers
--   FROM _bkp_delta_answers b WHERE b.company_id = m.company_id AND b.item_slug = m.item_slug;
-- COMMIT;


-- ------------------------------------------------------------
-- ETAPA 4 — depois de uns dias, com tudo certo, limpe as cópias
-- ------------------------------------------------------------
-- DROP TABLE _bkp_delta_companies, _bkp_delta_scripts,
--            _bkp_delta_edits, _bkp_delta_portal, _bkp_delta_answers;
