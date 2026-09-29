// Salva scripts gerados pela IA — usa service role para bypassar RLS

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Não autenticado' });

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Sessão inválida' });

  const { company_id, scripts, qual, aq } = req.body;
  if (!company_id) return res.status(400).json({ error: 'company_id obrigatório' });

  // Garante que o usuário pertence a essa empresa (ou é admin)
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('company_id, role')
    .eq('id', user.id)
    .single();

  const allowed =
    profile?.role === 'admin' ||
    profile?.company_id === company_id;

  if (!allowed) return res.status(403).json({ error: 'Sem permissão para salvar nessa empresa' });

  try {
    const { error } = await supabaseAdmin.from('company_scripts').upsert({
      company_id,
      scripts,
      qual,
      aq
    }, { onConflict: 'company_id' });

    if (error) return res.status(500).json({ error: error.message });

    await supabaseAdmin.from('companies').update({
      setup_complete: true,
      last_regenerated_at: new Date().toISOString()
    }).eq('id', company_id);

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
