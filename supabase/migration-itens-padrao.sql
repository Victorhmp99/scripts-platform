-- ============================================================
-- Itens liberados por padrão + os dois playbooks
-- Projeto dckvprqsecaxaooppqfp → SQL Editor
--
-- Até agora o acesso era só explícito: sem linha em company_items, item
-- bloqueado. Isso fazia sentido para conteúdo pago, mas deixava quem
-- acabou de entrar olhando uma Central inteira trancada — e derrubava o
-- gerador de scripts logo depois de gerá-los, porque o /app conferia a
-- liberação, não achava, e devolvia para a Central.
--
-- Agora portal_items tem `padrao`. Item com padrao = true nasce liberado
-- para todo mundo, inclusive para quem ainda não tem empresa. A liberação
-- explícita continua mandando mais: uma linha em company_items com
-- enabled = false tira o item de uma empresa específica.
--
-- Seguro rodar mais de uma vez.
-- ============================================================

-- ------------------------------------------------------------
-- 1. A marca de "já vem liberado"
-- ------------------------------------------------------------
ALTER TABLE portal_items ADD COLUMN IF NOT EXISTS padrao BOOLEAN NOT NULL DEFAULT FALSE;


-- ------------------------------------------------------------
-- 2. Os dois playbooks
-- Cada um na sua área: comercial com comercial, conteúdo com marketing.
-- external = true porque o PDF abre em aba nova, para a pessoa poder ler
-- ou baixar sem perder a Central.
-- ------------------------------------------------------------
INSERT INTO portal_items (slug, area, kind, title, description, href, external, icon, sort_order, active, padrao)
VALUES
  ('playbook-comercial', 'comercial', 'conteudo',
   'Playbook Comercial',
   'O passo a passo do processo comercial da Delta, do primeiro contato ao fechamento. PDF para ler e consultar.',
   '/playbooks/playbook-comercial-delta.pdf', TRUE, 'book', 5, TRUE, TRUE),

  ('playbook-conteudo', 'marketing', 'conteudo',
   'Playbook de Criação de Conteúdo',
   'Como planejar, gravar e publicar conteúdo que gera demanda, sem depender de inspiração. PDF para ler e consultar.',
   '/playbooks/playbook-conteudo-delta.pdf', TRUE, 'book', 5, TRUE, TRUE)
ON CONFLICT (slug) DO UPDATE SET
  area        = EXCLUDED.area,
  kind        = EXCLUDED.kind,
  title       = EXCLUDED.title,
  description = EXCLUDED.description,
  href        = EXCLUDED.href,
  external    = EXCLUDED.external,
  icon        = EXCLUDED.icon,
  active      = TRUE,
  padrao      = TRUE;


-- ------------------------------------------------------------
-- 3. O gerador de scripts também nasce liberado
--
-- Liberado não quer dizer pronto: quem não preencheu o cadastro entra e
-- encontra o convite para gerar os scripts, com saída para a Central.
-- Antes ele era bloqueado, e a pessoa nem via do que se tratava.
-- ------------------------------------------------------------
UPDATE portal_items SET padrao = TRUE WHERE slug = 'gerador-scripts';


-- ------------------------------------------------------------
-- 4. A regra de liberação passa a considerar o padrão
--
-- Testei as oito combinações antes de escrever. A primeira versão usava
-- um COALESCE simples e errava um caso: liberação com prazo que venceu
-- derrubava um item que é liberado para todos. Prazo vencido significa
-- que a liberação extra acabou, não que a pessoa perdeu o que todo mundo
-- tem — então volta ao padrão.
--
--   sem linha de empresa ............ vale o padrão do item
--   enabled = false ................. bloqueado (tirado de propósito)
--   enabled = true, no prazo ........ liberado
--   enabled = true, prazo vencido ... volta ao padrão
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_portal_items()
RETURNS TABLE (
  slug TEXT, area TEXT, kind TEXT, title TEXT, description TEXT,
  href TEXT, external BOOLEAN, icon TEXT, sort_order INTEGER,
  unlocked BOOLEAN, expires_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    i.slug, i.area, i.kind, i.title, i.description,
    i.href, i.external, i.icon, i.sort_order,
    CASE
      WHEN ci.company_id IS NULL                              THEN i.padrao
      WHEN ci.enabled IS NOT TRUE                             THEN FALSE
      WHEN ci.expires_at IS NULL OR ci.expires_at > NOW()     THEN TRUE
      ELSE i.padrao
    END AS unlocked,
    ci.expires_at
  FROM portal_items i
  LEFT JOIN company_items ci
    ON ci.item_slug = i.slug
   AND ci.company_id = public.get_my_company()
  WHERE i.active
  ORDER BY i.area, i.sort_order, i.title;
$$;

CREATE OR REPLACE FUNCTION public.company_has_item(p_company_id UUID, p_slug TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN ci.company_id IS NULL                          THEN COALESCE(i.padrao, FALSE)
    WHEN ci.enabled IS NOT TRUE                         THEN FALSE
    WHEN ci.expires_at IS NULL OR ci.expires_at > NOW() THEN TRUE
    ELSE COALESCE(i.padrao, FALSE)
  END
  FROM portal_items i
  LEFT JOIN company_items ci
    ON ci.item_slug = i.slug AND ci.company_id = p_company_id
  WHERE i.slug = p_slug AND i.active;
$$;


-- ------------------------------------------------------------
-- 5. A tela do gerador usa get_my_app; ela também passa a ver o padrão
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_app()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH eu AS (
    SELECT p.role, p.company_id, p.full_name
    FROM profiles p
    WHERE p.id = (SELECT auth.uid())
  )
  SELECT jsonb_build_object(
    'perfil', (SELECT to_jsonb(eu) FROM eu),

    'empresa', (
      SELECT jsonb_build_object(
               'name', c.name,
               'last_regenerated_at', c.last_regenerated_at)
      FROM companies c WHERE c.id = (SELECT company_id FROM eu)
    ),

    'gerador_liberado', (
      SELECT CASE
        WHEN (SELECT role FROM eu) = 'admin' THEN TRUE
        WHEN NOT EXISTS (SELECT 1 FROM portal_items WHERE slug = 'gerador-scripts' AND active) THEN TRUE
        ELSE COALESCE(public.company_has_item(
               (SELECT company_id FROM eu), 'gerador-scripts'), FALSE)
      END
    ),

    'scripts', (
      SELECT jsonb_build_object('scripts', s.scripts, 'qual', s.qual, 'aq', s.aq)
      FROM company_scripts s WHERE s.company_id = (SELECT company_id FROM eu)
    ),

    'edicoes', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'script_key',  e.script_key,
               'content',     e.content,
               'usage_count', e.usage_count))
      FROM script_edits e WHERE e.company_id = (SELECT company_id FROM eu)
    ), '[]'::jsonb)
  );
$$;


-- ------------------------------------------------------------
-- 6. Conferência
-- Os três têm que aparecer com padrao = true.
-- ------------------------------------------------------------
SELECT slug, area, kind, title, padrao, active
FROM portal_items
ORDER BY padrao DESC, area, sort_order;
