-- ============================================================
-- CORREÇÃO DE SEGURANÇA — autopromoção a admin
--
-- A política abaixo existia:
--   CREATE POLICY "usuário atualiza seu perfil" ON profiles
--     FOR UPDATE USING (id = auth.uid());
--
-- Sem WITH CHECK próprio e sem restrição de coluna, ela permitia que
-- QUALQUER pessoa logada rodasse, pelo console do navegador:
--   supabase.from('profiles').update({ role: 'admin' }).eq('id', <o próprio id>)
-- e virasse admin da plataforma — vendo todas as empresas, criando e
-- apagando usuários. As APIs não impediam: elas conferem profiles.role,
-- que é justamente o campo que a pessoa acabara de alterar.
--
-- Nenhuma tela do sistema atualiza o próprio perfil (conferido em
-- public/ e api/): só o painel admin e as funções de servidor, que usam
-- a chave de serviço e não passam por RLS. Por isso remover a política
-- não tira função nenhuma.
--
-- Seguro rodar mais de uma vez.
-- ============================================================

DROP POLICY IF EXISTS "usuário atualiza seu perfil" ON profiles;

-- Confere o que sobrou: esperado apenas
--   "admin vê todos perfis" (ALL)  e  "usuário vê seu perfil" (SELECT)
SELECT policyname, cmd, qual
  FROM pg_policies
 WHERE tablename = 'profiles'
 ORDER BY policyname;
