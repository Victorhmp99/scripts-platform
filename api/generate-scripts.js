// Gera scripts completos via Gemini 2.5 Flash — chamada única

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const { company } = req.body;
  if (!company?.name) return res.status(400).json({ error: 'Dados da empresa incompletos' });

  const prompt = buildPrompt(company);

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 16384,
            responseMimeType: 'application/json',
            thinkingConfig: { thinkingBudget: 0 }
          }
        })
      }
    );

    if (!geminiRes.ok) {
      const err = await geminiRes.text();
      console.error('Gemini error:', err);
      let msg = 'Erro na geração de scripts';
      try { msg = JSON.parse(err)?.error?.message || msg; } catch {}
      return res.status(500).json({ error: msg });
    }

    const data = await geminiRes.json();

    // Gemini 2.5 pode ter thinking tokens em parts[0] — pega a última parte com texto
    const parts = data.candidates?.[0]?.content?.parts || [];
    const text = parts.filter(p => p.text).map(p => p.text).pop();
    if (!text) {
      console.error('Gemini sem texto:', JSON.stringify(data).substring(0, 500));
      return res.status(500).json({ error: 'Resposta vazia do Gemini' });
    }

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      const m = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/s);
      try { parsed = JSON.parse(m?.[1] || m?.[0] || text); }
      catch(e2) {
        console.error('Parse error. Texto recebido:', text.substring(0, 500));
        return res.status(500).json({ error: 'Erro ao interpretar resposta da IA' });
      }
    }

    return res.status(200).json({ data: parsed });
  } catch (err) {
    console.error('Erro generate-scripts:', err);
    return res.status(500).json({ error: 'Erro interno: ' + err.message });
  }
}

