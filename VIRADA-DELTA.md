# Virada para Delta Soluções — passo a passo

Faça na ordem. Cada passo diz **onde** e **o que colar**.

O que já está pronto e no ar (não precisa fazer nada): identidade visual nova,
nome trocado nas telas, logo e favicon.

O que falta é tudo **fora do código**: os e-mails e o banco.

---

## Passo 1 — Deixar os e-mails bonitos

Hoje o convite que chega para as pessoas é o padrão sem estilo do Supabase.
Ele não sai deste projeto, sai do Supabase — por isso só muda lá.

**Faça antes dos outros passos**, senão os convites do passo 3 saem feios.

Onde: Supabase → projeto `dckvprqsecaxaooppqfp` → **Authentication** →
**Emails** → **Templates**.

Para cada aba abaixo, abra o arquivo, copie **tudo**, e cole no campo
*Message body*. Troque também o *Subject*:

| Aba no Supabase | Arquivo para copiar          | Subject                     |
|-----------------|------------------------------|-----------------------------|
| Invite user     | `emails/convite.html`        | Seu acesso à Delta Soluções |
| Confirm signup  | `emails/confirmacao.html`    | Confirme seu e-mail         |
| Reset password  | `emails/recuperar-senha.html`| Redefinir sua senha         |
| Magic Link      | `emails/link-magico.html`    | Seu link de acesso          |

A que o sistema usa de verdade é a **Invite user**. As outras três valem para
ninguém cair num e-mail feio ao pedir "esqueci minha senha".

> Não apague o `{{ .ConfirmationURL }}` de dentro do arquivo. É ele que o
> Supabase troca pelo link real na hora de enviar; sem ele o e-mail não leva
> a lugar nenhum.

---

## Passo 2 — Trocar "Green Lab" por "Delta Soluções" nos dados

Isso muda os **scripts de atendimento**, o nome da empresa e os textos que o
cliente lê. Hoje eles ainda dizem "Green Lab".

Onde: Supabase → **SQL Editor** → *New query*.

### 2a — Cópia de segurança (rode primeiro, sozinha)

Este projeto está sem backup automático, então a cópia é o que permite voltar
atrás.

```sql
DROP TABLE IF EXISTS _bkp_delta_companies, _bkp_delta_scripts;
CREATE TABLE _bkp_delta_companies AS SELECT * FROM companies;
CREATE TABLE _bkp_delta_scripts   AS SELECT * FROM company_scripts;
ALTER TABLE _bkp_delta_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE _bkp_delta_scripts   ENABLE ROW LEVEL SECURITY;

SELECT 'copia feita' AS ok,
       (SELECT count(*) FROM _bkp_delta_companies) AS empresas,
       (SELECT count(*) FROM _bkp_delta_scripts)   AS scripts;
```

### 2b — A troca

```sql
CREATE OR REPLACE FUNCTION public.delta_rename(t TEXT) RETURNS TEXT AS $f$
  SELECT CASE WHEN $1 IS NULL THEN NULL ELSE
    replace(
      regexp_replace(
        regexp_replace(
          replace($1, 'assessoriagreenlab.com.br', '@@DOMINIO_PRESERVADO@@'),
          '\mGreen[[:space:]]*(Lab|Hub)\M', 'Delta Soluções', 'gi'),
        '\mGreen\M', 'Delta', 'gi'),
      '@@DOMINIO_PRESERVADO@@', 'assessoriagreenlab.com.br')
  END
$f$ LANGUAGE sql IMMUTABLE;

UPDATE companies SET
  name = public.delta_rename(name),
  industry = public.delta_rename(industry),
  services = public.delta_rename(services),
  target_audience = public.delta_rename(target_audience),
  pain_points = public.delta_rename(pain_points),
  value_prop = public.delta_rename(value_prop),
  sales_process = public.delta_rename(sales_process),
  seller_name = public.delta_rename(seller_name),
  tone = public.delta_rename(tone);

UPDATE company_scripts SET
  scripts = public.delta_rename(scripts::text)::jsonb,
  qual    = public.delta_rename(qual::text)::jsonb,
  aq      = public.delta_rename(aq::text)::jsonb,
  updated_at = NOW();

UPDATE script_edits   SET content = public.delta_rename(content), updated_at = NOW();
UPDATE portal_items   SET title = public.delta_rename(title),
                          description = public.delta_rename(description);
UPDATE module_answers SET answers = public.delta_rename(answers::text)::jsonb;

DROP FUNCTION public.delta_rename(TEXT);

-- Conferência: tem que voltar VAZIO
SELECT 'ainda tem green' AS aviso, name AS trecho FROM companies
  WHERE replace(name,'assessoriagreenlab.com.br','') ILIKE '%green%'
UNION ALL
SELECT 'ainda tem green', left(scripts::text,100) FROM company_scripts
  WHERE replace(scripts::text,'assessoriagreenlab.com.br','') ILIKE '%green%';
```

