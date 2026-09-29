// Acervo no Supabase: leitura pública, escrita só de admin.
// O criativos.json continua no repositório como retaguarda — se o banco
// estiver vazio ou fora do ar, o site abre igual, com o acervo do arquivo.

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://dckvprqsecaxaooppqfp.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRja3ZwcnFzZWNheGFvb3BwcWZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzOTU4MjcsImV4cCI6MjA5Nzk3MTgyN30.fY17RCGW5k_9hDIfGStJn4Xi_HpeL1ned5zrZQCOwZ4';

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON);

/** Lê o acervo publicado. Devolve null se ainda não houver nada no banco. */
export async function lerAcervoRemoto() {
  try {
    const { data, error } = await sb
      .from('criativos_acervo')
      .select('dados, updated_at')
      .eq('id', 1)
      .maybeSingle();

    if (error || !data?.dados) return null;
    if (!Array.isArray(data.dados.procedimentos)) return null;
    return { dados: data.dados, atualizadoEm: data.updated_at };
  } catch {
    return null;
  }
}

/** Publica o acervo inteiro. Só passa se o usuário for admin (RLS). */
export async function publicarAcervo(dados, userId) {
  const { error } = await sb
    .from('criativos_acervo')
    .upsert({ id: 1, dados, updated_by: userId ?? null }, { onConflict: 'id' });
  if (error) throw new Error(error.message);
}

/** Quem está logado, e se pode editar. */
export async function sessaoAtual() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return { logado: false, admin: false, user: null };

  const { data: perfil } = await sb
    .from('profiles')
    .select('role, full_name')
    .eq('id', session.user.id)
    .maybeSingle();

  return {
    logado: true,
    admin: perfil?.role === 'admin',
    nome: perfil?.full_name || session.user.email,
    user: session.user,
  };
}

export async function entrar(email, senha) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password: senha });
  if (error) {
    throw new Error(error.message === 'Invalid login credentials'
      ? 'E-mail ou senha incorretos.'
      : error.message);
  }
  return data.user;
}

export async function sair() {
  await sb.auth.signOut();
}
