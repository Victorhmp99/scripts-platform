import test from 'node:test';
import assert from 'node:assert/strict';
import { formatarRoteiroTexto } from '../../public/criativos/assets/roteiro.js';

const criativo = {
  titulo: 'Reação no espelho',
  roteiro: {
    gancho: 'Grave a reação sem aviso.',
    desenvolvimento: ['Espelho virado.', 'Segure o plano.'],
    cta: 'Convite curto no final.',
    ficha: {
      duracao: '20 a 25 segundos',
      enquadramento: 'Vertical',
      cenario: 'Sala com espelho',
      precisa_cliente: true,
    },
  },
};

test('monta o texto com titulo e blocos na ordem', () => {
  const texto = formatarRoteiroTexto(criativo);
  assert.equal(
    texto,
    [
      'REAÇÃO NO ESPELHO',
      '',
      'GANCHO',
      'Grave a reação sem aviso.',
      '',
      'DESENVOLVIMENTO',
      '1. Espelho virado.',
      '2. Segure o plano.',
      '',
      'CTA',
      'Convite curto no final.',
      '',
      'FICHA TÉCNICA',
      'Duração: 20 a 25 segundos',
      'Enquadramento: Vertical',
      'Cenário: Sala com espelho',
      'Precisa de cliente: sim',
    ].join('\n'),
  );
});

test('escreve nao quando o criativo dispensa cliente', () => {
  const semCliente = {
    ...criativo,
    roteiro: { ...criativo.roteiro, ficha: { ...criativo.roteiro.ficha, precisa_cliente: false } },
  };
  assert.ok(formatarRoteiroTexto(semCliente).endsWith('Precisa de cliente: não'));
});

test('ficha gravada com a chave antiga continua valendo', () => {
  // O acervo publicado no banco foi salvo com precisa_paciente. Ler só a
  // chave nova mostraria "não" em todo criativo até alguém republicar.
  const antigo = {
    ...criativo,
    roteiro: { ...criativo.roteiro, ficha: { duracao: '20 a 25 segundos', enquadramento: 'Vertical', cenario: 'Sala com espelho', precisa_paciente: true } },
  };
  assert.ok(formatarRoteiroTexto(antigo).endsWith('Precisa de cliente: sim'));
});

test('omite o bloco de desenvolvimento quando esta vazio', () => {
  const semDesenvolvimento = {
    ...criativo,
    roteiro: { ...criativo.roteiro, desenvolvimento: [] },
  };
  assert.ok(!formatarRoteiroTexto(semDesenvolvimento).includes('DESENVOLVIMENTO'));
});

test('roteiro copiado inclui a referencia quando existe', () => {
  const comFonte = { ...criativo, fonte: { anunciante: 'Huff Life Canoas', no_ar_desde: 'março de 2024' } };
  assert.ok(formatarRoteiroTexto(comFonte).endsWith('Referência: Huff Life Canoas, no ar desde março de 2024'));
});
