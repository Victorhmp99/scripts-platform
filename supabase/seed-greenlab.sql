-- ============================================================
-- Seed: Scripts originais do Green Lab para a conta admin
--
-- COMO USAR:
-- 1. Execute o schema.sql primeiro
-- 2. Crie sua conta de admin pelo Supabase (Authentication > Users)
-- 3. Rode este arquivo no SQL Editor
-- 4. Execute a linha abaixo substituindo pelo SEU user ID:
--    UPDATE profiles SET role = 'admin', company_id = 'a0000000-0000-0000-0000-000000000001', full_name = 'Green Lab Admin' WHERE id = 'SEU_USER_ID_AQUI';
-- ============================================================

-- Cria a empresa Green Lab com ID fixo
INSERT INTO companies (
  id, name, industry, services, target_audience,
  pain_points, value_prop, setup_complete
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Green Lab',
  'Assessoria Comercial Odontológica',
  'Estruturação comercial, geração de demanda qualificada, treinamento de equipe de vendas para clínicas odontológicas',
  'Clínicas odontológicas em Brasília/Taguatinga com 1-5 cadeiras',
  'Dependência de indicação, falta de previsibilidade de faturamento, processos comerciais inexistentes ou mal estruturados',
  'Estruturamos o processo comercial de clínicas odontológicas do zero, gerando previsibilidade de faturamento em até 90 dias',
  true
) ON CONFLICT (id) DO NOTHING;

