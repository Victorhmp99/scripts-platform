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
  return normalizarAcervo(dados);
}

/**
 * Carrega o acervo: primeiro o que está publicado no banco; se não houver nada
 * lá, cai no arquivo do repositório. Assim o site nunca fica sem conteúdo.
 * `lerRemoto` é injetável para os testes seguirem rodando sem rede.
 */
export async function carregarDados(buscar = fetch, lerRemoto = null) {
  if (lerRemoto) {
    const remoto = await lerRemoto();
    if (remoto?.dados) return normalizarAcervo(remoto.dados);
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

// ── Nichos ───────────────────────────────────────────────────────────
// O nicho é um campo do procedimento, igual a `area` já era. A lista na
// raiz existe para um nicho recém-criado aparecer no painel antes de
// ter qualquer procedimento dentro.

export const NICHO_PADRAO = { slug: 'saude-e-estetica', nome: 'Saúde e estética' };

/**
 * Catálogo inicial de nichos.
 *
 * Mora aqui, e não só no criativos.json, porque o acervo publicado no banco
 * foi salvo antes dos nichos existirem. Se a lista viesse só do arquivo, o
 * site mostraria um nicho só até alguém republicar pelo painel. Com o padrão
 * no código, os seis aparecem de imediato; publicar apenas os grava.
 *
 * Nicho novo se cria pelo painel — não é para voltar aqui.
 */
export const NICHOS_PADRAO = [
  { slug: 'saude-e-estetica', nome: 'Saúde e estética', descricao: 'Clínicas, consultórios e profissionais de saúde, estética e bem-estar.' },
  { slug: 'negocio-local', nome: 'Negócio local', descricao: 'Quem vende para quem está perto: comércio de rua, serviços de bairro, food.' },
  { slug: 'ecommerce', nome: 'E-commerce', descricao: 'Loja online, marketplace e venda de produto físico pela internet.' },
  { slug: 'servicos-profissionais', nome: 'Serviços profissionais', descricao: 'Advocacia, contabilidade, arquitetura, consultoria e afins.' },
  { slug: 'educacao-e-infoproduto', nome: 'Educação e infoproduto', descricao: 'Curso, mentoria, treinamento e conteúdo pago.' },
  { slug: 'imobiliario', nome: 'Imobiliário', descricao: 'Corretagem, incorporação, locação e investimento em imóvel.' },
];

/**
 * Põe o acervo no formato atual, venha ele de onde vier.
 *
 * O acervo publicado no banco ainda está no formato antigo, sem nichos.
 * Em vez de exigir republicação para o site voltar a funcionar, a
 * normalização acontece na leitura: tudo que não tem nicho cai no padrão.
 */
export function normalizarAcervo(dados) {
  if (!dados || !Array.isArray(dados.procedimentos)) return dados;
  const nichos = Array.isArray(dados.nichos) && dados.nichos.length
    ? dados.nichos.map((n) => ({ ...n }))
    : NICHOS_PADRAO.map((n) => ({ ...n }));

  const procedimentos = dados.procedimentos.map((p) => ({
    ...p,
    nicho: p.nicho || nichos[0].slug,
  }));

  // nicho citado por um procedimento mas ausente da lista não some do site
  for (const p of procedimentos) {
    if (!nichos.some((n) => n.slug === p.nicho)) {
      nichos.push({ slug: p.nicho, nome: p.nicho, descricao: '' });
    }
  }
  return { ...dados, nichos, procedimentos };
}

export function acharNicho(dados, slug) {
  return dados.nichos?.find((nicho) => nicho.slug === slug) ?? null;
}

export function procedimentosDoNicho(dados, slug) {
  return dados.procedimentos.filter((p) => p.nicho === slug);
}

export function contarDoNicho(dados, slug) {
  return procedimentosDoNicho(dados, slug)
    .reduce((total, p) => total + contarCriativos(p), 0);
}

export function agruparPorArea(dados, slugNicho = null) {
  const areas = [];
  const lista = slugNicho ? procedimentosDoNicho(dados, slugNicho) : dados.procedimentos;
  for (const procedimento of lista) {
    let area = areas.find((item) => item.nome === procedimento.area);
    if (!area) {
      area = { nome: procedimento.area, slug: slugificar(procedimento.area), procedimentos: [] };
      areas.push(area);
    }
    area.procedimentos.push(procedimento);
  }
  return areas;
}

/**
 * A ficha trocou `precisa_paciente` por `precisa_cliente` quando a
 * ferramenta deixou de ser só odontológica. O acervo publicado no banco
 * ainda tem a chave antiga, então ler só a nova mostraria "não" para
 * todo criativo até alguém republicar.
 */
export function fichaPrecisaCliente(ficha) {
  return Boolean(ficha?.precisa_cliente ?? ficha?.precisa_paciente);
}
