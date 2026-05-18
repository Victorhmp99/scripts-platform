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
            content: 'Você é um especialista em scripts de vendas B2B para o mercado brasileiro. Responda APENAS com JSON válido, sem texto adicional, sem markdown, sem explicações.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 8000,
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

    if (!text) {
      return res.status(500).json({ error: 'Resposta vazia da IA' });
    }

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
  return `Você é um especialista em scripts de vendas B2B para o mercado brasileiro. Sua tarefa é criar um conjunto completo de scripts de vendas personalizados para a empresa abaixo.

EMPRESA:
- Nome: ${c.name}
- Setor: ${c.industry}
- Serviços/Produtos: ${c.services}
- Público-alvo: ${c.target_audience}
- Principais problemas que resolve: ${c.pain_points}
- Proposta de valor: ${c.value_prop}
- Processo de vendas: ${c.sales_process || 'Prospecção ativa via WhatsApp/telefone, reunião de diagnóstico, proposta e fechamento'}

INSTRUÇÕES:
- Todos os scripts devem ser em português brasileiro
- Tom: profissional mas acessível, direto e sem enrolação
- Scripts de WhatsApp: curtos (máx 3 parágrafos), naturais, sem formalidade excessiva
- Scripts de ligação: fluidos, como uma conversa real
- Use {nome} para o nome do prospect e {empresa} para o nome da empresa deles
- Cada categoria deve ter exatamente 5 variantes diferentes (abordagens distintas, não apenas paráfrases)
- Os scripts de aquecimento (30 dias) devem abordar diferentes gatilhos psicológicos

Retorne SOMENTE um JSON válido com a estrutura abaixo, sem texto adicional, sem markdown:

{
  "scripts": {
    "primeiro-contato": {
      "0": "Script de primeiro contato variante 1 - mensagem fria inicial via WhatsApp apresentando a empresa e gerando curiosidade",
      "1": "Variante 2 - abordagem diferente",
      "2": "Variante 3",
      "3": "Variante 4",
      "4": "Variante 5"
    },
    "agradecimento": {
      "0": "Script de agradecimento após primeira ligação/contato com o decisor",
      "1": "Variante 2", "2": "Variante 3", "3": "Variante 4", "4": "Variante 5"
    },
    "confirmacao": {
      "0": "Script confirmando reunião/demo agendada (data, hora, formato, o que vão ver)",
      "1": "Variante 2", "2": "Variante 3", "3": "Variante 4", "4": "Variante 5"
    },
    "lembrete": {
      "0": "Script de lembrete da reunião, enviado 1-2h antes",
      "1": "Variante 2", "2": "Variante 3", "3": "Variante 4", "4": "Variante 5"
    },
    "fechamento": {
      "0": "Mensagem de boas-vindas pós-venda, após assinar contrato/pagar",
      "1": "Variante 2", "2": "Variante 3", "3": "Variante 4", "4": "Variante 5"
    },
    "secretaria": {
      "0": "Script para quando a secretária/recepcionista atende a ligação — objetivo: ser transferido ao decisor",
      "1": "Variante 2", "2": "Variante 3", "3": "Variante 4", "4": "Variante 5"
    },
    "doutor-direto": {
      "0": "Script para quando o decisor atende direto — pitch rápido, gerar interesse, agendar reunião",
      "1": "Variante 2", "2": "Variante 3", "3": "Variante 4", "4": "Variante 5"
    },
    "pos-secretaria": {
      "0": "Mensagem WhatsApp após passar pela secretária, antes de falar com o decisor",
      "1": "Variante 2", "2": "Variante 3", "3": "Variante 4", "4": "Variante 5"
    },
    "pos-pdf": {
      "0": "Follow-up após enviar proposta/material — verificar se recebeu e gerar próximo passo",
      "1": "Variante 2", "2": "Variante 3", "3": "Variante 4", "4": "Variante 5"
    },
    "pos-doutor": {
      "0": "Mensagem após reunião com decisor — resumo, próximos passos, manter momentum",
      "1": "Variante 2", "2": "Variante 3", "3": "Variante 4", "4": "Variante 5"
    },
    "formulario": {
      "0": "Primeiro contato com lead inbound que preencheu formulário — resposta rápida e qualificação",
      "1": "Variante 2", "2": "Variante 3", "3": "Variante 4", "4": "Variante 5"
    },
    "interessado": {
      "0": "Script para lead que demonstrou interesse mas não agendou ainda — empurrar para próximo passo",
      "1": "Variante 2", "2": "Variante 3", "3": "Variante 4", "4": "Variante 5"
    },
    "fu-msg": {
      "0": "Follow-up via mensagem para lead que não respondeu (1-3 dias sem resposta)",
      "1": "Variante 2", "2": "Variante 3", "3": "Variante 4", "4": "Variante 5"
    },
    "fu-ligacao": {
      "0": "Script de ligação de follow-up para retomar contato com lead parado",
      "1": "Variante 2", "2": "Variante 3", "3": "Variante 4", "4": "Variante 5"
    },
    "fu-noshow": {
      "0": "Mensagem para lead que não apareceu na reunião agendada — reagendar sem soar chateado",
      "1": "Variante 2", "2": "Variante 3", "3": "Variante 4", "4": "Variante 5"
    },
    "fu-nao-fechou": {
      "0": "Mensagem para lead que participou da reunião mas não fechou — reacender interesse sem pressão",
      "1": "Variante 2", "2": "Variante 3", "3": "Variante 4", "4": "Variante 5"
    }
  },
  "qual": [
    { "num": "Abertura", "q": "Frase de abertura para qualificação — quebra-gelo e contexto da conversa" },
    { "num": "Q1 - Diagnóstico", "q": "Pergunta sobre a situação atual da empresa" },
    { "num": "Q2 - Dor Principal", "q": "Pergunta para identificar o maior problema/dor" },
    { "num": "Q3 - Impacto", "q": "Pergunta sobre o impacto financeiro/operacional do problema" },
    { "num": "Q4 - Tentativas", "q": "O que já tentaram para resolver? Por que não funcionou?" },
    { "num": "Q5 - Prioridade", "q": "Qual a urgência? Por que resolver agora?" },
    { "num": "Q6 - Decisão", "q": "Quem mais está envolvido na decisão?" },
    { "num": "Q7 - Visão", "q": "Como seria a situação ideal daqui a 6 meses?" },
    { "num": "Transição", "q": "Frase para transicionar para a apresentação da solução e agendar próximo passo" }
  ],
  "aq": [
    { "d": 1, "tag": "Dor: Problema atual", "t": "Mensagem dia 1 — abordar a principal dor do segmento de forma empática" },
    { "d": 2, "tag": "Curiosidade: Dado de mercado", "t": "Mensagem dia 2 — compartilhar dado/estatística relevante do setor que gera curiosidade" },
    { "d": 3, "tag": "Dor: Consequência", "t": "Mensagem dia 3 — explorar o que acontece se o problema não for resolvido" },
    { "d": 4, "tag": "Prova Social: Case", "t": "Mensagem dia 4 — case de sucesso (genérico/anônimo) de cliente do segmento" },
    { "d": 5, "tag": "Curiosidade: Pergunta", "t": "Mensagem dia 5 — pergunta instigante que faz o prospect pensar no problema" },
    { "d": 6, "tag": "Urgência: Mercado", "t": "Mensagem dia 6 — tendência de mercado que cria senso de urgência" },
    { "d": 7, "tag": "Dor: Rotina", "t": "Mensagem dia 7 — abordar problemas do dia a dia operacional" },
    { "d": 8, "tag": "Valor: ROI", "t": "Mensagem dia 8 — mostrar retorno financeiro possível com a solução" },
    { "d": 9, "tag": "Prova Social: Número", "t": "Mensagem dia 9 — resultado numérico alcançado por clientes" },
    { "d": 10, "tag": "Escassez: Vagas", "t": "Mensagem dia 10 — limitação de vagas/capacidade de atendimento" },
    { "d": 11, "tag": "Curiosidade: Comparação", "t": "Mensagem dia 11 — comparar situação antes e depois da solução" },
    { "d": 12, "tag": "Dor: Concorrência", "t": "Mensagem dia 12 — o que os concorrentes do prospect estão fazendo" },
    { "d": 13, "tag": "Autoridade: Especialidade", "t": "Mensagem dia 13 — posicionar-se como especialista no setor" },
    { "d": 14, "tag": "Prova Social: Depoimento", "t": "Mensagem dia 14 — depoimento fictício (mas realista) de cliente satisfeito" },
    { "d": 15, "tag": "Urgência: Tempo", "t": "Mensagem dia 15 — urgência baseada em prazo ou evento" },
    { "d": 16, "tag": "Curiosidade: Bastidor", "t": "Mensagem dia 16 — revelar algo dos bastidores da solução" },
    { "d": 17, "tag": "Dor: Tempo Perdido", "t": "Mensagem dia 17 — problema de tempo e energia desperdiçados" },
    { "d": 18, "tag": "Valor: Diferencial", "t": "Mensagem dia 18 — diferencial único que a concorrência não oferece" },
    { "d": 19, "tag": "Prova Social: Volume", "t": "Mensagem dia 19 — número de clientes/empresas que já usam a solução" },
    { "d": 20, "tag": "Escassez: Período", "t": "Mensagem dia 20 — condição especial por tempo limitado" },
    { "d": 21, "tag": "Curiosidade: Diagnóstico", "t": "Mensagem dia 21 — oferecer diagnóstico gratuito como isca" },
    { "d": 22, "tag": "Dor: Meta não atingida", "t": "Mensagem dia 22 — problema de não atingir metas e objetivos" },
    { "d": 23, "tag": "Autoridade: Mídia", "t": "Mensagem dia 23 — menção em mídia, prêmio ou reconhecimento" },
    { "d": 24, "tag": "Prova Social: Segmento", "t": "Mensagem dia 24 — cases específicos do segmento do prospect" },
    { "d": 25, "tag": "Urgência: Decisão", "t": "Mensagem dia 25 — custo de adiar a decisão" },
    { "d": 26, "tag": "Curiosidade: Erro comum", "t": "Mensagem dia 26 — erro mais comum que empresas do setor cometem" },
    { "d": 27, "tag": "Valor: Resultado Rápido", "t": "Mensagem dia 27 — resultado que pode ser visto em curto prazo" },
    { "d": 28, "tag": "Dor: Frustração", "t": "Mensagem dia 28 — frustração de ver oportunidades sendo perdidas" },
    { "d": 29, "tag": "Prova Social: Transformação", "t": "Mensagem dia 29 — transformação completa antes/depois de um cliente" },
    { "d": 30, "tag": "CTA Direto: Decisão", "t": "Mensagem dia 30 — chamada direta para ação, proposta de conversa final" }
  ]
}

IMPORTANTE: Gere scripts COMPLETOS e REAIS, não apenas descrições. Cada script deve ser o texto final que o vendedor vai enviar/falar, personalizado para ${c.name} no setor de ${c.industry}. Use os dados da empresa para tornar cada script específico e relevante.`;
}
