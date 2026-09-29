// Descobre como mostrar um criativo do tipo "link".
// Devolve { modo, src, proporcao } onde modo e 'iframe', 'video' ou 'externo'.
// 'externo' e o ultimo caso: o site nao deixa embutir (Biblioteca de Anuncios do Meta,
// por exemplo, manda X-Frame-Options e o iframe fica branco).

function id(padrao, url) {
  const achado = url.match(padrao);
  return achado ? achado[1] : null;
}

export function resolverEmbed(url) {
  const bruto = String(url || '').trim();
  if (!bruto) return { modo: 'externo', src: bruto };

  // Arquivo de vídeo servido direto (inclusive o acervo local).
  if (/\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(bruto)) {
    return { modo: 'video', src: bruto };
  }

  const yt =
    id(/youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)([\w-]{6,})/i, bruto) ||
    id(/youtu\.be\/([\w-]{6,})/i, bruto);
  if (yt) return { modo: 'iframe', src: `https://www.youtube.com/embed/${yt}?rel=0`, proporcao: '16 / 9' };

  const vimeo = id(/vimeo\.com\/(?:video\/)?(\d+)/i, bruto);
  if (vimeo) return { modo: 'iframe', src: `https://player.vimeo.com/video/${vimeo}`, proporcao: '16 / 9' };

  const insta = id(/instagram\.com\/(?:[\w.]+\/)?(?:reel|reels|p|tv)\/([\w-]+)/i, bruto);
  if (insta) return { modo: 'iframe', src: `https://www.instagram.com/p/${insta}/embed/captioned`, proporcao: '9 / 14' };

  // TikTok fica de fora de propósito: o embed dele responde
  // "overload-protect triggered" ou carrega em branco. Melhor um botão
  // honesto do que um quadro vazio.

  const drive = id(/drive\.google\.com\/file\/d\/([\w-]+)/i, bruto);
  if (drive) return { modo: 'iframe', src: `https://drive.google.com/file/d/${drive}/preview`, proporcao: '16 / 9' };

  const loom = id(/loom\.com\/(?:share|embed)\/([\w]+)/i, bruto);
  if (loom) return { modo: 'iframe', src: `https://www.loom.com/embed/${loom}`, proporcao: '16 / 9' };

  return { modo: 'externo', src: bruto };
}

// Rotulo do botao quando nao da para embutir.
export function rotuloExterno(url) {
  const u = String(url || '');
  if (/facebook\.com\/ads\/library/i.test(u)) return 'Abrir na Biblioteca de Anúncios';
  if (/tiktok\.com/i.test(u)) return 'Abrir no TikTok';
  return 'Abrir o post original';
}

// Prévia para o cartão da grade: a pessoa ver o vídeo antes de clicar.
// Devolve { modo, src } — 'img' quando a plataforma publica uma miniatura,
// 'video' para arquivo (o navegador desenha o primeiro quadro), 'iframe'
// quando só o embed mostra alguma coisa, e 'nenhum' quando não há prévia.
export function miniatura(url) {
  const bruto = String(url || '').trim();
  if (!bruto) return { modo: 'nenhum', src: '' };

  const yt =
    id(/youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)([\w-]{6,})/i, bruto) ||
    id(/youtu\.be\/([\w-]{6,})/i, bruto);
  if (yt) return { modo: 'img', src: `https://img.youtube.com/vi/${yt}/hqdefault.jpg` };

  const drive = id(/drive\.google\.com\/file\/d\/([\w-]+)/i, bruto);
  if (drive) return { modo: 'img', src: `https://drive.google.com/thumbnail?id=${drive}&sz=w640` };

  const { modo, src } = resolverEmbed(bruto);
  if (modo === 'video') return { modo: 'video', src };
  if (modo === 'iframe') {
    // No cartão o embed do Instagram entra sem a legenda: cabe melhor.
    return { modo: 'iframe', src: src.replace('/embed/captioned', '/embed') };
  }
  return { modo: 'nenhum', src: bruto };
}
