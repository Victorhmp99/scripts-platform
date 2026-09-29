import test from 'node:test';
import assert from 'node:assert/strict';
import { resolverEmbed, rotuloExterno } from '../../public/criativos/assets/embed.js';

test('youtube em qualquer formato de url vira player embutido', () => {
  for (const url of [
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ',
    'https://www.youtube.com/shorts/dQw4w9WgXcQ',
  ]) {
    assert.deepEqual(resolverEmbed(url), {
      modo: 'iframe',
      src: 'https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0',
      proporcao: '16 / 9',
    });
  }
});

test('reel do instagram vira embed vertical', () => {
  const r = resolverEmbed('https://www.instagram.com/clinica/reel/C1a_b2C3d/');
  assert.equal(r.modo, 'iframe');
  assert.ok(r.src.includes('/p/C1a_b2C3d/embed'));
});

test('vimeo, drive e loom tambem embutem', () => {
  assert.equal(resolverEmbed('https://vimeo.com/76979871').modo, 'iframe');
  assert.equal(resolverEmbed('https://drive.google.com/file/d/1AbC_dEf/view').modo, 'iframe');
  assert.equal(resolverEmbed('https://www.loom.com/embed/abc123').modo, 'iframe');
});

test('arquivo de video direto vira tag video', () => {
  assert.equal(resolverEmbed('https://cdn.exemplo.com/v.mp4?x=1').modo, 'video');
  assert.equal(resolverEmbed('videos/full-face/bastidor/a.mp4').modo, 'video');
});

test('quem bloqueia iframe cai no modo externo', () => {
  const url = 'https://www.facebook.com/ads/library/?id=123';
  assert.equal(resolverEmbed(url).modo, 'externo');
  assert.equal(rotuloExterno(url), 'Abrir na Biblioteca de Anúncios');
  assert.equal(rotuloExterno('https://site.com/post'), 'Abrir o post original');
});

// O embed do TikTok responde "overload-protect triggered" ou vem em branco.
test('tiktok fica de fora do embed e vira botao', () => {
  const url = 'https://www.tiktok.com/@u/video/7212345678901234567';
  assert.equal(resolverEmbed(url).modo, 'externo');
  assert.equal(rotuloExterno(url), 'Abrir no TikTok');
});

test('url vazia nao quebra', () => {
  assert.equal(resolverEmbed('').modo, 'externo');
  assert.equal(resolverEmbed(null).modo, 'externo');
});

test('miniatura: youtube e drive publicam imagem', async () => {
  const { miniatura } = await import('../../public/criativos/assets/embed.js');
  assert.deepEqual(miniatura('https://youtu.be/dQw4w9WgXcQ'), {
    modo: 'img', src: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
  });
  assert.equal(miniatura('https://drive.google.com/file/d/1AbC/view').modo, 'img');
});

test('miniatura: instagram so mostra pelo embed, e sem a legenda', async () => {
  const { miniatura } = await import('../../public/criativos/assets/embed.js');
  const m = miniatura('https://www.instagram.com/reel/Ddwin6atVAA/');
  assert.equal(m.modo, 'iframe');
  assert.ok(m.src.endsWith('/embed'), m.src);
});

test('miniatura: arquivo de video desenha o primeiro quadro', async () => {
  const { miniatura } = await import('../../public/criativos/assets/embed.js');
  assert.equal(miniatura('https://cdn.exemplo.com/a.mp4').modo, 'video');
});

test('miniatura: quem nao embute fica sem previa', async () => {
  const { miniatura } = await import('../../public/criativos/assets/embed.js');
  assert.equal(miniatura('https://www.facebook.com/ads/library/?id=1').modo, 'nenhum');
  assert.equal(miniatura('https://www.tiktok.com/@u/video/7212345678901234567').modo, 'nenhum');
  assert.equal(miniatura('').modo, 'nenhum');
});
