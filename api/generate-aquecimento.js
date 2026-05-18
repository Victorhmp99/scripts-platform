// Gera aquecimento 30 dias — chamada 2 de 2

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const { company } = req.body;
  if (!company?.name) return res.status(400).json({ error: 'Dados incompletos' });

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'Especialista em copywriting. Responda APENAS JSON válido, sem markdown.' },
          { role: 'user', content: buildAqPrompt(company) }
        ],
        temperature: 0.8,
        max_tokens: 6000,
        response_format: { type: 'json_object' }
      })
    });

    if (!groqRes.ok) {
      const err = await groqRes.text();
      let msg = 'Erro no aquecimento';
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

function buildAqPrompt(c) {
  return `Crie uma sequência de aquecimento de 30 dias para:
Empresa: ${c.name} | Nicho: ${c.industry} | Segmento: ${c.segment || 'Outros'}
Cliente ideal: ${c.target_audience}
Dores específicas: ${c.pain_points || 'não informado'}
Tom: ${c.tone || 'Direto e humano'}

REGRAS:
- Cada mensagem máx 5 linhas (WhatsApp)
- Use as dores ESPECÍFICAS do cliente ideal — nunca genérico
- Nunca repita o mesmo gatilho em dias consecutivos
- Tom ${c.tone || 'direto e humano'}, sem clichês
- Use {nome} para o prospect

Siga exatamente esta sequência de gatilhos:
D1:Conexão | D2:Dor principal | D3:Escassez | D4:Dor secundária | D5:Oportunidade | D6:Dor interna | D7:Case anônimo | D8:Resultado não alcançado | D9:Urgência de mercado | D10:Dor pessoal/tempo | D11:Escassez de vagas | D12:Prova social | D13:Dor previsibilidade | D14:Curiosidade | D15:Escassez local | D16:Dor conversão | D17:Timing | D18:Case com resultado | D19:Posicionamento/branding | D20:Urgência decisão | D21:Diagnóstico gratuito | D22:Escassez região | D23:Dor operacional | D24:Referência | D25:Oportunidade mercado | D26:Qualidade de vida | D27:Urgência concorrência | D28:Bloqueio/o que falta | D29:Transformação antes/depois | D30:Decisão final

Retorne JSON:
{"aq":[{"d":1,"tag":"Conexão","t":"mensagem completa..."},{"d":2,"tag":"Dor: Principal","t":"..."},...,{"d":30,"tag":"Decisão Final","t":"..."}]}`;
}
