/**
 * Encerra a sessão por inatividade.
 *
 * O Supabase guarda a sessão no localStorage e renova o token sozinho,
 * para sempre. Quem entrou uma vez nunca mais sai — nem fechando o
 * navegador, nem depois de uma semana. Para uma ferramenta que abre dados
 * de cliente e tem painel de administração, isso não serve: basta alguém
 * sentar no computador aberto.
 *
 * A contagem vive no localStorage, e não só em memória, por dois motivos:
 * sobrevive a recarregar a página, e é compartilhada entre abas — usar
 * uma aba conta como atividade em todas.
 */
(function () {
  'use strict';

  // 30 minutos parado encerra. 12 horas encerram de qualquer jeito,
  // mesmo com a pessoa usando: é o teto para uma sessão roubada valer.
  var INATIVIDADE_MS = 30 * 60 * 1000;
  var MAXIMO_MS = 12 * 60 * 60 * 1000;

  var CHAVE_ATIVIDADE = 'delta.ultima_atividade';
  var CHAVE_INICIO = 'delta.inicio_sessao';

  // Nas telas de entrada não há o que expirar, e redirecionar para a
  // própria tela criaria um laço.
  var caminho = window.location.pathname.replace(/\/$/, '');
  if (caminho === '' || caminho === '/index' || caminho === '/index.html'
      || caminho.indexOf('set-password') !== -1) {
    return;
  }

  function agora() { return Date.now(); }

  function ler(chave) {
    try { return parseInt(window.localStorage.getItem(chave), 10) || 0; }
    catch (e) { return 0; }   // modo anônimo ou armazenamento bloqueado
  }

  function gravar(chave, valor) {
    try { window.localStorage.setItem(chave, String(valor)); } catch (e) { /* idem */ }
  }

  function temSessao() {
    try {
      for (var i = 0; i < window.localStorage.length; i++) {
        var k = window.localStorage.key(i);
        if (k && k.indexOf('sb-') === 0 && k.indexOf('-auth-token') !== -1) return true;
      }
    } catch (e) { /* idem */ }
    return false;
  }

  function limparSessao() {
    // Tenta pelo cliente, que também avisa o servidor. Se a página não
    // tiver um `sb` à mão, apaga a chave na unha — o efeito para quem
    // está no navegador é o mesmo.
    try {
      if (typeof sb !== 'undefined' && sb && sb.auth) { sb.auth.signOut(); }
    } catch (e) { /* segue para o plano B */ }

    try {
      var apagar = [];
      for (var i = 0; i < window.localStorage.length; i++) {
        var k = window.localStorage.key(i);
        if (k && k.indexOf('sb-') === 0 && k.indexOf('-auth-token') !== -1) apagar.push(k);
      }
      for (var j = 0; j < apagar.length; j++) window.localStorage.removeItem(apagar[j]);
      window.localStorage.removeItem(CHAVE_ATIVIDADE);
      window.localStorage.removeItem(CHAVE_INICIO);
    } catch (e) { /* idem */ }
  }

  function encerrar(motivo) {
    limparSessao();
    window.location.replace('/?expirou=' + motivo);
  }

  /**
   * A decisão, isolada do navegador para poder ser testada.
   * Devolve o motivo de encerrar, ou null para seguir logado.
   */
  function decidir(t, ultima, inicio, temSessao) {
    if (!temSessao) return null;
    if (ultima && t - ultima > INATIVIDADE_MS) return 'inatividade';
    if (inicio && t - inicio > MAXIMO_MS) return 'tempo';
    return null;
  }

  function conferir() {
    var motivo = decidir(agora(), ler(CHAVE_ATIVIDADE), ler(CHAVE_INICIO), temSessao());
    if (motivo) encerrar(motivo);
  }

  function marcarAtividade() {
    if (!temSessao()) return;
    gravar(CHAVE_ATIVIDADE, agora());
    if (!ler(CHAVE_INICIO)) gravar(CHAVE_INICIO, agora());
  }

  // Confere assim que a página abre: pega quem fechou o navegador ontem
  // e voltou hoje, caso em que nenhum temporizador teria corrido.
  conferir();
  marcarAtividade();

  var eventos = ['pointerdown', 'keydown', 'scroll', 'touchstart', 'focus'];
  for (var i = 0; i < eventos.length; i++) {
    window.addEventListener(eventos[i], marcarAtividade, { passive: true, capture: true });
  }

  // Voltar para a aba é o momento mais provável de já ter expirado.
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') { conferir(); marcarAtividade(); }
  });

  window.setInterval(conferir, 60 * 1000);

  // só para os testes: a regra tem que poder ser verificada sem navegador
  window.SessaoDelta = { decidir: decidir, INATIVIDADE_MS: INATIVIDADE_MS, MAXIMO_MS: MAXIMO_MS };
})();
