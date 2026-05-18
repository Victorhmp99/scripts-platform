// Cria empresa e vincula ao usuário — usa service role para bypassar RLS

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  // Valida o JWT do usuário logado
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Não autenticado' });

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Sessão inválida' });

  const { company, company_id } = req.body;

  if (!company?.name) return res.status(400).json({ error: 'Nome da empresa é obrigatório' });

  try {
    let finalCompanyId = company_id;

    if (finalCompanyId) {
      // Atualiza empresa existente
      const { error } = await supabaseAdmin
        .from('companies')
        .update(company)
        .eq('id', finalCompanyId);
      if (error) return res.status(500).json({ error: error.message });
    } else {
      // Cria empresa nova
      const { data: newCompany, error } = await supabaseAdmin
        .from('companies')
        .insert(company)
        .select()
        .single();
      if (error || !newCompany) return res.status(500).json({ error: error?.message || 'Erro ao criar empresa' });
      finalCompanyId = newCompany.id;

      // Vincula o usuário à empresa
      await supabaseAdmin
        .from('profiles')
        .update({ company_id: finalCompanyId })
        .eq('id', user.id);
    }

    return res.status(200).json({ company_id: finalCompanyId });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
