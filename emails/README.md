# E-mails da Delta Soluções

Os e-mails que o cliente recebe (convite, confirmação, recuperação de senha)
são disparados pelo **Supabase Auth**, não por este código. Por isso eles
chegavam com o visual padrão, sem estilo nenhum.

Estes quatro arquivos substituem aquele padrão.

## Onde colar

Supabase → projeto `dckvprqsecaxaooppqfp` → **Authentication → Emails →
Templates**. Para cada aba, cole o conteúdo do arquivo no campo *Message body*
e ajuste o *Subject*:

| Aba no Supabase       | Arquivo                | Assunto sugerido              |
|-----------------------|------------------------|-------------------------------|
| Invite user           | `convite.html`         | Seu acesso à Delta Soluções   |
| Confirm signup        | `confirmacao.html`     | Confirme seu e-mail           |
| Reset password        | `recuperar-senha.html` | Redefinir sua senha           |
| Magic Link            | `link-magico.html`     | Seu link de acesso            |

O que o sistema usa hoje de verdade é o **Invite user** (`api/invite-user.js`
chama `inviteUserByEmail`). Os outros três valem a pena mesmo assim: evitam
que alguém caia num e-mail feio ao pedir "esqueci minha senha".

## Decisões de construção

- **Layout em tabelas e CSS em linha.** Cliente de e-mail não é navegador:
  Outlook ignora boa parte do CSS moderno e Gmail corta o que estiver em
  `<style>`. Tabela com atributo inline é o que funciona em todos.
- **Botão com VML.** O bloco `<!--[if mso]>` faz o Outlook desenhar o botão
  arredondado; sem ele o Outlook mostraria um retângulo quadrado e cinza.
- **Link de reserva embaixo.** Alguns clientes corporativos reescrevem ou
  bloqueiam o botão. O endereço em texto garante que a pessoa consiga entrar.
- **Texto de prévia escondido** no topo: é o trecho que o Gmail mostra na
  lista de mensagens, antes de abrir.
- **A logo é carregada por URL absoluta**
  (`https://ferramentas.assessoriagreenlab.com.br/logo-delta.png`).
  Se o domínio mudar, atualizar nos quatro arquivos, senão a marca some.
- **Fundo escuro.** Combina com a plataforma. Alguns clientes com "modo claro
  forçado" podem clarear o cartão; o texto continua legível porque o contraste
  foi escolhido para os dois casos.

## Variável do Supabase

`{{ .ConfirmationURL }}` é substituída pelo Supabase na hora do envio.
**Não trocar por um link fixo** — sem ela o e-mail não leva a lugar nenhum.
