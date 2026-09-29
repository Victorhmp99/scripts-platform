// Uma crase perdida num template literal derrubou a Central inteira em
// produção, e nenhum teste pegou: os testes só olhavam os módulos de
// dados. Este aqui lê o JavaScript de TODA página e de todo arquivo .js
// servido e só verifica se compila — barato, e pega o erro bobo.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';

const RAIZ = path.join(import.meta.dirname, '..', 'public');

function varrer(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const cheio = path.join(dir, e.name);
    return e.isDirectory() ? varrer(cheio) : [cheio];
  });
}

const arquivos = varrer(RAIZ);
const htmls = arquivos.filter((f) => f.endsWith('.html'));
const scripts = arquivos.filter((f) => f.endsWith('.js'));

assert.ok(htmls.length > 5, 'esperava encontrar as páginas em public/');

for (const arquivo of htmls) {
  const nome = path.relative(RAIZ, arquivo).split(path.sep).join('/');
  test(`${nome}: o script embutido compila`, () => {
    const html = fs.readFileSync(arquivo, 'utf8');
    const blocos = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
    for (const [, codigo] of blocos) {
      if (!codigo.trim()) continue;
      assert.doesNotThrow(() => new vm.Script(codigo, { filename: nome }));
    }
  });
}

for (const arquivo of scripts) {
  const nome = path.relative(RAIZ, arquivo).split(path.sep).join('/');
  test(`${nome}: compila`, () => {
    // .mjs para o --check aceitar import/export
    const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'gh-')), 'a.mjs');
    fs.writeFileSync(tmp, fs.readFileSync(arquivo));
    const r = spawnSync(process.execPath, ['--check', tmp], { encoding: 'utf8' });
    assert.equal(r.status, 0, `${nome}\n${r.stderr}`);
  });
}
