# Referências Criativos

Acervo de criativos de referência com roteiro pronto pra gravar, organizado em três níveis:
**procedimento → formato → criativo**. No ar em https://referencias-criativos.vercel.app

## Estrutura da pasta

```
referencias-criativos/
├── index.html · procedimento.html · formato.html · criativo.html   as quatro telas
├── criativos.json          fonte de dados única do site
├── assets/                 style.css, os módulos JS e os logos
├── _entrada/               caixa de entrada: solte vídeos novos aqui, sem organizar
├── videos/<procedimento>/<formato>/    onde entram os MP4 que forem hospedados
├── capas/                  imagens de capa dos criativos (opcional)
├── fonte/                  material de trabalho, NÃO vai pro site (veja fonte/LEIA-ME.md)
├── scripts/                gerar-estrutura.py e escanear.mjs
├── tests/                  35 testes, rodam com npm test
└── docs/superpowers/       o spec e o plano de implementação
```

## Os três níveis

- **Procedimento** — o que a clínica vende: full face, preenchimento labial, toxina, corporal, capilar.
- **Formato** — o tipo de vídeo: reação de cliente, antes e depois, bastidor, educacional,
  autoridade, quebra de objeção, prova social, convite direto, análise de caso, alerta,
  jornada da paciente.
- **Criativo** — a referência com gancho, desenvolvimento, CTA e ficha técnica.

## Como entra material novo

**Vídeo seu, do jeito fácil:** jogue o MP4 em `_entrada/` e me chame. Não precisa nomear,
separar nem dizer o que é. O Claude assiste, descobre o procedimento e o formato, leva pra
pasta certa, escreve o roteiro e mostra pra você conferir antes de publicar.

**Vídeo seu, já classificado:** se você já sabe onde ele entra, solte direto em
`videos/<procedimento>/<formato>/`. Pula a etapa de classificação.

**Anúncio da Biblioteca do Meta:** o Claude busca, filtra pelos que estão no ar há mais
tempo, baixa para `fonte/`, assiste e cadastra com o link do anúncio original.

**Post do Instagram:** cole o link no chat.

## Comandos

```bash
npm test                              # 35 testes
npm run escanear                      # compara videos/ com o criativos.json
python3 scripts/gerar-estrutura.py    # recria procedimentos e formatos (apaga os criativos)
python3 fonte/organizar.py            # espelha as pastas de trabalho pelo criativos.json
python3 fonte/indice.py               # reescreve fonte/INDICE.md
python3 -m http.server 4188           # roda local
npx vercel --prod                     # publica
```
