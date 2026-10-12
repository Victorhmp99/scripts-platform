import test from 'node:test';
import assert from 'node:assert/strict';
import { interpretar } from '../api/_json-ia.js';

test('JSON puro', () => {
  assert.deepEqual(interpretar('{"a":1}'), { a: 1 });
});

test('dentro de cerca de código', () => {
  assert.deepEqual(interpretar('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(interpretar('```\n{"a":1}\n```'), { a: 1 });
});

test('com conversa antes e depois', () => {
  // O Gemini às vezes enfeita a resposta apesar do responseMimeType.
  assert.deepEqual(
    interpretar('Claro! Aqui estão os scripts:\n{"a":1}\nEspero ter ajudado.'),
    { a: 1 },
  );
});

test('com quebras de linha e espaço em volta', () => {
  assert.deepEqual(interpretar('\n\n  {"a": 1}  \n'), { a: 1 });
});

test('objeto aninhado sobrevive ao recorte por chaves', () => {
  const dentro = { scripts: { oi: { 0: 'a}b' } }, lista: [1, 2] };
  assert.deepEqual(interpretar('texto ' + JSON.stringify(dentro) + ' fim'), dentro);
});

test('resposta cortada no meio devolve null', () => {
  // É o caso que mais aparece: estouro de tokens deixa o JSON sem fechar.
  assert.equal(interpretar('{"a":1,"b":{"c":'), null);
});

test('texto sem JSON nenhum devolve null', () => {
  assert.equal(interpretar('Desculpe, não posso ajudar com isso.'), null);
});

test('vazio e nulo devolvem null em vez de explodir', () => {
  assert.equal(interpretar(''), null);
  assert.equal(interpretar(null), null);
  assert.equal(interpretar(undefined), null);
});

test('JSON que não é objeto não passa', () => {
  // Uma resposta "42" ou "\"oi\"" não serve como pacote de scripts.
  assert.equal(interpretar('42'), null);
  assert.equal(interpretar('"oi"'), null);
});
