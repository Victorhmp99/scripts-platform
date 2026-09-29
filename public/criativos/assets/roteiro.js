export function formatarRoteiroTexto(criativo) {
  const { roteiro } = criativo;
  const linhas = [criativo.titulo.toUpperCase(), '', 'GANCHO', roteiro.gancho];

  if (roteiro.desenvolvimento.length > 0) {
    linhas.push('', 'DESENVOLVIMENTO');
    roteiro.desenvolvimento.forEach((passo, indice) => {
      linhas.push(`${indice + 1}. ${passo}`);
    });
  }

  linhas.push('', 'CTA', roteiro.cta);
  linhas.push(
    '',
    'FICHA TÉCNICA',
    `Duração: ${roteiro.ficha.duracao}`,
    `Enquadramento: ${roteiro.ficha.enquadramento}`,
    `Cenário: ${roteiro.ficha.cenario}`,
    `Precisa de paciente: ${roteiro.ficha.precisa_paciente ? 'sim' : 'não'}`,
  );

  if (criativo.fonte) {
    linhas.push(`Referência: ${criativo.fonte.anunciante}, no ar desde ${criativo.fonte.no_ar_desde}`);
  }

  return linhas.join('\n');
}
