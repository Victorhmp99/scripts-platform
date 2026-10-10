-- ============================================================
-- Troca do administrador da plataforma
--   sai:   assessoriagreenlab@gmail.com
--   entra: vhvictor2008@hotmail.com   (Victor Hugo Mendes Pessoa)
--          adeltasolucoes@gmail.com   (conta da empresa)
--
-- Projeto dckvprqsecaxaooppqfp (org adeltasolucoes).
--
-- O diagnóstico de 10/10/2026 mostrou que assessoriagreenlab@gmail.com é
-- o ÚNICO admin (empresa a0000000-...-0001) e que nenhuma das contas
-- novas existe ainda.
--
-- As contas novas NÃO são criadas por SQL: são criadas pelo painel
-- /admin, que já tem "Admin" no formulário e dispara o convite por
-- e-mail. Inserir direto em auth.users pularia o gatilho que monta o
-- perfil e o fluxo de definição de senha.
--
-- ORDEM:
--   1. Logado como assessoriagreenlab@gmail.com, abrir /admin e cadastrar
--      as DUAS contas, papel Admin, mesma empresa:
--        vhvictor2008@hotmail.com  — nome: Victor Hugo Mendes Pessoa
--        adeltasolucoes@gmail.com  — nome: Delta Soluções
--   2. Abrir os dois convites e definir as senhas.
--   3. Entrar com cada uma e confirmar que /admin abre e lista usuários.
--   4. Só então rodar a ETAPA 1.
-- ============================================================


-- ------------------------------------------------------------
-- ETAPA 0 — confere o terreno. Tem que listar as DUAS contas novas
-- como admin, mais a antiga.
-- ------------------------------------------------------------
SELECT p.email, p.role, p.company_id, u.last_sign_in_at
FROM profiles p
LEFT JOIN auth.users u ON u.id = p.id
WHERE p.email IN ('assessoriagreenlab@gmail.com',
                  'vhvictor2008@hotmail.com',
                  'adeltasolucoes@gmail.com')
   OR p.role = 'admin'
ORDER BY p.email;


-- ------------------------------------------------------------
-- ETAPA 1 — passa a herança e remove a conta antiga
-- ------------------------------------------------------------
DO $$
DECLARE
  novos      UUID[];
  quantos    INT;
  velho_id   UUID;
  empresa_id UUID;
  herdeiro   UUID;
BEGIN
  SELECT array_agg(id) INTO novos
    FROM profiles
   WHERE email IN ('vhvictor2008@hotmail.com', 'adeltasolucoes@gmail.com')
     AND role = 'admin';

  quantos := coalesce(array_length(novos, 1), 0);

  SELECT id, company_id INTO velho_id, empresa_id
    FROM profiles WHERE email = 'assessoriagreenlab@gmail.com';

  -- trava: sem nenhum admin novo funcionando, remover a conta antiga
  -- deixaria o sistema sem administrador nenhum
  IF quantos = 0 THEN
    RAISE EXCEPTION 'Nenhuma das contas novas está como admin. Faça os passos 1 a 3 do cabeçalho antes de rodar isto.';
  END IF;

  IF quantos < 2 THEN
    RAISE WARNING 'Só % das 2 contas novas está como admin. Seguindo mesmo assim, mas confira a outra depois.', quantos;
  END IF;

  IF velho_id IS NULL THEN
    RAISE NOTICE 'A conta antiga já não existe. Nada a remover.';
    RETURN;
  END IF;

  -- quem recebe a empresa e a autoria: a conta pessoal, se estiver pronta
  SELECT coalesce(
           (SELECT id FROM profiles WHERE email = 'vhvictor2008@hotmail.com' AND role = 'admin'),
           novos[1])
    INTO herdeiro;

  -- qualquer admin novo que tenha ficado sem empresa herda a da antiga
  UPDATE profiles SET company_id = empresa_id
   WHERE id = ANY(novos) AND company_id IS NULL;

  -- a autoria das respostas de módulo passa adiante; sem isso elas
  -- ficariam órfãs quando o usuário antigo sumisse
  UPDATE module_answers SET updated_by = herdeiro WHERE updated_by = velho_id;

  -- apagar de auth.users cascateia para profiles
  DELETE FROM auth.users WHERE id = velho_id;

  RAISE NOTICE 'Conta antiga removida. Admins ativos: %', quantos;
END $$;


-- ------------------------------------------------------------
-- ETAPA 2 — confirmação.
-- Tem que listar só vhvictor2008@hotmail.com e adeltasolucoes@gmail.com.
-- ------------------------------------------------------------
SELECT p.email, p.role, p.company_id, c.name AS empresa
FROM profiles p
LEFT JOIN companies c ON c.id = p.company_id
WHERE p.role = 'admin'
ORDER BY p.email;
