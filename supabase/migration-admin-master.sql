-- ============================================================
-- Admin master: adeltasolucoes@gmail.com
--
-- Regra pedida:
--   - só a conta master pode remover outros admins;
--   - nenhum outro admin pode apagar, rebaixar ou alterar a master.
--
-- Por que mexer no banco e não só no botão: a política atual é
--     CREATE POLICY "admin vê todos perfis" ON profiles
--       FOR ALL USING (get_my_role() = 'admin');
-- e FOR ALL inclui UPDATE. Hoje qualquer admin pode rebaixar qualquer
-- outro admin direto do navegador, sem passar pela API. Esconder o
-- botão não resolveria — a regra tem que valer no banco.
--
-- Rodar inteiro de uma vez no SQL Editor.
-- ============================================================

-- ------------------------------------------------------------
-- 1. A marca de master
-- ------------------------------------------------------------
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_master BOOLEAN NOT NULL DEFAULT FALSE;

-- Só pode existir UMA conta master. O índice é o que garante isso:
-- sem ele, bastaria alguém marcar a própria conta para empatar.
DROP INDEX IF EXISTS profiles_um_master_so;
CREATE UNIQUE INDEX profiles_um_master_so ON profiles ((TRUE)) WHERE is_master;

UPDATE profiles SET is_master = TRUE WHERE email = 'adeltasolucoes@gmail.com';

-- A master é admin por definição.
UPDATE profiles SET role = 'admin' WHERE is_master AND role <> 'admin';


-- ------------------------------------------------------------
-- 2. Helper
-- SECURITY DEFINER de propósito: a função lê profiles, e profiles tem
-- RLS que vai chamar esta função. Sem DEFINER, a checagem entraria em
-- recursão. É o mesmo padrão do get_my_role() que já existe.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sou_master()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_master FROM profiles WHERE id = auth.uid()), FALSE);
$$;


-- ------------------------------------------------------------
-- 3. RLS: troca o FOR ALL por regras separadas por operação
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "admin vê todos perfis" ON profiles;
DROP POLICY IF EXISTS "admin lê todos perfis" ON profiles;
DROP POLICY IF EXISTS "admin cria perfis"     ON profiles;
DROP POLICY IF EXISTS "admin altera perfis"   ON profiles;
DROP POLICY IF EXISTS "admin apaga perfis"    ON profiles;

-- Ler: qualquer admin vê todo mundo, inclusive a master.
CREATE POLICY "admin lê todos perfis" ON profiles
  FOR SELECT USING (get_my_role() = 'admin');

-- Criar: admin cria perfis, mas ninguém nasce master.
CREATE POLICY "admin cria perfis" ON profiles
  FOR INSERT WITH CHECK (get_my_role() = 'admin' AND NOT is_master);

-- Alterar:
--   USING      -> quais linhas podem ser tocadas: a da master, só a master toca.
--   WITH CHECK -> como a linha pode ficar: só a master pode marcar is_master,
--                 o que impede um admin comum de se autopromover a master.
CREATE POLICY "admin altera perfis" ON profiles
  FOR UPDATE
  USING      (get_my_role() = 'admin' AND (NOT is_master OR public.sou_master()))
  WITH CHECK (get_my_role() = 'admin' AND (public.sou_master() OR NOT is_master));

-- Apagar: a linha da master não é apagável por ninguém por aqui.
CREATE POLICY "admin apaga perfis" ON profiles
  FOR DELETE USING (get_my_role() = 'admin' AND NOT is_master);


-- ------------------------------------------------------------
-- 4. Rede de segurança no próprio banco
--
-- As políticas acima valem para quem usa a chave pública (o navegador).
-- A service_role das rotas /api IGNORA RLS. O gatilho abaixo vale para
-- todos, inclusive a service_role: é o que impede que um descuido numa
-- rota futura apague a master.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protege_master()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD.is_master THEN
    RAISE EXCEPTION 'A conta master não pode ser removida. Passe a condição de master para outra conta antes.';
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.is_master AND NEW.role <> 'admin' THEN
    RAISE EXCEPTION 'A conta master não pode deixar de ser admin.';
  END IF;

  RETURN CASE TG_OP WHEN 'DELETE' THEN OLD ELSE NEW END;
END $$;

DROP TRIGGER IF EXISTS protege_master_trg ON profiles;
CREATE TRIGGER protege_master_trg
  BEFORE UPDATE OR DELETE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.protege_master();

-- auth.users é a origem: apagar de lá cascateia para profiles e
-- escaparia do gatilho acima, porque o CASCADE não dispara BEFORE DELETE
-- em profiles como uma exclusão direta. Este segundo gatilho fecha isso.
CREATE OR REPLACE FUNCTION public.protege_master_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM profiles WHERE id = OLD.id AND is_master) THEN
    RAISE EXCEPTION 'Esta é a conta master da plataforma e não pode ser excluída.';
  END IF;
  RETURN OLD;
END $$;

DROP TRIGGER IF EXISTS protege_master_auth_trg ON auth.users;
CREATE TRIGGER protege_master_auth_trg
  BEFORE DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.protege_master_auth();


-- ------------------------------------------------------------
-- 5. Arruma o que o diagnóstico mostrou fora do lugar
-- ------------------------------------------------------------
-- vhvictor2008@hotmail.com estava admin sem empresa nenhuma
UPDATE profiles SET
  company_id = COALESCE(company_id,
                        (SELECT company_id FROM profiles WHERE is_master)),
  full_name  = CASE WHEN full_name = 'Pessoa Resolve'
                    THEN 'Victor Hugo Mendes Pessoa' ELSE full_name END
WHERE email = 'vhvictor2008@hotmail.com';


-- ------------------------------------------------------------
-- 6. Conferência
-- ------------------------------------------------------------
SELECT p.email, p.role, p.is_master, p.full_name, c.name AS empresa
FROM profiles p
LEFT JOIN companies c ON c.id = p.company_id
WHERE p.role = 'admin'
ORDER BY p.is_master DESC, p.email;
