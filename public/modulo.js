/* ============================================================
   Green Hub — motor compartilhado dos módulos do portal.
   Cada página define window.MODULO = { slug, avaliar(h), mensagens? }
   e o resto (login, salvar, somas, sinais, plano) roda daqui.
   ============================================================ */

const SUPABASE_URL = 'https://dckvprqsecaxaooppqfp.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRja3ZwcnFzZWNheGFvb3BwcWZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzOTU4MjcsImV4cCI6MjA5Nzk3MTgyN30.fY17RCGW5k_9hDIfGStJn4Xi_HpeL1ned5zrZQCOwZ4';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

const NIVEIS = {
  verde:    { cor: 'var(--mint)',  rotulo: 'Verde · tudo certo por aqui' },
  amarelo:  { cor: 'var(--amber)', rotulo: 'Amarelo · ponto de atenção' },
  vermelho: { cor: 'var(--red)',   rotulo: 'Vermelho · precisa de ação agora' }
};
const PESO = { vermelho: 0, amarelo: 1, verde: 2 };

const MENSAGENS_PADRAO = {
  vermelho: 'Tem mais de um ponto crítico aqui. Não tente arrumar tudo de uma vez — siga o plano abaixo na ordem em que ele aparece.',
  amarelo:  'A estrutura existe, mas cede fácil. O plano abaixo ataca primeiro o ponto mais frágil.',
  verde:    'Está bem resolvido. O próximo passo não é arrumar o que já funciona, é subir o nível.'
};

let companyId = null;
let userId = null;
let agendado = null;
let modoDemo = false;

/* ---------- helpers de leitura ---------- */
const campos = () => Array.from(document.querySelectorAll('[data-c]'));
const el = id => document.getElementById(id);
const num = id => { const n = el(id); if (!n) return null; const v = parseFloat(n.value); return isNaN(v) ? null : v; };
const txt = id => { const n = el(id); return n ? n.value.trim() : ''; };
const H = { num, txt, el };

