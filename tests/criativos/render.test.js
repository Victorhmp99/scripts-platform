import test from 'node:test';
import assert from 'node:assert/strict';
import {
  escapar,
  htmlAreas,
  htmlAviso,
  htmlBotaoCopiar,
  htmlFormatos,
  htmlGradeCriativos,
  htmlPlayer,
  htmlRoteiro,
  htmlTrilha,
} from '../../public/criativos/assets/render.js';

const criativoArquivo = {
  id: 'ff-bastidor-01',
  titulo: 'A marcação do rosto',
  tipo: 'arquivo',
  src: 'videos/full-face/bastidor/ff-bastidor-01.mp4',
  capa: null,
  roteiro: {
    gancho: 'Abra na caneta desenhando os pontos.',
    desenvolvimento: ['Mostre a marcação em close.'],
    cta: 'Convide pra avaliação.',
    ficha: { duracao: '30s', enquadramento: 'Vertical', cenario: 'Consultório', precisa_paciente: true },
  },
};

const criativoLink = { ...criativoArquivo, id: 'proc-01', tipo: 'link', src: 'https://www.instagram.com/reel/EXEMPLO/' };
// A Biblioteca de Anuncios do Meta manda X-Frame-Options: o iframe fica branco, entao vira botao.
const criativoExterno = { ...criativoLink, id: 'proc-02', src: 'https://www.facebook.com/ads/library/?id=123' };

const formatoCheio = { slug: 'bastidor', nome: 'Bastidor do Procedimento', descricao: 'Como é feito.', criativos: [criativoArquivo] };
const formatoVazio = { slug: 'educacional', nome: 'Educacional', descricao: 'Tira-dúvida.', criativos: [] };
const procedimento = { slug: 'full-face', nome: 'Full Face', area: 'Face', descricao: 'Rosto inteiro.', formatos: [formatoCheio, formatoVazio] };
const areas = [{ nome: 'Face', procedimentos: [procedimento] }];
const contar = (proc) => proc.formatos.reduce((t, f) => t + f.criativos.length, 0);

test('escapa caracteres perigosos', () => {
  assert.equal(escapar('<img src=x onerror="a">'), '&lt;img src=x onerror=&quot;a&quot;&gt;');
});

test('home agrupa por area e linka o procedimento', () => {
  const html = htmlAreas(areas, contar);
  assert.ok(html.includes('area-titulo'));
  assert.ok(html.includes('Face'));
  assert.ok(html.includes('href="procedimento.html?p=full-face"'));
  assert.ok(html.includes('1 criativo'));
});

test('procedimento sem criativo ganha a classe vazio e o rotulo em breve', () => {
  const html = htmlAreas([{ nome: 'Face', procedimentos: [{ ...procedimento, formatos: [formatoVazio] }] }], contar);
  assert.ok(html.includes('cartao-pasta vazio'));
  assert.ok(html.includes('Em breve'));
});

test('lista os formatos do procedimento', () => {
  const html = htmlFormatos(procedimento);
  assert.ok(html.includes('href="formato.html?p=full-face&amp;f=bastidor"'));
  assert.ok(html.includes('Bastidor do Procedimento'));
  assert.ok(html.includes('Em breve'));
});

test('grade de criativos aponta para a pagina do criativo', () => {
  const html = htmlGradeCriativos(procedimento, formatoCheio);
  assert.ok(html.includes('href="criativo.html?p=full-face&amp;f=bastidor&amp;id=ff-bastidor-01"'));
  assert.ok(html.includes('preload="metadata"'));
});

test('formato vazio mostra estado vazio', () => {
  assert.ok(htmlGradeCriativos(procedimento, formatoVazio).includes('Ainda não tem criativo aqui'));
});

test('player de arquivo usa video com preload metadata', () => {
  const html = htmlPlayer(criativoArquivo);
  assert.ok(html.includes('<video'));
  assert.ok(html.includes('preload="metadata"'));
});

test('player de link embute o video quando a plataforma deixa', () => {
  const html = htmlPlayer(criativoLink);
  assert.ok(html.includes('<iframe'));
  assert.ok(html.includes('https://www.instagram.com/p/EXEMPLO/embed/captioned'));
  assert.ok(html.includes('allowfullscreen'));
});

test('player de mp4 por link vira video de verdade', () => {
  const html = htmlPlayer({ ...criativoLink, src: 'https://cdn.exemplo.com/a.mp4' });
  assert.ok(html.includes('<video'));
  assert.ok(html.includes('controls'));
});

test('link que nao aceita iframe cai no botao em aba nova', () => {
  const html = htmlPlayer(criativoExterno);
  assert.ok(!html.includes('<iframe'));
  assert.ok(html.includes('target="_blank"'));
  assert.ok(html.includes('rel="noopener noreferrer"'));
});

test('roteiro renderiza os quatro blocos', () => {
  const html = htmlRoteiro(criativoArquivo);
  assert.ok(html.includes('Gancho'));
  assert.ok(html.includes('Desenvolvimento'));
  assert.ok(html.includes('CTA'));
  assert.ok(html.includes('Ficha técnica'));
});

test('criativo com fonte mostra a referencia e o tempo no ar', () => {
  const comFonte = { ...criativoExterno, fonte: { anunciante: 'Clínica Onlyou', no_ar_desde: 'abril de 2026' } };
  const ficha = htmlRoteiro(comFonte);
  assert.ok(ficha.includes('Referência'));
  assert.ok(ficha.includes('Clínica Onlyou, no ar desde abril de 2026'));
  const player = htmlPlayer(comFonte);
  assert.ok(player.includes('Abrir na Biblioteca de Anúncios'));
  const grade = htmlGradeCriativos(procedimento, { ...formatoCheio, criativos: [comFonte] });
  assert.ok(grade.includes('No ar desde abril de 2026'));
});

test('botao de copiar tem id e rotulo', () => {
  const html = htmlBotaoCopiar();
  assert.ok(html.includes('id="copiar"'));
  assert.ok(html.includes('Copiar roteiro'));
});

test('trilha separa os niveis e so linka quem tem href', () => {
  const html = htmlTrilha([{ nome: 'Início', href: 'index.html' }, { nome: 'Full Face' }]);
  assert.ok(html.includes('href="index.html"'));
  assert.ok(html.includes('<span>Full Face</span>'));
  assert.ok(html.includes('<i>/</i>'));
});

test('aviso mostra a mensagem recebida', () => {
  assert.ok(htmlAviso('Deu ruim').includes('Deu ruim'));
});
