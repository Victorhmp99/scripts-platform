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
    .select('role, is_master')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return { error: 'Acesso restrito ao administrador', status: 403 };
  }

  return { user, isMaster: profile.is_master === true };
}

/**
 * Regras da conta master.
 *
 * A master é a dona da plataforma: só ela mexe em outros admins, e
 * ninguém mexe nela. Isto vive aqui, e não só no banco, porque estas
 * rotas usam a service_role — que ignora RLS por definição.
 *
 * Devolve { error, status } quando a ação é proibida, ou null quando pode.
 */
export async function podeMexerEm(auth, alvoUserId) {
  if (!alvoUserId) return { error: 'user_id obrigatório', status: 400 };

  const { data: alvo } = await supabaseAdmin
    .from('profiles')
    .select('role, is_master')
    .eq('id', alvoUserId)
    .single();

  if (!alvo) return { error: 'Usuário não encontrado', status: 404 };

  if (alvo.is_master) {
    return { error: 'A conta master da plataforma não pode ser alterada ou removida.', status: 403 };
  }

  if (alvo.role === 'admin' && !auth.isMaster) {
    return { error: 'Só a conta master pode mexer em outros administradores.', status: 403 };
  }

  return null;
}

export { supabaseAdmin };
