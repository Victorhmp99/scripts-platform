// Cria usuário com service_role (bypassa RLS) — só chamado pelo admin

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  // Valida senha de admin (header Authorization: Bearer ADMIN_SECRET)
  const auth = req.headers.authorization?.replace('Bearer ', '');
  if (auth !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  const { email, password, full_name, role, company_id } = req.body;

  if (!email || !password || !role) {
    return res.status(400).json({ error: 'Dados incompletos: email, password e role são obrigatórios' });
  }

  try {
    // Cria usuário no Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name }
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    const userId = authData.user.id;

    // Atualiza o perfil com role e company (o trigger já criou o perfil básico)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ role, company_id: company_id || null, full_name })
      .eq('id', userId);

    if (profileError) {
      // Se der erro no perfil, remove o usuário para não ficar inconsistente
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return res.status(500).json({ error: 'Erro ao configurar perfil do usuário' });
    }

    return res.status(200).json({
      message: 'Usuário criado com sucesso',
      user_id: userId,
      email
    });
  } catch (err) {
    console.error('Erro create-user:', err);
    return res.status(500).json({ error: 'Erro interno ao criar usuário' });
  }
}
