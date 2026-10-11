import { lerParametros } from './rotas.js';
import {
  acharCriativo,
  acharFormato,
  acharNicho,
  acharProcedimento,
  agruparPorArea,
  carregarDados,
  contarCriativos,
  contarDoNicho,
  slugificar,
} from './dados.js';
import { formatarRoteiroTexto } from './roteiro.js';
import {
  htmlAreas,
  htmlNichos,
  htmlAviso,
  htmlBotaoCopiar,
  htmlFormatos,
  htmlGradeCriativos,
  htmlPlayer,
  htmlRoteiro,
  htmlTrilha,
} from './render.js';

const conteudo = document.getElementById('conteudo');

function acenderMenu(slugArea) {
  for (const link of document.querySelectorAll('[data-menu-area]')) {
    if (link.dataset.menuArea === slugArea) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
}

function marcarArea(procedimento, dados) {
  const slugArea = slugificar(procedimento.area);
  document.body.dataset.area = slugArea;
  if (dados) montarMenuAreas(dados, procedimento.nicho);
  acenderMenu(slugArea);
}

function definir(id, texto) {
  const elemento = document.getElementById(id);
  if (elemento) elemento.textContent = texto;
}

function definirVolta(href, rotulo) {
  const botao = document.getElementById('voltar');
  if (!botao) return;
  botao.href = href;
  botao.lastChild.textContent = ` ${rotulo}`;
}

function trilha(itens) {
  const elemento = document.getElementById('trilha');
  if (elemento) elemento.innerHTML = htmlTrilha(itens);
}

function paginaHome(dados) {
  conteudo.className = 'lista-areas';
  conteudo.innerHTML = htmlNichos(dados.nichos, (slug) => contarDoNicho(dados, slug));
  montarMenuAreas(dados, null);
}

function paginaNicho(dados, params) {
  const nicho = acharNicho(dados, params.nicho);
  if (!nicho) {
    window.location.replace('/criativos');
    return;
  }
  document.title = `${nicho.nome} · Referências Criativos`;
  definirVolta('/criativos', 'Todos os nichos');
  trilha([{ nome: 'Início', href: '/criativos' }, { nome: nicho.nome }]);
  definir('titulo', nicho.nome);
  definir('subtitulo', nicho.descricao || 'Escolha o serviço que você quer vender.');
  conteudo.className = 'lista-areas';
  conteudo.innerHTML = htmlAreas(agruparPorArea(dados, nicho.slug), contarCriativos);
  montarMenuAreas(dados, nicho.slug);
}

/**
 * O menu de áreas era fixo em Face/Corpo/Capilar — só fazia sentido em
 * estética. Agora ele é montado a partir das áreas que existem dentro do
 * nicho aberto, e some na home, onde a escolha ainda é de nicho.
 */
function montarMenuAreas(dados, slugNicho) {
  const lista = document.getElementById('menu-areas');
  if (!lista) return;
  if (!slugNicho) { lista.innerHTML = ''; return; }
  lista.innerHTML = agruparPorArea(dados, slugNicho)
    .map((area) => `<li><a href="/criativos/nicho?n=${encodeURIComponent(slugNicho)}#${area.slug}" data-menu-area="${area.slug}">${area.nome}</a></li>`)
    .join('');
}

function paginaProcedimento(dados, params) {
  const procedimento = acharProcedimento(dados, params.procedimento);
  if (!procedimento) {
    window.location.replace('/criativos');
    return;
  }
  document.title = `${procedimento.nome} · Referências Criativos`;
  marcarArea(procedimento, dados);
  definirVolta('/criativos', 'Todos os procedimentos');
  trilha([{ nome: 'Início', href: '/criativos' }, { nome: procedimento.nome }]);
  definir('titulo', procedimento.nome);
  definir('subtitulo', `${procedimento.descricao} Escolha o formato do vídeo.`);
  conteudo.className = 'grade-pastas';
  conteudo.innerHTML = htmlFormatos(procedimento);
}

function paginaFormato(dados, params) {
  const procedimento = acharProcedimento(dados, params.procedimento);
  const formato = acharFormato(dados, params.procedimento, params.formato);
  if (!formato) {
    window.location.replace(
      procedimento ? `procedimento.html?p=${encodeURIComponent(params.procedimento)}` : '/criativos',
    );
    return;
  }
  document.title = `${formato.nome} · ${procedimento.nome}`;
  marcarArea(procedimento, dados);
  definirVolta(`procedimento.html?p=${encodeURIComponent(procedimento.slug)}`, procedimento.nome);
  trilha([
    { nome: 'Início', href: '/criativos' },
    { nome: procedimento.nome, href: `procedimento.html?p=${encodeURIComponent(procedimento.slug)}` },
    { nome: formato.nome },
  ]);
  definir('titulo', formato.nome);
  definir('subtitulo', formato.descricao);
  conteudo.className = 'grade-criativos';
  conteudo.innerHTML = htmlGradeCriativos(procedimento, formato);
}

// o texto sai e entra com um respiro, em vez de trocar seco
function trocarRotulo(botao, texto) {
  if (botao.textContent === texto) return;
  botao.classList.add('trocando');
  setTimeout(() => {
    botao.textContent = texto;
    botao.classList.remove('trocando');
  }, 120);
}

function paginaCriativo(dados, params) {
  const procedimento = acharProcedimento(dados, params.procedimento);
  const formato = acharFormato(dados, params.procedimento, params.formato);
  const criativo = acharCriativo(dados, params.procedimento, params.formato, params.id);
  if (!criativo) {
    let destino = '/criativos';
    if (formato) {
      destino = `formato.html?p=${encodeURIComponent(params.procedimento)}&f=${encodeURIComponent(params.formato)}`;
    } else if (procedimento) {
      destino = `procedimento.html?p=${encodeURIComponent(params.procedimento)}`;
    }
    window.location.replace(destino);
    return;
  }
  document.title = `${criativo.titulo} · Referências Criativos`;
  marcarArea(procedimento, dados);
  definirVolta(
    `formato.html?p=${encodeURIComponent(procedimento.slug)}&f=${encodeURIComponent(formato.slug)}`,
    formato.nome,
  );
  trilha([
    { nome: 'Início', href: '/criativos' },
    { nome: procedimento.nome, href: `procedimento.html?p=${encodeURIComponent(procedimento.slug)}` },
    {
      nome: formato.nome,
      href: `formato.html?p=${encodeURIComponent(procedimento.slug)}&f=${encodeURIComponent(formato.slug)}`,
    },
    { nome: criativo.titulo },
  ]);
  definir('titulo', criativo.titulo);
  definir('subtitulo', '');
  conteudo.className = 'detalhe';
  conteudo.innerHTML = `
    <div class="coluna-video">${htmlPlayer(criativo)}</div>
    <div class="coluna-roteiro">${htmlRoteiro(criativo)}${htmlBotaoCopiar()}</div>`;

  const botaoCopiar = document.getElementById('copiar');
  let voltarRotulo;

  botaoCopiar.addEventListener('click', async () => {
    let rotulo;
    try {
      await navigator.clipboard.writeText(formatarRoteiroTexto(criativo));
      rotulo = 'Roteiro copiado';
    } catch {
      rotulo = 'Não consegui copiar. Selecione o texto acima.';
    }
    trocarRotulo(botaoCopiar, rotulo);
    clearTimeout(voltarRotulo);
    voltarRotulo = setTimeout(() => trocarRotulo(botaoCopiar, 'Copiar roteiro'), 2500);
  });
}

async function iniciar() {
  const params = lerParametros(window.location.search);
  let dados;
  try {
    // o acervo publicado vem antes do arquivo; se o banco falhar, o site abre igual
    let lerRemoto = null;
    try {
      ({ lerAcervoRemoto: lerRemoto } = await import('./acervo.js'));
    } catch { /* sem rede ou CDN fora: segue com o arquivo */ }
    dados = await carregarDados(fetch, lerRemoto);
  } catch (erro) {
    conteudo.className = '';
    conteudo.innerHTML = htmlAviso(erro.message);
    return;
  }
  const pagina = document.body.dataset.pagina;
  if (pagina === 'home') paginaHome(dados);
  else if (pagina === 'nicho') paginaNicho(dados, params);
  else if (pagina === 'procedimento') paginaProcedimento(dados, params);
  else if (pagina === 'formato') paginaFormato(dados, params);
  else if (pagina === 'criativo') paginaCriativo(dados, params);
}

iniciar();
