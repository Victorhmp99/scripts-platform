import test from 'node:test';
import assert from 'node:assert/strict';
import { lerParametros } from '../../public/criativos/assets/rotas.js';

test('le procedimento, formato e id da query string', () => {
  assert.deepEqual(lerParametros('?p=full-face&f=bastidor&id=ff-bastidor-01'), {
    procedimento: 'full-face',
    formato: 'bastidor',
    id: 'ff-bastidor-01',
  });
});

test('devolve null quando nao ha query string', () => {
  assert.deepEqual(lerParametros(''), { procedimento: null, formato: null, id: null });
});

test('trata parametro vazio como null', () => {
  assert.deepEqual(lerParametros('?p=&f=bastidor'), {
    procedimento: null,
    formato: 'bastidor',
    id: null,
  });
});

test('remove espacos em volta do valor', () => {
  assert.deepEqual(lerParametros('?p=%20full-face%20'), {
    procedimento: 'full-face',
    formato: null,
    id: null,
  });
});
