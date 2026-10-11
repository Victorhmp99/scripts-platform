-- ============================================================
-- Uma chamada só para montar o gerador de scripts (app.html)
--
-- Medido em 10/10/2026:
--   execução no banco, como authenticated ....  4,7 ms
--   mesma consulta vista do navegador .......  211 a 516 ms
--
-- O tempo não está no banco: está no caminho até ele, e é cobrado POR
-- REQUISIÇÃO. Logo, o que adianta é reduzir quantas requisições a tela
-- faz, não deixar cada consulta mais rápida.
--
-- O app.html fazia três idas em sequência:
--   1. perfil (+ empresa)
--   2. get_my_portal_items, só para saber se o gerador está liberado
--   3. scripts + edições
--
-- Esta função devolve as três de uma vez.
-- ============================================================

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

    -- admin passa sempre; os demais dependem da liberação no portal.
    -- Mantém o comportamento antigo: se não houver linha de catálogo,
    -- não bloqueia ninguém.
    'gerador_liberado', (
      SELECT CASE
        WHEN (SELECT role FROM eu) = 'admin' THEN TRUE
        WHEN NOT EXISTS (SELECT 1 FROM portal_items WHERE slug = 'gerador-scripts' AND active) THEN TRUE
        ELSE COALESCE((
          SELECT ci.enabled AND (ci.expires_at IS NULL OR ci.expires_at > NOW())
          FROM company_items ci
          WHERE ci.item_slug = 'gerador-scripts'
            AND ci.company_id = (SELECT company_id FROM eu)
        ), FALSE)
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

REVOKE ALL ON FUNCTION public.get_my_app() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_app() TO authenticated;

-- Conferência: rode logado pelo app. Aqui no SQL Editor auth.uid() é
-- nulo e o resultado vem vazio de propósito. Para testar de verdade:
--
--   BEGIN;
--   SET LOCAL role authenticated;
--   SET LOCAL request.jwt.claims = '{"sub":"SEU_UID","role":"authenticated"}';
--   SELECT public.get_my_app();
--   ROLLBACK;
