-- ============================================================
-- Conserta a lentidão do banco: funções de RLS marcadas STABLE
--
-- O problema:
--
--   CREATE OR REPLACE FUNCTION get_my_role()
--   RETURNS TEXT AS $$
--     SELECT role FROM profiles WHERE id = auth.uid();
--   $$ LANGUAGE sql SECURITY DEFINER;    <- faltava STABLE
--
-- Sem STABLE, o Postgres considera a função VOLATILE e precisa executá-la
-- UMA VEZ POR LINHA analisada, porque não pode assumir que o resultado se
-- repete dentro da mesma consulta. Essas duas funções aparecem em 28
-- cláusulas de política. Cada linha de cada tabela disparava um SELECT
-- extra em profiles.
--
-- Com STABLE, o resultado é calculado uma vez por consulta.
--
-- Medido em 10/10/2026, antes: um select de uma linha levava 211 a 516 ms,
-- com picos de 1 s. Compare com EXPLAIN (ANALYZE) antes e depois.
--
-- Seguro rodar mais de uma vez. Não muda o comportamento, só o custo:
-- as funções devolvem exatamente o mesmo valor.
-- ============================================================

-- ------------------------------------------------------------
-- 1. As duas funções usadas nas políticas
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE                      -- <- a correção
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = (SELECT auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.get_my_company()
RETURNS UUID
LANGUAGE sql
STABLE                      -- <- a correção
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM profiles WHERE id = (SELECT auth.uid());
$$;

-- O (SELECT auth.uid()) no lugar de auth.uid() não é enfeite: embrulhado
-- num subselect, o Postgres calcula uma vez e reaproveita, em vez de
-- chamar a cada avaliação.



-- ------------------------------------------------------------
-- 1b. As funções do portal também estavam VOLATILE
--
-- get_my_portal_items é a consulta que monta a tela principal. Além de
-- VOLATILE, ela repetia a subconsulta do perfil DENTRO da condição de
-- junção, ou seja, uma vez por item do catálogo. Trocada pela helper
-- get_my_company(), que agora é STABLE e resolve uma vez só.
--
-- Mesmo resultado, mesma ordem — só o custo muda.
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
    COALESCE(
      ci.enabled AND (ci.expires_at IS NULL OR ci.expires_at > NOW()),
      FALSE
    ) AS unlocked,
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
  SELECT EXISTS (
    SELECT 1 FROM company_items
    WHERE company_id = p_company_id
      AND item_slug = p_slug
      AND enabled
      AND (expires_at IS NULL OR expires_at > NOW())
  );
$$;

-- ------------------------------------------------------------
-- 2. A política que chama auth.uid() direto também paga o mesmo preço
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "usuário vê seu perfil" ON profiles;
CREATE POLICY "usuário vê seu perfil" ON profiles
  FOR SELECT USING (id = (SELECT auth.uid()));


-- ------------------------------------------------------------
-- 3. Índice que faltava
-- profiles.company_id é usado em junção e em política, e só havia
-- índice na chave primária (id).
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS profiles_company_idx ON profiles (company_id);
CREATE INDEX IF NOT EXISTS profiles_email_idx   ON profiles (lower(email));


-- ------------------------------------------------------------
-- 4. Atualiza as estatísticas do planejador
-- ------------------------------------------------------------
ANALYZE profiles;
ANALYZE companies;
ANALYZE portal_items;
ANALYZE company_items;


-- ------------------------------------------------------------
-- 5. Conferência: as duas têm que aparecer como 's' (stable)
-- ------------------------------------------------------------
SELECT proname AS funcao,
       CASE provolatile WHEN 'i' THEN 'immutable'
                        WHEN 's' THEN 'stable'
                        WHEN 'v' THEN 'VOLATILE (ainda errado)' END AS volatilidade
FROM pg_proc
WHERE proname IN ('get_my_role', 'get_my_company', 'sou_master', 'get_my_portal_items')
ORDER BY proname;