function escapar(t) {
  return String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

function moeda(v) {
  if (v === null || isNaN(v)) return '—';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

function pct(v) {
  if (v === null || isNaN(v) || !isFinite(v)) return '—';
  return v.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%';
}

/* ---------- somatórios declarativos ----------
   <div class="soma" data-soma="id1,id2,id3">Total: <b>0</b> / 100</div> */
function atualizarSomas() {
  document.querySelectorAll('.soma[data-soma]').forEach(box => {
    const ids = box.dataset.soma.split(',').map(s => s.trim());
    const vals = ids.map(num);
    const total = vals.reduce((a, b) => a + (b || 0), 0);
    const preenchido = vals.some(v => v !== null);
    const alvo = parseFloat(box.dataset.alvo || '100');
    box.querySelector('b').textContent = Math.round(total * 10) / 10;
    box.classList.toggle('ok', preenchido && Math.abs(total - alvo) < 0.01);
    box.classList.toggle('erro', preenchido && Math.abs(total - alvo) >= 0.01);
  });
}

/* ---------- resultado ---------- */
function montarPlano(sinais) {
  const pendentes = sinais
    .filter(s => s.nivel !== 'verde' && s.acao)
    .sort((a, b) => PESO[a.nivel] - PESO[b.nivel])
    .slice(0, 4);

  if (pendentes.length) return pendentes.map(s => s.acao);

  return [(window.MODULO.planoTudoCerto) || {
    titulo: 'Suba o nível',
    porque: 'Os indicadores deste módulo estão saudáveis — continuar ajustando aqui rende pouco.',
    como: 'Passe para o próximo módulo da central e repita o diagnóstico daqui em 30 dias.'
  }];
}

function renderPlano(sinais) {
  const caixa = el('plano');
  const lista = el('passos');
  if (!caixa || !lista) return;

  if (!sinais.length) { caixa.classList.remove('ativo'); return; }

  const passos = montarPlano(sinais);
  lista.innerHTML = passos.map((p, i) =>
    '<div class="passo">' +
      '<div class="passo-num">' + (i + 1) + '</div>' +
      '<div class="passo-txt">' +
        '<b>' + escapar(p.titulo) + '</b>' +
        '<span>' + escapar(p.porque) + '</span>' +
        '<em>&rarr; ' + escapar(p.como) + '</em>' +
      '</div>' +
    '</div>').join('');

  caixa.classList.add('ativo');
  caixa.dataset.texto = passos.map((p, i) => (i + 1) + '. ' + p.titulo + '\n   ' + p.porque + '\n   -> ' + p.como).join('\n\n');
}

function copiarPlano() {
  const titulo = (document.title || 'Meu plano').split('—')[0].trim().toUpperCase();
  const texto = 'MEU PLANO — ' + titulo + '\n\n' + (el('plano').dataset.texto || '');
  navigator.clipboard.writeText(texto).then(() => {
    const b = el('btnCopiar');
    b.textContent = 'Copiado!';
    setTimeout(() => { b.textContent = 'Copiar plano'; }, 1800);
  });
}

function renderResultado() {
  const sinais = (window.MODULO.avaliar(H) || []).filter(Boolean);
  const box = el('sinais');
  const ver = el('veredito');

  renderPlano(sinais);

  if (!sinais.length) {
    box.innerHTML = '';
    ver.style.borderColor = 'rgba(255,255,255,0.10)';
    ver.style.background = 'rgba(4,8,6,0.35)';
    ver.innerHTML = '<b style="color:var(--footer)">Aguardando</b><p style="color:var(--muted)">Preencha as atividades para receber a leitura deste módulo.</p>';
    return;
  }

  box.innerHTML = sinais.map(s =>
    '<div class="sinal">' +
      '<div class="bolinha" style="background:' + NIVEIS[s.nivel].cor + '"></div>' +
      '<div class="txt"><b>' + escapar(s.titulo) + '</b><span>' + escapar(s.texto) + '</span></div>' +
    '</div>').join('');

  const vermelhos = sinais.filter(s => s.nivel === 'vermelho').length;
  const amarelos  = sinais.filter(s => s.nivel === 'amarelo').length;
  const geral = vermelhos >= 2 ? 'vermelho' : (vermelhos === 1 || amarelos >= 2) ? 'amarelo' : 'verde';
  const cor = NIVEIS[geral].cor;
  const msgs = Object.assign({}, MENSAGENS_PADRAO, window.MODULO.mensagens || {});
  const rotulos = Object.assign({}, { verde: NIVEIS.verde.rotulo, amarelo: NIVEIS.amarelo.rotulo, vermelho: NIVEIS.vermelho.rotulo }, window.MODULO.rotulos || {});

  ver.style.borderColor = cor;
  ver.style.background = 'rgba(47,227,138,0.05)';
  ver.innerHTML = '<b style="color:' + cor + '">' + rotulos[geral] + '</b>' +
                  '<p style="color:var(--soft)">' + msgs[geral] + '</p>';
}

/* ---------- salvar / carregar ---------- */
function coletar() {
  const dados = {};
  campos().forEach(c => { if (c.value !== '') dados[c.id] = c.value; });
  return dados;
}

function aplicar(dados) {
  if (!dados) return;
  Object.entries(dados).forEach(([id, v]) => { const c = el(id); if (c) c.value = v; });
}

function status(texto, ok) {
  const s = el('statusSalvo');
  if (!s) return;
  s.textContent = texto;
  s.classList.toggle('ok', !!ok);
}

async function salvar() {
  if (modoDemo) {
    try { localStorage.setItem('demo_' + window.MODULO.slug, JSON.stringify(coletar())); } catch (e) {}
    status('Salvo neste navegador', true);
    return;
  }
  if (!companyId) return;
  status('Salvando...');
  const { error } = await sb.from('module_answers').upsert({
    company_id: companyId, item_slug: window.MODULO.slug, answers: coletar(), updated_by: userId
  }, { onConflict: 'company_id,item_slug' });
  status(error ? 'Erro ao salvar' : 'Salvo automaticamente', !error);
}

function aoMudar() {
  atualizarSomas();
  if (typeof window.MODULO.aoMudar === 'function') window.MODULO.aoMudar(H);
  renderResultado();
  clearTimeout(agendado);
  agendado = setTimeout(salvar, 1200);
}

async function iniciarModulo() {
  campos().forEach(c => {
    c.addEventListener('input', aoMudar);
    c.addEventListener('change', aoMudar);
  });

  // modo demonstração: só vale rodando local, nunca em produção
  const local = ['localhost', '127.0.0.1', '::1'].includes(location.hostname);
  modoDemo = local && new URLSearchParams(location.search).has('demo');

  if (modoDemo) {
    try { aplicar(JSON.parse(localStorage.getItem('demo_' + window.MODULO.slug) || '{}')); } catch (e) {}
    aoMudar();
    status('Modo demonstração');
    return;
  }

  const { data: { session } } = await sb.auth.getSession();
  if (!session) { window.location.href = '/index.html'; return; }
  userId = session.user.id;

  const { data: perfil } = await sb.from('profiles').select('company_id, role').eq('id', userId).single();
  if (!perfil?.company_id) { window.location.href = '/setup.html'; return; }
  companyId = perfil.company_id;

  // confere se a empresa tem este módulo liberado (admin passa sempre)
  if (perfil.role !== 'admin') {
    const { data: itens } = await sb.rpc('get_my_portal_items');
    const item = (itens || []).find(i => i.slug === window.MODULO.slug);
    if (!item || !item.unlocked) { window.location.href = '/portal.html?bloqueado=' + window.MODULO.slug; return; }
  }

  const { data } = await sb.from('module_answers')
    .select('answers')
    .eq('company_id', companyId)
    .eq('item_slug', window.MODULO.slug)
    .maybeSingle();

  aplicar(data?.answers);
  aoMudar();
  status(data ? 'Respostas carregadas' : 'Pronto para preencher');
}

document.addEventListener('DOMContentLoaded', iniciarModulo);