function buildPrompt(c) {
  return `Você é um especialista em copywriting e vendas consultivas. Crie scripts de vendas 100% personalizados para:

Empresa: ${c.name} | Vendedor: ${c.seller_name || 'o vendedor'} | Nicho: ${c.industry} | Segmento: ${c.segment || 'Outros'}
Vende: ${c.services} | Cliente ideal: ${c.target_audience}
Dores: ${c.pain_points || 'não informado'} | Proposta de valor: ${c.value_prop || 'não informado'}
Processo de vendas: ${c.sales_process || 'não informado'} | Tom de voz: ${c.tone || 'Direto e humano'}

SEGMENTO ${c.segment || 'Outros'}: ${getSegmentHint(c.segment)}

REGRAS OBRIGATÓRIAS:
- Zero clichês ("espero que esteja bem" é proibido)
- Tom direto como o vendedor realmente fala
- WhatsApp: máx 5 linhas, sempre com CTA
- E-mail: inclua "Assunto: X" na primeira linha
- Use {nome} para prospect, {empresa} para empresa do prospect
- Personalize TUDO para o nicho e dores informadas
- Scripts REAIS e COMPLETOS — não descrições

ANALISE o processo de vendas e defina quais guias dinâmicas são relevantes além das obrigatórias.

GERE 5 variações para cada seção:

OBRIGATÓRIAS (todas as empresas):
- primeiro-contato: primeira abordagem WhatsApp
- agradecimento-ligacao: após ligação positiva
- confirmacao: adapte ao processo (reunião/consulta/visita/call/demo)
- lembrete: antes do compromisso
- pos-fechamento: boas-vindas ao novo cliente
- fu-whatsapp: 5 variações com gatilhos diferentes (curiosidade/escassez/dor/oportunidade/prova-social) usando as dores específicas
- fu-ligacao: mensagem após tentativa de ligação sem resposta
- fu-email: com assunto — "Assunto: X\\n\\nCorpo: Y"
- agradecimento-reuniao: após reunião/consulta/call (adapte)
- agradecimento-indicacao: por indicação recebida
- recuperacao: 5 abordagens (sem-pressão/urgência/novo-benefício/provocar-dor/prova-social)

AQUECIMENTO 30 DIAS — mensagens com as dores ESPECÍFICAS do cliente ideal, nunca repita gatilho consecutivo:
D1:Conexão D2:Dor-principal D3:Escassez D4:Dor-secundária D5:Oportunidade D6:Dor-interna D7:Case-anônimo D8:Resultado-não-alcançado D9:Urgência-mercado D10:Dor-pessoal D11:Escassez-vagas D12:Prova-social D13:Dor-previsibilidade D14:Curiosidade D15:Escassez-local D16:Dor-conversão D17:Timing D18:Case-resultado D19:Posicionamento D20:Urgência-decisão D21:Diagnóstico D22:Escassez-região D23:Dor-operacional D24:Referência D25:Oportunidade-mercado D26:Qualidade-vida D27:Urgência-concorrência D28:Bloqueio D29:Transformação D30:Decisão-final

QUALIFICAÇÃO: abertura + 5-7 perguntas específicas para o nicho + transição

GUIAS DINÂMICAS: baseado no processo de vendas, adicione seções adicionais relevantes (ex: qualificação, agendamento, pós-proposta, negociação, carrinho abandonado para e-commerce, etc). Não crie o que não faz sentido.

Retorne JSON com esta estrutura:
{
  "__structure": [
    {"tab_id":"dia-a-dia","tab_label":"Dia a Dia","sections":[
      {"key":"primeiro-contato","label":"Primeiro Contato","desc":"Primeira abordagem"},
      {"key":"agradecimento-ligacao","label":"Agradecimento Ligação","desc":"Após ligação"},
      {"key":"confirmacao","label":"Confirmação","desc":"Confirmar compromisso"},
      {"key":"lembrete","label":"Lembrete","desc":"Antes do compromisso"},
      {"key":"pos-fechamento","label":"Pós-Fechamento","desc":"Boas-vindas ao cliente"}
    ]},
    {"tab_id":"followup","tab_label":"Follow Up","sections":[
      {"key":"fu-whatsapp","label":"WhatsApp","desc":"Follow-up por mensagem"},
      {"key":"fu-ligacao","label":"Ligação","desc":"Após tentativa sem resposta"},
      {"key":"fu-email","label":"E-mail","desc":"Follow-up por e-mail"}
    ]},
    {"tab_id":"agradecimento","tab_label":"Agradecimento","sections":[
      {"key":"agradecimento-ligacao","label":"Por Ligação","desc":"Após ligação"},
      {"key":"agradecimento-reuniao","label":"Por Reunião","desc":"Após reunião"},
      {"key":"agradecimento-indicacao","label":"Por Indicação","desc":"Por indicação recebida"}
    ]},
    {"tab_id":"recuperacao","tab_label":"Recuperação","sections":[
      {"key":"recuperacao","label":"Não Fechou","desc":"Reativar lead"}
    ]}
    // + abas dinâmicas conforme o processo
  ],
  "primeiro-contato":{"0":"...","1":"...","2":"...","3":"...","4":"..."},
  "agradecimento-ligacao":{"0":"...","1":"...","2":"...","3":"...","4":"..."},
  "confirmacao":{"0":"...","1":"...","2":"...","3":"...","4":"..."},
  "lembrete":{"0":"...","1":"...","2":"...","3":"...","4":"..."},
  "pos-fechamento":{"0":"...","1":"...","2":"...","3":"...","4":"..."},
  "fu-whatsapp":{"0":"...","1":"...","2":"...","3":"...","4":"..."},
  "fu-ligacao":{"0":"...","1":"...","2":"...","3":"...","4":"..."},
  "fu-email":{"0":"Assunto: X\\n\\nCorpo: Y","1":"...","2":"...","3":"...","4":"..."},
  "agradecimento-reuniao":{"0":"...","1":"...","2":"...","3":"...","4":"..."},
  "agradecimento-indicacao":{"0":"...","1":"...","2":"...","3":"...","4":"..."},
  "recuperacao":{"0":"...","1":"...","2":"...","3":"...","4":"..."},
  "qual":[
    {"num":"Abertura","q":"..."},
    {"num":"Q1 - Diagnóstico","q":"..."},
    {"num":"Q2 - Dor Principal","q":"..."},
    {"num":"Q3 - Impacto","q":"..."},
    {"num":"Q4 - Urgência","q":"..."},
    {"num":"Q5 - Decisão","q":"..."},
    {"num":"Transição","q":"..."}
  ],
  "aq":[
    {"d":1,"tag":"Conexão","t":"mensagem completa..."},
    {"d":2,"tag":"Dor: Principal","t":"..."},
    {"d":3,"tag":"Escassez","t":"..."},
    {"d":4,"tag":"Dor: Secundária","t":"..."},
    {"d":5,"tag":"Oportunidade","t":"..."},
    {"d":6,"tag":"Dor: Interna","t":"..."},
    {"d":7,"tag":"Case: Anônimo","t":"..."},
    {"d":8,"tag":"Dor: Resultado","t":"..."},
    {"d":9,"tag":"Urgência: Mercado","t":"..."},
    {"d":10,"tag":"Dor: Pessoal","t":"..."},
    {"d":11,"tag":"Escassez: Vagas","t":"..."},
    {"d":12,"tag":"Prova Social","t":"..."},
    {"d":13,"tag":"Dor: Previsibilidade","t":"..."},
    {"d":14,"tag":"Curiosidade","t":"..."},
    {"d":15,"tag":"Escassez: Local","t":"..."},
    {"d":16,"tag":"Dor: Conversão","t":"..."},
    {"d":17,"tag":"Timing","t":"..."},
    {"d":18,"tag":"Case: Resultado","t":"..."},
    {"d":19,"tag":"Posicionamento","t":"..."},
    {"d":20,"tag":"Urgência: Decisão","t":"..."},
    {"d":21,"tag":"Diagnóstico","t":"..."},
    {"d":22,"tag":"Escassez: Região","t":"..."},
    {"d":23,"tag":"Dor: Operacional","t":"..."},
    {"d":24,"tag":"Referência","t":"..."},
    {"d":25,"tag":"Oportunidade: Mercado","t":"..."},
    {"d":26,"tag":"Dor: Qualidade de Vida","t":"..."},
    {"d":27,"tag":"Urgência: Concorrência","t":"..."},
    {"d":28,"tag":"Bloqueio","t":"..."},
    {"d":29,"tag":"Transformação","t":"..."},
    {"d":30,"tag":"Decisão Final","t":"..."}
  ]
}`;
}

function getSegmentHint(segment) {
  const hints = {
    'Negócio Local': 'scripts de agendamento presencial/consulta, cliente chega fisicamente ou agenda visita',
    'E-commerce': 'foco em carrinho abandonado, recompra e reativação — SEM scripts de reunião presencial',
    'Serviço Online': 'agendamento de call ou reunião online, atendimento 100% remoto',
    'B2B / Empresas': 'prospecção ativa, ciclo de vendas longo, reunião comercial e proposta formal',
    'Agência / Consultoria': 'diagnóstico inicial, reunião de apresentação de estratégia, proposta de valor intelectual',
    'Outros': 'use o processo de vendas descrito para definir o formato e etapas adequadas'
  };
  return hints[segment] || hints['Outros'];
}
