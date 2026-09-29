import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// O acervo mora em public/criativos desde que a biblioteca entrou no app.
const raizRepo = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const raiz = path.join(raizRepo, 'public', 'criativos');

const dados = JSON.parse(await readFile(path.join(raiz, 'criativos.json'), 'utf8'));

const procedimentosNoJson = new Map(dados.procedimentos.map((p) => [p.slug, p]));
const fontesNoJson = new Set(
  dados.procedimentos.flatMap((p) =>
    p.formatos.flatMap((f) => f.criativos.map((c) => c.src)),
  ),
);

async function subpastas(diretorio) {
  const entradas = await readdir(diretorio, { withFileTypes: true });
  return entradas.filter((e) => e.isDirectory()).map((e) => e.name);
}

const novos = [];
const fontesEmDisco = new Set();

for (const procedimento of await subpastas(path.join(raiz, 'videos'))) {
  const noJson = procedimentosNoJson.get(procedimento);
  if (!noJson) {
    console.log(`[procedimento novo] videos/${procedimento} ainda não existe no criativos.json`);
  }
  const formatosNoJson = new Set(noJson ? noJson.formatos.map((f) => f.slug) : []);

  for (const formato of await subpastas(path.join(raiz, 'videos', procedimento))) {
    if (noJson && !formatosNoJson.has(formato)) {
      console.log(`[formato novo] videos/${procedimento}/${formato} ainda não existe no criativos.json`);
    }
    const arquivos = await readdir(path.join(raiz, 'videos', procedimento, formato));
    for (const arquivo of arquivos) {
      if (!arquivo.toLowerCase().endsWith('.mp4')) continue;
      const src = `videos/${procedimento}/${formato}/${arquivo}`;
      fontesEmDisco.add(src);
      if (!fontesNoJson.has(src)) novos.push(src);
    }
  }
}

for (const src of fontesNoJson) {
  if (src.startsWith('videos/') && !fontesEmDisco.has(src)) {
    console.log(`[arquivo sumiu] ${src} está no criativos.json mas não está na pasta`);
  }
}

// videos soltos na caixa de entrada ou na raiz: ainda sem procedimento nem formato
const soltos = [];
for (const pasta of ['_entrada', '.']) {
  let arquivos = [];
  try {
    arquivos = await readdir(path.join(raiz, pasta));
  } catch {
    continue;
  }
  for (const arquivo of arquivos) {
    if (arquivo.toLowerCase().endsWith('.mp4')) {
      soltos.push(pasta === '.' ? arquivo : `${pasta}/${arquivo}`);
    }
  }
}

if (soltos.length > 0) {
  console.log(`\n${soltos.length} vídeo(s) aguardando classificação:`);
  soltos.forEach((src) => console.log(`  ${src}`));
  console.log('  (o Claude assiste, descobre procedimento e formato, e leva pra pasta certa)');
}

if (novos.length === 0) {
  console.log('Nenhum vídeo novo. Tudo que está na pasta já está no site.');
} else {
  console.log(`\n${novos.length} vídeo(s) sem entrada no criativos.json:`);
  novos.forEach((src) => console.log(`  ${src}`));
}
