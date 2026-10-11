-- ============================================================
-- Uma chamada só para montar o portal
--
-- Medição de 10/10/2026, do navegador, com a conexão já quente:
--   /auth/v1/settings  (não toca o banco)  ->  60 ms
--   /rest/v1/...       (toca o banco)      ->  211 a 516 ms, pico de 1049
--
-- O portal fazia duas idas em sequência: primeiro o perfil, depois
-- (em paralelo) a empresa e os itens. São dois tempos de espera somados.
-- Esta função devolve tudo de uma vez, então sobra uma ida só.
--
-- Não substitui resolver a lentidão do banco em si — só deixa de pagar
-- o pedágio duas vezes.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_my_portal()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'perfil', (
      SELECT jsonb_build_object(
               'full_name',  p.full_name,
               'role',       p.role,
               'company_id', p.company_id,
               'is_master',  p.is_master)
      FROM profiles p WHERE p.id = auth.uid()
    ),
    'empresa', (
      SELECT jsonb_build_object('name', c.name)
      FROM companies c
      WHERE c.id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    ),
    'itens', COALESCE(
      (SELECT jsonb_agg(to_jsonb(t)) FROM get_my_portal_items() t),
      '[]'::jsonb
    )
  );
$$;

REVOKE ALL ON FUNCTION public.get_my_portal() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_portal() TO authenticated;

-- Conferência (rode logado pelo app, não pelo SQL Editor —
-- aqui auth.uid() é nulo e o resultado vem vazio de propósito):
-- SELECT public.get_my_portal();
