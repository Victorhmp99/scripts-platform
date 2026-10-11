import test from 'node:test';
import assert from 'node:assert/strict';
import { lerParametros } from '../../public/criativos/assets/rotas.js';

test('le nicho, procedimento, formato e id da query string', () => {
  assert.deepEqual(lerParametros('?n=saude-e-estetica&p=full-face&f=bastidor&id=ff-bastidor-01'), {
    nicho: 'saude-e-estetica',
    procedimento: 'full-face',
    formato: 'bastidor',
    id: 'ff-bastidor-01',
  });
});

test('devolve null quando nao ha query string', () => {
  assert.deepEqual(lerParametros(''), {
    nicho: null,
    procedimento: null,
    formato: null,
    id: null,
  });
});

test('trata parametro vazio como null', () => {
  assert.deepEqual(lerParametros('?p=&f=bastidor'), {
    nicho: null,
    procedimento: null,
    formato: 'bastidor',
    id: null,
  });
});

test('remove espacos em volta do valor', () => {
  assert.deepEqual(lerParametros('?n=%20ecommerce%20&p=%20full-face%20'), {
    nicho: 'ecommerce',
    procedimento: 'full-face',
    formato: null,
    id: null,
  });
});

test('link antigo sem nicho continua valendo', () => {
  // Links já compartilhados apontam para /criativos/procedimento?p=...
  // sem o parâmetro de nicho. A leitura não pode falhar por causa disso.
  assert.deepEqual(lerParametros('?p=full-face'), {
    nicho: null,
    procedimento: 'full-face',
    formato: null,
    id: null,
  });
});
