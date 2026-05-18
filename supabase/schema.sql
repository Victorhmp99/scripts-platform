-- ============================================================
-- Scripts Platform - Schema Supabase
-- Execute este SQL no SQL Editor do seu projeto Supabase
-- ============================================================

-- Tabela de empresas clientes
CREATE TABLE IF NOT EXISTS companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  industry TEXT,
  services TEXT,
  target_audience TEXT,
  pain_points TEXT,
  value_prop TEXT,
  sales_process TEXT,
  setup_complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Perfis de usuários (estende auth.users do Supabase)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  role TEXT CHECK (role IN ('admin', 'gestor', 'user')) DEFAULT 'user',
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scripts gerados pela IA para cada empresa
CREATE TABLE IF NOT EXISTS company_scripts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE UNIQUE,
  scripts JSONB NOT NULL DEFAULT '{}',
  qual JSONB NOT NULL DEFAULT '[]',
  aq JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Edições e personalizações feitas pelos usuários
CREATE TABLE IF NOT EXISTS script_edits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  script_key TEXT NOT NULL,
  content TEXT NOT NULL,
  usage_count INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, script_key)
);

-- ============================================================
-- Trigger: cria perfil automaticamente ao criar usuário
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- Trigger: atualiza updated_at em company_scripts
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS company_scripts_updated_at ON company_scripts;
CREATE TRIGGER company_scripts_updated_at
  BEFORE UPDATE ON company_scripts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE script_edits ENABLE ROW LEVEL SECURITY;

-- Helper: retorna o role do usuário autenticado
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper: retorna o company_id do usuário autenticado
CREATE OR REPLACE FUNCTION get_my_company()
RETURNS UUID AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Policies: companies
CREATE POLICY "admin vê tudo" ON companies
  FOR ALL USING (get_my_role() = 'admin');

CREATE POLICY "usuário vê sua empresa" ON companies
  FOR SELECT USING (id = get_my_company());

-- Policies: profiles
CREATE POLICY "admin vê todos perfis" ON profiles
  FOR ALL USING (get_my_role() = 'admin');

CREATE POLICY "usuário vê seu perfil" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "usuário atualiza seu perfil" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- Policies: company_scripts
CREATE POLICY "admin vê todos scripts" ON company_scripts
  FOR ALL USING (get_my_role() = 'admin');

CREATE POLICY "usuário vê scripts da empresa" ON company_scripts
  FOR SELECT USING (company_id = get_my_company());

CREATE POLICY "gestor atualiza scripts da empresa" ON company_scripts
  FOR ALL USING (
    company_id = get_my_company()
    AND get_my_role() IN ('admin', 'gestor')
  );

-- Policies: script_edits
CREATE POLICY "admin vê todas edições" ON script_edits
  FOR ALL USING (get_my_role() = 'admin');

CREATE POLICY "usuário vê edições da empresa" ON script_edits
  FOR SELECT USING (company_id = get_my_company());

CREATE POLICY "usuário edita scripts da empresa" ON script_edits
  FOR ALL USING (company_id = get_my_company());
