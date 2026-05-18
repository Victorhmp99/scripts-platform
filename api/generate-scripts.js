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
  return `Você é um especialista em scripts de vendas para o mercado brasileiro. Crie scripts de vendas COMPLETOS e PERSONALIZADOS para esta empresa:

EMPRESA:
- Nome: ${c.name}
- Setor: ${c.industry}
- Serviços/Produtos: ${c.services}
- Público-alvo: ${c.target_audience}
- Dores que resolve: ${c.pain_points || 'não informado'}
- Proposta de valor: ${c.value_prop || 'não informado'}
- Processo de vendas: ${c.sales_process || 'não informado'}

REGRAS IMPORTANTES:
1. Leia o processo de vendas da empresa com atenção — ele define QUAIS etapas existem
2. Só crie scripts para etapas que realmente existem no processo desta empresa
3. NÃO invente etapas que não foram mencionadas (ex: se não há reunião, não crie scripts de confirmação, lembrete ou no-show)
4. Adapte os nomes das etapas ao vocabulário desta empresa e setor
5. Cada etapa deve ter 5 variantes de script (abordagens distintas, não apenas paráfrases)
6. Scripts de WhatsApp: curtos, naturais, sem formalidade excessiva
7. Scripts de ligação: fluidos, como conversa real
8. Use {nome} para nome do prospect, {empresa} para empresa deles
9. Todo texto em português brasileiro

ETAPAS UNIVERSAIS (sempre inclua, adaptando ao contexto):
- primeiro-contato: primeira mensagem/abordagem ao prospect
- agradecimento: mensagem após primeiro contato positivo
- fu-msg: follow-up por mensagem quando não respondeu
- fu-ligacao: script de ligação para retomar contato
- fu-nao-fechou: follow-up para quem participou mas não fechou

ETAPAS CONDICIONAIS (inclua SOMENTE se existem no processo desta empresa):
- confirmacao: se agendam reuniões/demos/visitas
- lembrete: se agendam reuniões/demos/visitas
- fu-noshow: se agendam reuniões e prospect pode não aparecer
- fechamento: se há etapa formal de fechamento/onboarding
- secretaria: se fazem prospecção por ligação cold call para empresas com recepcionista
- decisor-direto: se ligam diretamente para o decisor
- pos-contato-barreira: se passam por porteiro/secretária antes do decisor
- pos-proposta: se enviam proposta/orçamento/PDF
- pos-reuniao: se têm reunião/apresentação antes do fechamento
- inbound-form: se recebem leads por formulário/anúncio
- lead-interessado: se têm leads que demonstraram interesse mas não avançaram

Você também pode criar etapas CUSTOMIZADAS com chaves únicas se o processo da empresa tiver etapas específicas que não se encaixam nas acima. Use chaves em kebab-case (ex: "visita-tecnica", "demonstracao-produto", "trial-ativo").

Retorne SOMENTE JSON válido com esta estrutura:

{
  "structure": [
    {
      "tab_id": "id-unico-da-aba",
      "tab_label": "Nome da Aba",
      "sections": [
        {"key": "chave-da-etapa", "label": "Nome da Etapa", "desc": "Quando usar este script"}
      ]
    }
  ],
  "scripts": {
    "chave-da-etapa": {
      "0": "Script completo variante 1...",
      "1": "Script completo variante 2...",
      "2": "Script completo variante 3...",
      "3": "Script completo variante 4...",
      "4": "Script completo variante 5..."
    }
  },
  "qual": [
    {"num": "Abertura", "q": "Texto completo da abertura de qualificação..."},
    {"num": "Q1 - [tema]", "q": "Pergunta completa..."},
    {"num": "Q2 - [tema]", "q": "Pergunta completa..."},
    {"num": "Q3 - [tema]", "q": "Pergunta completa..."},
    {"num": "Q4 - [tema]", "q": "Pergunta completa..."},
    {"num": "Q5 - [tema]", "q": "Pergunta completa..."},
    {"num": "Transição", "q": "Texto completo da transição para próximo passo..."}
  ],
  "aq": [
    {"d": 1, "tag": "Tipo: Subtipo", "t": "Mensagem completa do dia 1..."},
    {"d": 2, "tag": "Tipo: Subtipo", "t": "Mensagem completa do dia 2..."},
    ...até dia 30
  ]
}

Para a estrutura de abas (structure), organize as etapas em grupos lógicos que façam sentido para esta empresa. Exemplos de agrupamentos:
- "Prospecção" ou "Primeiro Contato"
- "Negociação" ou "Avanço"
- "Follow Up"
- Qualquer agrupamento que faça sentido para o processo desta empresa

Os scripts de qualificação devem ter perguntas específicas para descobrir as dores e qualificar prospects desta empresa, não genéricas.

Os 30 dias de aquecimento devem usar gatilhos relevantes para o setor de ${c.industry}, com mensagens específicas para o público-alvo "${c.target_audience}".

LEMBRE: Gere scripts REAIS e COMPLETOS — o texto final que o vendedor vai usar, não descrições do que deveria ser escrito.`;
}
