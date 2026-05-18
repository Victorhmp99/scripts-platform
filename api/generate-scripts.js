// Proxy seguro para Groq API — chave nunca exposta ao cliente

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const { company } = req.body;
  if (!company?.name) {
    return res.status(400).json({ error: 'Dados da empresa incompletos' });
  }

  const prompt = buildPrompt(company);

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em copywriting e vendas consultivas para o mercado brasileiro. Responda APENAS com JSON válido, sem texto adicional, sem markdown, sem explicações.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.8,
        max_tokens: 32000,
        response_format: { type: 'json_object' }
      })
    });

    if (!groqRes.ok) {
      const err = await groqRes.text();
      console.error('Groq error:', err);
      let errMsg = 'Erro na geração de scripts';
      try { errMsg = JSON.parse(err)?.error?.message || errMsg; } catch {}
      return res.status(500).json({ error: errMsg });
    }

    const data = await groqRes.json();
    const text = data.choices?.[0]?.message?.content;

    if (!text) return res.status(500).json({ error: 'Resposta vazia da IA' });

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      const match = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(match?.[1] || match?.[0] || text);
    }

    return res.status(200).json({ data: parsed });
  } catch (err) {
    console.error('Erro generate-scripts:', err);
    return res.status(500).json({ error: 'Erro interno: ' + err.message });
  }
}