-- Insere os scripts originais do Green Lab
INSERT INTO company_scripts (company_id, scripts, qual, aq)
VALUES (
  'a0000000-0000-0000-0000-000000000001',

  -- scripts (D object convertido para JSONB)
  '{
    "primeiro-contato": {
      "0": "Olá, Doutor(a) [NOME]! Tudo bem? Meu nome é [SEU NOME], sou de Taguatinga e trabalho com uma assessoria especializada em clínicas odontológicas. Gostaria de marcar um momento rápido para conversar. Quando seria um bom horário?",
      "1": "Oi, Doutor(a) [NOME]! Aqui é [SEU NOME], de Taguatinga. Trabalho com assessoria para clínicas odontológicas e acredito que temos algo que pode fazer sentido para o momento da sua clínica. Tem um tempinho para conversar?",
      "2": "Olá, Doutor(a) [NOME]! Meu nome é [SEU NOME], sou daqui de Taguatinga. Trabalho com clínicas odontológicas ajudando a estruturar o comercial e gerar demanda qualificada. Posso te contar mais?",
      "3": "Oi, Doutor(a) [NOME]! Aqui é [SEU NOME]. Tenho trabalhado com clínicas odontológicas aqui em Brasília e acredito que vale a pena a gente bater um papo rápido. Quando seria um bom momento?",
      "4": "Olá, Doutor(a) [NOME]! Sou [SEU NOME], de Taguatinga. Trabalho com assessoria odontológica e gostaria de entender melhor o momento da sua clínica. Faz sentido conversar?"
    },
    "agradecimento": {
      "0": "Doutor(a) [NOME], foi um prazer conversar! Fico animado com o que você me contou sobre a clínica. Qualquer dúvida estou à disposição. Até a nossa reunião!",
      "1": "Doutor(a) [NOME], obrigado pelo papo! O que você me contou sobre [INFORMAÇÃO COLETADA] fez muito sentido. Tenho certeza que a gente consegue resolver isso. Até logo!",
      "2": "Foi muito bom falar com você, Doutor(a) [NOME]! Com base no que conversamos já consigo enxergar alguns pontos importantes. Ansioso para nossa reunião!",
      "3": "Doutor(a) [NOME], obrigado pela atenção e pela abertura! Raramente encontro um doutor que enxerga o problema tão claramente. Isso já é meio caminho andado. Até breve!",
      "4": "Que bom que conseguimos falar, Doutor(a) [NOME]! O que você me contou sobre [INFORMAÇÃO COLETADA] é exatamente o tipo de situação que a gente resolve. Até a reunião!"
    },
    "confirmacao": {
      "0": "Doutor(a) [NOME], confirmando nossa reunião para [DIA] às [HORÁRIO]. Nosso especialista estará te esperando. Qualquer imprevisto me avisa!",
      "1": "Reunião confirmada, Doutor(a) [NOME]! [DIA] às [HORÁRIO]. Vai ser rápido e direto ao ponto. Até lá!",
      "2": "Oi, Doutor(a) [NOME]! Tudo certo para [DIA] às [HORÁRIO]. Me avisa se precisar reagendar com antecedência!",
      "3": "Doutor(a) [NOME], nosso especialista já está confirmado para [DIA] às [HORÁRIO]. Qualquer dúvida antes estou aqui!",
      "4": "Perfeito, Doutor(a) [NOME]! [DIA] às [HORÁRIO] confirmado. Até lá!"
    },
    "lembrete": {
      "0": "Bom dia, Doutor(a) [NOME]! Lembrete da nossa reunião hoje às [HORÁRIO]. Te espero lá!",
      "1": "Oi, Doutor(a) [NOME]! Nossa reunião é daqui a pouco, às [HORÁRIO]. Qualquer coisa me chama antes!",
      "2": "Doutor(a) [NOME], reunião em 1 hora! Às [HORÁRIO] nosso especialista estará te esperando.",
      "3": "Bom dia, Doutor(a) [NOME]! Só um lembrete rápido — hoje às [HORÁRIO]. Até já!",
      "4": "Oi, Doutor(a) [NOME]! Reunião hoje às [HORÁRIO]. Nos vemos em breve!"
    },
    "fechamento": {
      "0": "Doutor(a) [NOME], bem-vindo(a) à Green Lab! Estamos muito animados com essa parceria. Em breve nosso time entra em contato com os próximos passos!",
      "1": "Que ótima decisão, Doutor(a) [NOME]! A partir de agora você tem um time inteiro dedicado ao crescimento da sua clínica. Vamos nessa!",
      "2": "Doutor(a) [NOME], parceria firmada! Obrigado pela confiança. Estamos aqui para entregar resultado de verdade.",
      "3": "Bem-vindo(a), Doutor(a) [NOME]! Agora é hora de trabalhar. Nosso time já vai entrar em contato para dar início a tudo.",
      "4": "Doutor(a) [NOME], decisão tomada! Fico muito feliz com essa parceria. Vamos construir algo incrível juntos!"
    },
    "secretaria": {
      "0": "\"Bom dia! Meu nome é [SEU NOME], sou de Taguatinga. Já havia ligado antes e fiquei de falar com o responsável pela parte de vendas da clínica. O Doutor [NOME] está disponível?\"",
      "1": "\"Olá, tudo bem? Aqui é [SEU NOME], de Taguatinga. Já havia feito contato anteriormente e fiquei de falar com o Dr. [NOME]. Consegue me passar para ele?\"",
      "2": "\"Bom dia! Sou [SEU NOME], de Taguatinga. Já estive em contato antes e combinei de falar com o responsável pelas decisões da clínica. O doutor está?\"",
      "3": "\"Oi, tudo bem? Aqui é [SEU NOME]. Já havia ligado e fiquei de conversar com o Dr. [NOME] sobre a clínica. Ele está disponível agora?\"",
      "4": "\"Bom dia! Meu nome é [SEU NOME], de Taguatinga. Já havia entrado em contato e precisava falar com quem cuida da parte comercial da clínica. Consegue me ajudar?\""
    },
    "doutor-direto": {
      "0": "\"Doutor(a) [NOME], que bom falar com você! Meu nome é [SEU NOME], de Taguatinga. Trabalho com uma assessoria especializada em clínicas odontológicas — a gente não é agência, fazemos uma análise completa da clínica e montamos o processo comercial do zero. Você teria 2 minutos para eu te explicar melhor?\"",
      "1": "\"Bom dia, Doutor(a) [NOME]! Aqui é [SEU NOME] da Green Lab, de Taguatinga. Trabalho com clínicas odontológicas ajudando a sair da dependência de indicação e estruturar o comercial. Faz sentido conversar rapidinho?\"",
      "2": "\"Olá, Doutor(a) [NOME]! Sou [SEU NOME], de Taguatinga. A Green Lab é uma assessoria odontológica — antes de qualquer solução a gente analisa a clínica para entender onde está o gargalo real. Tem 2 minutinhos?\"",
      "3": "\"Doutor(a) [NOME], tudo bem? Aqui é [SEU NOME] da Green Lab. Trabalhamos com clínicas que querem parar de depender de indicação e construir previsibilidade de faturamento. Posso te contar como funciona?\"",
      "4": "\"Bom dia, Doutor(a) [NOME]! [SEU NOME] aqui, de Taguatinga. Trabalho com assessoria para clínicas odontológicas e acredito que temos algo que faz sentido para o seu momento. Tem 2 minutos?\""
    },
    "pos-secretaria": {
      "0": "Oi [NOME DA SECRETÁRIA]! Aqui é [SEU NOME], acabamos de conversar. Conforme combinado, deixo aqui meu contato. Seria muito importante que o Dr. [NOME] soubesse do nosso contato — acredito que o que fazemos pode ajudar muito a clínica. Conta com você!",
      "1": "[NOME DA SECRETÁRIA], obrigado pela atenção! Como conversamos, seria fundamental que o Dr. [NOME] tivesse acesso a essa informação. Você que conhece a clínica por dentro sabe melhor do que ninguém o quanto isso faz falta. Conto com você para repassar!",
      "2": "Oi [NOME DA SECRETÁRIA]! [SEU NOME] aqui. Sei que você lida com muito na recepção — exatamente por isso o que fazemos pode ajudar tanto a clínica quanto o seu dia a dia. Passa para o Dr. [NOME] quando puder, tá?",
      "3": "[NOME DA SECRETÁRIA], obrigado pelo papo! Com base no que você me contou sobre a clínica, acredito muito que o Dr. [NOME] vai querer saber disso. Conta com você para repassar!",
      "4": "Oi [NOME DA SECRETÁRIA]! Fico feliz que a gente conseguiu conversar. Com base no que você me contou, acredito muito que o Dr. [NOME] vai querer saber disso. Conto com você!"
    },
    "pos-pdf": {
      "0": "[NOME DA SECRETÁRIA], conforme combinado estou enviando nossa apresentação. Seria ótimo que o Dr. [NOME] pudesse dar uma olhada — vou ligar em breve para conversar com ele sobre. Obrigado pela ajuda!",
      "1": "Oi [NOME DA SECRETÁRIA]! Segue a apresentação da Green Lab conforme conversamos. Deixa com o Dr. [NOME] quando puder — vou entrar em contato em breve para falar com ele diretamente. Conto com você!",
      "2": "[NOME DA SECRETÁRIA], enviando a apresentação como combinado. Com base no que você me contou sobre a clínica, acredito que vai fazer muito sentido para o Dr. [NOME]. Vou ligar para falar com ele em breve!",
      "3": "Oi [NOME DA SECRETÁRIA]! Segue o material que você pediu. Passa para o Dr. [NOME] quando tiver um momento — vou ligar para conversar com ele sobre o que fazemos. Obrigado pela atenção!",
      "4": "[NOME DA SECRETÁRIA], conforme conversamos segue nossa apresentação. Vou entrar em contato em breve para falar diretamente com o Dr. [NOME]. Obrigado por facilitar isso!"
    },
    "pos-doutor": {
      "0": "Doutor(a) [NOME], foi muito bom conversar! O que você me contou sobre [INFORMAÇÃO COLETADA] mostra claramente que a clínica tem muito potencial ainda não explorado. Ansioso para nossa reunião!",
      "1": "Doutor(a) [NOME], obrigado pelo tempo! Poucos doutores enxergam o problema tão claramente quanto você. Isso já facilita muito o nosso trabalho. Até a reunião!",
      "2": "Foi ótimo falar com você, Doutor(a) [NOME]! Com base no que conversamos já consigo ver onde estão os gargalos. Na reunião vamos destrinchar isso juntos!",
      "3": "Doutor(a) [NOME], obrigado pela abertura! O que você me contou sobre [INFORMAÇÃO COLETADA] é exatamente o tipo de situação que a gente resolve. Até breve!",
      "4": "Que bom que a gente conseguiu falar, Doutor(a) [NOME]! Raramente vejo um doutor que já tem essa clareza sobre o negócio. Vai ser uma reunião muito produtiva. Até lá!"
    },
    "formulario": {
      "0": "Oi, Doutor(a) [NOME]! Vi que você preencheu nosso formulário. Aqui é [SEU NOME] da Green Lab. Você tem um tempinho agora para a gente conversar?",
      "1": "Olá, Doutor(a) [NOME]! Recebi seu contato e quero entender melhor o momento da sua clínica. Sou [SEU NOME] da Green Lab. Podemos conversar hoje?",
      "2": "Doutor(a) [NOME], tudo bem? Vi suas respostas no formulário e acredito que faz muito sentido a gente avançar. Quando seria um bom momento para um papo rápido?",
      "3": "Oi, Doutor(a) [NOME]! Aqui é [SEU NOME] da Green Lab. Você preencheu nosso formulário e quero entender melhor o que está travando sua clínica. Tem 10 minutinhos agora?",
      "4": "Olá, Doutor(a) [NOME]! Recebi seu formulário e fiquei animado com seu perfil. Sou [SEU NOME] da Green Lab. Posso te ligar agora para bater um papo rápido?"
    },
    "interessado": {
      "0": "Que ótimo, Doutor(a) [NOME]! Para entender melhor o seu momento posso te fazer algumas perguntas rápidas. Pode ser?",
      "1": "Fico feliz que fez sentido, Doutor(a) [NOME]! Antes de avançar preciso entender o cenário da sua clínica. São só algumas perguntas rápidas. Topa?",
      "2": "Perfeito, Doutor(a) [NOME]! Vou te fazer algumas perguntas para entender o que faz mais sentido para você. Pode ser agora?",
      "3": "Que bom, Doutor(a) [NOME]! Para montar a melhor solução preciso entender o seu momento. São rápidas. Pode ser?",
      "4": "Ótimo, Doutor(a) [NOME]! Antes de qualquer coisa quero entender o cenário da sua clínica. Posso te fazer algumas perguntas?"
    },
    "fu-msg": {
      "0": "Oi, Doutor(a) [NOME]! Só passando para ver se você teve a chance de ver minha mensagem. Estou à disposição!",
      "1": "Doutor(a) [NOME], sei que a rotina da clínica é corrida. Quando tiver um tempinho me fala o que achou!",
      "2": "Olá, Doutor(a) [NOME]! Não quero ser inconveniente, mas acredito muito que faz sentido a gente conversar. Tem um minutinho?",
      "3": "Oi, Doutor(a) [NOME]! Só um toque rápido. Quando quiser avançar estou à disposição!",
      "4": "Doutor(a) [NOME], qualquer dúvida estou aqui. Quando quiser conversar é só me chamar!"
    },
    "fu-ligacao": {
      "0": "Doutor(a) [NOME], tentei te ligar mas não consegui. Fica à vontade para me retornar quando puder. Estou aqui!",
      "1": "Oi, Doutor(a) [NOME]! Tentei contato por ligação mas imagino que estava ocupado(a). Quando tiver um tempinho me chama!",
      "2": "Doutor(a) [NOME], passei aqui para deixar meu contato. Quando puder me retorna — sem pressa!",
      "3": "Olá, Doutor(a) [NOME]! Tentei falar com você mas não consegui. Qualquer hora que quiser conversar estou disponível.",
      "4": "Oi, Doutor(a) [NOME]! Sei que a rotina é corrida. Me chama quando tiver um tempinho. Vai valer a pena!"
    },
    "fu-noshow": {
      "0": "Doutor(a) [NOME], tudo bem? Notei que não conseguimos nos encontrar hoje. Aconteceu algum imprevisto? Fico à disposição para reagendarmos!",
      "1": "Oi, Doutor(a) [NOME]! Ficamos te esperando mas imagino que surgiu algo. Quando quiser reagendar é só me falar!",
      "2": "Doutor(a) [NOME], sem problemas! Sei que imprevistos acontecem. Quando quiser remarcar estou aqui.",
      "3": "Olá, Doutor(a) [NOME]! Não conseguimos nos encontrar hoje. Quero muito apresentar o que temos para sua clínica. Conseguimos remarcar?",
      "4": "Oi, Doutor(a) [NOME]! Tudo bem por aí? Me fala quando puder para a gente remarcar!"
    },
    "fu-nao-fechou": {
      "0": "Doutor(a) [NOME], obrigado pela reunião! Sei que é uma decisão importante. Fica à vontade para pensar e me chamar quando quiser!",
      "1": "Oi, Doutor(a) [NOME]! Foi muito bom conversar. Fico à disposição para tirar qualquer dúvida que surgir!",
      "2": "Doutor(a) [NOME], entendo que precisa pensar. Se surgir qualquer dúvida estou aqui!",
      "3": "Olá, Doutor(a) [NOME]! Obrigado pela reunião. Quando estiver pronto(a) para avançar é só me chamar!",
      "4": "Oi, Doutor(a) [NOME]! Só queria reforçar que estou à disposição. A decisão é sua e respeito o seu tempo!"
    }
  }'::jsonb,

  -- qual (qualificação)
  '[
    {"num": "Abertura",    "q": "Doutor(a) [NOME], antes de tudo quero entender melhor o seu momento. Vou te fazer algumas perguntas rápidas para ver se faz sentido uma parceria. Pode ser?"},
    {"num": "Pergunta 1",  "q": "Me conta brevemente sobre você e sua clínica. Hoje quem cuida da clínica, seria só você ou tem mais alguém, algum sócio?"},
    {"num": "Pergunta 2",  "q": "Há quanto tempo está aberta, quantos profissionais atuam e quais especialidades vocês atendem?"},
    {"num": "Pergunta 3",  "q": "Qual é o faturamento médio mensal hoje — está crescendo, estagnado ou caindo?"},
    {"num": "Pergunta 4",  "q": "Como os pacientes chegam até você — indicação, Google, redes sociais, convênio? Tem uma fonte principal?"},
    {"num": "Pergunta 5",  "q": "Desses contatos que chegam, você sente que está convertendo bem ou percebe que muita gente some no caminho?"},
    {"num": "Pergunta 6",  "q": "Se você pudesse resolver uma coisa na clínica agora, o que seria?"},
    {"num": "Pergunta 7",  "q": "Como você imagina a clínica daqui a um ano?"},
    {"num": "Transição",   "q": "Perfeito, Doutor(a) [NOME]! Com base no que você me contou acredito que faz muito sentido avançar. O próximo passo é uma reunião rápida de 30 minutos com nosso especialista para ver se existe uma possibilidade de parceria. Você teria disponibilidade essa semana?"}
  ]'::jsonb,

  -- aq (aquecimento 30 dias)
  '[
    {"d":1,  "tag":"Conexão",            "t":"Doutor(a) [NOME], foi muito bom falar com você hoje! Fico por aqui caso queira conversar mais. Quando o momento for certo estou à disposição!"},
    {"d":2,  "tag":"Dor: Indicação",     "t":"Doutor(a) [NOME], uma coisa que ouço muito dos doutores que atendo é que odeiam depender de indicação para o mês fechar bem. O pior é que quando a indicação some, a ansiedade bate na mesma hora. Você se identifica com isso?"},
    {"d":3,  "tag":"Escassez",           "t":"Doutor(a) [NOME], só passando para te contar que estamos em contato com algumas clínicas da sua região. As que estão estruturando o comercial agora estão saindo na frente e capturando uma fatia do mercado que antes ficava distribuída. Só uma informação mesmo!"},
    {"d":4,  "tag":"Dor: Operacional",   "t":"Doutor(a) [NOME], me conta uma coisa — você ainda é o primeiro a chegar e o último a sair da clínica? Porque a maioria dos doutores que fala comigo está preso exatamente nisso. Trabalha demais e sente que sem ele tudo para."},
    {"d":5,  "tag":"Oportunidade",       "t":"Doutor(a) [NOME], estamos num momento muito específico do mercado odontológico em Brasília. As clínicas que estruturarem o comercial agora vão ter uma vantagem enorme nos próximos 12 meses. As que deixarem pra depois vão correr atrás. Só queria te deixar essa reflexão!"},
    {"d":6,  "tag":"Dor: Secretária",    "t":"Doutor(a) [NOME], você sabia que a maioria das clínicas perde entre 30% e 50% dos leads que chegam por WhatsApp? Não é falta de interesse do paciente. É falta de processo e treinamento na recepção. Isso acontece aí?"},
    {"d":7,  "tag":"Case",               "t":"Doutor(a) [NOME], semana passada conversei com um doutor aqui de Brasília que tinha exatamente o mesmo perfil que você me descreveu — agenda travada, dependendo de indicação e sem previsibilidade. Hoje ele já tem um processo rodando. Se quiser conversar sobre como foi é só me falar!"},
    {"d":8,  "tag":"Dor: Alto Ticket",   "t":"Doutor(a) [NOME], você se especializou anos para fazer os procedimentos que realmente domina. Mas aposto que a agenda ainda está cheia de coisas que qualquer outro dentista faria. Isso não é falta de paciente certo — é falta de demanda qualificada chegando até você."},
    {"d":9,  "tag":"Urgência",           "t":"Doutor(a) [NOME], o mercado odontológico em Brasília está mudando rápido. As clínicas que dependem só de indicação estão perdendo espaço para as que têm processo comercial estruturado. Não é alarmismo — é o que estamos vendo na prática todo dia."},
    {"d":10, "tag":"Dor: Família",       "t":"Doutor(a) [NOME], quando foi a última vez que você teve um fim de semana inteiro sem pensar na clínica? Porque a maioria dos doutores que atendo não consegue mais separar as duas coisas. E isso cobra um preço alto."},
    {"d":11, "tag":"Escassez: Vagas",    "t":"Doutor(a) [NOME], só te avisando que estamos próximos de fechar nossa capacidade de atendimento para novas clínicas nesse trimestre. Não quero que você perca a janela caso tenha interesse em avançar!"},
    {"d":12, "tag":"Prova Social",       "t":"Doutor(a) [NOME], se quiser ver um pouco do trabalho que fazemos com clínicas odontológicas é só dar uma olhada no nosso perfil. Lá você consegue ter uma ideia melhor do que entregamos na prática. Qualquer dúvida estou aqui!"},
    {"d":13, "tag":"Dor: Previsibilidade","t":"Doutor(a) [NOME], você consegue dizer hoje quanto vai faturar no mês que vem? A maioria dos doutores que converso não consegue. E essa falta de previsibilidade é o que mais tira o sono — porque você nunca sabe se o mês vai fechar bem ou não."},
    {"d":14, "tag":"Curiosidade",        "t":"Doutor(a) [NOME], posso te fazer uma pergunta direta? O que você acha que está travando o crescimento da sua clínica hoje? Pergunto porque depois de falar com dezenas de doutores percebo que quase sempre o gargalo real não é onde a pessoa imagina."},
    {"d":15, "tag":"Escassez: Local",    "t":"Doutor(a) [NOME], essa semana falei com duas clínicas na sua região que estão estruturando o comercial agora. Não cito nomes mas são clínicas com perfil parecido com o seu. O mercado está se movendo — só queria que você soubesse disso."},
    {"d":16, "tag":"Dor: Conversão",     "t":"Doutor(a) [NOME], quantos pacientes chegam até sua clínica por mês e quantos realmente fecham? Se esse número for menor que 50% o problema não é o marketing. É o processo comercial. E isso é exatamente o que a gente resolve."},
    {"d":17, "tag":"Timing",             "t":"Doutor(a) [NOME], o melhor momento para estruturar o comercial de uma clínica é antes de precisar. Quando a agenda esvazia e a ansiedade bate qualquer decisão fica mais difícil. Você está num momento de escolha agora — e isso é positivo."},
    {"d":18, "tag":"Case: Resultado",    "t":"Doutor(a) [NOME], uma clínica que acompanhamos saiu de uma dependência de 90% de indicação para ter uma fonte previsível de pacientes em menos de 90 dias. Não foi mágica — foi processo. Se quiser entender como foi é só me falar!"},
    {"d":19, "tag":"Dor: Branding",      "t":"Doutor(a) [NOME], as pessoas marcam na clínica ou no doutor? Porque quando o nome que vende é o da clínica e não o seu, você nunca consegue cobrar pelo que realmente vale. Personal branding para dentista ainda é muito pouco explorado em Brasília."},
    {"d":20, "tag":"Urgência: Decisão",  "t":"Doutor(a) [NOME], não quero pressionar mas sei que decisões adiadas custam caro. Cada mês sem processo comercial é um mês perdendo pacientes que poderiam ser seus. Quando você acha que vai ser o momento certo para avançar?"},
    {"d":21, "tag":"Reunião 30min",      "t":"Doutor(a) [NOME], posso te fazer uma pergunta direta? Se eu te dissesse que consigo identificar em 30 minutos qual é o maior gargalo da sua clínica — você toparia? Porque é exatamente isso que nossa reunião faz. Sem enrolação, direto ao ponto."},
    {"d":22, "tag":"Escassez: Região",   "t":"Doutor(a) [NOME], trabalhamos com no máximo uma clínica por especialidade por região. Não quero que quando você estiver pronto(a) para avançar a vaga já tenha sido ocupada por outro doutor da sua área. Só deixando isso claro!"},
    {"d":23, "tag":"Dor: Glosa",         "t":"Doutor(a) [NOME], glosa, paciente que cancela em cima da hora, secretária que não filtra — tudo isso drena o faturamento sem você perceber. A maioria dos doutores acha que é normal. Não é. É falta de processo."},
    {"d":24, "tag":"Prova Social: Ref.", "t":"Doutor(a) [NOME], se quiser conversar com alguma clínica que já trabalha com a gente posso disponibilizar um contato para você tirar suas dúvidas diretamente. Sem filtro nenhum — você pergunta o que quiser!"},
    {"d":25, "tag":"Mercado",            "t":"Doutor(a) [NOME], o mercado odontológico em Brasília ainda tem muito espaço para quem se posicionar bem. O problema é que essa janela não fica aberta para sempre. As clínicas que se moverem agora vão dominar a região nos próximos anos."},
    {"d":26, "tag":"Dor: Tempo",         "t":"Doutor(a) [NOME], quando foi a última vez que você saiu da clínica no horário? Porque trabalhar demais e não ter tempo para família, para treinar, para viver — isso não é dedicação. É falta de estrutura. E tem solução."},
    {"d":27, "tag":"Urgência: Concorrência","t":"Doutor(a) [NOME], não vou mentir — estamos em conversa com outras clínicas da sua região. Algumas já estão avançando. Não quero que daqui a 6 meses você olhe para o lado e veja seu concorrente crescendo com o processo que você poderia ter tido primeiro."},
    {"d":28, "tag":"Bloqueio",           "t":"Doutor(a) [NOME], o que falta para você dar esse passo? Pergunto com respeito — às vezes é uma dúvida específica que posso resolver agora mesmo em 5 minutos."},
    {"d":29, "tag":"Case: Transformação","t":"Doutor(a) [NOME], um dos doutores que acompanhamos me disse algo que ficou na memória: \"Eu achava que meu problema era marketing. Na verdade era que eu nunca tinha tido um processo.\" Isso ressoa com você?"},
    {"d":30, "tag":"Decisão Final",      "t":"Doutor(a) [NOME], chegamos ao fim de um ciclo de conversas e quero ser direto com você. Acredito muito no potencial da sua clínica. Se fizer sentido avançar estou aqui. Se não for o momento certo também respeito. Só me fala para eu saber como posso te ajudar melhor!"}
  ]'::jsonb

) ON CONFLICT (company_id) DO UPDATE
  SET scripts = EXCLUDED.scripts,
      qual = EXCLUDED.qual,
      aq = EXCLUDED.aq,
      updated_at = NOW();
