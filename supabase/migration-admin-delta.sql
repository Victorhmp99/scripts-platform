-- ============================================================
-- Troca do administrador: vhvictor2015@gmail.com assume tudo
-- Rodar no SQL Editor do projeto dckvprqsecaxaooppqfp (org adeltasolucoes)
--
-- São DUAS ETAPAS de propósito. A etapa 1 promove a conta nova
-- sem tirar nada de ninguém; a etapa 2 só deve ser rodada DEPOIS
-- de você confirmar, logado como vhvictor2015@gmail.com, que o
-- painel /admin abre normalmente. Assim não existe momento em que
-- o sistema fica sem nenhum administrador.
-- ============================================================


-- ------------------------------------------------------------
-- ETAPA 0 — diagnóstico. Rode sozinha primeiro e leia o resultado.
-- Mostra quem é admin hoje e se a conta nova já existe.
-- ------------------------------------------------------------
SELECT
  p.email,
  p.role,
  p.company_id,
  c.name AS empresa,
  u.last_sign_in_at
FROM profiles p
LEFT JOIN companies c ON c.id = p.company_id
LEFT JOIN auth.users u ON u.id = p.id
WHERE p.role = 'admin' OR p.email = 'vhvictor2015@gmail.com'
ORDER BY p.role, p.email;

-- Se 'vhvictor2015@gmail.com' NÃO aparecer na lista acima, pare aqui:
-- a conta ainda não existe. Crie-a pelo próprio painel /admin (ou pelo
-- Authentication > Users do Supabase) e só então siga para a etapa 1.


-- ------------------------------------------------------------
-- ETAPA 1 — promove a conta nova e passa a ela a herança
-- ------------------------------------------------------------
DO $$
DECLARE
  novo_id    UUID;
  velho_id   UUID;
  empresa_id UUID;
BEGIN
  SELECT id INTO novo_id FROM profiles WHERE email = 'vhvictor2015@gmail.com';
  IF novo_id IS NULL THEN
    RAISE EXCEPTION 'A conta vhvictor2015@gmail.com não existe ainda. Crie-a antes de rodar esta etapa.';
  END IF;

  -- admin atual (o mais antigo que não seja a conta nova)
  SELECT id, company_id INTO velho_id, empresa_id
  FROM profiles
  WHERE role = 'admin' AND id <> novo_id
  ORDER BY created_at
  LIMIT 1;

  -- herda a empresa do admin antigo (se ele tinha uma e a conta nova não tem)
  UPDATE profiles
     SET role = 'admin',
         company_id = COALESCE(company_id, empresa_id)
   WHERE id = novo_id;

  -- passa a autoria das respostas de módulo para a conta nova,
  -- senão elas ficariam órfãs quando o usuário antigo for apagado
  IF velho_id IS NOT NULL THEN
    UPDATE module_answers SET updated_by = novo_id WHERE updated_by = velho_id;
  END IF;

  RAISE NOTICE 'Pronto. vhvictor2015@gmail.com agora é admin (id %). Admin antigo: %', novo_id, COALESCE(velho_id::text, 'nenhum');
END $$;

-- Confira:
SELECT email, role, company_id FROM profiles WHERE role = 'admin';

-- >>> PARE AQUI. Saia, entre no sistema como vhvictor2015@gmail.com
-- >>> e confirme que /admin abre e lista usuários e empresas.
-- >>> Só depois disso rode a etapa 2.


-- ------------------------------------------------------------
-- ETAPA 2 — remove a conta antiga (irreversível)
-- Troque o e-mail abaixo pelo que a etapa 0 mostrou como admin antigo.
-- ------------------------------------------------------------
-- DO $$
-- DECLARE
--   alvo UUID;
-- BEGIN
--   SELECT id INTO alvo FROM profiles WHERE email = 'COLOQUE_AQUI_O_EMAIL_ANTIGO';
--   IF alvo IS NULL THEN
--     RAISE EXCEPTION 'E-mail não encontrado. Confira a etapa 0.';
--   END IF;
--
--   -- trava de segurança: não apaga se isso fosse deixar o sistema sem admin
--   IF NOT EXISTS (
--     SELECT 1 FROM profiles
--     WHERE role = 'admin' AND email = 'vhvictor2015@gmail.com' AND id <> alvo
--   ) THEN
--     RAISE EXCEPTION 'A conta nova ainda não está como admin. Rode a etapa 1 primeiro.';
--   END IF;
--
--   -- apagar de auth.users cascateia para profiles
--   DELETE FROM auth.users WHERE id = alvo;
--   RAISE NOTICE 'Conta % removida.', alvo;
-- END $$;