> O domínio `assessoriagreenlab.com.br` é protegido de propósito: é um endereço
> real e viraria link morto se virasse "deltalab".

Se quiser desfazer, o bloco está em `supabase/migration-renomeia-delta.sql`,
etapa 3.

---

## Passo 3 — Criar os dois admins novos

Ainda logado como `assessoriagreenlab@gmail.com`, abra
`https://ferramentas.assessoriagreenlab.com.br/admin` → **adicionar usuário**:

| E-mail                     | Nome                      | Papel | Empresa        |
|----------------------------|---------------------------|-------|----------------|
| `vhvictor2008@hotmail.com` | Victor Hugo Mendes Pessoa | Admin | Delta Soluções |
| `adeltasolucoes@gmail.com` | Delta Soluções            | Admin | Delta Soluções |

> Não crie essas contas por SQL. Inserir direto no banco pula o gatilho que
> monta o perfil e pula o fluxo de senha — a conta nasce quebrada.

---

## Passo 4 — Abrir os convites e definir as senhas

Cada uma das duas caixas de entrada recebe um convite. Clique, defina a senha.

---

## Passo 5 — Conferir

Entre com **cada uma** das duas contas e confirme que `/admin` abre e lista
usuários e empresas.

**Não pule este passo.** Ele é o que garante que você não fique trancado para
fora no passo 6.

---

## Passo 6 — Remover a conta antiga

Só depois do passo 5. Supabase → SQL Editor:

```sql
DO $$
DECLARE
  novos UUID[]; quantos INT; velho_id UUID; empresa_id UUID; herdeiro UUID;
BEGIN
  SELECT array_agg(id) INTO novos FROM profiles
   WHERE email IN ('vhvictor2008@hotmail.com','adeltasolucoes@gmail.com')
     AND role = 'admin';
  quantos := coalesce(array_length(novos,1),0);

  SELECT id, company_id INTO velho_id, empresa_id
    FROM profiles WHERE email = 'assessoriagreenlab@gmail.com';

  IF quantos = 0 THEN
    RAISE EXCEPTION 'Nenhuma das contas novas está como admin. Faça os passos 3 a 5 antes.';
  END IF;
  IF quantos < 2 THEN
    RAISE WARNING 'Só % das 2 contas novas está como admin. Seguindo, mas confira a outra.', quantos;
  END IF;
  IF velho_id IS NULL THEN
    RAISE NOTICE 'A conta antiga já não existe.'; RETURN;
  END IF;

  SELECT coalesce(
    (SELECT id FROM profiles WHERE email='vhvictor2008@hotmail.com' AND role='admin'),
    novos[1]) INTO herdeiro;

  UPDATE profiles SET company_id = empresa_id
   WHERE id = ANY(novos) AND company_id IS NULL;

  UPDATE module_answers SET updated_by = herdeiro WHERE updated_by = velho_id;

  DELETE FROM auth.users WHERE id = velho_id;
  RAISE NOTICE 'Conta antiga removida. Admins ativos: %', quantos;
END $$;

-- Conferência: tem que listar SÓ as duas contas novas
SELECT p.email, p.role, c.name AS empresa
FROM profiles p LEFT JOIN companies c ON c.id = p.company_id
WHERE p.role = 'admin' ORDER BY p.email;
```

A trava recusa rodar se nenhuma conta nova estiver funcionando como admin —
não existe instante em que o sistema fica sem administrador.

Apagar esse usuário **não mexe** na sua conta do painel do Supabase nem no
Gmail `assessoriagreenlab@gmail.com` em si. Some só o acesso à plataforma.

---

## Passo 7 — Depois de uns dias, limpar as cópias

```sql
DROP TABLE _bkp_delta_companies, _bkp_delta_scripts;
```

---

## Ainda em aberto (decidir depois)

- O domínio continua `assessoriagreenlab.com.br`. Trocar envolve DNS, o
  endereço nos e-mails e o `APP_URL` na Vercel — é um trabalho à parte.
- O projeto Supabase transferido continua sem backup automático.
- O `ADMIN_SECRET` antigo nas variáveis da Vercel não é mais usado pelo código
  e pode ser removido.
