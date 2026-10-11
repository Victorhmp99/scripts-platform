import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

/**
 * Carrega o sessao.js num navegador de mentira, só com o suficiente para
 * ele rodar. O que interessa é a regra de decisão, não o DOM.
 */
function carregar() {
  const codigo = readFileSync(new URL('../public/sessao.js', import.meta.url), 'utf-8');
  const janela = {
    location: { pathname: '/portal', replace() {} },
    localStorage: {
      length: 0,
      key: () => null,
      getItem: () => null,
      setItem() {},
      removeItem() {},
    },
    addEventListener() {},
    setInterval() {},
  };
  const contexto = {
    window: janela,
    document: { addEventListener() {}, visibilityState: 'visible' },
  };
  contexto.globalThis = contexto;
  vm.createContext(contexto);
  vm.runInContext(codigo, contexto);
  return janela.SessaoDelta;
}

const S = carregar();
const MIN = 60 * 1000;
const AGORA = 1_000_000_000_000;

test('expõe a regra e os prazos', () => {
  assert.equal(typeof S.decidir, 'function');
  assert.equal(S.INATIVIDADE_MS, 30 * MIN);
  assert.equal(S.MAXIMO_MS, 12 * 60 * MIN);
});

test('sem sessão, não há o que encerrar', () => {
  // Importante: visitante não logado não pode ser redirecionado em laço.
  assert.equal(S.decidir(AGORA, AGORA - 99 * MIN, AGORA - 99 * MIN, false), null);
});

test('dentro do prazo, segue logado', () => {
  assert.equal(S.decidir(AGORA, AGORA - 29 * MIN, AGORA - 60 * MIN, true), null);
});

test('encerra depois de 30 minutos parado', () => {
  assert.equal(S.decidir(AGORA, AGORA - 31 * MIN, AGORA - 31 * MIN, true), 'inatividade');
});

test('o limite exato não encerra; um instante depois, sim', () => {
  assert.equal(S.decidir(AGORA, AGORA - 30 * MIN, AGORA - 30 * MIN, true), null);
  assert.equal(S.decidir(AGORA, AGORA - 30 * MIN - 1, AGORA - 30 * MIN, true), 'inatividade');
});

test('encerra em 12 horas mesmo com a pessoa usando', () => {
  // Atividade agora mesmo, mas a sessão começou há 13 horas: é o teto que
  // limita o estrago de uma sessão roubada.
  assert.equal(S.decidir(AGORA, AGORA - 1 * MIN, AGORA - 13 * 60 * MIN, true), 'tempo');
});

test('inatividade tem precedência sobre o teto', () => {
  assert.equal(S.decidir(AGORA, AGORA - 40 * MIN, AGORA - 13 * 60 * MIN, true), 'inatividade');
});

test('marcador ausente não encerra sozinho', () => {
  // Sessão recém-criada, antes do primeiro registro de atividade.
  assert.equal(S.decidir(AGORA, 0, 0, true), null);
});
