-- ============================================================
-- Troca do administrador da plataforma
--   sai: assessoriagreenlab@gmail.com
--   entra: vhvictor2015@gmail.com
--
-- Projeto dckvprqsecaxaooppqfp (org adeltasolucoes).
--
-- O diagnóstico de 10/10/2026 mostrou que vhvictor2015@gmail.com ainda
-- NÃO existe na plataforma, e que assessoriagreenlab@gmail.com é o único
-- admin (empresa a0000000-...-0001).
--
-- Por isso a conta nova NÃO é criada por SQL: ela é criada pelo próprio
-- painel /admin, que já tem a opção "Admin" no formulário e dispara o
-- convite por e-mail. Criar direto em auth.users por SQL pularia o
-- trigger que monta o perfil e o fluxo de senha.
--
-- ORDEM:
--   1. Logado como assessoriagreenlab@gmail.com, abrir /admin e cadastrar
--      vhvictor2015@gmail.com com papel Admin e a mesma empresa.
--   2. Abrir o convite no e-mail, definir a senha.
--   3. Entrar como vhvictor2015@gmail.com e confirmar que /admin abre e
--      lista usuários e empresas.
--   4. Só então rodar a ETAPA 1 abaixo.
-- ============================================================


-- ------------------------------------------------------------
-- ETAPA 0 — confere se o terreno está pronto para a remoção
-- Tem que listar DUAS linhas, as duas com role = admin.
-- ------------------------------------------------------------
SELECT p.email, p.role, p.company_id, u.last_sign_in_at
FROM profiles p
LEFT JOIN auth.users u ON u.id = p.id
WHERE p.email IN ('assessoriagreenlab@gmail.com', 'vhvictor2015@gmail.com')
ORDER BY p.email;


-- ------------------------------------------------------------
-- ETAPA 1 — passa a herança e remove a conta antiga
-- ------------------------------------------------------------
DO $$
DECLARE
  novo_id    UUID;
  velho_id   UUID;
  empresa_id UUID;
BEGIN
  SELECT id, company_id INTO novo_id, empresa_id
    FROM profiles WHERE email = 'vhvictor2015@gmail.com';
  SELECT id INTO velho_id
    FROM profiles WHERE email = 'assessoriagreenlab@gmail.com';

  IF novo_id IS NULL THEN
    RAISE EXCEPTION 'vhvictor2015@gmail.com não existe. Cadastre pelo painel /admin antes (passos 1 a 3 do cabeçalho).';
  END IF;

  -- trava: a conta nova precisa já estar funcionando como admin,
  -- senão a remoção deixaria o sistema sem nenhum administrador
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = novo_id AND role = 'admin') THEN
    RAISE EXCEPTION 'vhvictor2015@gmail.com existe mas não é admin. Ajuste o papel antes de remover a conta antiga.';
  END IF;

  IF velho_id IS NULL THEN
    RAISE NOTICE 'A conta antiga já não existe. Nada a remover.';
    RETURN;
  END IF;

  -- herda a empresa da conta antiga, se a nova tiver ficado sem
  IF empresa_id IS NULL THEN
    UPDATE profiles SET company_id = (SELECT company_id FROM profiles WHERE id = velho_id)
     WHERE id = novo_id;
  END IF;

  -- a autoria das respostas de módulo passa para a conta nova;
  -- sem isso elas ficariam órfãs quando o usuário antigo sumisse
  UPDATE module_answers SET updated_by = novo_id WHERE updated_by = velho_id;

  -- apagar de auth.users cascateia para profiles
  DELETE FROM auth.users WHERE id = velho_id;

  RAISE NOTICE 'Pronto. Admin agora é vhvictor2015@gmail.com (%). Conta antiga removida.', novo_id;
END $$;


-- ------------------------------------------------------------
-- ETAPA 2 — confirmação. Tem que sobrar UMA linha: a conta nova.
-- ------------------------------------------------------------
SELECT p.email, p.role, p.company_id, c.name AS empresa
FROM profiles p
LEFT JOIN companies c ON c.id = p.company_id
WHERE p.role = 'admin';
