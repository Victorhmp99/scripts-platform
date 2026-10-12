// Leitura do JSON que um modelo de linguagem devolve.
//
// O arquivo começa com "_" para a Vercel não expor como rota.
//
// Mesmo pedindo JSON explicitamente (responseMimeType, ou a instrução no
// prompt), a resposta às vezes vem embrulhada em cerca de código ou com
// uma frase de cortesia em volta. E, quando estoura o limite de tokens,
// vem cortada no meio. Quem chama precisa distinguir "veio torto mas dá
// para ler" de "não veio" — por isso aqui devolve null em vez de lançar.

/**
 * @param {string} texto resposta crua do modelo
 * @returns {object|null} o objeto, ou null se não houver JSON utilizável
 */
export function interpretar(texto) {
  if (!texto) return null;

  const tentativas = [texto];

  const cerca = texto.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (cerca) tentativas.push(cerca[1]);

  // do primeiro { até o último }: descarta conversa antes e depois
  const abre = texto.indexOf('{');
  const fecha = texto.lastIndexOf('}');
  if (abre !== -1 && fecha > abre) tentativas.push(texto.slice(abre, fecha + 1));

  for (const t of tentativas) {
    try {
      const v = JSON.parse(t.trim());
      // um número ou uma string solta não servem como pacote de dados
      if (v && typeof v === 'object') return v;
    } catch { /* tenta a próxima forma */ }
  }
  return null;
}
