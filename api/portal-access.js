// Portal Green Hub — leitura e escrita das liberações de uma empresa.
// GET  ?company_id=UUID           -> catálogo + o que está liberado
// POST { company_id, items: [] }  -> grava as liberações
// Só admin. Usa service role para bypassar RLS depois de conferir o papel.

import { requireAdmin, supabaseAdmin } from './_auth.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const auth = await requireAdmin(req);
  if (auth.error) return res.status(auth.status).json({ error: auth.error });

  if (req.method === 'GET') {
    const { company_id } = req.query;
    if (!company_id) return res.status(400).json({ error: 'company_id é obrigatório' });

    const [catalog, access] = await Promise.all([
      supabaseAdmin
        .from('portal_items')
        .select('slug, area, kind, title, description, sort_order, active, padrao')
        .eq('active', true)
        .order('area')
        .order('sort_order'),
      supabaseAdmin
        .from('company_items')
        .select('item_slug, enabled, expires_at')
        .eq('company_id', company_id)
    ]);

    if (catalog.error)  return res.status(500).json({ error: catalog.error.message });
    if (access.error)   return res.status(500).json({ error: access.error.message });

    const byslug = Object.fromEntries((access.data || []).map(a => [a.item_slug, a]));

    // Sem linha de empresa, vale o padrão do item — a mesma regra que o
    // portal usa. Antes caía sempre em `false`, e um item que já vem
    // liberado apareceria desmarcado no painel, contradizendo o que a
    // pessoa vê na Central.
    const items = (catalog.data || []).map(item => ({
      ...item,
      enabled:    byslug[item.slug]?.enabled ?? item.padrao ?? false,
      expires_at: byslug[item.slug]?.expires_at ?? null
    }));

    return res.status(200).json({ items });
  }

  if (req.method === 'POST') {
    const { company_id, items } = req.body || {};
    if (!company_id)        return res.status(400).json({ error: 'company_id é obrigatório' });
    if (!Array.isArray(items)) return res.status(400).json({ error: 'items deve ser uma lista' });

    const liberados = items.filter(i => i.enabled);
    const revogados = items.filter(i => !i.enabled).map(i => i.slug);

    try {
      if (liberados.length) {
        const rows = liberados.map(i => ({
          company_id,
          item_slug:  i.slug,
          enabled:    true,
          // string vazia do input date vira NULL (sem prazo)
          expires_at: i.expires_at ? new Date(i.expires_at).toISOString() : null
        }));

        const { error } = await supabaseAdmin
          .from('company_items')
          .upsert(rows, { onConflict: 'company_id,item_slug' });
        if (error) return res.status(500).json({ error: error.message });
      }

      if (revogados.length) {
        // Item que já vem liberado precisa de uma linha dizendo "não" —
        // apagar a linha dele o devolveria ao padrão, e desmarcar no
        // painel não faria efeito nenhum. Para os demais, apagar é o
        // certo: sem linha significa bloqueado, e a tabela fica limpa.
        const { data: catalogo, error: erroCatalogo } = await supabaseAdmin
          .from('portal_items')
          .select('slug, padrao')
          .in('slug', revogados);
        if (erroCatalogo) return res.status(500).json({ error: erroCatalogo.message });

        const ehPadrao = new Set((catalogo || []).filter(i => i.padrao).map(i => i.slug));
        const paraMarcar = revogados.filter(s => ehPadrao.has(s));
        const paraApagar = revogados.filter(s => !ehPadrao.has(s));

        if (paraMarcar.length) {
          const { error } = await supabaseAdmin
            .from('company_items')
            .upsert(
              paraMarcar.map(slug => ({ company_id, item_slug: slug, enabled: false, expires_at: null })),
              { onConflict: 'company_id,item_slug' }
            );
          if (error) return res.status(500).json({ error: error.message });
        }

        if (paraApagar.length) {
          const { error } = await supabaseAdmin
            .from('company_items')
            .delete()
            .eq('company_id', company_id)
            .in('item_slug', paraApagar);
          if (error) return res.status(500).json({ error: error.message });
        }
      }

      return res.status(200).json({ ok: true, liberados: liberados.length });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Método não permitido' });
}
