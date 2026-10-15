// Onboarding automático da Delta: cria a empresa do cliente, libera todos os itens do
// catálogo e manda o convite por e-mail. Chamado só pelo servidor do CRM (Edge Function
// delta-onboarding), depois que o Victor escolhe o plano no Telegram.
//
// Acesso de máquina: exige o cabeçalho x-delta-secret igual a DELTA_ONBOARDING_SECRET.
// Limite: se já houver 5 empresas criadas nas últimas 24h (por qualquer caminho), recusa criar outra.
// Idempotente: e-mail que já tem conta só ganha os itens; empresa com o mesmo nome é reaproveitada.

import crypto from 'node:crypto';
import { supabaseAdmin } from './_auth.js';

const LIMITE_DIA = 5;

function segredoValido(recebido) {
  const esperado = process.env.DELTA_ONBOARDING_SECRET || '';
  if (!esperado || typeof recebido !== 'string') return false;
  const a = Buffer.from(recebido), b = Buffer.from(esperado);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });
  if (!segredoValido(req.headers['x-delta-secret'])) return res.status(401).json({ error: 'Não autorizado' });

  const email = String(req.body?.email || '').trim().toLowerCase();
  const nome = String(req.body?.nome || '').trim().slice(0, 120);
  const empresa = String(req.body?.empresa || '').trim().slice(0, 160);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'E-mail inválido' });
  if (!empresa) return res.status(400).json({ error: 'Empresa obrigatória' });

  try {
    // Empresa: reaproveita a de mesmo nome; senão cria (respeitando o limite diário).
    let { data: comp } = await supabaseAdmin.from('companies').select('id').ilike('name', empresa).limit(1).maybeSingle();
    let empresaCriada = false;
    if (!comp) {
      const desde = new Date(Date.now() - 86400000).toISOString();
      const { count } = await supabaseAdmin.from('companies').select('id', { count: 'exact', head: true })
        .gte('created_at', desde);
      if ((count || 0) >= LIMITE_DIA) return res.status(429).json({ error: 'Limite diário de empresas atingido' });
      const ins = await supabaseAdmin.from('companies')
        .insert({ name: empresa, setup_complete: false }).select('id').single();
      if (ins.error) throw ins.error;
      comp = ins.data; empresaCriada = true;
    }

    // Usuário: convite por e-mail (Supabase envia) ou, se já existe, só vincula.
    const redirectTo = `${process.env.APP_URL || 'https://ferramentas.adeltasolucoes.com.br'}/set-password.html`;
    let userId, convite = 'enviado';
    const inv = await supabaseAdmin.auth.admin.inviteUserByEmail(email, { redirectTo, data: { full_name: nome || email } });
    if (inv.error) {
      if (!/already been registered/i.test(inv.error.message || '')) throw inv.error;
      const { data: lista } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const existente = lista?.users?.find(u => (u.email || '').toLowerCase() === email);
      if (!existente) throw new Error('Usuário já existe, mas não foi encontrado na lista');
      const { data: perfil } = await supabaseAdmin.from('profiles').select('id, role, is_master').eq('id', existente.id).maybeSingle();
      if (!perfil) throw new Error('Usuário já existe, mas o perfil não foi encontrado');
      if (perfil.role === 'admin' || perfil.is_master) return res.status(409).json({ error: 'E-mail pertence a um administrador: nada alterado' });
      userId = perfil.id; convite = 'já tinha conta';
    } else {
      userId = inv.data.user.id;
    }

    const upd = await supabaseAdmin.from('profiles')
      .update({ company_id: comp.id, full_name: nome || email, role: 'gestor' }).eq('id', userId);
    if (upd.error) throw upd.error;

    // Libera todos os itens ativos do catálogo.
    const { data: itens, error: errItens } = await supabaseAdmin.from('portal_items').select('slug').eq('active', true);
    if (errItens) throw errItens;
    if (itens?.length) {
      const rows = itens.map(i => ({ company_id: comp.id, item_slug: i.slug, enabled: true, expires_at: null }));
      const up = await supabaseAdmin.from('company_items').upsert(rows, { onConflict: 'company_id,item_slug' });
      if (up.error) throw up.error;
    }

    return res.status(200).json({ ok: true, convite, empresa_criada: empresaCriada, itens_liberados: itens?.length || 0 });
  } catch (err) {
    console.error('delta-onboarding error:', err);
    return res.status(500).json({ error: 'Erro interno: ' + (err.message || err) });
  }
}
