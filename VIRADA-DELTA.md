# Virada para Delta Soluções — o que falta fazer

Atualizado em 10/10/2026, já com o estado real do banco.

**Já está pronto e no ar** (não precisa fazer nada): identidade visual nova,
nome trocado nas telas, logo e favicon, preconnect de desempenho, e as
proteções da conta master no código.

**Já está no banco:** as três contas de admin existem —
`adeltasolucoes@gmail.com`, `vhvictor2008@hotmail.com` e a antiga
`assessoriagreenlab@gmail.com`.

O que falta é rodar 3 migrações e, separado, resolver o e-mail.

Tudo abaixo roda em **Supabase → projeto `dckvprqsecaxaooppqfp` → SQL Editor**.

---

## Passo 1 — Trocar "Green Lab" por "Delta Soluções" nos dados

Os scripts de atendimento ainda dizem "Green Lab" para o cliente.

**Arquivo:** `supabase/migration-renomeia-delta.sql`

Rode as etapas na ordem que está dentro do arquivo:

- **Etapa 0** — diagnóstico, só mostra o que vai mudar.
- **Etapa 1** — cópia de segurança. **Não pule**: este projeto está sem backup
  automático, e a cópia é o que permite voltar atrás.
- **Etapa 2** — a troca.
- Etapa 3 só se der errado (desfaz). Etapa 4 limpa as cópias depois de uns dias.

O domínio `assessoriagreenlab.com.br` é preservado de propósito — é endereço
real e viraria link morto.

---

## Passo 2 — Tornar a Delta Soluções a conta master

**Arquivo:** `supabase/migration-admin-master.sql`

Rode o arquivo inteiro de uma vez. Ele:

- marca `adeltasolucoes@gmail.com` como master (com índice único: só pode haver uma);
- troca a política `FOR ALL` por regras separadas, para que nenhum admin possa
  rebaixar outro pelo navegador;
- cria gatilhos que valem até para as rotas `/api`, que ignoram RLS;
- conserta o `vhvictor2008@hotmail.com`, que está admin **sem empresa nenhuma**.

No fim ele mostra os admins. Confira que `adeltasolucoes@gmail.com` aparece com
`is_master = true`.

---

## Passo 3 — Conferir antes de apagar

Entre no site com **cada uma** das duas contas novas e confirme que `/admin`
abre e lista usuários:

- `adeltasolucoes@gmail.com`
- `vhvictor2008@hotmail.com` (a senha é a que você definiu em junho; se não
  lembrar, troque em Authentication → Users → o usuário → Edit user)

Logado como a master, a tela deve mostrar o selo **master** amarelo ao lado da
função, e os outros admins sem o botão Remover.

**Não pule este passo** — é ele que garante que você não fique trancado para fora.

---

## Passo 4 — Remover a conta antiga

**Arquivo:** `supabase/migration-admin-delta.sql`, etapa 1.

Remove `assessoriagreenlab@gmail.com`. A trava recusa rodar se nenhuma conta
nova estiver funcionando como admin.

Apagar esse usuário **não mexe** na sua conta do painel do Supabase nem no
Gmail em si — some só o acesso à plataforma.

---

## Passo 5 — Deixar o portal mais rápido

**Arquivo:** `supabase/migration-portal-uma-chamada.sql`

Rode o arquivo inteiro. O portal fazia duas idas ao banco em sequência; com a
função nova faz uma. Cada ida custa de 200 a 500ms hoje.

Pode rodar a qualquer momento — o site já está no ar tentando a função nova e
caindo no caminho antigo enquanto ela não existe, então não quebra nada.

---

## Passo 6 — O e-mail (só quando for convidar clientes)

Isto **não é necessário** para os seus dois admins, que já existem. É
necessário para qualquer pessoa nova receber convite.

Duas coisas travam hoje:

1. O Supabase bloqueia editar templates no plano grátis com o remetente padrão.
2. Esse remetente é limitado a **2 e-mails por hora** e a documentação diz que
   não é para produção.

SMTP próprio resolve as duas, de graça. O caminho está em `emails/README.md`,
e os modelos prontos são:

| Aba no Supabase | Arquivo                       |
|-----------------|-------------------------------|
| Invite user     | `emails/convite.html`         |
| Confirm signup  | `emails/confirmacao.html`     |
| Reset password  | `emails/recuperar-senha.html` |
| Magic Link      | `emails/link-magico.html`     |

**Armadilha:** o remetente não pode ser `@gmail.com` — o DMARC do Gmail rejeita
e-mail saindo de outro servidor em nome dele. Use `assessoriagreenlab.com.br`.

---

## Passo 7 — A lentidão de verdade

Os passos acima cortam o **número** de esperas. A **duração** de cada uma não
depende do código:

| Chamada, mesmo servidor, conexão quente | Tempo    |
|-----------------------------------------|----------|
| `/auth/v1/settings` (não toca o banco)   | 60 ms    |
| `/rest/v1/...` (toca o banco)            | 211–516 ms, pico de 1049 ms |

Um `select` de uma linha numa tabela minúscula deveria levar ~10 ms. Isso é
compute esfomeado: plano grátis compartilhado, num projeto que apareceu como
*Unhealthy* depois da transferência.

Veja o status do projeto em **Supabase → Settings → Infrastructure**. Se seguir
degradado, é aí que está o ganho real — não no código.

---

## Ainda em aberto (decidir depois)

- O domínio continua `assessoriagreenlab.com.br`. Trocar envolve DNS, o endereço
  nos e-mails e o `APP_URL` na Vercel — trabalho à parte.
- O projeto Supabase continua sem backup automático.
- O `ADMIN_SECRET` antigo nas variáveis da Vercel não é mais usado e pode sair.
- A logo tem só a versão de 256px. Se for usar em material impresso ou redes,
  guarde o arquivo original em alta à parte.
