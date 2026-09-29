-- ============================================================
-- Biblioteca de Criativos — acervo publicado
-- Roda no mesmo projeto Supabase do portal (dckvprqsecaxaooppqfp).
-- Seguro rodar mais de uma vez.
-- ============================================================

-- Uma linha só: o acervo inteiro em JSON, no mesmo formato do criativos.json.
-- Guardar como documento evita migration toda vez que o formato do roteiro muda.
CREATE TABLE IF NOT EXISTS criativos_acervo (
  id         SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  dados      JSONB NOT NULL,
  updated_by UUID REFERENCES auth.users ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE criativos_acervo ENABLE ROW LEVEL SECURITY;

-- O site é público: qualquer visitante lê, inclusive sem login.
DROP POLICY IF EXISTS "qualquer um lê o acervo" ON criativos_acervo;
CREATE POLICY "qualquer um lê o acervo" ON criativos_acervo
  FOR SELECT TO anon, authenticated USING (true);

-- Escrever é só do admin — o mesmo papel usado no portal.
DROP POLICY IF EXISTS "admin publica o acervo" ON criativos_acervo;
CREATE POLICY "admin publica o acervo" ON criativos_acervo
  FOR ALL TO authenticated
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

DROP TRIGGER IF EXISTS criativos_acervo_updated_at ON criativos_acervo;
CREATE TRIGGER criativos_acervo_updated_at
  BEFORE UPDATE ON criativos_acervo
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Não semeia nada aqui de propósito: o acervo atual tem 172 KB de JSON.
-- Na primeira vez, o painel abre lendo o criativos.json do repositório e
-- o botão "Publicar alterações" manda tudo para cá.
