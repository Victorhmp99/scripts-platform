// Gera scripts (sem aquecimento) — chamada 1 de 2

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const { company } = req.body;
  if (!company?.name) return res.status(400).json({ error: 'Dados da empresa incompletos' });

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'Especialista em copywriting e vendas para o mercado brasileiro. Responda APENAS JSON válido, sem markdown.' },
          { role: 'user', content: buildScriptsPrompt(company) }
        ],
        temperature: 0.8,
        max_tokens: 8000,
        response_format: { type: 'json_object' }
      })
    });

    if (!groqRes.ok) {
      const err = await groqRes.text();
      let msg = 'Erro na geração';
      try { msg = JSON.parse(err)?.error?.message || msg; } catch {}
      return res.status(500).json({ error: msg });
    }

    const data = await groqRes.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) return res.status(500).json({ error: 'Resposta vazia' });

    let parsed;
    try { parsed = JSON.parse(text); }
    catch { const m = text.match(/\{[\s\S]*\}/); parsed = JSON.parse(m?.[0] || text); }

    return res.status(200).json({ data: parsed });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

function buildScriptsPrompt(c) {
  return `Crie scripts de vendas personalizados para:
Empresa: ${c.name} | Vendedor: ${c.seller_name || 'o vendedor'} | Nicho: ${c.industry} | Segmento: ${c.segment || 'Outros'}
Vende: ${c.services} | Cliente: ${c.target_audience}
Dores: ${c.pain_points || 'não informado'} | Proposta: ${c.value_prop || 'não informado'}
Processo: ${c.sales_process || 'não informado'} | Tom: ${c.tone || 'Direto e humano'}

REGRAS: zero clichês ("espero que esteja bem" proibido), tom direto como o vendedor fala, WhatsApp máx 5 linhas sempre com CTA, e-mail com "Assunto: X" na 1ª linha, use {nome} para prospect e {empresa} para empresa do prospect.

SEGMENTO ${c.segment || 'Outros'}: ${getSegmentHint(c.segment)}

GERE 5 variações para cada script abaixo. Scripts REAIS e COMPLETOS, não descrições:
- primeiro-contato (WhatsApp frio)
- agradecimento-ligacao (após ligação positiva)
- confirmacao (adapte: reunião/consulta/visita/call/demo conforme o processo)
- lembrete (antes do compromisso)
- pos-fechamento (boas-vindas ao novo cliente)
- fu-whatsapp (5 gatilhos diferentes: curiosidade, escassez, dor, oportunidade, prova social — use as dores específicas)
- fu-ligacao (mensagem após tentativa de ligação sem resposta)
- fu-email (com assunto — formato "Assunto: X\\n\\nCorpo: Y")
- agradecimento-reuniao (após reunião/consulta/call — adapte)
- agradecimento-indicacao (por indicação recebida)
- recuperacao (5 abordagens: sem-pressão / urgência / novo-benefício / provocar-dor / prova-social)

Analise o processo de vendas e adicione guias dinâmicas relevantes (ex: qualificação, agendamento, pós-proposta, etc). Não invente etapas que não existem no processo.

Qualificação: gere abertura + 5 a 7 perguntas específicas para o nicho + transição.

Retorne JSON:
{
  "__structure": [
    {"tab_id":"dia-a-dia","tab_label":"Dia a Dia","sections":[{"key":"primeiro-contato","label":"Primeiro Contato","desc":"..."},{"key":"agradecimento-ligacao","label":"Agradecimento Ligação","desc":"..."},{"key":"confirmacao","label":"Confirmação","desc":"..."},{"key":"lembrete","label":"Lembrete","desc":"..."},{"key":"pos-fechamento","label":"Pós-Fechamento","desc":"..."}]},
    {"tab_id":"followup","tab_label":"Follow Up","sections":[{"key":"fu-whatsapp","label":"WhatsApp","desc":"..."},{"key":"fu-ligacao","label":"Ligação","desc":"..."},{"key":"fu-email","label":"E-mail","desc":"..."}]},
    {"tab_id":"recuperacao","tab_label":"Recuperação","sections":[{"key":"recuperacao","label":"Não Fechou","desc":"..."}]}
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
  "qual":[{"num":"Abertura","q":"..."},{"num":"Q1","q":"..."},{"num":"Q2","q":"..."},{"num":"Q3","q":"..."},{"num":"Q4","q":"..."},{"num":"Q5","q":"..."},{"num":"Transição","q":"..."}]
}`;
}

function getSegmentHint(segment) {
  const hints = {
    'Negócio Local': 'scripts de agendamento presencial/consulta, cliente chega fisicamente',
    'E-commerce': 'foco em carrinho abandonado e recompra, SEM scripts de reunião',
    'Serviço Online': 'agendamento de call ou reunião online, atendimento remoto',
    'B2B / Empresas': 'prospecção ativa, ciclo longo, reunião comercial e proposta',
    'Agência / Consultoria': 'diagnóstico, reunião de apresentação, proposta de valor intelectual',
    'Outros': 'use o processo de vendas descrito para definir o formato ideal'
  };
  return hints[segment] || hints['Outros'];
}
