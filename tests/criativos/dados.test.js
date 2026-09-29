import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  acharCriativo,
  acharFormato,
  acharProcedimento,
  agruparPorArea,
  carregarDados,
  contarCriativos,
} from '../../public/criativos/assets/dados.js';

const dados = JSON.parse(await readFile(new URL('../../public/criativos/criativos.json', import.meta.url), 'utf8'));

test('acha procedimento pelo slug', () => {
  assert.equal(acharProcedimento(dados, 'full-face').nome, 'Full Face');
});

test('devolve null para procedimento inexistente', () => {
  assert.equal(acharProcedimento(dados, 'nao-existe'), null);
});

test('acha formato dentro do procedimento', () => {
  assert.equal(acharFormato(dados, 'full-face', 'bastidor').nome, 'Bastidor do Procedimento');
});

test('devolve null para formato inexistente', () => {
  assert.equal(acharFormato(dados, 'full-face', 'nao-existe'), null);
});

test('devolve null para formato de procedimento inexistente', () => {
  assert.equal(acharFormato(dados, 'nao-existe', 'bastidor'), null);
});

test('acha criativo dentro do formato', () => {
  assert.equal(acharCriativo(dados, 'full-face', 'reacao-de-cliente', 'ff-reacao-02').tipo, 'arquivo');
});

test('devolve null para criativo inexistente', () => {
  assert.equal(acharCriativo(dados, 'full-face', 'bastidor', 'nao-existe'), null);
});

test('conta criativos somando todos os formatos do procedimento', () => {
  for (const procedimento of dados.procedimentos) {
    const soma = procedimento.formatos.reduce((t, f) => t + f.criativos.length, 0);
    assert.equal(contarCriativos(procedimento), soma);
  }
  assert.ok(contarCriativos(acharProcedimento(dados, 'full-face')) > 0);
});

test('agrupa procedimentos por area preservando a ordem', () => {
  const areas = agruparPorArea(dados);
  assert.deepEqual(areas.map((area) => area.nome), ['Face', 'Corpo', 'Capilar']);
  assert.ok(areas[0].procedimentos.length > 0);
});

test('carregarDados devolve o json quando a resposta e ok', async () => {
  const buscar = async () => ({ ok: true, json: async () => dados });
  assert.ok((await carregarDados(buscar)).procedimentos.length > 0);
});

test('carregarDados lanca mensagem amigavel quando a resposta falha', async () => {
  const buscar = async () => ({ ok: false, json: async () => ({}) });
  await assert.rejects(carregarDados(buscar), {
    message: 'Não consegui carregar as referências. Recarrega a página.',
  });
});

test('carregarDados lanca mensagem amigavel quando o json esta fora do formato', async () => {
  const buscar = async () => ({ ok: true, json: async () => ({}) });
  await assert.rejects(carregarDados(buscar), {
    message: 'Não consegui carregar as referências. Recarrega a página.',
  });
});

test('todo procedimento tem os onze formatos padrao', () => {
  const esperado = [
    'reacao-de-cliente', 'antes-e-depois', 'bastidor', 'educacional',
    'autoridade', 'objecao', 'prova-social', 'convite-direto', 'analise-de-caso', 'alerta', 'jornada-da-paciente',
  ];
  for (const procedimento of dados.procedimentos) {
    assert.ok(procedimento.slug && procedimento.nome && procedimento.area);
    assert.deepEqual(procedimento.formatos.map((formato) => formato.slug), esperado);
  }
});

test('todo criativo tem os campos obrigatorios', () => {
  for (const procedimento of dados.procedimentos) {
    for (const formato of procedimento.formatos) {
      for (const criativo of formato.criativos) {
        assert.ok(criativo.id && criativo.titulo && criativo.src);
        assert.ok(['arquivo', 'link'].includes(criativo.tipo));
        assert.ok(criativo.roteiro.gancho && criativo.roteiro.cta);
        assert.ok(criativo.roteiro.desenvolvimento.length > 0);
        assert.ok(criativo.roteiro.ficha.duracao);
        if (criativo.fonte) {
          assert.ok(criativo.fonte.anunciante && criativo.fonte.no_ar_desde);
          assert.ok(criativo.src.startsWith('https://www.facebook.com/ads/library/?id='));
        }
      }
    }
  }
});
