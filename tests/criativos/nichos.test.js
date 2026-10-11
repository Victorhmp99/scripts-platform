import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  NICHOS_PADRAO,
  acharNicho,
  agruparPorArea,
  contarDoNicho,
  normalizarAcervo,
  procedimentosDoNicho,
} from '../../public/criativos/assets/dados.js';

function procedimento(slug, area, nicho, qtdCriativos = 1) {
  return {
    slug,
    nome: slug,
    area,
    descricao: '',
    ...(nicho ? { nicho } : {}),
    formatos: [{ slug: 'f', nome: 'f', descricao: '', criativos: Array.from({ length: qtdCriativos }, (_, i) => ({ id: `${slug}-${i}` })) }],
  };
}

test('acervo antigo, sem nichos, ganha o catálogo padrão', () => {
  // É o caso real: o acervo publicado no banco foi salvo antes dos nichos
  // existirem. Ele não pode abrir quebrado nem perder conteúdo.
  const antigo = { procedimentos: [procedimento('full-face', 'Face', null)] };
  const d = normalizarAcervo(antigo);

  assert.equal(d.nichos.length, NICHOS_PADRAO.length);
  assert.equal(d.procedimentos[0].nicho, 'saude-e-estetica');
  assert.equal(contarDoNicho(d, 'saude-e-estetica'), 1);
});

test('nicho já gravado manda mais que o padrão', () => {
  const salvo = {
    nichos: [{ slug: 'ecommerce', nome: 'E-commerce', descricao: '' }],
    procedimentos: [procedimento('tenis', 'Calçados', 'ecommerce')],
  };
  const d = normalizarAcervo(salvo);
  assert.deepEqual(d.nichos.map((n) => n.slug), ['ecommerce']);
});

test('nicho citado por um serviço mas ausente da lista não some', () => {
  // Protege contra um acervo editado à mão, ou um nicho removido pela
  // metade: o serviço continuaria existindo e sumiria da navegação.
  const torto = {
    nichos: [{ slug: 'ecommerce', nome: 'E-commerce' }],
    procedimentos: [procedimento('x', 'A', 'orfao')],
  };
  const d = normalizarAcervo(torto);
  assert.ok(d.nichos.some((n) => n.slug === 'orfao'), 'o nicho órfão foi recuperado');
});

test('normalizar não altera o objeto recebido', () => {
  const original = { procedimentos: [procedimento('p', 'A', null)] };
  const copia = JSON.parse(JSON.stringify(original));
  normalizarAcervo(original);
  assert.deepEqual(original, copia);
});

test('agrupa por área apenas dentro do nicho pedido', () => {
  const d = normalizarAcervo({
    nichos: [{ slug: 'a', nome: 'A' }, { slug: 'b', nome: 'B' }],
    procedimentos: [
      procedimento('p1', 'Face', 'a'),
      procedimento('p2', 'Face', 'b'),
      procedimento('p3', 'Corpo', 'a'),
    ],
  });

  const areasDeA = agruparPorArea(d, 'a');
  assert.deepEqual(areasDeA.map((x) => x.nome), ['Face', 'Corpo']);
  assert.deepEqual(areasDeA[0].procedimentos.map((p) => p.slug), ['p1']);

  // sem nicho, agrupa tudo — é o que o painel usa
  assert.equal(agruparPorArea(d).reduce((t, a) => t + a.procedimentos.length, 0), 3);
});

test('conta criativos somando só o nicho', () => {
  const d = normalizarAcervo({
    nichos: [{ slug: 'a', nome: 'A' }, { slug: 'b', nome: 'B' }],
    procedimentos: [procedimento('p1', 'Face', 'a', 3), procedimento('p2', 'Face', 'b', 5)],
  });
  assert.equal(contarDoNicho(d, 'a'), 3);
  assert.equal(contarDoNicho(d, 'b'), 5);
  assert.equal(contarDoNicho(d, 'inexistente'), 0);
});

test('nicho sem serviço nenhum continua listado', () => {
  const d = normalizarAcervo({
    nichos: [{ slug: 'vazio', nome: 'Vazio' }],
    procedimentos: [],
  });
  assert.ok(acharNicho(d, 'vazio'), 'o nicho vazio existe');
  assert.deepEqual(procedimentosDoNicho(d, 'vazio'), []);
  assert.equal(contarDoNicho(d, 'vazio'), 0);
});

test('acervo real do repositório está todo em saúde e estética', () => {
  const dados = JSON.parse(
    readFileSync(new URL('../../public/criativos/criativos.json', import.meta.url), 'utf-8'),
  );
  const d = normalizarAcervo(dados);
  const semNicho = d.procedimentos.filter((p) => !p.nicho);
  assert.equal(semNicho.length, 0, 'todo serviço tem nicho');
  assert.equal(
    d.procedimentos.every((p) => p.nicho === 'saude-e-estetica'),
    true,
    'o acervo atual todo caiu no nicho de saúde e estética',
  );
});