function buildPrompt(c) {
  return `Você é um especialista em copywriting e vendas consultivas. Sua tarefa é criar uma central de scripts de vendas 100% personalizada para a empresa abaixo.

DADOS DA EMPRESA:
- Nome da empresa: ${c.name}
- Nome do vendedor: ${c.seller_name || 'o vendedor'}
- Setor/Nicho: ${c.industry}
- Segmento: ${c.segment || 'Outros'}
- O que vende: ${c.services}
- Cliente ideal: ${c.target_audience}
- Dores que resolve: ${c.pain_points || 'não informado'}
- Proposta de valor: ${c.value_prop || 'não informado'}
- Processo de vendas: ${c.sales_process || 'não informado'}
- Tom de voz: ${c.tone || 'Direto e humano'}

SEGMENTOS E COMO INTERPRETAR:
Negócio Local → cliente chega fisicamente ou agenda presencialmente. Use o nicho para entender se é consulta, visita, horário ou outro formato.
E-commerce → venda online sem contato humano direto. Foco em carrinho abandonado, recompra e reativação. Sem scripts de reunião.
Serviço Online → atendimento remoto. Foco em qualificação, agendamento de call ou reunião online e pós-atendimento.
B2B / Empresas → venda para outras empresas. Foco em prospecção ativa, reunião comercial e proposta. Ciclo longo.
Agência / Consultoria → venda de serviço intelectual. Foco em diagnóstico, reunião de apresentação e proposta de valor.
Outros → leia o processo de vendas e defina o esqueleto adequado.

REGRAS OBRIGATÓRIAS:
- Nunca use "Espero que esteja bem" ou "Venho por meio deste"
- Tom direto e humano — como o vendedor realmente fala
- WhatsApp: máximo 5 linhas
- E-mail: pode ser mais longo mas sem enrolação, sempre com assunto
- Ligação: deve soar natural
- Sempre termine com CTA claro
- Use {nome} para nome do prospect, {empresa} para empresa do prospect
- No aquecimento nunca repita o mesmo gatilho em dias consecutivos
- Use as dores informadas nos follow ups, recuperação e aquecimento
- Adapte tudo ao processo de vendas descrito

---

PASSO 1: Analise o processo de vendas e identifique as etapas específicas além das obrigatórias (ex: qualificação, agendamento de reunião/consulta/demo/visita, pós-reunião, envio de proposta, etc). Essas viram guias dinâmicas.

PASSO 2: Gere os scripts obrigatórios (todos os segmentos):

DIA A DIA — 5 variações para cada:
- primeiro-contato: primeira abordagem via WhatsApp
- agradecimento-ligacao: agradecimento após ligação
- confirmacao: confirmação do próximo passo (adapte: reunião, consulta, visita, call, demo)
- lembrete: lembrete antes do compromisso
- pos-fechamento: boas-vindas após fechar

FOLLOW UP WHATSAPP — 5 variações com gatilhos diferentes (curiosidade, escassez, dor, oportunidade, prova social). Use as dores específicas do cliente ideal.

FOLLOW UP LIGAÇÃO — 5 variações de mensagem pós tentativa de ligação sem resposta.

FOLLOW UP EMAIL — 5 variações com assunto e corpo. Formato: "**Assunto:** Título\\n\\n**Corpo:**\\nTexto do email"

AGRADECIMENTO — 5 variações para cada sub-tipo:
- agradecimento-ligacao: após ligação
- agradecimento-reuniao: após reunião/consulta/call (adapte ao processo)
- agradecimento-indicacao: por indicação

RECUPERAÇÃO — 5 variações:
- Variação 1: Retomar conexão sem pressão
- Variação 2: Gatilho de urgência
- Variação 3: Nova condição ou benefício
- Variação 4: Provocar a dor novamente
- Variação 5: Case ou prova social similar

AQUECIMENTO 30 DIAS — 30 mensagens, uma por dia. Use dores específicas do cliente ideal. Siga exatamente esta ordem:
Dia 1: Conexão | Dia 2: Dor principal | Dia 3: Escassez | Dia 4: Dor secundária | Dia 5: Oportunidade | Dia 6: Dor interna | Dia 7: Case sem nome | Dia 8: Resultado não alcançado | Dia 9: Urgência de mercado | Dia 10: Dor pessoal/tempo | Dia 11: Escassez vagas | Dia 12: Prova social | Dia 13: Dor previsibilidade | Dia 14: Curiosidade | Dia 15: Escassez local | Dia 16: Dor conversão | Dia 17: Timing | Dia 18: Case com resultado | Dia 19: Posicionamento | Dia 20: Urgência decisão | Dia 21: Diagnóstico | Dia 22: Escassez região | Dia 23: Dor operacional | Dia 24: Referência | Dia 25: Oportunidade mercado | Dia 26: Qualidade de vida | Dia 27: Urgência concorrência | Dia 28: Bloqueio | Dia 29: Transformação | Dia 30: Decisão final

PASSO 3: Gere scripts das etapas específicas do processo (identificadas no Passo 1). 5 variações cada. Exemplos possíveis dependendo do contexto: qualificação, agendamento, pós-consulta, pós-visita, envio de proposta, follow-up de proposta, negociação, carrinho abandonado, recompra.

---

Retorne APENAS JSON válido nesta estrutura exata:

{
  "__structure": [
    {
      "tab_id": "dia-a-dia",
      "tab_label": "Dia a Dia",
      "sections": [
        {"key": "primeiro-contato", "label": "Primeiro Contato", "desc": "Primeira abordagem ao prospect"},
        {"key": "agradecimento-ligacao", "label": "Agradecimento por Ligação", "desc": "Após ligação positiva"},
        {"key": "confirmacao", "label": "Confirmação", "desc": "Confirmar próximo passo"},
        {"key": "lembrete", "label": "Lembrete", "desc": "Antes do compromisso"},
        {"key": "pos-fechamento", "label": "Pós-Fechamento", "desc": "Boas-vindas ao novo cliente"}
      ]
    },
    {
      "tab_id": "followup",
      "tab_label": "Follow Up",
      "sections": [
        {"key": "fu-whatsapp", "label": "WhatsApp", "desc": "Follow-up por mensagem"},
        {"key": "fu-ligacao", "label": "Ligação", "desc": "Após tentativa de ligação"},
        {"key": "fu-email", "label": "E-mail", "desc": "Follow-up por e-mail"}
      ]
    },
    {
      "tab_id": "recuperacao",
      "tab_label": "Recuperação",
      "sections": [
        {"key": "recuperacao", "label": "Não Fechou", "desc": "Reativar lead que não comprou"}
      ]
    }
    // Adicione aqui as abas dinâmicas do Passo 3 conforme o processo
  ],
  "primeiro-contato": {"0": "script...", "1": "script...", "2": "script...", "3": "script...", "4": "script..."},
  "agradecimento-ligacao": {"0": "...", "1": "...", "2": "...", "3": "...", "4": "..."},
  "confirmacao": {"0": "...", "1": "...", "2": "...", "3": "...", "4": "..."},
  "lembrete": {"0": "...", "1": "...", "2": "...", "3": "...", "4": "..."},
  "pos-fechamento": {"0": "...", "1": "...", "2": "...", "3": "...", "4": "..."},
  "fu-whatsapp": {"0": "...", "1": "...", "2": "...", "3": "...", "4": "..."},
  "fu-ligacao": {"0": "...", "1": "...", "2": "...", "3": "...", "4": "..."},
  "fu-email": {"0": "**Assunto:** Título\\n\\n**Corpo:**\\nTexto...", "1": "...", "2": "...", "3": "...", "4": "..."},
  "agradecimento-reuniao": {"0": "...", "1": "...", "2": "...", "3": "...", "4": "..."},
  "agradecimento-indicacao": {"0": "...", "1": "...", "2": "...", "3": "...", "4": "..."},
  "recuperacao": {"0": "...", "1": "...", "2": "...", "3": "...", "4": "..."},
  "qual": [
    {"num": "Abertura", "q": "texto..."},
    {"num": "Q1 - Diagnóstico", "q": "pergunta..."},
    {"num": "Q2 - Dor Principal", "q": "pergunta..."},
    {"num": "Q3 - Impacto", "q": "pergunta..."},
    {"num": "Q4 - Tentativas", "q": "pergunta..."},
    {"num": "Q5 - Urgência", "q": "pergunta..."},
    {"num": "Transição", "q": "texto de transição..."}
  ],
  "aq": [
    {"d": 1, "tag": "Conexão", "t": "mensagem dia 1..."},
    {"d": 2, "tag": "Dor: Principal", "t": "mensagem dia 2..."},
    {"d": 3, "tag": "Escassez", "t": "mensagem dia 3..."},
    {"d": 4, "tag": "Dor: Secundária", "t": "mensagem dia 4..."},
    {"d": 5, "tag": "Oportunidade", "t": "mensagem dia 5..."},
    {"d": 6, "tag": "Dor: Interna", "t": "mensagem dia 6..."},
    {"d": 7, "tag": "Case: Anônimo", "t": "mensagem dia 7..."},
    {"d": 8, "tag": "Dor: Resultado", "t": "mensagem dia 8..."},
    {"d": 9, "tag": "Urgência: Mercado", "t": "mensagem dia 9..."},
    {"d": 10, "tag": "Dor: Pessoal", "t": "mensagem dia 10..."},
    {"d": 11, "tag": "Escassez: Vagas", "t": "mensagem dia 11..."},
    {"d": 12, "tag": "Prova Social", "t": "mensagem dia 12..."},
    {"d": 13, "tag": "Dor: Previsibilidade", "t": "mensagem dia 13..."},
    {"d": 14, "tag": "Curiosidade", "t": "mensagem dia 14..."},
    {"d": 15, "tag": "Escassez: Local", "t": "mensagem dia 15..."},
    {"d": 16, "tag": "Dor: Conversão", "t": "mensagem dia 16..."},
    {"d": 17, "tag": "Timing", "t": "mensagem dia 17..."},
    {"d": 18, "tag": "Case: Resultado", "t": "mensagem dia 18..."},
    {"d": 19, "tag": "Posicionamento", "t": "mensagem dia 19..."},
    {"d": 20, "tag": "Urgência: Decisão", "t": "mensagem dia 20..."},
    {"d": 21, "tag": "Curiosidade: Diagnóstico", "t": "mensagem dia 21..."},
    {"d": 22, "tag": "Escassez: Região", "t": "mensagem dia 22..."},
    {"d": 23, "tag": "Dor: Operacional", "t": "mensagem dia 23..."},
    {"d": 24, "tag": "Prova Social: Referência", "t": "mensagem dia 24..."},
    {"d": 25, "tag": "Oportunidade: Mercado", "t": "mensagem dia 25..."},
    {"d": 26, "tag": "Dor: Qualidade de Vida", "t": "mensagem dia 26..."},
    {"d": 27, "tag": "Urgência: Concorrência", "t": "mensagem dia 27..."},
    {"d": 28, "tag": "Bloqueio", "t": "mensagem dia 28..."},
    {"d": 29, "tag": "Case: Transformação", "t": "mensagem dia 29..."},
    {"d": 30, "tag": "Decisão Final", "t": "mensagem dia 30..."}
  ]
}`;
}
