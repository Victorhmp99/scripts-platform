// Deleta empresa e todos os dados relacionados via service role

import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from './_auth.js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Método não permitido' });

  const auth = await requireAdmin(req);
  if (auth.error) return res.status(auth.status).json({ error: auth.error });

  const { company_id } = req.body;
  if (!company_id) return res.status(400).json({ error: 'company_id obrigatório' });

  try {
    // Desvincula usuários da empresa antes de deletar
    await supabaseAdmin
      .from('profiles')
      .update({ company_id: null })
      .eq('company_id', company_id);

    // Deleta (CASCADE remove company_scripts e script_edits automaticamente)
    const { error } = await supabaseAdmin
      .from('companies')
      .delete()
      .eq('id', company_id);

    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({ message: 'Empresa removida com sucesso' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
