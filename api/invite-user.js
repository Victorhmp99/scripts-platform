// Envia convite por e-mail para o usuário via Supabase
// O usuário recebe um link, clica e já entra autenticado — sem precisar criar senha

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  const { email, full_name, role = 'user', company_id } = req.body;

  if (!email) return res.status(400).json({ error: 'E-mail é obrigatório' });
  if (!['admin', 'gestor', 'user'].includes(role)) {
    return res.status(400).json({ error: 'Role inválido' });
  }

  const redirectTo = `${process.env.APP_URL || 'https://scripts-platform.vercel.app'}/set-password.html`;

  try {
    // Envia convite — Supabase cria o usuário e dispara o e-mail
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: { full_name: full_name || email }
    });

    if (error) {
      // Se o usuário já existe, apenas atualiza o perfil
      if (error.message?.includes('already been registered')) {
        const { data: existing } = await supabaseAdmin.auth.admin.listUsers();
        const user = existing?.users?.find(u => u.email === email);
        if (user) {
          await supabaseAdmin
            .from('profiles')
            .update({ role, company_id: company_id || null, full_name: full_name || email })
            .eq('id', user.id);
          return res.status(200).json({
            status: 'updated',
            message: `Acesso atualizado para ${email}. O usuário já pode fazer login.`
          });
        }
      }
      return res.status(400).json({ error: error.message });
    }

    const userId = data.user.id;

    // Atualiza perfil com role e empresa (o trigger já criou o perfil base)
    await supabaseAdmin
      .from('profiles')
      .update({ role, company_id: company_id || null, full_name: full_name || email })
      .eq('id', userId);

    return res.status(200).json({
      status: 'invited',
      message: `Convite enviado para ${email}`,
      user_id: userId
    });

  } catch (err) {
    console.error('invite-user error:', err);
    return res.status(500).json({ error: 'Erro interno: ' + err.message });
  }
}
