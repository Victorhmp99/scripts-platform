-- Adiciona coluna email na tabela profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Atualiza o trigger para salvar o email quando o usuário é criado
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email)
  ON CONFLICT (id) DO UPDATE SET email = NEW.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
