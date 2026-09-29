// Validação de administrador para as rotas de /api.
// O arquivo começa com "_" para a Vercel não expor como rota.
//
// Antes, estas rotas confiavam em ADMIN_SECRET enviado pelo front — e o segredo
// ficava em texto puro no admin.html, legível por qualquer um sem login.
// Agora o front manda o JWT da sessão e quem decide é o papel do usuário no banco.

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Confere se quem chamou está logado e é admin.
 * Uso: const auth = await requireAdmin(req);
 *      if (auth.error) return res.status(auth.status).json({ error: auth.error });
 */
export async function requireAdmin(req) {
  const header = req.headers.authorization;
  if (!header) return { error: 'Não autenticado', status: 401 };

  const token = header.replace('Bearer ', '');
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return { error: 'Sessão inválida', status: 401 };

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return { error: 'Acesso restrito ao administrador', status: 403 };
  }

  return { user };
}

export { supabaseAdmin };
