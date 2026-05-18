// Endpoint chamado pelo CRM para criar/revogar acesso à plataforma de scripts
// O CRM envia uma requisição POST com email, nome e company_id (ou dados para criar empresa nova)

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Autenticação: CRM deve enviar Authorization: Bearer CRM_WEBHOOK_SECRET
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  const { action } = req.body;

  if (action === 'grant') return grantAccess(req, res);
  if (action === 'revoke') return revokeAccess(req, res);
  if (action === 'check') return checkAccess(req, res);

  return res.status(400).json({ error: 'Ação inválida. Use: grant, revoke ou check' });
}

// ── Conceder acesso ──────────────────────────────────────────────
async function grantAccess(req, res) {
  const {
    email,
    full_name,
    password,                // opcional — se não informado, gera senha aleatória
    company_id,              // ID da empresa já existente (para usuário adicional)
    company_name,            // nome da empresa (para criar empresa nova)
    company_industry,        // setor (opcional)
    company_services,        // serviços (opcional)
    role = 'user'            // 'user', 'gestor' ou 'admin'
  } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'E-mail é obrigatório' });
  }

  const tempPassword = password || generatePassword();
  let finalCompanyId = company_id;

  try {
    // 1. Cria empresa se não foi informado company_id
    if (!finalCompanyId && company_name) {
      const { data: company, error: companyErr } = await supabaseAdmin
        .from('companies')
        .insert({
          name: company_name,
          industry: company_industry || null,
          services: company_services || null,
          setup_complete: false
        })
        .select()
        .single();

      if (companyErr) {
        return res.status(500).json({ error: 'Erro ao criar empresa: ' + companyErr.message });
      }
      finalCompanyId = company.id;
    }

    // 2. Verifica se o usuário já existe
    const { data: existing } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existing?.users?.find(u => u.email === email);

    let userId;

    if (existingUser) {
      // Usuário já existe — só atualiza o perfil
      userId = existingUser.id;
      await supabaseAdmin
        .from('profiles')
        .update({ role, company_id: finalCompanyId || null, full_name: full_name || existingUser.user_metadata?.full_name })
        .eq('id', userId);

      return res.status(200).json({
        status: 'updated',
        message: `Acesso atualizado para ${email}`,
        user_id: userId,
        company_id: finalCompanyId,
        email,
        // senha não retornada pois usuário já existia
      });
    }

    // 3. Cria usuário novo
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: full_name || email }
    });

    if (authErr) {
      return res.status(400).json({ error: authErr.message });
    }

    userId = authData.user.id;

    // 4. Atualiza perfil com role e empresa
    const { error: profileErr } = await supabaseAdmin
      .from('profiles')
      .update({ role, company_id: finalCompanyId || null, full_name: full_name || email })
      .eq('id', userId);

    if (profileErr) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return res.status(500).json({ error: 'Erro ao configurar perfil' });
    }

    return res.status(200).json({
      status: 'created',
      message: `Acesso criado para ${email}`,
      user_id: userId,
      company_id: finalCompanyId,
      email,
      temp_password: tempPassword,
      login_url: `${process.env.APP_URL || 'https://seu-dominio.vercel.app'}/index.html`,
      setup_url: finalCompanyId ? null : `${process.env.APP_URL || 'https://seu-dominio.vercel.app'}/setup.html`
    });

  } catch (err) {
    console.error('grant-access error:', err);
    return res.status(500).json({ error: 'Erro interno: ' + err.message });
  }
}

// ── Revogar acesso ───────────────────────────────────────────────
async function revokeAccess(req, res) {
  const { email, user_id } = req.body;

  if (!email && !user_id) {
    return res.status(400).json({ error: 'Informe email ou user_id' });
  }

  try {
    let uid = user_id;

    if (!uid && email) {
      const { data } = await supabaseAdmin.auth.admin.listUsers();
      const user = data?.users?.find(u => u.email === email);
      if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
      uid = user.id;
    }

    // Remove empresa do perfil (desativa acesso sem deletar o usuário)
    await supabaseAdmin
      .from('profiles')
      .update({ company_id: null, role: 'user' })
      .eq('id', uid);

    return res.status(200).json({
      status: 'revoked',
      message: `Acesso revogado para user ${uid}`
    });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno: ' + err.message });
  }
}

// ── Verificar acesso ─────────────────────────────────────────────
async function checkAccess(req, res) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'E-mail é obrigatório' });

  try {
    const { data } = await supabaseAdmin.auth.admin.listUsers();
    const user = data?.users?.find(u => u.email === email);
    if (!user) return res.status(200).json({ has_access: false, status: 'not_found' });

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role, company_id, companies(name, setup_complete)')
      .eq('id', user.id)
      .single();

    return res.status(200).json({
      has_access: !!profile?.company_id,
      user_id: user.id,
      email,
      role: profile?.role,
      company_id: profile?.company_id,
      company_name: profile?.companies?.name,
      setup_complete: profile?.companies?.setup_complete
    });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno: ' + err.message });
  }
}

// ── Gerar senha segura ───────────────────────────────────────────
function generatePassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#';
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}
