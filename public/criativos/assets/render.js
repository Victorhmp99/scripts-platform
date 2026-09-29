import { resolverEmbed, rotuloExterno, miniatura } from './embed.js';

export function escapar(texto) {
  return String(texto)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function rotuloContagem(total) {
  if (total === 0) return 'Em breve';
  return total === 1 ? '1 criativo' : `${total} criativos`;
}

export function htmlAreas(areas, contar) {
  return areas
    .map(
      (area) => `
      <section class="area" id="${escapar(area.slug)}" data-area="${escapar(area.slug)}">
        <h2 class="area-titulo">${escapar(area.nome)}<span>${area.procedimentos.length}</span></h2>
        <div class="grade-pastas">
          ${area.procedimentos
            .map((procedimento, indice) => {
              const total = contar(procedimento);
              return `
              <a class="cartao-pasta${total === 0 ? ' vazio' : ''}" style="--i:${Math.min(indice, 7)}" href="procedimento.html?p=${escapar(procedimento.slug)}">
                <h3>${escapar(procedimento.nome)}</h3>
                <p>${escapar(procedimento.descricao)}</p>
                <span class="contagem">${escapar(rotuloContagem(total))}</span>
              </a>`;
            })
            .join('')}
        </div>
      </section>`,
    )
    .join('');
}

export function htmlFormatos(procedimento) {
  return procedimento.formatos
    .map(
      (formato, indice) => `
      <a class="cartao-pasta${formato.criativos.length === 0 ? ' vazio' : ''}" style="--i:${indice}" href="formato.html?p=${escapar(procedimento.slug)}&amp;f=${escapar(formato.slug)}">
        <h3>${escapar(formato.nome)}</h3>
        <p>${escapar(formato.descricao)}</p>
        <span class="contagem">${escapar(rotuloContagem(formato.criativos.length))}</span>
      </a>`,
    )
    .join('');
}

function capaDoCartao(criativo) {
  if (criativo.capa) {
    return `<img src="${escapar(criativo.capa)}" alt="" loading="lazy">`;
  }
  if (criativo.tipo === 'arquivo') {
    return `<video src="${escapar(criativo.src)}" preload="metadata" muted playsinline></video>`;
  }

  const previa = miniatura(criativo.src);
  if (previa.modo === 'img') {
    // Se a miniatura não existir mais, o cartão volta a mostrar o título.
    return `<img src="${escapar(previa.src)}" alt="" loading="lazy"
      onerror="this.outerHTML='<span class=\'capa-vazia\'>${escapar(criativo.titulo)}</span>'">`;
  }
  if (previa.modo === 'video') {
    return `<video src="${escapar(previa.src)}" preload="metadata" muted playsinline></video>`;
  }
  if (previa.modo === 'iframe') {
    // pointer-events fica no CSS: o clique tem que chegar no cartão, não no embed.
    const corte = previa.src.includes('instagram.com') ? ' previa-instagram' : '';
    return `<iframe class="previa${corte}" src="${escapar(previa.src)}" loading="lazy" scrolling="no"
      referrerpolicy="strict-origin-when-cross-origin" tabindex="-1" aria-hidden="true"></iframe>`;
  }
  return `<span class="capa-vazia">${escapar(criativo.titulo)}</span>`;
}

export function htmlGradeCriativos(procedimento, formato) {
  if (formato.criativos.length === 0) {
    return htmlAviso('Ainda não tem criativo aqui. Assim que os vídeos entrarem nessa pasta, eles aparecem com o roteiro pronto.');
  }
  return formato.criativos
    .map(
      (criativo, indice) => `
      <a class="cartao-criativo" style="--i:${Math.min(indice, 7)}" href="criativo.html?p=${escapar(procedimento.slug)}&amp;f=${escapar(formato.slug)}&amp;id=${escapar(criativo.id)}">
        <div class="moldura">${capaDoCartao(criativo)}</div>
        <h3>${escapar(criativo.titulo)}</h3>
        ${criativo.fonte ? `<span class="etiqueta">No ar desde ${escapar(criativo.fonte.no_ar_desde)}</span>` : criativo.tipo === 'link' ? '<span class="etiqueta">Post externo</span>' : ''}
      </a>`,
    )
    .join('');
}

export function htmlPlayer(criativo) {
  if (criativo.tipo === 'arquivo') {
    const poster = criativo.capa ? ` poster="${escapar(criativo.capa)}"` : '';
    // Alguns criativos antigos apontam para MP4 que não está no acervo.
    // Em vez de um player preto sem explicação, o bloco se troca por um aviso.
    return `<div class="player-caixa">
      <video class="player" src="${escapar(criativo.src)}" controls playsinline preload="metadata"${poster}
        onerror="this.closest('.player-caixa').classList.add('sem-video')"></video>
      <div class="player-ausente">
        <b>Vídeo indisponível</b>
        <span>O arquivo deste criativo não está no acervo. O roteiro ao lado continua valendo — é ele que você usa para gravar.</span>
      </div>
    </div>`;
  }
  const { modo, src, proporcao } = resolverEmbed(criativo.src);

  if (modo === 'video') {
    const poster = criativo.capa ? ` poster="${escapar(criativo.capa)}"` : '';
    return `<div class="player-caixa">
      <video class="player" src="${escapar(src)}" controls playsinline preload="metadata"${poster}></video>
    </div>`;
  }

  if (modo === 'iframe') {
    return `<div class="player-caixa">
      <iframe class="player player-embed" style="aspect-ratio:${escapar(proporcao || '9 / 16')}" src="${escapar(src)}" loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
        referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
    </div>`;
  }

  // O site de origem nao permite embutir (Biblioteca de Anuncios do Meta bloqueia iframe).
  const capa = criativo.capa
    ? `<img src="${escapar(criativo.capa)}" alt="">`
    : `<span class="capa-vazia">${escapar(criativo.titulo)}</span>`;
  return `
    <div class="player player-externo">
      ${capa}
      <a class="botao" href="${escapar(src)}" target="_blank" rel="noopener noreferrer">${escapar(rotuloExterno(src))}</a>
    </div>`;
}

export function htmlRoteiro(criativo) {
  const { roteiro } = criativo;
  const fonte = criativo.fonte
    ? `<dt>Referência</dt><dd>${escapar(criativo.fonte.anunciante)}, no ar desde ${escapar(criativo.fonte.no_ar_desde)}</dd>`
    : '';
  const passos = roteiro.desenvolvimento.map((passo) => `<li>${escapar(passo)}</li>`).join('');
  const desenvolvimento =
    roteiro.desenvolvimento.length > 0
      ? `<section><h3>Desenvolvimento</h3><ol>${passos}</ol></section>`
      : '';
  return `
    <section><h3>Gancho</h3><p class="destaque">${escapar(roteiro.gancho)}</p></section>
    ${desenvolvimento}
    <section><h3>CTA</h3><p>${escapar(roteiro.cta)}</p></section>
    <section class="ficha">
      <h3>Ficha técnica</h3>
      <dl>
        <dt>Duração</dt><dd>${escapar(roteiro.ficha.duracao)}</dd>
        <dt>Enquadramento</dt><dd>${escapar(roteiro.ficha.enquadramento)}</dd>
        <dt>Cenário</dt><dd>${escapar(roteiro.ficha.cenario)}</dd>
        <dt>Precisa de paciente</dt><dd>${roteiro.ficha.precisa_paciente ? 'sim' : 'não'}</dd>
        ${fonte}
      </dl>
    </section>`;
}

export function htmlBotaoCopiar() {
  return '<button class="botao botao-copiar" id="copiar" type="button">Copiar roteiro</button>';
}

export function htmlAviso(mensagem) {
  return `<p class="aviso">${escapar(mensagem)}</p>`;
}

export function htmlTrilha(itens) {
  return itens
    .map((item) =>
      item.href
        ? `<a href="${escapar(item.href)}">${escapar(item.nome)}</a>`
        : `<span>${escapar(item.nome)}</span>`,
    )
    .join('<i>/</i>');
}
