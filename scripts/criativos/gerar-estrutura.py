# -*- coding: utf-8 -*-
"""Gera criativos.json com todos os procedimentos e os formatos padrao."""
import os
import json, collections

FORMATOS = [
    ("reacao-de-cliente", "Reação de Cliente", "A paciente vendo o resultado pela primeira vez."),
    ("antes-e-depois", "Antes e Depois", "A transformação lado a lado, dentro das regras do conselho."),
    ("bastidor", "Bastidor do Procedimento", "Como é feito, do preparo à finalização."),
    ("educacional", "Educacional", "Tira-dúvida, mito e verdade, o que ninguém explica."),
    ("autoridade", "Autoridade", "Técnica, formação e segurança. Por que confiar em você."),
    ("objecao", "Quebra de Objeção", "Dói? Incha? Fica natural? Dura quanto tempo?"),
    ("prova-social", "Prova Social", "Avaliação, print e depoimento de quem já passou pela cadeira."),
    ("convite-direto", "Convite Direto", "Você olhando na câmera e chamando pra agendar, sem rodeio."),
    ("analise-de-caso", "Análise de Caso", "A foto da paciente na tela e você riscando por cima o que dá pra fazer."),
    ("alerta", "Alerta", "O que te vendem errado, o truque do vídeo manipulado, o cuidado que ninguém conta."),
    ("jornada-da-paciente", "Jornada da Paciente", "Da chegada na clínica ao resultado, narrado por ela mesma."),
]

PROCEDIMENTOS = [
    ("full-face", "Full Face", "Face", "Harmonização do rosto inteiro, planejada por proporção."),
    ("preenchimento-labial", "Preenchimento Labial", "Face", "Volume, contorno e hidratação dos lábios."),
    ("toxina-botulinica", "Toxina Botulínica", "Face", "Suaviza as linhas de expressão da testa, glabela e olhos."),
    ("preenchimento-de-olheiras", "Preenchimento de Olheiras", "Face", "Preenche o vale lacrimal e tira o ar de cansaço."),
    ("rinomodelacao", "Rinomodelação", "Face", "Ajusta o perfil do nariz sem cirurgia."),
    ("contorno-de-mandibula", "Contorno de Mandíbula", "Face", "Define o ângulo mandibular e o terço inferior."),
    ("preenchimento-de-malar", "Preenchimento de Malar", "Face", "Projeta a maçã do rosto e sustenta o terço médio."),
    ("preenchimento-de-mento", "Preenchimento de Mento", "Face", "Projeta o queixo e equilibra o perfil."),
    ("preenchimento-de-temporas", "Preenchimento de Têmporas", "Face", "Repõe o volume perdido na lateral da testa."),
    ("sulco-nasogeniano", "Sulco Nasogeniano", "Face", "Suaviza o bigode chinês sem pesar o rosto."),
    ("lipo-enzimatica-de-papada", "Lipo Enzimática de Papada", "Face", "Reduz a gordura submentoniana com enzimas."),
    ("toxina-para-bruxismo", "Toxina para Bruxismo", "Face", "Relaxa o masseter, alivia o aperto e afina o rosto."),
    ("sorriso-gengival", "Sorriso Gengival", "Face", "Corrige a exposição excessiva de gengiva ao sorrir."),
    ("fios-de-pdo", "Fios de PDO", "Face", "Sustentação e estímulo de colágeno com fios absorvíveis."),
    ("bioestimulador-de-colageno", "Bioestimulador de Colágeno", "Face", "Firmeza e qualidade de pele construídas ao longo dos meses."),
    ("skinbooster", "Skinbooster", "Face", "Hidratação profunda e brilho de pele."),
    ("microagulhamento", "Microagulhamento", "Face", "Renova a textura, poros e marcas de acne."),
    ("peeling-quimico", "Peeling Químico", "Face", "Clareia manchas e renova a superfície da pele."),
    ("pdrn-e-exossomos", "PDRN e Exossomos", "Face", "Regeneração celular e recuperação da pele."),
    ("intradermoterapia-facial", "Intradermoterapia Facial", "Face", "Ativos aplicados ponto a ponto, no alvo certo."),
    ("bioestimulador-corporal", "Bioestimulador Corporal", "Corpo", "Firmeza para braços, abdômen, glúteo e coxas."),
    ("enzimas-para-gordura-localizada", "Enzimas para Gordura Localizada", "Corpo", "Reduz a gordura de pontos específicos do corpo."),
    ("preenchimento-de-gluteo", "Preenchimento de Glúteo", "Corpo", "Projeção e contorno sem cirurgia."),
    ("tratamento-de-celulite", "Tratamento de Celulite", "Corpo", "Trata os furinhos na causa, não só na superfície."),
    ("tratamento-de-estrias", "Tratamento de Estrias", "Corpo", "Estimula colágeno e melhora a textura da marca."),
    ("hiperidrose", "Hiperidrose", "Corpo", "Controla o suor excessivo das axilas, mãos e pés."),
    ("mesoterapia-capilar", "Mesoterapia Capilar", "Capilar", "Nutre o couro cabeludo e freia a queda."),
    ("microagulhamento-capilar", "Microagulhamento Capilar", "Capilar", "Estimula o folículo e potencializa o tratamento da queda."),
]

dados = {"procedimentos": []}
for slug, nome, area, descricao in PROCEDIMENTOS:
    dados["procedimentos"].append({
        "slug": slug, "nome": nome, "area": area, "descricao": descricao,
        "formatos": [
            {"slug": f_slug, "nome": f_nome, "descricao": f_desc, "criativos": []}
            for f_slug, f_nome, f_desc in FORMATOS
        ],
    })

# O acervo mora em public/criativos desde que a biblioteca entrou no app.
DESTINO = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
                       "public", "criativos", "criativos.json")

with open(DESTINO, "w", encoding="utf-8") as arquivo:
    json.dump(dados, arquivo, ensure_ascii=False, indent=2)

areas = collections.Counter(p["area"] for p in dados["procedimentos"])
print(f'{len(dados["procedimentos"])} procedimentos:', dict(areas))
