const ERRO_CARGA = 'Não consegui carregar as referências. Recarrega a página.';

/** Lê o criativos.json do repositório. É a retaguarda do acervo publicado. */
export async function carregarDoArquivo(buscar = fetch) {
  let dados;
  try {
    // Caminho absoluto: em /criativos (sem barra final) o relativo
    // resolveria para /criativos.json, fora da pasta.
    const resposta = await buscar('/criativos/criativos.json');
    if (!resposta.ok) throw new Error(ERRO_CARGA);
    dados = await resposta.json();
  } catch {
    throw new Error(ERRO_CARGA);
  }
  if (!dados || !Array.isArray(dados.procedimentos)) throw new Error(ERRO_CARGA);
  return dados;
}

/**
 * Carrega o acervo: primeiro o que está publicado no banco; se não houver nada
 * lá, cai no arquivo do repositório. Assim o site nunca fica sem conteúdo.
 * `lerRemoto` é injetável para os testes seguirem rodando sem rede.
 */
export async function carregarDados(buscar = fetch, lerRemoto = null) {
  if (lerRemoto) {
    const remoto = await lerRemoto();
    if (remoto?.dados) return remoto.dados;
  }
  return carregarDoArquivo(buscar);
}

export function acharProcedimento(dados, slug) {
  return dados.procedimentos.find((procedimento) => procedimento.slug === slug) ?? null;
}

export function acharFormato(dados, slugProcedimento, slugFormato) {
  const procedimento = acharProcedimento(dados, slugProcedimento);
  if (!procedimento) return null;
  return procedimento.formatos.find((formato) => formato.slug === slugFormato) ?? null;
}

export function acharCriativo(dados, slugProcedimento, slugFormato, id) {
  const formato = acharFormato(dados, slugProcedimento, slugFormato);
  if (!formato) return null;
  return formato.criativos.find((criativo) => criativo.id === id) ?? null;
}

export function contarCriativos(procedimento) {
  return procedimento.formatos.reduce((total, formato) => total + formato.criativos.length, 0);
}

export function slugificar(texto) {
  return String(texto)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function agruparPorArea(dados) {
  const areas = [];
  for (const procedimento of dados.procedimentos) {
    let area = areas.find((item) => item.nome === procedimento.area);
    if (!area) {
      area = { nome: procedimento.area, slug: slugificar(procedimento.area), procedimentos: [] };
      areas.push(area);
    }
    area.procedimentos.push(procedimento);
  }
  return areas;
}
