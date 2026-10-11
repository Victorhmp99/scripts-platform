export function lerParametros(queryString) {
  const params = new URLSearchParams(queryString);
  const limpar = (valor) => {
    if (valor === null) return null;
    const limpo = valor.trim();
    return limpo === '' ? null : limpo;
  };
  return {
    nicho: limpar(params.get('n')),
    procedimento: limpar(params.get('p')),
    formato: limpar(params.get('f')),
    id: limpar(params.get('id')),
  };
}
