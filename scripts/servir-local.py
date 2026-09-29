"""Servidor local que imita o cleanUrls do Vercel.

O python -m http.server simples nao resolve /portal para portal.html,
entao o que funciona em producao dava 404 na conferencia local.
"""
import os, sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

RAIZ = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'public')


class Limpo(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        destino = super().translate_path(path)
        if os.path.isdir(destino):
            indice = os.path.join(destino, 'index.html')
            if os.path.isfile(indice):
                return indice
        if not os.path.exists(destino) and not destino.endswith('.html'):
            comHtml = destino + '.html'
            if os.path.isfile(comHtml):
                return comHtml
        return destino

    def log_message(self, *args):
        pass


if __name__ == '__main__':
    porta = int(sys.argv[1]) if len(sys.argv) > 1 else 8093
    os.chdir(RAIZ)
    print('servindo %s em http://127.0.0.1:%d (URLs limpas)' % (RAIZ, porta))
    ThreadingHTTPServer(('127.0.0.1', porta), Limpo).serve_forever()
