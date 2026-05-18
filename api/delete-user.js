// Remove o usuário do Supabase Auth via service role

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Método não permitido' });

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id obrigatório' });

  try {
    // Deleta o usuário do Supabase Auth (remove perfil via CASCADE)
    const { error } = await supabaseAdmin.auth.admin.deleteUser(user_id);
    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({ message: 'Usuário removido com sucesso' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
