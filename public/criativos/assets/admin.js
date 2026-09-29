// Painel do acervo: cadastrar criativo por link, criar procedimento e formato.
// Entra com a mesma conta do portal; quem grava é o papel de admin no banco.

import { slugificar } from './dados.js';
import { carregarDoArquivo } from './dados.js';
import { lerAcervoRemoto, publicarAcervo, sessaoAtual, entrar, sair } from './acervo.js';
import { resolverEmbed, miniatura } from './embed.js';

const $ = (id) => document.getElementById(id);

let acervo = null;        // { procedimentos: [...] }
let sessao = null;
let selecionado = { procedimento: null, formato: null, criativo: null };
let sujo = false;         // tem mudança não publicada?

/* ---------------- utilidades ---------------- */

function esc(t) {
  return String(t ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function aviso(texto, tipo = 'ok') {
  const el = $('aviso');
  el.textContent = texto;
  el.className = `aviso ${tipo} aparece`;
  clearTimeout(aviso.t);
  aviso.t = setTimeout(() => el.classList.remove('aparece'), 4000);
}

function marcarSujo() {
  sujo = true;
  $('btnPublicar').disabled = false;
  $('estadoPublicacao').textContent = 'Há mudanças não publicadas';
  $('estadoPublicacao').className = 'estado-pub pendente';
}

function marcarLimpo(quando) {
  sujo = false;
  $('btnPublicar').disabled = true;
  $('estadoPublicacao').textContent = quando
    ? `Publicado · ${new Date(quando).toLocaleString('pt-BR')}`
    : 'Tudo publicado';
  $('estadoPublicacao').className = 'estado-pub ok';
}

const proc = () => acervo?.procedimentos.find((p) => p.slug === selecionado.procedimento) ?? null;
const fmt = () => proc()?.formatos.find((f) => f.slug === selecionado.formato) ?? null;
const cri = () => fmt()?.criativos.find((c) => c.id === selecionado.criativo) ?? null;

/** id único no formato usado hoje: <iniciais>-<formato>-<n> */
function novoId(procedimento, formato) {
  const iniciais = procedimento.slug.split('-').map((p) => p[0]).join('').slice(0, 3);
  const base = `${iniciais}-${formato.slug.split('-')[0]}`;
  const usados = new Set();
  for (const p of acervo.procedimentos) {
    for (const f of p.formatos) for (const c of f.criativos) usados.add(c.id);
  }
  let n = 1;
  while (usados.has(`${base}-${String(n).padStart(2, '0')}`)) n += 1;
  return `${base}-${String(n).padStart(2, '0')}`;
}

/* ---------------- listas ---------------- */

function desenharProcedimentos() {
  const lista = $('listaProcedimentos');
  lista.innerHTML = acervo.procedimentos.map((p) => {
    const qtd = p.formatos.reduce((t, f) => t + f.criativos.length, 0);
    const ativo = p.slug === selecionado.procedimento ? ' ativo' : '';
    return `<button class="item${ativo}" data-proc="${esc(p.slug)}">
      <b>${esc(p.nome)}</b><span>${esc(p.area)} · ${qtd} criativo${qtd === 1 ? '' : 's'}</span>
    </button>`;
  }).join('') || '<p class="vazio">Nenhum procedimento ainda.</p>';

  lista.querySelectorAll('[data-proc]').forEach((b) => {
    b.onclick = () => {
      selecionado = { procedimento: b.dataset.proc, formato: null, criativo: null };
      desenharTudo();
    };
  });
}

function desenharFormatos() {
  const p = proc();
  const lista = $('listaFormatos');
  $('colunaFormatos').style.display = p ? '' : 'none';
  if (!p) return;

  $('tituloFormatos').textContent = p.nome;
  lista.innerHTML = p.formatos.map((f) => {
    const ativo = f.slug === selecionado.formato ? ' ativo' : '';
    return `<button class="item${ativo}" data-fmt="${esc(f.slug)}">
      <b>${esc(f.nome)}</b><span>${f.criativos.length} criativo${f.criativos.length === 1 ? '' : 's'}</span>
    </button>`;
  }).join('') || '<p class="vazio">Nenhum formato neste procedimento.</p>';

  lista.querySelectorAll('[data-fmt]').forEach((b) => {
    b.onclick = () => {
      selecionado.formato = b.dataset.fmt;
      selecionado.criativo = null;
      desenharTudo();
    };
  });
}

function desenharCriativos() {
  const f = fmt();
  const lista = $('listaCriativos');
  $('colunaCriativos').style.display = f ? '' : 'none';
  if (!f) return;

  $('tituloCriativos').textContent = f.nome;
  lista.innerHTML = f.criativos.map((c) => {
    const ativo = c.id === selecionado.criativo ? ' ativo' : '';
    const etiqueta = c.tipo === 'link' ? 'link' : 'arquivo';
    return `<button class="item${ativo}" data-cri="${esc(c.id)}">
      <b>${esc(c.titulo)}</b><span class="etq etq-${etiqueta}">${etiqueta}</span>
    </button>`;
  }).join('') || '<p class="vazio">Nenhum criativo neste formato.</p>';

  lista.querySelectorAll('[data-cri]').forEach((b) => {
    b.onclick = () => { selecionado.criativo = b.dataset.cri; desenharTudo(); };
  });
}

/* ---------------- formulário do criativo ---------------- */

function desenharFormulario() {
  const c = cri();
  const painel = $('painelCriativo');
  painel.style.display = c ? '' : 'none';
  if (!c) return;

  $('fTitulo').value = c.titulo ?? '';
  $('fSrc').value = c.src ?? '';
  $('fCapa').value = c.capa ?? '';
  $('fAnunciante').value = c.fonte?.anunciante ?? '';
  $('fNoAr').value = c.fonte?.no_ar_desde ?? '';
  $('fGancho').value = c.roteiro?.gancho ?? '';
  $('fDesenvolvimento').value = (c.roteiro?.desenvolvimento ?? []).join('\n');
  $('fCta').value = c.roteiro?.cta ?? '';
  $('fDuracao').value = c.roteiro?.ficha?.duracao ?? '';
  $('fEnquadramento').value = c.roteiro?.ficha?.enquadramento ?? '';
  $('fCenario').value = c.roteiro?.ficha?.cenario ?? '';
  $('fPaciente').checked = Boolean(c.roteiro?.ficha?.precisa_paciente);

  const arquivo = c.tipo !== 'link';
  $('avisoArquivo').style.display = arquivo ? '' : 'none';
  $('fSrc').type = arquivo ? 'text' : 'url';
  $('rotuloSrc').textContent = arquivo ? 'Caminho do arquivo' : 'Link do criativo';

  $('dicaSrc').style.display = arquivo ? 'none' : '';
  conferirLink();
  conferirCapa();
  atualizarDicaCapa();

  $('avisoSemArquivo').style.display = 'none';
  $('btnVirarLink').style.display = 'none';
  if (arquivo) conferirArquivo(c);
}

/** Diz na hora, embaixo do campo, como aquele link vai aparecer no site. */
const NOMES = {
  'youtube.com': 'YouTube', 'youtu.be': 'YouTube', 'instagram.com': 'Instagram',
  'tiktok.com': 'TikTok', 'vimeo.com': 'Vimeo', 'drive.google.com': 'Google Drive',
  'loom.com': 'Loom',
};

function conferirLink() {
  const alvo = $('statusSrc');
  const c = cri();
  const url = $('fSrc').value.trim();
  alvo.className = 'dica-status';
  alvo.textContent = '';
  if (!c || c.tipo !== 'link' || !url) return;

  const { modo } = resolverEmbed(url);
  if (modo === 'video') {
    alvo.className = 'dica-status ok';
    alvo.textContent = 'Arquivo de vídeo — toca direto na página.';
    return;
  }
  if (modo === 'iframe') {
    const dono = Object.keys(NOMES).find((d) => url.includes(d));
    alvo.className = 'dica-status ok';
    alvo.textContent = `${NOMES[dono] ?? 'Plataforma reconhecida'} — o vídeo aparece embutido na página.`;
    return;
  }
  if (/facebook\.com\/ads\/library/i.test(url)) {
    alvo.className = 'dica-status botao';
    alvo.textContent = 'Biblioteca de Anúncios: o Facebook não deixa embutir. Vira botão, e o cartão fica sem prévia — preencha a Capa abaixo para aparecer uma imagem.';
    return;
  }
  alvo.className = 'dica-status erro';
  alvo.textContent = 'Link não reconhecido. Vai virar só um botão — confira se colou o endereço do vídeo.';
}

/** Mostra ali mesmo se a capa carrega, para não descobrir só no site. */
function conferirCapa() {
  const caixa = $('previaCapa');
  const img = caixa.querySelector('img');
  const texto = caixa.querySelector('span');
  const valor = $('fCapa').value.trim();

  caixa.className = 'previa-capa';
  if (!valor) return;

  caixa.classList.add('mostrar');
  texto.textContent = 'Carregando a capa...';
  const teste = new Image();
  teste.onload = () => {
    if ($('fCapa').value.trim() !== valor) return;
    img.src = valor;
    caixa.className = 'previa-capa mostrar ok';
    texto.textContent = `Capa ok — ${teste.naturalWidth}x${teste.naturalHeight}.`;
  };
  teste.onerror = () => {
    if ($('fCapa').value.trim() !== valor) return;
    caixa.className = 'previa-capa mostrar erro';
    texto.textContent = 'Não consegui carregar essa imagem. Confira o endereço.';
  };
  teste.src = valor;
}

/** O aviso da capa só aparece quando o criativo não tem prévia sozinho. */
function atualizarDicaCapa() {
  const c = cri();
  const semPrevia = c && c.tipo === 'link' && miniatura($('fSrc').value.trim()).modo === 'nenhum';
  $('dicaCapa').style.color = semPrevia ? '#F0C43A' : '';
  $('dicaCapa').style.fontWeight = semPrevia ? '500' : '';
}

/** Alguns criativos antigos apontam para MP4 que não está no acervo. */
async function conferirArquivo(criativo) {
  let existe = false;
  try {
    const r = await fetch(criativo.src, { method: 'HEAD' });
    existe = r.ok;
  } catch { existe = false; }

  // a seleção pode ter mudado enquanto a checagem rodava
  if (cri()?.id !== criativo.id) return;

  $('avisoSemArquivo').style.display = existe ? 'none' : '';
  $('avisoArquivo').style.display = existe ? '' : 'none';
  $('btnVirarLink').style.display = existe ? 'none' : '';
}

/** Converte um criativo de arquivo para link, para consertar os órfãos. */
function virarLink() {
  const c = cri();
  if (!c) return;
  const url = prompt('Cole o link do criativo (Instagram, Biblioteca de Anúncios, etc):', '');
  if (!url) return;

  c.tipo = 'link';
  c.src = url.trim();
  marcarSujo();
  desenharTudo();
  aviso('Criativo convertido para link.');
}

function lerFormulario() {
  const c = cri();
  if (!c) return;

  c.titulo = $('fTitulo').value.trim();
  c.src = $('fSrc').value.trim();
  c.capa = $('fCapa').value.trim() || null;

  const anunciante = $('fAnunciante').value.trim();
  const noAr = $('fNoAr').value.trim();
  if (anunciante || noAr) c.fonte = { anunciante, no_ar_desde: noAr };
  else delete c.fonte;

  c.roteiro = {
    gancho: $('fGancho').value.trim(),
    desenvolvimento: $('fDesenvolvimento').value.split('\n').map((l) => l.trim()).filter(Boolean),
    cta: $('fCta').value.trim(),
    ficha: {
      duracao: $('fDuracao').value.trim(),
      enquadramento: $('fEnquadramento').value.trim(),
      cenario: $('fCenario').value.trim(),
      precisa_paciente: $('fPaciente').checked,
    },
  };

  marcarSujo();
  desenharCriativos();
}

/* ---------------- criar e remover ---------------- */

function criarProcedimento() {
  const nome = $('npNome').value.trim();
  const area = $('npArea').value.trim();
  const descricao = $('npDescricao').value.trim();
  if (!nome || !area) { aviso('Nome e área são obrigatórios.', 'erro'); return; }

  const slug = slugificar(nome);
  if (acervo.procedimentos.some((p) => p.slug === slug)) {
    aviso('Já existe um procedimento com esse nome.', 'erro');
    return;
  }

  acervo.procedimentos.push({ slug, nome, area, descricao, formatos: [] });
  selecionado = { procedimento: slug, formato: null, criativo: null };
  ['npNome', 'npArea', 'npDescricao'].forEach((id) => { $(id).value = ''; });
  fecharModal('modalProcedimento');
  marcarSujo();
  desenharTudo();
  aviso(`Procedimento "${nome}" criado.`);
}

function criarFormato() {
  const p = proc();
  if (!p) return;

  const nome = $('nfNome').value.trim();
  const descricao = $('nfDescricao').value.trim();
  if (!nome) { aviso('Dê um nome ao formato.', 'erro'); return; }

  const slug = slugificar(nome);
  if (p.formatos.some((f) => f.slug === slug)) {
    aviso('Esse formato já existe neste procedimento.', 'erro');
    return;
  }

  p.formatos.push({ slug, nome, descricao, criativos: [] });
  selecionado.formato = slug;
  selecionado.criativo = null;
  ['nfNome', 'nfDescricao'].forEach((id) => { $(id).value = ''; });
  fecharModal('modalFormato');
  marcarSujo();
  desenharTudo();
  aviso(`Formato "${nome}" criado.`);
}

function criarCriativo() {
  const p = proc();
  const f = fmt();
  if (!p || !f) return;

  const titulo = $('ncTitulo').value.trim();
  const src = $('ncLink').value.trim();
  if (!titulo || !src) { aviso('Título e link são obrigatórios.', 'erro'); return; }

  const id = novoId(p, f);
  f.criativos.push({
    id,
    titulo,
    tipo: 'link',
    src,
    capa: null,
    roteiro: { gancho: '', desenvolvimento: [], cta: '', ficha: { duracao: '', enquadramento: '', cenario: '', precisa_paciente: false } },
  });

  selecionado.criativo = id;
  ['ncTitulo', 'ncLink'].forEach((idc) => { $(idc).value = ''; });
  fecharModal('modalCriativo');
  marcarSujo();
  desenharTudo();
  aviso('Criativo adicionado. Preencha o roteiro ao lado.');
}

function removerCriativo() {
  const f = fmt();
  const c = cri();
  if (!f || !c) return;
  if (!confirm(`Remover "${c.titulo}" do acervo?`)) return;

  f.criativos = f.criativos.filter((x) => x.id !== c.id);
  selecionado.criativo = null;
  marcarSujo();
  desenharTudo();
  aviso('Criativo removido.');
}

function removerFormato() {
  const p = proc();
  const f = fmt();
  if (!p || !f) return;
  const qtd = f.criativos.length;
  if (!confirm(`Remover o formato "${f.nome}"${qtd ? ` e seus ${qtd} criativos` : ''}?`)) return;

  p.formatos = p.formatos.filter((x) => x.slug !== f.slug);
  selecionado.formato = null;
  selecionado.criativo = null;
  marcarSujo();
  desenharTudo();
  aviso('Formato removido.');
}

function removerProcedimento() {
  const p = proc();
  if (!p) return;
  const qtd = p.formatos.reduce((t, f) => t + f.criativos.length, 0);
  if (!confirm(`Remover "${p.nome}"${qtd ? ` e seus ${qtd} criativos` : ''}?`)) return;

  acervo.procedimentos = acervo.procedimentos.filter((x) => x.slug !== p.slug);
  selecionado = { procedimento: null, formato: null, criativo: null };
  marcarSujo();
  desenharTudo();
  aviso('Procedimento removido.');
}

/* ---------------- publicar ---------------- */

async function publicar() {
  const btn = $('btnPublicar');
  btn.disabled = true;
  btn.textContent = 'Publicando...';
  try {
    await publicarAcervo(acervo, sessao.user?.id);
    marcarLimpo(new Date().toISOString());
    aviso('Acervo publicado. Já está no ar para todo mundo.');
  } catch (e) {
    aviso(`Não consegui publicar: ${e.message}`, 'erro');
    btn.disabled = false;
  } finally {
    btn.textContent = 'Publicar alterações';
  }
}

/* ---------------- modais ---------------- */

function abrirModal(id) { $(id).classList.add('aberto'); }
function fecharModal(id) { $(id).classList.remove('aberto'); }

/* ---------------- desenho geral ---------------- */

function desenharTudo() {
  desenharProcedimentos();
  desenharFormatos();
  desenharCriativos();
  desenharFormulario();

  const p = proc();
  const f = fmt();
  $('btnNovoFormato').style.display = p ? '' : 'none';
  $('btnNovoCriativo').style.display = f ? '' : 'none';
  $('btnRemoverProcedimento').style.display = p ? '' : 'none';
  $('btnRemoverFormato').style.display = f ? '' : 'none';
}

/* ---------------- entrada ---------------- */

async function carregarAcervo() {
  const remoto = await lerAcervoRemoto();
  if (remoto?.dados) {
    acervo = remoto.dados;
    marcarLimpo(remoto.atualizadoEm);
    $('origem').textContent = 'Acervo vindo do banco';
    return;
  }
  acervo = await carregarDoArquivo();
  $('origem').textContent = 'Acervo vindo do criativos.json — publique para passar a usar o banco';
  marcarSujo();
}

async function abrirPainel() {
  $('telaLogin').style.display = 'none';
  $('painel').style.display = '';
  $('quemSou').textContent = sessao.nome;

  await carregarAcervo();
  desenharTudo();
}

async function tentarEntrar() {
  const btn = $('btnEntrar');
  const email = $('email').value.trim();
  const senha = $('senha').value;
  $('erroLogin').classList.remove('aparece');

  if (!email || !senha) {
    $('erroLogin').textContent = 'Preencha e-mail e senha.';
    $('erroLogin').classList.add('aparece');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Entrando...';
  try {
    await entrar(email, senha);
    sessao = await sessaoAtual();
    if (!sessao.admin) throw new Error('Esta conta não tem permissão para editar o acervo.');
    await abrirPainel();
  } catch (e) {
    $('erroLogin').textContent = e.message;
    $('erroLogin').classList.add('aparece');
    btn.disabled = false;
    btn.textContent = 'Entrar';
  }
}

function ligarEventos() {
  $('btnEntrar').onclick = tentarEntrar;
  $('senha').onkeydown = (e) => { if (e.key === 'Enter') tentarEntrar(); };

  $('btnSair').onclick = async () => {
    if (sujo && !confirm('Há mudanças não publicadas. Sair mesmo assim?')) return;
    await sair();
    window.location.reload();
  };

  $('btnPublicar').onclick = publicar;

  $('btnNovoProcedimento').onclick = () => abrirModal('modalProcedimento');
  $('btnNovoFormato').onclick = () => abrirModal('modalFormato');
  $('btnNovoCriativo').onclick = () => abrirModal('modalCriativo');

  $('criarProcedimento').onclick = criarProcedimento;
  $('criarFormato').onclick = criarFormato;
  $('criarCriativo').onclick = criarCriativo;

  $('btnRemoverProcedimento').onclick = removerProcedimento;
  $('btnRemoverFormato').onclick = removerFormato;
  $('btnRemoverCriativo').onclick = removerCriativo;
  $('btnVirarLink').onclick = virarLink;

  document.querySelectorAll('[data-fechar]').forEach((b) => {
    b.onclick = () => fecharModal(b.dataset.fechar);
  });
  document.querySelectorAll('.modal-fundo').forEach((f) => {
    f.onclick = (e) => { if (e.target === f) f.classList.remove('aberto'); };
  });

  document.querySelectorAll('#painelCriativo input, #painelCriativo textarea')
    .forEach((campo) => campo.addEventListener('input', lerFormulario));
  $('fPaciente').addEventListener('change', lerFormulario);
  $('fSrc').addEventListener('input', () => { conferirLink(); atualizarDicaCapa(); });
  $('fCapa').addEventListener('input', conferirCapa);

  window.addEventListener('beforeunload', (e) => {
    if (sujo) { e.preventDefault(); e.returnValue = ''; }
  });
}

async function iniciar() {
  ligarEventos();
  sessao = await sessaoAtual();
  if (sessao.logado && sessao.admin) await abrirPainel();
  else if (sessao.logado) {
    $('erroLogin').textContent = 'Esta conta não tem permissão para editar o acervo.';
    $('erroLogin').classList.add('aparece');
  }
}

iniciar();
