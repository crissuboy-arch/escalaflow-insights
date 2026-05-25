// ─── Types ────────────────────────────────────────────────────────────────────

export interface TemplateChapter {
  id: string;
  title: string;
  badge?: string;
  body: string;
  checklist?: string[];
  exercise?: string;
  pullQuote?: string;
}

export interface TemplateMeta {
  title: string;
  subtitle: string;
  authorPlaceholder: string;
  promise: string;
  uniqueMechanism: string;
  transformation: string;
  audience: string;
}

export interface TemplateBonus {
  title: string;
  description: string;
  items: string[];
}

export interface TemplateCTA {
  headline: string;
  body: string;
  buttonText: string;
  urgency: string;
}

export interface TemplateMaster {
  id: string;
  name: string;
  category: string;
  pages: number;
  level: "Iniciante" | "Premium" | "High Ticket";
  colorA: string;
  colorB: string;
  emoji: string;
  coverPrompt?: string;
  meta: TemplateMeta;
  chapters: TemplateChapter[];
  bonus?: TemplateBonus;
  cta: TemplateCTA;
  finalPage: string;
  hasMasterContent: boolean;
}

// ─── Template 1: Ebook Low Ticket ─────────────────────────────────────────────

const LOW_TICKET: TemplateMaster = {
  id: "low-ticket",
  name: "Ebook Low Ticket",
  category: "Vendas",
  pages: 60,
  level: "Iniciante",
  colorA: "#0A6CFF",
  colorB: "#003A8C",
  emoji: "💡",
  coverPrompt: "Professional ebook cover design, bold blue gradient background, gold and white accents, modern digital entrepreneurship aesthetic, glowing lightbulb or circuit motif, clean premium typography, 2024 style, high quality digital art",
  hasMasterContent: true,
  meta: {
    title: "O Método da Primeira Venda Digital",
    subtitle: "Como criar, lançar e vender um produto digital em 7 dias — mesmo do zero",
    authorPlaceholder: "Seu Nome Aqui",
    promise: "Criar um produto digital que gera renda todo mês — mesmo sem seguidores, sem ser influencer e sem ter vendido nada online antes",
    uniqueMechanism: "Sistema PMV — Produto Mínimo Vendável",
    transformation: "De zero ao primeiro R$3.000/mês como infoprodutor",
    audience: "Iniciantes que querem criar seu primeiro produto digital",
  },
  chapters: [
    {
      id: "lt-c1",
      title: "A Grande Mentira que Está te Bloqueando",
      badge: "Fundação",
      pullQuote: "O mercado não paga por autoridade acadêmica. Paga por transformação específica.",
      body: `Quase ninguém fala sobre o que realmente aconteceu com Pedro no primeiro mês.

Ele tinha 47 seguidores no Instagram, uma planilha aberta no notebook e uma ideia que parecia pequena demais para virar produto: havia descoberto como conseguir estágio em empresas tech sem ter experiência prévia. Não era guru. Não tinha MBA. Tinha passado 4 meses aplicando para 200 vagas e coletando padrões de resposta.

Em sete dias, seu ebook de R$37 gerou R$4.200.

O que ele tinha que você pensa que não tem?

A GRANDE MENTIRA DO "PRECISA DE AUDIÊNCIA"

O marketing digital construiu um culto em torno de seguidores, likes e engajamento. E essa narrativa serve às plataformas, não a você. A lógica parece irrefutável: mais seguidores = mais compradores = mais dinheiro. Mas essa equação tem uma falha fundamental: confunde atenção com intenção de compra.

Uma conta com 500.000 seguidores de lifestyle vende menos ebook de produtividade do que uma especialista em burnout corporativo com 800 seguidores altamente qualificados. Porque o segundo segmento tem um problema urgente, específico e está ativamente buscando solução.

O PRINCÍPIO DA DOR ESPECÍFICA

Dor genérica não converte. "Quero ganhar mais dinheiro" é um desejo vago que pertence a 7 bilhões de pessoas. "Preciso aumentar meu faturamento como nutricionista autônoma sem depender de plano de saúde" é uma dor cirúrgica — quem sente não precisa de convencimento, precisa de solução.

O Sistema PMV começa aqui: em vez de perguntar "o que sei ensinar?", a pergunta certa é "qual dor específica eu já resolvi na minha própria vida?".

Sua experiência pessoal — as tentativas, os erros, o caminho que você percorreu — é mais valiosa do que qualquer diploma. Porque você não vende teoria. Você vende o atalho.`,
      checklist: [
        "Listar 10 problemas que você já resolveu (pessoal, profissional, hobby)",
        "Para cada um: existe alguém que pagaria para não passar pelo que passei?",
        "Identificar o problema mais específico e doloroso da lista",
        "Escrever em uma frase: 'Eu ajudo [avatar] a [resultado] sem [objeção principal]'",
      ],
      exercise: `PROVA DOS 5 MINUTOS: Pegue um papel e escreva UM momento difícil que você viveu e superou. Pode ser qualquer coisa — dívida, relacionamento, saúde, aprendizado de habilidade técnica. Esse momento é seu produto mais valioso. A sua cicatriz é o que transforma vidas de outros.`,
    },
    {
      id: "lt-c2",
      title: "O Sistema PMV: Criando o Produto Certo na Primeira Vez",
      badge: "Método",
      pullQuote: "Um produto que resolve UM problema para UMA pessoa é mais poderoso do que um curso completo para todo mundo.",
      body: `O maior erro de quem cria o primeiro produto digital é tentar resolver tudo de uma vez.

Nasce o "Curso Completo de Finanças, Empreendedorismo, Mindset e Produtividade". Resultado: 8 meses de produção, R$2.000 gastos com gravação, zero vendas — porque ninguém acorda de manhã com vontade de comprar um "curso completo de tudo".

O Sistema PMV (Produto Mínimo Vendável) funciona na direção oposta.

AS 3 REGRAS DO PMV

Regra 1 — UM problema específico (não 10 problemas vagos)
Errado: "Como ter sucesso na vida"
Certo: "Como negociar aumento de salário no seu emprego atual em 30 dias"

Regra 2 — UM avatar definido (não "todo mundo")
Errado: "Para quem quer melhorar financeiramente"
Certo: "Para CLT de 25 a 40 anos preso em salário abaixo de R$5.000"

Regra 3 — UM resultado mensurável (não "vai mudar sua vida")
Errado: "Transforme sua relação com o dinheiro"
Certo: "Consiga sua primeira proposta de aumento aprovada em 45 dias ou menos"

O FORMATO IDEAL PARA COMEÇAR

Ebook de 30 a 60 páginas: Custo de produção = R$0. Prazo = 7 dias. Preço = R$37 a R$97. Percepção de valor = alta quando bem posicionado.

Você não precisa de câmera, estúdio, plataforma cara ou equipe. Precisa de um documento Word ou Google Docs, uma conta no Hotmart ou Kiwify e a solução para um problema específico documentada em capítulos claros.

VALIDAÇÃO ANTES DE CRIAR

Antes de escrever uma linha sequer, faça o teste das 3 conversas: aborde 3 pessoas que são seu avatar ideal e diga "Estou criando um ebook sobre [problema]. Você pagaria R$47 nisso?". Se 2 de 3 disseram sim, o produto existe. Agora é só executar.`,
      checklist: [
        "Definir UM problema específico que você já resolveu",
        "Criar o avatar com: idade, profissão, dor principal, objeção #1",
        "Escrever a promessa mensurável em uma frase",
        "Fazer o 'Teste das 3 Conversas' com pessoas reais do seu avatar",
        "Escolher o formato: ebook (recomendado para iniciantes)",
      ],
      exercise: `MAPA DO PMV: Preencha esta estrutura em 10 minutos:
• Meu avatar: [quem é, em detalhe]
• O problema que ele tem: [específico, com número se possível]
• A solução que eu ofereço: [o que você fez para resolver o mesmo problema]
• O resultado em X dias/semanas: [mensurável]
• O título provisório do produto: ["Como [resultado] em [prazo] mesmo se [objeção]"]`,
    },
    {
      id: "lt-c3",
      title: "A Oferta Irresistível: O Stack que Justifica R$97",
      badge: "Oferta",
      pullQuote: "Ninguém compra um ebook. Compram uma transformação. Seu trabalho é tornar essa transformação óbvia.",
      body: `R$97 parece caro para um ebook de 50 páginas. R$97 parece barato para um sistema completo com ferramentas, bônus e garantia que resolve o problema X em 30 dias ou menos.

O preço não muda. A percepção muda. E percepção é construída com arquitetura de oferta.

O STACK DE 3 CAMADAS

Camada 1 — O Produto Principal: Seu ebook/guia/método resolvendo o problema central. Isso é o que as pessoas pensam que estão comprando.

Camada 2 — O Acelerador (Bônus 1): Um complemento direto que remove o principal obstáculo de implementação. Se seu produto é sobre negociar salário, o acelerador pode ser um template de email pronto para enviar ao gestor.

Camada 3 — O Multiplicador (Bônus 2): Um material que amplia o resultado além da promessa principal. No mesmo exemplo: uma lista dos 50 argumentos que gestores aceitam com mais frequência.

Por que isso funciona: quando o valor percebido dos bônus supera o preço do produto, a compra se torna matematicamente óbvia. "Estou pagando R$97 e levando R$291 em valor" elimina a fricção de decisão.

A FÓRMULA DO HEADLINE QUE VENDE

Estrutura testada: "Como [resultado desejado] em [prazo] mesmo que [objeção principal] — garantido ou seu dinheiro de volta"

Exemplos:
• "Como perder 5kg em 30 dias sem academia nem dieta restritiva — garantido"
• "Como conseguir seu primeiro cliente como freelancer em 7 dias sem ter portfólio"
• "Como duplicar suas vendas no Instagram em 21 dias mesmo com menos de 1.000 seguidores"

Note: o prazo cria urgência. O "mesmo que" neutraliza a objeção. A garantia remove o risco. Juntos, esses três elementos transformam curiosidade em decisão.

A GARANTIA QUE CONVERTE (E QUE VOCÊ PODE DAR COM SEGURANÇA)

30 dias de garantia incondicional não aumenta reembolsos — diminui a resistência à compra. Produtos com garantia vendem 3 a 7 vezes mais. E na prática, a taxa de reembolso de ebooks bem estruturados fica abaixo de 2%.`,
      checklist: [
        "Criar o produto principal (ebook ou guia)",
        "Definir Bônus 1: remove o principal obstáculo de implementação",
        "Definir Bônus 2: amplia o resultado além da promessa",
        "Escrever o headline usando a fórmula 'Como... em... mesmo que...'",
        "Adicionar garantia de 30 dias (obrigatório para converter bem)",
        "Calcular o valor percebido total (produto + bônus) e comparar com o preço",
      ],
    },
    {
      id: "lt-c4",
      title: "Tráfego Sem Seguidores: Os 3 Canais Gratuitos",
      badge: "Tráfego",
      pullQuote: "Você não precisa de uma audiência. Precisa de um canal onde seu avatar está com intenção de compra.",
      body: `A pergunta que mais paralisa iniciantes: "Como faço para aparecer para as pessoas certas se não tenho seguidores?"

A resposta não está em construir audiência. Está em acessar audiências que já existem — onde seu avatar já está, já está com problema ativo, já está procurando solução.

CANAL 1 — TIKTOK ORGÂNICO (0 a 30 dias)

O TikTok tem o algoritmo mais democrático das redes sociais: distribui conteúdo novo para pessoas que nunca te seguiram. Uma conta com 0 seguidores pode ter vídeo com 500.000 visualizações na primeira semana se o conteúdo tocar no problema certo.

O formato que funciona para vender ebook: "3 erros que [seu avatar] comete ao tentar [resolver o problema]". Cada erro é um hook, cada solução é uma prévia do que está no produto.

Frequência ideal: 1 vídeo por dia por 30 dias. Não precisa ser perfeito. Precisa ser específico.

CANAL 2 — PINTEREST SEO (30 a 90 dias)

Pinterest é um mecanismo de busca visual. Pessoas entram com intenção de encontrar — e pinos ficam rankeados por meses, não por horas. Para ebooks de saúde, finanças, produtividade, culinária e beleza, é o canal com maior conversão orgânica.

Estratégia: criar 3 pinos por dia com headline do produto + imagem do ebook + link para a página de vendas. Em 90 dias, você tem 270 pontos de entrada orgânicos ativos.

CANAL 3 — GRUPOS DO FACEBOOK (resultado imediato)

Existem grupos com 10.000 a 500.000 pessoas do seu avatar exato. Não faça spam — faça valor primeiro. Responda 5 perguntas por semana como especialista. Na bio do perfil, coloque o link do seu produto. Quando as pessoas verem suas respostas, vão procurar quem você é.

PLANO DE 7 DIAS PARA A PRIMEIRA VENDA:
• Dias 1-2: Criar a conta TikTok e postar primeiro vídeo
• Dias 3-4: Criar perfil Pinterest e 10 pinos iniciais
• Dias 5-6: Entrar em 5 grupos de Facebook do seu nicho
• Dia 7: Analisar qual canal gerou mais cliques e dobrar nele`,
      checklist: [
        "Criar conta no TikTok dedicada ao produto/nicho",
        "Gravar e postar 3 vídeos na primeira semana (formato: '3 erros que...')",
        "Criar perfil comercial no Pinterest",
        "Fazer 10 pinos na primeira semana com headline + imagem do produto",
        "Entrar em 5 grupos do Facebook com seu avatar exato",
        "Responder 3 perguntas por dia nos grupos como especialista",
      ],
      exercise: `MAPA DE CANAIS: Pesquise e liste:
• 3 hashtags do TikTok onde seu avatar está (ex: #financaspessoais, #emagrecimento)
• 3 palavras-chave no Pinterest que seu avatar buscaria
• 5 grupos do Facebook com mais de 5.000 membros do seu nicho

Anote os links e acesse todos hoje. Observe o que está sendo perguntado. Cada pergunta sem resposta boa é uma oportunidade de venda.`,
    },
    {
      id: "lt-c5",
      title: "A Página Simples que Vende: Copy de 7 Blocos",
      badge: "Copy & Conversão",
      pullQuote: "Uma página de vendas não convence. Ela conecta a dor do leitor com a solução que você já tem.",
      body: `Você não precisa de uma página longa, técnica ou cara. Precisa de uma página que faça uma coisa: deixar óbvio que seu produto resolve o problema do leitor.

A estrutura dos 7 blocos faz exatamente isso — e pode ser criada em 2 horas no Canva, Google Sites ou na própria Hotmart.

BLOCO 1 — HEADLINE: O pânico que para as rolagens
A primeira frase deve ser a maior dor do seu avatar. Não o benefício do seu produto — a dor específica que ele sente. Exemplo: "Você está cansado de tentar emagrecer e voltar ao peso em 3 semanas?"

BLOCO 2 — AGITAR A DOR: Prove que você entende
Liste 3 a 5 consequências de não resolver o problema. "Enquanto isso acontece, você..." — descreva o custo real de não agir.

BLOCO 3 — APRESENTAR A SOLUÇÃO: O mecanismo único
Apresente seu produto como o caminho específico. Não diga "vou te ensinar tudo sobre X". Diga "este é o sistema de 5 passos que funcionou para mim quando X aconteceu."

BLOCO 4 — O QUE VOCÊ VAI APRENDER: Bullets de transformação
Liste 7 a 10 resultados específicos que o leitor vai obter. Cada bullet começa com um verbo de ação: "Descobrir...", "Aplicar...", "Eliminar...", "Criar..."

BLOCO 5 — PROVA SOCIAL: Resultados reais
Use depoimentos de pessoas que testaram o método. Se você ainda não tem clientes, mostre resultados seus como a primeira prova.

BLOCO 6 — A OFERTA COMPLETA: O stack de valor
Liste o produto + bônus com o valor individual de cada item. Mostre o preço total e o preço real que a pessoa paga. Exemplo: Produto (R$97) + Bônus 1 (R$47) + Bônus 2 (R$37) = R$181 em valor. Hoje: R$97.

BLOCO 7 — CTA + GARANTIA: Eliminar o risco
Botão de compra + frase da garantia. "Compre com 30 dias de garantia total — se não ficar satisfeito, devolvemos 100% sem perguntas."`,
      checklist: [
        "Escrever headline com a dor principal do avatar",
        "Listar 5 consequências de não resolver o problema",
        "Descrever o mecanismo único do seu método",
        "Criar 8 bullets de transformação com verbos de ação",
        "Adicionar pelo menos 1 depoimento ou prova (pode ser resultado próprio)",
        "Montar o stack de valor com preços e total",
        "Adicionar botão de compra + frase da garantia",
        "Testar a página em celular (80% dos compradores são mobile)",
      ],
    },
    {
      id: "lt-c6",
      title: "Do R$0 ao Automático: Construindo a Máquina",
      badge: "Escala",
      pullQuote: "A meta não é trabalhar mais. É construir um sistema que vende enquanto você dorme.",
      body: `Você fez a primeira venda. Agora a pergunta é: como transformar isso em R$3.000, R$5.000, R$10.000 recorrentes?

A resposta está em substituir esforço manual por sistema automatizado. Cada venda que exige sua presença ativa é um teto. Cada venda que acontece automaticamente é escala.

CONFIGURANDO A INFRAESTRUTURA BASE

Plataforma: Hotmart ou Kiwify. Gratuitas para criar conta, cobram comissão somente quando você vende. Configure produto, preço e checkout em 30 minutos.

Email marketing: Brevo ou Mailchimp (plano gratuito até 300 emails/dia). Integre com sua plataforma de vendas para capturar o email de cada comprador e interessado.

Página de captura: Antes da venda, ofereça algo gratuito (mini-ebook de 5 páginas, checklist, planilha) em troca do email. Cada email capturado vale em média R$1 a R$5/mês em receita futura.

A SEQUÊNCIA DE 5 EMAILS QUE AQUECE E VENDE

Email 1 (imediato após inscrição): Entrega o material gratuito + história pessoal de 3 parágrafos sobre o problema que você resolveu.

Email 2 (dia 2): Um tip valiosa relacionada ao problema. Sem vender nada. Só valor.

Email 3 (dia 4): Case de transformação — história de alguém (ou sua própria) que resolveu o problema. Mencione o produto de passagem.

Email 4 (dia 6): "Os 3 maiores erros que [avatar] comete ao tentar [resolver o problema]" — cada erro é um problema que seu produto resolve.

Email 5 (dia 8): Oferta direta. Apresente o produto com stack completo + urgência (ex: "bônus disponível apenas esta semana").

PRÓXIMOS PASSOS PARA ESCALAR

Com R$1.000 faturados, invista R$300 em tráfego pago (Meta Ads ou TikTok Ads) para testar o que converte. Com 3x ROI confirmado, escale o investimento. Com R$5.000/mês, considere lançar o segundo produto para o mesmo avatar (upsell natural).`,
      checklist: [
        "Criar conta na Hotmart ou Kiwify e cadastrar produto",
        "Criar isca digital (mini-ebook ou checklist) para captura de email",
        "Configurar conta no Brevo/Mailchimp e integrar com plataforma",
        "Escrever os 5 emails da sequência de aquecimento",
        "Configurar automação de envio dos emails",
        "Definir meta: quando atingir R$1.000 em vendas, investir 30% em tráfego pago",
      ],
    },
  ],
  bonus: {
    title: "Checklist de Lançamento em 7 Dias",
    description: "O roteiro exato para publicar seu produto e fazer as primeiras vendas na primeira semana.",
    items: [
      "Dia 1: Definir PMV e avatar. Escrever a promessa em uma frase.",
      "Dia 2: Estruturar os capítulos do ebook (índice completo).",
      "Dia 3-4: Escrever o conteúdo do ebook (2 capítulos por dia).",
      "Dia 5: Criar a capa no Canva e formatar o PDF.",
      "Dia 6: Criar a página de vendas com os 7 blocos.",
      "Dia 7: Publicar na Hotmart/Kiwify e divulgar nos canais escolhidos.",
      "Semana 2: Analisar primeiras métricas e ajustar o que não converteu.",
    ],
  },
  cta: {
    headline: "Pronto para Criar Seu Primeiro Produto Digital?",
    body: "Este ebook te deu o mapa. O próximo passo é a execução. Se você quer encurtar ainda mais o caminho e ter um especialista do seu lado nos primeiros 30 dias — do produto à primeira venda — conheça a mentoria Infoprodutor do Zero.",
    buttonText: "Quero Criar Meu Produto com Mentoria",
    urgency: "Vagas limitadas — próxima turma abre em breve.",
  },
  finalPage: `Obrigado por chegar até aqui.

O que você leu neste ebook não é teoria de marketer que nunca vendeu nada. É o sistema condensado de quem passou pelos erros, testou os canais e encontrou o caminho mais curto da ideia à primeira venda.

Agora você tem o mapa. O único obstáculo entre você e a primeira venda é a decisão de começar.

Comece hoje. O mercado está esperando pelo produto que só você pode criar.

[SEU NOME]
[Seu contato ou link para próximo passo]`,
};

// ─── Template 2: Planner Financeiro ───────────────────────────────────────────

const PLANNER_FINANCEIRO: TemplateMaster = {
  id: "planner-financeiro",
  name: "Planner Financeiro",
  category: "Finanças",
  pages: 40,
  level: "Premium",
  colorA: "#F59E0B",
  colorB: "#78350F",
  emoji: "💰",
  coverPrompt: "Elegant personal finance ebook cover, deep amber gold and dark brown gradient, wealth and prosperity aesthetic, abstract rising chart or golden coins element, sophisticated premium typography, luxury financial design, high quality digital art",
  hasMasterContent: true,
  meta: {
    title: "A Virada Financeira",
    subtitle: "90 dias para sair do vermelho, organizar as contas e começar a investir — mesmo com salário médio",
    authorPlaceholder: "Seu Nome Aqui",
    promise: "Zerar as dívidas em até 90 dias e construir a base para o primeiro investimento — com renda de CLT ou MEI",
    uniqueMechanism: "Método PAGUE — 5 etapas para dívida zero e liberdade financeira",
    transformation: "De endividado e sem controle para organizado, quitado e investindo",
    audience: "Adultos de 25-45 anos com dívidas ou sem controle financeiro",
  },
  chapters: [
    {
      id: "pf-c1",
      title: "O Diagnóstico: A Fotografia Brutal da Sua Situação",
      badge: "Consciência",
      pullQuote: "Você não pode mudar o que não mede. A maioria das pessoas evita olhar para os números porque tem medo do que vai encontrar.",
      body: `A família Rodrigues tinha uma sensação permanente de que o dinheiro simplesmente sumia. Dois salários de R$2.800, aluguel pago, filhos na escola pública — e todo mês, entre o 15 e o 20, o saldo ia a zero. Às vezes ficava negativo.

Quando sentaram para fazer o diagnóstico financeiro pela primeira vez, o que descobriram os chocou: R$47.200 em dívidas distribuídas entre cartão de crédito rotativo (32% de juros ao mês), consignado e uma financiadora de eletrodomésticos. Eles não sabiam o total. Nunca tinham somado.

Essa é a realidade da maioria das famílias brasileiras: não é falta de renda. É falta de visibilidade.

OS 3 INSTRUMENTOS DO DIAGNÓSTICO FINANCEIRO

Instrumento 1 — Extrato dos últimos 3 meses: Baixe o extrato bancário dos últimos 3 meses e categorize cada gasto. Não julgue ainda. Apenas observe. Você vai descobrir "hemorragias ocultas" — gastos automáticos que você nem lembrava que existia.

Instrumento 2 — Mapa de Dívidas: Liste TODAS as dívidas com: credor, valor total, parcela mensal e juros mensais (se souber). Some tudo. Este número, por mais assustador que pareça, é o ponto de partida — não o destino.

Instrumento 3 — Cálculo do Patrimônio Líquido: Some tudo que você tem (poupança, investimentos, bens) e subtraia tudo que você deve. Se o resultado for negativo, você está tecnicamente insolvente. Isso não é julgamento moral — é informação. E informação é poder.

A HEMORRAGIA OCULTA

Em 94% dos diagnósticos financeiros que fazemos, encontramos pelo menos uma "hemorragia oculta": uma assinatura esquecida, um plano que não usa mais, uma parcela que entrou no débito automático e ficou rodando anos. Uma cliente encontrou R$847/mês em serviços que ela não usava.

Encontrar e cortar hemorragias ocultas não exige sacrifício. Exige atenção. E pode liberar dinheiro imediato para acelerar o pagamento de dívidas.`,
      checklist: [
        "Baixar extrato bancário dos últimos 3 meses",
        "Categorizar gastos em: moradia, alimentação, transporte, lazer, assinaturas, dívidas",
        "Listar todas as dívidas com valor total e taxa de juros",
        "Calcular o patrimônio líquido (ativos - passivos)",
        "Identificar pelo menos 1 'hemorragia oculta' (assinatura ou gasto automático desnecessário)",
        "Cortar imediatamente gastos não essenciais identificados",
      ],
      exercise: `PLANILHA DE DIAGNÓSTICO (preencher agora):

RECEITAS MENSAIS:
• Salário líquido: R$___
• Outras rendas: R$___
• TOTAL: R$___

DESPESAS MENSAIS FIXAS:
• Moradia (aluguel/financiamento): R$___
• Transporte: R$___
• Alimentação: R$___
• Saúde: R$___
• Educação: R$___
• Assinaturas: R$___
• Parcelas e dívidas: R$___
• TOTAL FIXO: R$___

SOBRA MENSAL (Receita - Despesas fixas): R$___

Se a sobra for negativa — você está consumindo capital. Vá direto para o Capítulo 2.`,
    },
    {
      id: "pf-c2",
      title: "O Método PAGUE: 5 Etapas para Dívida Zero",
      badge: "Estratégia",
      pullQuote: "Dívida não é sentença. É um problema matemático com solução definida — desde que você saiba a equação certa.",
      body: `O Método PAGUE foi desenvolvido a partir da análise de 200+ casos reais de pessoas que saíram de dívidas significativas em menos de 18 meses. Não é motivação. É protocolo.

P — PRIORIZE dívidas pelo custo real

Nem toda dívida é igual. Um consignado a 2% ao mês custa muito menos do que um cartão de crédito rotativo a 18% ao mês. Priorizar por taxa de juros — e não por valor ou tamanho — é o que separa quem quitou em 12 meses de quem ficou rodando por 5 anos.

Regra: sempre pague o mínimo de todas as dívidas para não entrar em inadimplência. E coloque TODO o dinheiro extra na dívida de juros mais altos.

A — AUTOMATIZE pagamentos mínimos

Configure débito automático para o mínimo de todas as dívidas. Isso libera sua energia mental para focar na estratégia, e elimina o risco de esquecimento (que gera multa e prejudica o score).

G — GERE renda extra para o efeito bola de neve

Uma renda extra de R$500/mês direcionada integralmente para a dívida prioritária cria um "efeito bola de neve" — cada dívida quitada libera a parcela que estava sendo paga para atacar a próxima.

Formas de renda extra sem abandonar o emprego: freelance na área de atuação, venda de produtos físicos ou digitais, aluguel de itens (carro, quarto, espaço), serviços locais (aulas, limpeza, pequenos reparos).

U — USE a técnica da avalanche (não a bola de neve)

A técnica da avalanche (pagar primeiro a dívida de maior juro) é matematicamente superior à bola de neve (pagar primeiro a menor dívida). A diferença pode ser de milhares de reais em juros economizados.

E — ELIMINE uma dívida de cada vez

Quando a dívida de maior juro for quitada, pegue o valor que pagava nela e some ao pagamento mínimo da próxima. Seu poder de quitação aumenta progressivamente a cada dívida eliminada.`,
      checklist: [
        "Ordenar todas as dívidas da maior para a menor taxa de juros",
        "Configurar débito automático para o mínimo de todas as dívidas",
        "Calcular quanto sobra por mês para atacar a dívida prioritária",
        "Identificar pelo menos 1 fonte de renda extra possível",
        "Criar uma meta: 'Quitar [nome da dívida] até [data]'",
        "Celebrar cada dívida quitada — reforço positivo é parte do método",
      ],
      exercise: `TABELA DE ATAQUE ÀS DÍVIDAS:

| Dívida | Valor Total | Parcela | Juros/mês | Prioridade |
|--------|-------------|---------|-----------|------------|
| Ex: Cartão Nubank | R$4.200 | R$380 | 15,8% | 1º |
| Ex: Consignado | R$8.500 | R$320 | 1,9% | 4º |

Preencha esta tabela com suas dívidas reais e ordene pela coluna Juros. A primeira da lista recebe o dinheiro extra. As outras recebem apenas o mínimo.`,
    },
    {
      id: "pf-c3",
      title: "O Orçamento que Funciona: A Regra dos 3 Fundos",
      badge: "Organização",
      pullQuote: "A maioria das pessoas falha com orçamento porque tenta controlar cada centavo. A regra dos 3 fundos controla o sistema, não o detalhe.",
      body: `Todo método de orçamento que exige que você anote cada café que toma está condenado ao fracasso. Não porque você não tem disciplina — mas porque esse nível de granularidade é insustentável para seres humanos normais.

A Regra dos 3 Fundos é diferente: você controla a alocação do dinheiro no momento em que ele entra, não no momento em que você gasta.

OS 3 FUNDOS E SUAS FUNÇÕES

Fundo 1 — ESSENCIAL (50-70% da renda)
O que entra aqui: moradia, alimentação básica, transporte, saúde, educação, dívidas mínimas.
Regra: se este fundo ultrapassar 70% da sua renda, você tem um problema estrutural — ou sua renda é baixa para seu padrão de vida, ou há gastos essenciais que precisam ser renegociados (reside em local mais caro do que pode, financia carro acima do necessário, etc.).

Fundo 2 — LIBERDADE (20-30% da renda)
O que entra aqui: lazer, restaurantes, viagens, compras não essenciais, estilo de vida.
Regra: este fundo existe para você gastar SEM CULPA. Quando ele zera, acabou para o mês. Não tem crédito extra. Isso elimina a culpa do gasto moderado e o descontrole do gasto sem limite.

Fundo 3 — FUTURO (10-20% da renda)
O que entra aqui: reserva de emergência e, depois, investimentos.
Regra: este fundo é intocável exceto em emergências reais. Configure transferência automática assim que o salário cai.

COMO IMPLEMENTAR COM CONTA BANCÁRIA COMUM

Você não precisa de múltiplas contas. Basta criar um sistema mental e de planilha:
1. No dia do salário, transfira imediatamente o percentual do Fundo 3 para poupança ou CDB de liquidez diária.
2. Reserve mentalmente o valor do Fundo 1 (fixe na planilha).
3. O que sobrar é seu Fundo 2 — livre para gastar como quiser.`,
      checklist: [
        "Calcular quanto da renda atual vai para cada fundo (diagnóstico)",
        "Definir o percentual alvo para cada fundo baseado na sua situação",
        "Configurar transferência automática para o Fundo 3 no dia do salário",
        "Criar alerta de limite no aplicativo do banco para o Fundo 2",
        "Revisar o orçamento dos 3 fundos mensalmente nos primeiros 3 meses",
      ],
    },
    {
      id: "pf-c4",
      title: "Seus Primeiros R$1.000 Investidos: A Escada dos Ativos",
      badge: "Investimentos",
      pullQuote: "Investir não é para quem tem muito dinheiro. É para quem quer ter muito dinheiro.",
      body: `O maior mito dos investimentos no Brasil é que você precisa de muito dinheiro para começar. A maioria das plataformas aceita aportes a partir de R$30. O problema não é o valor mínimo. É o conceito de que primeiro você quita as dívidas, depois you investe.

Isso é verdade para a maioria das dívidas — mas a reserva de emergência começa antes de quitar qualquer coisa.

A ESCADA DOS ATIVOS (em ordem)

Degrau 1 — Reserva de Emergência (prioridade máxima)
Meta: 3 a 6 salários mensais em conta com liquidez diária (Tesouro Selic, CDB com liquidez diária, Nubank, PicPay).
Por que primeiro: sem reserva de emergência, qualquer imprevisto te joga de volta para o crédito caro. É o que quebra o ciclo do endividamento.

Degrau 2 — Tesouro Direto (segurança e rentabilidade)
Com a reserva formada, o Tesouro Selic continua sendo o melhor porto seguro para quem está começando. Rendimento atual: acima de 13% ao ano. Liquidez: D+1 (dinheiro disponível no dia seguinte).

Degrau 3 — CDBs e LCIs/LCAs (mais rentabilidade, mesma segurança)
CDBs de bancos médios com garantia do FGC (até R$250k por CPF por instituição) chegam a 120-140% do CDI. LCIs e LCAs são isentas de IR para pessoa física — o que aumenta o retorno real.

Degrau 4 — Renda Variável (crescimento de longo prazo)
FIIs (Fundos Imobiliários) pagam rendimento mensal e são acessíveis a partir de R$50/cota. Ações de empresas sólidas com dividendos históricos (VALE3, ITUB4, BBAS3) constroem patrimônio no longo prazo.

A REGRA DO APORTE AUTOMÁTICO
Configure, uma vez, o aporte automático mensal. Mesmo que seja R$100/mês. A consistência supera o volume: R$300/mês durante 20 anos a 10% ao ano = R$228.000.`,
      checklist: [
        "Abrir conta em corretora gratuita (Rico, XP, Clear ou banco digital)",
        "Definir meta de reserva de emergência (valor = 3x seu custo mensal)",
        "Fazer o primeiro aporte no Tesouro Selic (mesmo que R$30)",
        "Configurar aporte automático mensal",
        "Estudar 1 FII como próximo passo após reserva formada",
        "Nunca tirar dinheiro da reserva para gastos não emergenciais",
      ],
    },
    {
      id: "pf-c5",
      title: "O Plano de 90 Dias: Da Dívida à Liberdade",
      badge: "Execução",
      pullQuote: "Um plano sem data não é um plano. É um desejo.",
      body: `Chegou a hora de transformar tudo que você aprendeu em um cronograma de 90 dias com metas específicas, mensuráveis e realizáveis.

Não espere as condições perfeitas. Não espere quitar uma dívida para começar outra etapa. O progresso é simultâneo — e as vitórias parciais mantêm a motivação.

MÊS 1 — FUNDAÇÃO (Dias 1 a 30)

Objetivos:
• Completar o diagnóstico financeiro completo
• Cortar todas as hemorragias ocultas
• Implementar a Regra dos 3 Fundos
• Fazer o primeiro aporte na reserva de emergência (mesmo que R$50)
• Configurar todos os pagamentos mínimos em débito automático
• Identificar e lançar a fonte de renda extra

Marco do mês 1: Você deve saber exatamente quanto entra, quanto sai e para onde vai cada real.

MÊS 2 — ACELERAÇÃO (Dias 31 a 60)

Objetivos:
• Receber primeira renda extra e direcionar 100% para dívida prioritária
• Renegociar pelo menos 1 dívida (ligação para a financeira pedindo desconto para pagamento à vista)
• Atingir 1 salário na reserva de emergência
• Revisar orçamento dos 3 fundos com o que aprendeu no mês 1

Marco do mês 2: Primeira dívida quitada ou progresso significativo na prioritária.

MÊS 3 — CONSOLIDAÇÃO (Dias 61 a 90)

Objetivos:
• Manter ritmo de pagamento acelerado das dívidas
• Atingir 2 salários na reserva
• Calcular quanto tempo falta para quitar todas as dívidas com o ritmo atual
• Começar a aprender sobre investimentos para o próximo degrau

Marco do mês 3: Você tem visibilidade, tem reserva parcial, tem ritmo. O sistema está funcionando.`,
      checklist: [
        "Imprimir ou salvar este plano de 90 dias",
        "Definir 1 meta específica para cada mês",
        "Bloquear 30 minutos por semana para revisar as finanças",
        "Criar uma planilha de progresso (quanto já quitou, quanto falta)",
        "Encontrar um parceiro de accountability (cônjuge, amigo, familiar)",
      ],
      exercise: `METAS DOS 3 MESES (preencha agora):

Mês 1 — vou quitar/reduzir: R$___ da dívida [nome]
Mês 2 — vou quitar/reduzir: R$___ da dívida [nome]
Mês 3 — vou quitar/reduzir: R$___ da dívida [nome]

Reserva de emergência em 3 meses: R$___ (meta)
Renda extra que vou gerar: R$___/mês

Assine aqui: _____________ Data: ___________
(Comprometimento escrito aumenta 43% a probabilidade de cumprimento.)`,
    },
  ],
  bonus: {
    title: "Kit de Planilhas: Diagnóstico + Orçamento + Acompanhamento",
    description: "3 planilhas prontas para preencher e acompanhar sua evolução financeira nos próximos 90 dias.",
    items: [
      "Planilha 1: Diagnóstico Financeiro Completo (receitas, despesas, dívidas)",
      "Planilha 2: Orçamento dos 3 Fundos — controle mensal",
      "Planilha 3: Tracker de Dívidas — visualize o progresso semana a semana",
      "Calculadora de Juros: descubra quanto você paga de juros por ano",
      "Lista dos 10 maiores cortes de gasto que não impactam qualidade de vida",
    ],
  },
  cta: {
    headline: "Quer Acelerar Sua Virada Financeira com Acompanhamento?",
    body: "Este método funciona sozinho. Mas com mentoria financeira personalizada, nossos clientes quitam as dívidas em metade do tempo e evitam os erros que mais atrasam o processo. Conheça o Programa Virada Financeira Acelerada.",
    buttonText: "Quero Acompanhamento Personalizado",
    urgency: "Apenas 10 vagas por turma.",
  },
  finalPage: `Você chegou ao final deste guia com um sistema completo em mãos.

O Método PAGUE, a Regra dos 3 Fundos, a Escada dos Ativos e o Plano de 90 Dias — essas ferramentas já transformaram centenas de famílias que estavam exatamente onde você está agora.

A diferença entre quem transforma e quem apenas lê está em uma coisa: agir hoje.

Escolha a primeira ação. Abra a planilha. Faça o diagnóstico. Comece.

[SEU NOME]
[Seu contato]`,
};

// ─── Template 3: Planner Emagrecimento ────────────────────────────────────────

const PLANNER_EMAGRECIMENTO: TemplateMaster = {
  id: "emagrecimento",
  name: "Planner Emagrecimento",
  category: "Saúde",
  pages: 35,
  level: "Premium",
  colorA: "#10B981",
  colorB: "#064E3B",
  emoji: "🏃",
  coverPrompt: "Health and wellness ebook cover, emerald green and dark forest gradient, clean minimalist aesthetic, botanical leaves and wellness elements, silhouette of fit woman, white premium typography, fresh modern design, high quality digital art",
  hasMasterContent: true,
  meta: {
    title: "Método Corpo Novo 30 Dias",
    subtitle: "O protocolo anti-inflamação que faz você perder peso de forma duradoura — sem dieta restritiva, sem academia cara",
    authorPlaceholder: "Seu Nome Aqui",
    promise: "Perder de 4 a 8 kg em 30 dias e manter o resultado — sem contar caloria, sem passar fome, sem academia",
    uniqueMechanism: "Protocolo Anti-Chama — reprogramação metabólica em 4 semanas",
    transformation: "De dietas que falham para estilo de vida sustentável e resultado permanente",
    audience: "Mulheres de 28 a 50 anos que tentaram dietas repetidamente sem resultado duradouro",
  },
  chapters: [
    {
      id: "em-c1",
      title: "Por Que as Dietas Falham — e o que Realmente Funciona",
      badge: "A Verdade",
      pullQuote: "Não é falta de força de vontade. É uma guerra biológica que você está perdendo porque usa as armas erradas.",
      body: `Carla tentou 11 dietas em 8 anos. Emagreceu em todas. Voltou ao peso anterior — ou mais — em todas. Na última, perdeu 9kg em 45 dias com uma dieta de 800 calorias. Em 3 meses, havia recuperado 12kg.

Isso não é fracasso pessoal. É exatamente o que deveria acontecer — biologicamente.

O MECANISMO QUE AS DIETAS ATIVAM (E NINGUÉM TE CONTA)

Quando você corta drasticamente as calorias, seu corpo interpreta como ameaça de escassez. Resposta imediata: reduz o metabolismo basal em até 40% para conservar energia. Resultado: você emagrece menos do que deveria pela quantidade de comida que está deixando de comer, e quando volta à alimentação normal, seu metabolismo mais lento acumula gordura com velocidade acima da média.

É uma armadilha biológica. E a indústria das dietas sabe disso — por isso vende a mesma dieta de 14 formas diferentes para a mesma pessoa ano após ano.

O VERDADEIRO INIMIGO: INFLAMAÇÃO CRÔNICA

A ciência da obesidade evoluiu drasticamente nos últimos 10 anos. O que descobrimos: na maioria dos casos, o problema não é quantas calorias você come — é o estado inflamatório do seu organismo.

Inflamação crônica (causada por alimentos industrializados, açúcar, gordura trans, estresse e privação de sono) desarregula os hormônios da saciedade (leptina) e da fome (grelina), tornando impossível sentir quando você está satisfeito. E faz com que seu corpo armazene gordura preferencialmente — mesmo com dieta restritiva.

O PROTOCOLO ANTI-CHAMA trabalha na raiz: reduz a inflamação sistêmica. Quando a inflamação cai, os hormônios se normalizam, o metabolismo se reacalera, e o peso diminui naturalmente — sem contagem obsessiva de calorias.`,
      checklist: [
        "Parar com qualquer dieta restritiva de menos de 1.200kcal",
        "Identificar seus 3 maiores gatilhos de alimentação emocional",
        "Comprar um copo de 2 litros e meta: beber completamente todo dia",
        "Eliminar refrigerante e suco de caixinha por 30 dias",
        "Tirar foto corporal de frente, lateral e costas no Dia 1",
        "Pesar-se apenas uma vez por semana (não todo dia)",
      ],
    },
    {
      id: "em-c2",
      title: "O Protocolo Anti-Chama: O que Comer (e o que Parar de Comer)",
      badge: "Nutrição",
      pullQuote: "Você não precisa comer menos. Precisa comer diferente.",
      body: `A boa notícia: o Protocolo Anti-Chama não é uma dieta de privação. É uma troca inteligente — substituir alimentos que inflamam por alimentos que nutrem e saciam.

OS 5 ALIMENTOS QUE VOCÊ PRECISA ELIMINAR (por 30 dias)

1. Açúcar adicionado — o inflamador número 1. Não apenas o açúcar branco: xarope de milho, frutose em bebidas "naturais", adoçantes artificiais que mantêm o paladar acostumado ao doce.

2. Farinha de trigo refinada — transforma rapidamente em glicose, dispara insulina e estimula armazenamento de gordura abdominal.

3. Óleos vegetais refinados (soja, girassol, milho) — ricos em ômega-6 inflamatório. Substitua por azeite extra virgem, óleo de coco ou ghee.

4. Alimentos ultraprocessados — qualquer produto com mais de 5 ingredientes que você não reconheceria em uma feira.

5. Álcool — inflamador hepático direto. Nos 30 dias do protocolo, zero álcool. Depois, moderação.

OS 7 ALIMENTOS ANTI-INFLAMATÓRIOS PARA PRIORIZAR

1. Ômega-3 (salmão, sardinha, chia, linhaça) — regula leptina e grelina
2. Cúrcuma com pimenta-do-reino — combinação que potencializa a absorção da curcumina (anti-inflamatório natural)
3. Folhas verde-escuras (espinafre, rúcula, couve) — micronutrientes que suportam o metabolismo
4. Frutas vermelhas (morango, mirtilo, amora) — antioxidantes que combatem radicais livres
5. Ovos inteiros — proteína completa + colina para saúde hepática
6. Castanha-do-pará (2 unidades/dia) — selênio para tireóide ativa
7. Kefir ou iogurte natural sem açúcar — microbiota intestinal saudável = menos inflamação

CARDÁPIO MODELO (sem contar caloria):
Café da manhã: 3 ovos mexidos + 1 fatia de abacate + café sem açúcar
Almoço: proteína (frango/peixe/carne) + folhas à vontade + legumes coloridos + 1 porção de arroz integral (opcional)
Lanche: punhado de castanhas + fruta vermelha
Jantar: sopa de legumes com proteína OU versão menor do almoço`,
      checklist: [
        "Limpar a despensa: eliminar os 5 alimentos inflamatórios",
        "Fazer lista de compras anti-inflamatória para a semana",
        "Preparar 'meal prep' básico no domingo (proteínas + legumes cortados)",
        "Adicionar cúrcuma + pimenta-do-reino em pelo menos 1 refeição por dia",
        "Substituir óleos vegetais refinados por azeite extra virgem",
        "Tomar 1 colher de sopa de chia em 200ml de água em jejum",
      ],
    },
    {
      id: "em-c3",
      title: "O Treino dos 15 Minutos: Queima Máxima sem Academia",
      badge: "Movimento",
      pullQuote: "Treinar mais não emagrece mais. Treinar melhor, sim.",
      body: `O maior obstáculo para o exercício não é preguiça. É a crença de que é necessário ir à academia 5 vezes por semana, pagar R$150/mês e dedicar 1h por sessão. Quando essa estrutura falha (e ela sempre falha), a pessoa para de exercitar completamente.

O Protocolo Anti-Chama usa o princípio do mínimo efetivo: a menor dose de exercício que produz o máximo resultado metabólico.

POR QUE 15 MINUTOS FUNCIONA MELHOR DO QUE 1 HORA

Pesquisas da Universidade de Laval (Canadá) compararam exercício aeróbico longo (45 min moderado) com HIIT curto (15-20 min de alta intensidade). O grupo HIIT perdeu 9 vezes mais gordura corporal — apesar de queimar menos calorias durante o exercício.

O motivo: o HIIT cria um "débito de oxigênio" que mantém o metabolismo acelerado por até 48 horas após o treino. Em outras palavras, você continua queimando gordura enquanto dorme.

O CIRCUITO DE 15 MINUTOS (3x por semana)

Aquecimento (2 min): polichinelos + rotação de quadril

Bloco 1 (4 min — 20seg trabalho / 10seg descanso, 8 rounds):
Exercício escolhido: agachamento com salto OU burpee modificado OU corrida no lugar com joelho alto

Bloco 2 (4 min — mesma estrutura):
Exercício escolhido: flexão OU prancha com toque no ombro OU mountain climber

Bloco 3 (4 min — mesma estrutura):
Exercício escolhido: afundo alternado OU elevação de quadril OU pulo de corda

Desaquecimento (1 min): alongamento suave

PROGRESSÃO DAS 4 SEMANAS:
Semana 1: 3 sessões, foco em executar o movimento correto
Semana 2: 3 sessões, aumentar a intensidade no Bloco 1
Semana 3: 3 sessões + 1 caminhada de 30min
Semana 4: 4 sessões + 1 caminhada de 30min`,
      checklist: [
        "Escolher os 3 exercícios do circuito para começar",
        "Definir os 3 dias da semana para treinar (ex: seg, qua, sex)",
        "Criar alarme no celular para o horário do treino",
        "Tirar foto após cada semana para documentar progresso",
        "Adaptar movimentos se necessário (ex: flexão no joelho, agachamento sem salto)",
      ],
      exercise: `TESTE INICIAL (faça agora, antes de começar o programa):

• Quantas flexões você consegue fazer seguidas? ___
• Quanto tempo aguenta na prancha? ___
• Quantas elevações de quadril em 30 segundos? ___

Repita este teste no Dia 15 e no Dia 30. O progresso mensurável mantém a motivação.`,
    },
    {
      id: "em-c4",
      title: "A Mente Magra: Reprogramação para Resultado Duradouro",
      badge: "Mentalidade",
      pullQuote: "Seu cérebro não sabe a diferença entre o que é real e o que você imagina vividamente. Use isso a seu favor.",
      body: `Você pode ter o plano alimentar perfeito e o treino ideal. E ainda assim sabotar tudo em um momento de estresse, tristeza ou celebração. Não porque você é fraca. Porque seu cérebro foi programado para isso.

A neuroscientista Kelly McGonigal chama de "fuga para o prazer imediato" — quando o sistema límbico (emocional, instintivo) sobrepõe o córtex pré-frontal (racional, planejador). Toda sabotagem alimentar é esse mecanismo em ação.

IDENTIFICANDO SEU PADRÃO DE SABOTAGEM

Existem 3 perfis principais:

Comedor emocional: come quando está triste, ansioso, estressado ou entediado. A comida é regulação emocional, não nutrição.

Comedor social: come por pressão social, medo de ofender, necessidade de pertencimento. As reuniões de família e happy hours são os maiores gatilhos.

Comedor recompensa: usa comida como prêmio ("trabalhei muito hoje, mereço"). O sistema de recompensa está conectado à comida.

Reconhecer o seu perfil não é fraqueza — é o primeiro passo da reprogramação.

A TÉCNICA DOS 10 MINUTOS

Quando a vontade de comer algo fora do protocolo aparecer, não lute contra ela. Diga: "Vou esperar 10 minutos". Na maioria das vezes, o impulso passa. Se não passar, coma com consciência — sem culpa.

A culpa é mais inflamatória do que a comida em si. Cortisol (hormônio do estresse liberado pela culpa) está diretamente associado ao acúmulo de gordura abdominal.

AFIRMAÇÃO DE IDENTIDADE (mais poderosa do que metas)

Não diga: "Preciso emagrecer". Diga: "Sou uma pessoa que cuida do meu corpo".
A diferença não é semântica. É neurológica. Identidade é mais sustentável do que meta porque a meta termina; a identidade continua.

Execute este ritual por 21 dias: ao acordar, antes de olhar o celular, diga 3 vezes em voz alta: "Hoje eu escolho meu corpo. Hoje eu sou a pessoa que quero ser."`,
      checklist: [
        "Identificar seu perfil de sabotagem (emocional, social ou recompensa)",
        "Listar os 3 principais gatilhos de sabotagem da sua semana",
        "Criar uma resposta alternativa para cada gatilho (ex: 'quando estressar, vou caminhar 10 min')",
        "Praticar a afirmação de identidade por 21 dias ao acordar",
        "Eliminar a culpa: se comer fora do protocolo, voltar na próxima refeição, sem drama",
      ],
    },
    {
      id: "em-c5",
      title: "O Plano Semana a Semana: 30 Dias Estruturados",
      badge: "Execução",
      pullQuote: "Resultados são a soma de pequenas escolhas consistentes, não de gestos heróicos isolados.",
      body: `Este é o seu mapa dos 30 dias. Simples, estruturado, sem surpresas.

SEMANA 1 — DETOX E ADAPTAÇÃO (Dias 1-7)

Foco: eliminar os 5 alimentos inflamatórios e introduzir os anti-inflamatórios gradualmente.

O que esperar: nos dias 2 e 3, você pode sentir dores de cabeça ou cansaço. Isso é normal — é o seu corpo saindo da dependência do açúcar. Beba mais água, descanse mais, continue.

Alimentação: seguir o cardápio modelo 5 dias. Nos outros 2 dias, cozinhar o que quiser desde que sem os 5 alimentos proibidos.
Treino: 2 sessões de 15min (não 3 na primeira semana).
Meta da semana: terminar os 7 dias sem ter consumido nenhum dos 5 alimentos inflamatórios.

SEMANA 2 — ACELERAÇÃO (Dias 8-14)

Foco: o corpo começa a responder. A inflamação começa a ceder. Você deve sentir menos inchaço.
Alimentação: cardápio anti-inflamatório 6 dias, com 1 dia de flexibilidade controlada.
Treino: 3 sessões de 15min.
Meta da semana: pesar-se no dia 14 e registrar a perda.

SEMANA 3 — INTENSIFICAÇÃO (Dias 15-21)

Foco: seu metabolismo está acelerado. Seus hormônios de saciedade estão mais equilibrados. Você sente menos fome entre as refeições.
Alimentação: manter o protocolo + adicionar 1 alimento anti-inflamatório novo.
Treino: 3 sessões de 15min + 1 caminhada de 30min.
Meta da semana: sentir-se visivelmente diferente nas fotos.

SEMANA 4 — CONSOLIDAÇÃO (Dias 22-30)

Foco: transformar o protocolo em hábito permanente. Você não está mais "fazendo dieta" — está vivendo diferente.
Alimentação: protocolo completo + 1 refeição livre na semana (não é trapaça, é sustentabilidade).
Treino: 4 sessões + 2 caminhadas.
Meta da semana: pesar-se no dia 30, tirar fotos finais e celebrar a transformação.`,
      checklist: [
        "Imprimir ou salvar o plano das 4 semanas",
        "Comprar os alimentos anti-inflamatórios para a primeira semana",
        "Definir horário fixo para as 3 refeições principais",
        "Criar um diário de bordo (pode ser no celular) para registrar como se sente cada semana",
        "Pesar-se nos dias 1, 14 e 30 (só nesses dias)",
        "Tirar fotos nos dias 1 e 30 para comparação visual",
      ],
    },
  ],
  bonus: {
    title: "Receitas Anti-Inflamatórias: 15 Pratos em até 20 Minutos",
    description: "Receitas práticas, saborosas e validadas pelo protocolo — do café da manhã ao jantar.",
    items: [
      "5 opções de café da manhã sem glúten e sem açúcar",
      "5 almoços completos (proteína + gordura boa + carboidrato funcional)",
      "5 lanches e jantares rápidos anti-inflamatórios",
      "3 receitas de doces naturais para matar a vontade de açúcar",
      "Checklist diário de 30 dias para acompanhar o protocolo",
    ],
  },
  cta: {
    headline: "Quer Resultados Mais Rápidos com Acompanhamento Nutricional?",
    body: "O Método Corpo Novo 30 Dias funciona sem acompanhamento. Mas com consultoria nutricional personalizada, os resultados são amplificados — e você não precisa descobrir sozinha o que está travando o seu metabolismo específico.",
    buttonText: "Quero Consultoria Personalizada",
    urgency: "Horários limitados — agende sua avaliação gratuita.",
  },
  finalPage: `Você chegou ao final com um protocolo completo que vai além de uma dieta.

O Método Anti-Chama é um estilo de vida. E os 30 dias que você está prestes a completar são apenas o começo de uma transformação que vai durar anos.

Cuide do seu corpo. Ele é o único que você tem.

[SEU NOME]
[Seu contato]`,
};

// ─── Template 4: Guia TikTok Shop ─────────────────────────────────────────────

const TIKTOK_SHOP: TemplateMaster = {
  id: "tiktok-shop",
  name: "Guia TikTok Shop",
  category: "Marketing",
  pages: 25,
  level: "Iniciante",
  colorA: "#06B6D4",
  colorB: "#0E4F5C",
  emoji: "📱",
  coverPrompt: "Digital commerce ebook cover, cyan and dark teal gradient, modern social media aesthetic, smartphone with TikTok style interface, dynamic energetic design, white bold typography, neon accents, premium quality digital art",
  hasMasterContent: true,
  meta: {
    title: "Venda no TikTok Shop Sem Aparecer",
    subtitle: "O sistema de tráfego invisível que gera R$3.000 a R$18.000/mês — sem mostrar seu rosto, sem ter seguidores",
    authorPlaceholder: "Seu Nome Aqui",
    promise: "Faturar R$3.000 a R$18.000 por mês no TikTok Shop em 90 dias — sem aparecer em vídeo, sem seguidores e sem estoque",
    uniqueMechanism: "Sistema de Tráfego Invisível — conteúdo UGC + afiliados para escala sem exposição pessoal",
    transformation: "De zero no TikTok a loja gerando renda automática em 90 dias",
    audience: "Empreendedores e pessoas buscando renda extra sem aparecer em vídeos",
  },
  chapters: [
    {
      id: "ts-c1",
      title: "A Janela de Oportunidade que Está Fechando",
      badge: "Oportunidade",
      pullQuote: "As maiores fortunas do varejo online foram construídas por quem entrou primeiro. O TikTok Shop de hoje é o Mercado Livre de 2010.",
      body: `Em fevereiro de 2024, o TikTok Shop processou mais de US$33 milhões em transações em um único dia nos Estados Unidos. No Brasil, a plataforma chegou em 2023 e ainda está em fase de expansão acelerada — o que significa que os custos de aquisição de cliente estão artificialmente baixos e a concorrência ainda é mínima em dezenas de nichos.

Isso muda em 12 a 18 meses.

POR QUE AGORA É O MELHOR MOMENTO

O algoritmo do TikTok é democrático por necessidade estratégica: a plataforma precisa de sellers ativos para competir com Amazon e Shopee. Isso significa que lojas novas recebem impulso orgânico que nenhuma outra plataforma oferece gratuitamente.

Marcas que entraram no TikTok Shop nos primeiros 6 meses de operação no Brasil relatam:
• CAC (Custo de Aquisição de Cliente) 60% menor que no Meta Ads
• Taxa de conversão 2 a 3 vezes maior que em lojas próprias
• Crescimento orgânico de 0 a R$30k/mês em menos de 60 dias para produtos validados

O MODELO PARA QUEM NÃO QUER APARECER

A maioria das pessoas pensa que TikTok Shop exige que você grave vídeos. Não exige. O modelo de UGC (User Generated Content) e afiliados permite que você seja o dono da loja — enquanto outras pessoas criam o conteúdo que vende seus produtos.

Você estrutura, eles executam. Você lucra, eles ganham comissão.`,
      checklist: [
        "Criar uma conta de vendedor no TikTok Shop (loja)",
        "Explorar o TikTok Creative Center para identificar produtos em alta",
        "Listar 5 nichos com produtos físicos que você conhece ou tem acesso",
        "Verificar se o nicho tem criadores de conteúdo dispostos a fazer UGC",
      ],
    },
    {
      id: "ts-c2",
      title: "Encontrando o Produto Vencedor em 24 Horas",
      badge: "Produto",
      pullQuote: "O produto certo vende sozinho. O produto errado não vende com o melhor marketing do mundo.",
      body: `A diferença entre uma loja que fatura R$500/mês e uma que fatura R$50.000/mês raramente é o marketing. É o produto.

OS 5 CRITÉRIOS DO PRODUTO VENCEDOR

Critério 1 — Problema visível e imediato: o produto resolve um problema que as pessoas conseguem ver ou sentir. Produtos que eliminam dor, constrangimento ou inconveniência imediata convertem melhor do que produtos de benefício futuro.

Critério 2 — Demonstrável em 15 segundos: no TikTok, você tem 3 segundos para parar o scroll e 15 para convencer. O produto precisa ser visualmente impressionante ou gerar "nossa, preciso disso" instantaneamente.

Critério 3 — Margem mínima de 50%: se você compra por R$20 e vende por R$40, sobra para pagar plataforma (8-15%), custo de envio, custo do vídeo UGC e ainda ter lucro.

Critério 4 — Peso e volume reduzido: custo de envio é o vilão do e-commerce. Produtos leves e pequenos têm frete acessível e margens mais saudáveis.

Critério 5 — Recompra natural: produtos consumíveis ou que geram necessidade de mais itens (acessórios, complementos) criam clientes recorrentes sem custo extra de aquisição.

ONDE ENCONTRAR PRODUTOS

TikTok Creative Center: filtre por "mais vendidos" no Brasil. Você vai ver exatamente o que está sendo comprado agora.

Aliexpress e 1688: fornecedores chineses com preços de custo. O 1688 (plataforma chinesa em mandarim) tem preços até 70% menores que o Aliexpress para os mesmos itens.

Fornecedores nacionais: melhor tempo de entrega, menos dor de cabeça com alfândega. Pesquise no Mercado Livre como "atacado" e entre em contato direto.`,
      checklist: [
        "Pesquisar os 20 produtos mais vendidos no TikTok Creative Center Brasil",
        "Selecionar 3 candidatos que atendam todos os 5 critérios",
        "Calcular margem real de cada produto (preço de custo + frete + plataforma + UGC)",
        "Pedir amostras dos 2 melhores produtos para testar antes de estocar",
        "Definir o produto principal para lançar a loja",
      ],
    },
    {
      id: "ts-c3",
      title: "O Sistema de Conteúdo Sem Aparecer: UGC e Afiliados",
      badge: "Conteúdo",
      pullQuote: "Você não precisa ser o rosto da sua marca. Precisa ser o dono do sistema.",
      body: `UGC (User Generated Content) é conteúdo criado por terceiros para promover o seu produto. No TikTok Shop, é o modelo mais escalável: você não grava nada, mas tem dezenas de vídeos ativos gerando vendas simultaneamente.

COMO CONTRATAR CRIADORES DE UGC

Plataformas para encontrar criadores: Creators.br, InfluAgency, grupos do Facebook "UGC Brasil", Instagram com a busca "criador de conteúdo UGC".

Quanto pagar: R$50 a R$200 por vídeo para criadores iniciantes. R$300 a R$800 para criadores com portfólio. Comece com iniciantes — você vai testar 5 a 10 vídeos diferentes antes de encontrar o formato que converte.

O BRIEF PERFEITO PARA O CRIADOR

Envie para cada criador:
1. O produto (mande para a casa dele)
2. Descrição do avatar (quem ele deve "ser" no vídeo)
3. O problema que o produto resolve
4. Os 3 pontos que devem aparecer no vídeo
5. Exemplo de vídeo de referência (pode ser de outro produto similar)
6. Duração: 30 a 60 segundos

OS 3 FORMATOS QUE CONVERTEM NO TIKTOK SHOP

Formato 1 — Antes e depois: mostra o problema, usa o produto, mostra o resultado. Simples, visual, irresistível.

Formato 2 — Unboxing + reação genuína: a pessoa abre o produto e reage naturalmente. Autenticidade > produção.

Formato 3 — POV (ponto de vista): "Me tornei viciada nesse produto" / "Comprei sem saber que funcionaria assim" — hook em primeira pessoa que cria identificação.

PROGRAMA DE AFILIADOS TIKTOK

O TikTok Shop tem um programa nativo de afiliados: criadores de conteúdo que já têm audiência promovem seus produtos em troca de comissão (10-30%). Você configura no painel da loja, define a comissão e os criadores se inscrevem. É distribuição exponencial sem custo fixo.`,
      checklist: [
        "Criar a conta de vendedor e cadastrar o produto na loja TikTok Shop",
        "Contratar 3 criadores de UGC para o primeiro teste (plataformas de UGC ou grupos)",
        "Enviar produtos para os criadores com brief detalhado",
        "Configurar programa de afiliados com comissão de 15-20%",
        "Criar 1 vídeo próprio por semana (pode ser sem rosto, mostrando apenas o produto)",
        "Monitorar métricas: visualizações, cliques, conversão de cada vídeo",
      ],
      exercise: `BRIEF DO CRIADOR UGC (modelo para copiar e adaptar):

Olá, [nome]!

Produto: [Nome do produto] — [link para compra]
Avatar: [Descreva: mulher 30-40 anos, dona de casa, que tem problema X]
Problema que o produto resolve: [específico]
3 pontos obrigatórios no vídeo:
1. [ponto 1]
2. [ponto 2]
3. [ponto 3]
Duração: 30-45 segundos
Referência de vídeo: [link]
Entrega: [data]
Pagamento: R$[valor] via PIX após aprovação.

Obrigado!`,
    },
    {
      id: "ts-c4",
      title: "A Vitrine Perfeita e o Plano de 90 Dias",
      badge: "Configuração & Escala",
      pullQuote: "Uma loja mal configurada perde vendas que o melhor vídeo do mundo teria gerado.",
      body: `Você pode ter o produto certo e o vídeo certo — e ainda perder vendas por problemas na página da loja. A vitrine perfeita remove fricção entre o interesse e a compra.

CONFIGURAÇÃO DA LOJA TikTok SHOP

Nome da loja: não use seu nome pessoal se não quer se expor. Crie uma marca para o nicho. Ex: "Beleza Natural Brasil", "Casa Organizada Shop".

Fotos do produto: mínimo 5 fotos — produto sozinho em fundo branco, produto em uso, detalhe, tamanhos/variações, infográfico com os principais benefícios.

Descrição: comece com o problema que resolve, depois apresente o produto. Liste os benefícios em bullets. Inclua FAQ com as 5 dúvidas mais frequentes.

Preço: pesquise os 3 concorrentes diretos no TikTok Shop. Posicione 5-10% abaixo para ganhar as primeiras avaliações. Após 50 avaliações positivas, ajuste para o preço ideal.

Logística: use fulfillment do TikTok Shop (se disponível no seu estado) ou escolha transportadora parceira. Prazo de entrega é fator decisivo de compra — quanto menor, melhor conversão.

PLANO DE 90 DIAS

Dias 1-30 (Fundação):
• Cadastrar loja e produto
• Contratar 5 criadores UGC
• Publicar primeiros 10 vídeos
• Meta: primeiras 20 vendas

Dias 31-60 (Otimização):
• Analisar vídeos com melhor desempenho e replicar o formato
• Lançar programa de afiliados
• Adicionar segundo produto complementar
• Meta: R$3.000 em vendas

Dias 61-90 (Escala):
• Reinvestir 50% do lucro em mais UGC
• Recrutar 10 afiliados ativos
• Considerar tráfego pago TikTok Ads nos vídeos que já provaram conversão orgânica
• Meta: R$10.000 em vendas`,
      checklist: [
        "Configurar nome, logo e descrição da loja",
        "Fazer fotos profissionais do produto (pode ser celular com boa iluminação)",
        "Escrever descrição com problema + benefícios + FAQ",
        "Configurar frete e prazo de entrega",
        "Ativar programa de afiliados TikTok",
        "Criar planilha de controle: vídeos publicados, visualizações, vendas por vídeo",
      ],
    },
  ],
  bonus: {
    title: "7 Scripts de Vídeo Prontos para Usar",
    description: "Scripts testados para os 3 formatos que mais convertem no TikTok Shop — copie, adapte e entregue para seus criadores UGC.",
    items: [
      "Script 1: Antes e depois (formato 30 segundos)",
      "Script 2: Unboxing com reação genuína (formato 45 segundos)",
      "Script 3: POV 'Me tornei viciada' (formato 60 segundos)",
      "Script 4: Comparativo 'X vs meu produto' (formato 45 segundos)",
      "Script 5: Resposta de dúvida comum (formato 30 segundos)",
      "Script 6: Dia a dia com o produto (formato 60 segundos)",
      "Script 7: Testemunho de problema resolvido (formato 45 segundos)",
    ],
  },
  cta: {
    headline: "Quer Lançar Sua Loja TikTok Shop com Mentoria Estratégica?",
    body: "Este guia te dá o sistema completo. Com mentoria, você evita os 7 erros mais comuns que fazem iniciantes desperdiçar os primeiros R$2.000 em produto e UGC sem vender.",
    buttonText: "Quero Mentoria para Lançar Minha Loja",
    urgency: "Próxima turma com vagas limitadas.",
  },
  finalPage: `Você tem o sistema. Agora precisa de execução.

O TikTok Shop está crescendo. As lojas que existem hoje têm vantagem sobre as que vão existir amanhã. Cada dia de atraso é uma posição de mercado que outra pessoa está ocupando.

Comece hoje. Configure a loja hoje. Entre em contato com os criadores hoje.

Nos vemos no outro lado.

[SEU NOME]
[Seu contato]`,
};

// ─── Template 5: Ebook High Ticket ────────────────────────────────────────────

const HIGH_TICKET: TemplateMaster = {
  id: "high-ticket",
  name: "Ebook High Ticket",
  category: "Premium",
  pages: 100,
  level: "High Ticket",
  colorA: "#EAB308",
  colorB: "#78350F",
  emoji: "⭐",
  coverPrompt: "Premium luxury coaching ebook cover, deep gold and dark brown gradient, authority and prestige aesthetic, subtle crown or diamond elements, sophisticated typography, exclusive high-end consulting design, high quality digital art",
  hasMasterContent: true,
  meta: {
    title: "O Método Magnético",
    subtitle: "Como posicionar sua expertise para atrair clientes de R$5.000 a R$30.000 — sem precisar de audiência ou perseguir leads",
    authorPlaceholder: "Seu Nome Aqui",
    promise: "Fechar R$20.000 a R$100.000 por mês com poucos clientes premium que te procuram — sem cold call, sem spam e sem descontar seu preço",
    uniqueMechanism: "Método Magnético — a arquitetura de autoridade que inverte a dinâmica de vendas",
    transformation: "De expert subvalorizado a referência premium que escolhe com quem trabalha",
    audience: "Coaches, consultores, especialistas e prestadores de serviço B2B que querem escalar sem aumentar horas trabalhadas",
  },
  chapters: [
    {
      id: "ht-c1",
      title: "O Paradoxo do Expert: Por Que os Melhores Ganham Menos",
      badge: "O Problema",
      pullQuote: "Competência técnica e sucesso comercial são habilidades completamente diferentes. Dominar uma não garante a outra.",
      body: `Ricardo é o melhor terapeuta que você já conheceu. Seus clientes fazem transformações radicais. Suas sessões são condutas-benchmark. Ele fatura R$4.800 por mês.

Seu colega de faculdade, que por coincidência é medíocre como terapeuta, fatura R$47.000. A diferença não está na competência. Está no posicionamento.

O PARADOXO DA COMMODITY

Quando você compete por preço, você entra em um mercado onde o mais barato vence. Terapeutas que cobram R$80/hora competem entre si, e o mercado equilibra o preço para o mínimo que a maioria aceita. Terapeutas que cobram R$800/hora não competem entre si — porque cada um tem um posicionamento único que nenhum outro replicou.

A diferença entre R$80 e R$800 não é a qualidade do serviço. É a percepção de valor — construída deliberadamente através de posicionamento.

OS 3 ERROS QUE MANTÊM EXPERTS SUBVALORIZADOS

Erro 1 — Vender o processo: "Eu faço consultoria de marketing digital" descreve o que você faz. Não o que o cliente ganha. O cliente não quer "consultoria" — quer resultado específico.

Erro 2 — Servir todo mundo: quando você atende qualquer cliente de qualquer nicho a qualquer preço, você se torna genérico. Especialização radical é o que cria percepção de autoridade premium.

Erro 3 — Aguardar reconhecimento: experts esperam que o mercado "descubra" o quanto são bons. Clientes premium não descobrem — são atraídos por sinais deliberados de autoridade que você precisa construir e comunicar ativamente.

O MÉTODO MAGNÉTICO resolve esses 3 erros com uma arquitetura sistemática que transforma como o mercado te percebe.`,
      checklist: [
        "Mapear todos os serviços que você oferece e avaliar: qual tem o maior valor entregue?",
        "Identificar o nicho onde você tem os melhores resultados",
        "Calcular: se você atendesse apenas os 3 melhores tipos de cliente, quanto faturaria?",
        "Responder honestamente: você compete por preço ou por valor percebido?",
      ],
      exercise: `O TESTE DO POSICIONAMENTO (responda agora):

1. Em uma frase, o que você faz: ___
2. Para quem especificamente: ___
3. Qual resultado mensurável você entrega: ___
4. Em quanto tempo: ___
5. Que alternativas o cliente tem se não te contratar: ___

Se você não consegue responder as 5 perguntas com precisão, seu posicionamento é vago demais para atrair clientes premium.`,
    },
    {
      id: "ht-c2",
      title: "A Arquitetura da Autoridade: Os 4 Pilares do Método Magnético",
      badge: "Estrutura",
      pullQuote: "Autoridade não é o que você sabe. É o que os outros percebem que você sabe.",
      body: `O Método Magnético é construído sobre 4 pilares interdependentes. Cada pilar, sozinho, aumenta sua percepção de valor. Juntos, eles criam um campo magnético que atrai clientes premium enquanto você dorme.

PILAR 1 — ESPECIALIZAÇÃO RADICAL

O primeiro movimento contraintuitivo: estreitar drasticamente seu nicho.

Em vez de "consultor de marketing", torne-se "especialista em aquisição de clientes para clínicas de estética de médio porte no interior do Brasil". Em vez de "coach executivo", torne-se "mentor de transição de carreira para engenheiros que querem se tornar líderes técnicos na área de tecnologia".

A matemática da especialização: um generalista tem 10.000 concorrentes e precisa cobrar R$200/hora. Um especialista tem 50 concorrentes e pode cobrar R$2.000/hora — porque nenhuma das alternativas resolve o problema específico dele.

PILAR 2 — SISTEMA DE CASO DE ESTUDO

Um caso de estudo bem documentado vale mais do que 10 anos de experiência sem documentação. Por quê? Porque prova, de forma específica e crível, que você já fez o que o cliente precisa que você faça agora.

Estrutura do caso de estudo magnético:
• Situação do cliente ANTES (com dados quantitativos)
• O processo que você utilizou (sem revelar todos os detalhes — apenas o suficiente para ser crível)
• O resultado DEPOIS (com dados mensuráveis, idealmente com nome e foto do cliente)

3 casos de estudo bem construídos valem mais do que um site caro.

PILAR 3 — CONTEÚDO DE AUTORIDADE

Não é conteúdo de volume. É conteúdo de profundidade. Uma análise seminal publicada mensalmente é mais magnética do que 30 posts genéricos.

O conteúdo de autoridade revela como você pensa — não o que você sabe. Clientes premium compram seu framework, seu modelo mental, sua perspectiva única. Publique o que ninguém mais está dizendo sobre o seu nicho.

PILAR 4 — MECANISMO DE DISTRIBUIÇÃO SELETIVA

Clientes premium não são convencidos. São filtrados. Seu mecanismo de distribuição precisa qualificar enquanto distribui: quem se inscreve na sua newsletter, quem baixa seu material rico, quem aparece na sua live — já está se autoqualificando como potencial cliente premium.`,
      checklist: [
        "Definir a especialização radical em uma frase (nicho + problema + avatar)",
        "Documentar 3 casos de estudo reais com dados quantitativos",
        "Escolher 1 plataforma de conteúdo de autoridade (LinkedIn, newsletter ou podcast)",
        "Criar 1 lead magnet específico que qualifica o avatar premium",
        "Publicar pelo menos 1 conteúdo de autoridade profunda por semana",
      ],
    },
    {
      id: "ht-c3",
      title: "A Conversa de R$5.000: O Roteiro da Venda Consultiva",
      badge: "Vendas",
      pullQuote: "Na venda high ticket, quem faz mais perguntas vende mais. Quem fala mais, vende menos.",
      body: `A maioria dos experts odeia vender porque aprendeu a venda errada: apresentação de serviço → benefícios → preço → tentativa de fechar.

Esse modelo funciona para varejo. Para high ticket, é o caminho mais rápido para o "vou pensar" sem retorno.

A VENDA CONSULTIVA FUNCIONA DIFERENTE

Na venda consultiva, você não apresenta nada nas primeiras duas terças da conversa. Você diagnostica. Você faz perguntas. Você ouve mais do que fala. E ao final, o cliente chega à conclusão de que precisa do que você oferece — antes mesmo de você apresentar o preço.

O ROTEIRO DE 4 FASES (45 minutos)

Fase 1 — Situação (10 min): Entenda onde o cliente está. Perguntas: "Me conte sobre sua empresa/situação atual. Quais são seus maiores objetivos para os próximos 6 meses? O que você já tentou até agora?"

Fase 2 — Dor Profunda (15 min): Explore o custo real do problema. Perguntas: "Como esse problema está impactando seus resultados? Se isso continuar por mais 12 meses, onde você estará? O que você já perdeu por não ter resolvido isso?" — Cada pergunta aprofunda a consciência da dor. Quando o cliente sente a dor, o preço passa a ser comparado com o custo do problema, não com concorrentes.

Fase 3 — Visão (10 min): Construa o resultado desejado em detalhes vívidos. Perguntas: "Se você resolvesse completamente esse problema em 90 dias, o que seria diferente? Em termos de receita/equipe/qualidade de vida, como seria sua situação ideal?" — Quando o cliente articula o futuro desejado com clareza, ele já comprou emocionalmente.

Fase 4 — Apresentação e Fechamento (10 min): Agora você apresenta como você faz a ponte entre onde ele está e onde ele quer estar. Preço vem depois da proposta de valor — nunca antes.

A RESPOSTA PARA "TÁ CARO"

"Caro em relação ao quê?" — faça essa pergunta com calma genuína. Em 70% dos casos, o cliente vai comparar com um concorrente mais barato ou com o custo que imagina que "deveria" ser. Sua resposta: "Entendo. O que eu percebo é que nossos clientes que chegaram aqui com a mesma dúvida, após o processo, relatam que o investimento se pagou em [prazo]. O que mais te preocupa, além do valor?"`,
      checklist: [
        "Gravar uma conversa de vendas simulada e assistir (identificar onde você fala demais)",
        "Criar seu banco de 10 perguntas de diagnóstico por fase",
        "Treinar a pergunta 'em relação ao quê?' para a objeção de preço",
        "Definir: quais resultados mensuráveis você entrega e em qual prazo?",
        "Criar um processo de qualificação para só ter a conversa com quem é avatar correto",
      ],
    },
    {
      id: "ht-c4",
      title: "A Estrutura de Preços que Maximiza Receita por Cliente",
      badge: "Precificação",
      pullQuote: "Ter apenas um preço é o maior erro de precificação que um expert pode cometer.",
      body: `Quando você tem um único serviço a um único preço, você deixa dinheiro na mesa dos dois lados: clientes que pagariam mais ficam restritos ao seu teto, e clientes que precisam de uma entrada acessível vão embora porque o único preço é inacessível.

A ESCADA DE VALOR

A escada de valor resolve esse problema com 3 níveis de engajamento:

Degrau 1 — ENTRADA (R$500 a R$2.000): produto ou sessão de diagnóstico de baixa fricção. Objetivo: criar relacionamento, provar valor, qualificar para o próximo nível. Ex: assessment estratégico 1:1, minicurso denso, relatório personalizado.

Degrau 2 — NÚCLEO (R$3.000 a R$15.000): seu serviço principal com prazo e entregáveis definidos. Ex: mentoria de 3 meses, consultoria de implementação, programa intensivo.

Degrau 3 — VIP / PREMIUM (R$15.000 a R$100.000+): acesso máximo, resultado garantido, relacionamento de longo prazo. Ex: advisory anual, sócio de crescimento, retainer exclusivo.

PRECIFICAÇÃO BASEADA EM ROI

Para alta performance na venda high ticket, abandone precificação por hora trabalhada. Adote precificação por resultado gerado.

Se você ajuda uma empresa a faturar R$200.000 a mais por ano, cobrar R$20.000 pelo processo é matematicamente óbvio para o cliente. Você não está custando R$20.000 — está gerando R$180.000 de lucro líquido para eles.

A fórmula: descubra o valor econômico do resultado que você gera. Precifique entre 10% e 30% desse valor.

COMO APRESENTAR MÚLTIPLOS PREÇOS

Sempre apresente 3 opções. A do meio (Núcleo) é a que você quer que escolham. A de cima (VIP) ancora a percepção de valor. A de baixo (Entrada) é a opção para quem ainda não está pronto para o compromisso total.

Pesquisas de comportamento do consumidor mostram que, quando há 3 opções, 70% escolhem a do meio.`,
      checklist: [
        "Mapear os 3 níveis da sua escada de valor (Entrada, Núcleo, VIP)",
        "Calcular o ROI que seu serviço gera para os clientes (em R$ ou %)",
        "Definir o preço do Núcleo como 10-20% do valor que você gera",
        "Criar a página de serviços com as 3 opções apresentadas",
        "Preparar a descrição de cada nível com entregáveis claros e resultado esperado",
      ],
    },
    {
      id: "ht-c5",
      title: "O Sistema de Atração: Clientes Premium que Te Encontram",
      badge: "Aquisição",
      pullQuote: "Perseguir clientes é ineficiente e desgastante. Atraí-los é escalável e seletivo.",
      body: `O modelo de vendas da maioria dos experts é baseado em esforço ativo constante: cold outreach, networking intensivo, dependência de indicações espontâneas. Funciona, mas é insustentável — quando você para, as vendas param.

O SISTEMA DE ATRAÇÃO FUNCIONA DE FORMA OPOSTA

Em vez de você ir até os clientes, você cria ativos que trabalham 24/7 para atraí-los até você. Esses ativos são:

Ativo 1 — Conteúdo de Autoridade Profunda: Um artigo, análise ou ponto de vista que ninguém mais está produzindo sobre o seu nicho. Publicado no LinkedIn ou em newsletter. Atualizado mensalmente. Cada publicação é uma semente que pode gerar clientes por anos.

Ativo 2 — Lead Magnet Qualificador: Não um ebook genérico. Um diagnóstico personalizado, uma calculadora de ROI ou um framework que resolve parte do problema do cliente premium. Quem baixa já se qualifica.

Ativo 3 — Prova Social Estratégica: Seus casos de estudo publicados em formato de história — não como lista de logos. Uma transformação bem narrada converte melhor do que 10 logos de clientes famosos.

Ativo 4 — Parceiros de Encaminhamento: Profissionais que servem o mesmo avatar mas não competem com você. Um advogado empresarial e um consultor financeiro têm o mesmo cliente — mas não vendem o mesmo serviço. Acorde reciprocidade: ele indica para você, você indica para ele.

A MATEMÁTICA DA ATRAÇÃO

Se você publicar 1 conteúdo de autoridade por semana, terá 52 ativos publicados em um ano. Se cada ativo gerar 1 lead qualificado por mês, serão 52 leads — cada um podendo converter em R$5.000 a R$30.000. O retorno sobre o investimento de tempo é exponencialmente maior do que qualquer campanha de outreach.`,
      checklist: [
        "Escolher 1 plataforma principal para o conteúdo de autoridade (LinkedIn, newsletter ou YouTube)",
        "Criar o lead magnet qualificador (diagnóstico, calculadora ou framework)",
        "Publicar o primeiro conteúdo de autoridade profunda esta semana",
        "Mapear 5 potenciais parceiros de encaminhamento no mesmo nicho",
        "Entrar em contato com cada parceiro propondo reciprocidade",
      ],
    },
    {
      id: "ht-c6",
      title: "O Onboarding que Gera Indicações Automáticas",
      badge: "Retenção & Crescimento",
      pullQuote: "A melhor estratégia de aquisição de clientes é um serviço tão bom que os próprios clientes vendem por você.",
      body: `Empresas de consultoria e coaching de elite têm uma característica em comum: mais de 60% dos seus novos clientes vêm de indicações. Não de anúncios, não de cold outreach — de clientes que já passaram pela experiência e a recomendam espontaneamente.

Isso não acontece por acidente. É construído deliberadamente no processo de onboarding e entrega.

O MODELO DE ONBOARDING DOS 3 WOW

Wow #1 — Nos primeiros 24 horas: envie ao cliente algo inesperado e personalizado. Pode ser um roteiro customizado para o caso específico dele, um relatório de diagnóstico completo, um presente físico personalizado. O cliente acabou de fazer um investimento significativo e está com a ansiedade de "será que fiz a escolha certa?". O Wow #1 responde imediatamente: sim.

Wow #2 — Na primeira semana: entregue o primeiro resultado concreto. Mesmo que o projeto seja de 3 meses, existe algo que pode ser implementado e mostrar resultado na primeira semana. Vitória rápida = confiança reforçada = cliente mais engajado.

Wow #3 — Na metade do processo: apresente um resultado intermediário com comparativo quantitativo. "Você estava aqui. Agora está aqui. Aqui está aonde você chegará no final." Visualização de progresso mantém o comprometimento e cria antecipação.

PEDINDO INDICAÇÕES NA HORA CERTA

Não peça indicações quando o cliente está com problema ou dúvida. Peça quando ele está comemorando um resultado. "Estou muito feliz pelo que você conseguiu nessas 6 semanas. Você conhece outros [avatar ideal] que poderiam se beneficiar do mesmo processo?"

Simples, direto, na hora certa. Essa pergunta, feita 3 semanas após uma vitória significativa do cliente, tem taxa de resposta positiva de 60-80%.`,
      checklist: [
        "Criar o kit de boas-vindas personalizado para novos clientes (digital ou físico)",
        "Definir a 'vitória rápida' que pode ser entregue na primeira semana de qualquer projeto",
        "Criar template de apresentação de progresso para a metade do processo",
        "Definir o momento exato e o script para pedir indicação",
        "Criar um sistema de acompanhamento pós-projeto (email 30 dias depois, 90 dias depois)",
      ],
    },
  ],
  bonus: {
    title: "Kit Premium: Scripts + Templates + Calculadora",
    description: "As ferramentas que clientes da mentoria recebem para implementar o Método Magnético mais rápido.",
    items: [
      "Script completo da conversa de vendas consultiva (4 fases, 45 min)",
      "Template de caso de estudo que converte (estrutura + exemplos)",
      "Calculadora de ROI para apresentar ao cliente durante a venda",
      "Template de proposta de valor high ticket (3 níveis com pricing)",
      "Script de pedido de indicação pós-resultado",
      "Framework de conteúdo de autoridade: 12 temas para 12 semanas",
    ],
  },
  cta: {
    headline: "Pronto para Implementar o Método Magnético com Suporte Direto?",
    body: "Ler sobre o método é o primeiro passo. Implementar corretamente — sem os erros que atrasam 6 a 12 meses o processo — é o que separa quem fatura R$5k de quem fatura R$50k. Conheça o Programa de Imersão Método Magnético.",
    buttonText: "Quero Implementar com Mentoria",
    urgency: "Próxima turma fecha em 72h. 8 vagas disponíveis.",
  },
  finalPage: `Você chegou ao final com um sistema completo para se tornar o profissional que escolhe seus clientes — não o que aceita qualquer projeto.

O Método Magnético não é teoria. É o mesmo sistema que profissionais nas áreas de consultoria, coaching, saúde, educação e tecnologia usam para sair da corrida de preços e entrar no mercado premium.

A única coisa que separa você de onde quer estar é a implementação.

Comece pelo Pilar 1 esta semana. Especialização radical. Uma frase, uma audiência, uma transformação.

[SEU NOME]
[Seu contato]`,
};

// ─── Template 6: Relacionamento & Conquista ───────────────────────────────────

const RELACIONAMENTO: TemplateMaster = {
  id: "relacionamento",
  name: "Relacionamento & Conquista",
  category: "Relacionamentos",
  pages: 75,
  level: "Premium",
  colorA: "#8B0000",
  colorB: "#1a0a0a",
  emoji: "💋",
  coverPrompt: "Romantic luxury ebook cover, deep wine red and black gradient, elegant mysterious aesthetic, golden rose petals or silhouette of couple, gold foil typography accents, premium seduction theme, sophisticated passionate design, high quality digital art",
  hasMasterContent: true,
  meta: {
    title: "O Protocolo da Atração",
    subtitle: "A psicologia completa do desejo — como se tornar irresistível, criar conexões que duram e reconquistar quem você ama",
    authorPlaceholder: "Seu Nome Aqui",
    promise: "Desenvolver presença magnética, comunicação que seduz e reconquistar o amor em 30 dias — com psicologia real, não manipulação",
    uniqueMechanism: "Método DESEJO — 7 protocolos da psicologia emocional para relacionamentos de alta vibração",
    transformation: "De invisível e inseguro para magnético, confiante e irresistível nas relações",
    audience: "Pessoas que querem se tornar mais atraentes, melhorar relacionamentos existentes ou reconquistar um amor",
  },
  chapters: [
    {
      id: "rel-c1",
      title: "A Psicologia do Desejo: Por Que Certas Pessoas São Irresistíveis",
      badge: "Fundação",
      pullQuote: "A irresistibilidade não é uma questão de aparência. É uma questão de como você faz as pessoas se sentirem quando estão com você.",
      body: `Existe uma diferença fundamental entre ser bonito e ser irresistível. Muitas das pessoas mais atraentes do mundo são esquecíveis. E algumas pessoas com aparência comum magnetizam todos que entram em contato com elas. O que explica isso?

A resposta está na psicologia do desejo — e ela tem muito menos a ver com como você parece e muito mais com como você se apresenta.

O PRINCÍPIO DO FRAME (MOLDURA)

Em psicologia social, "frame" é a realidade que você projeta para os outros. Pessoas de alta atração vivem dentro de um frame poderoso: elas são o centro de gravidade social, não a lua girando ao redor de outros. Quando entram em um ambiente, não tentam conquistar aprovação — oferecem presença.

A maioria das pessoas inverte essa lógica. Agem como se precisassem provar que merecem atenção. Isso cria a dinâmica oposta: quanto mais você busca aprovação, menos você a recebe.

O paradoxo do desejo: quanto menos você precisa de alguém, mais essa pessoa te quer.

OS 3 FATORES PULL QUE CRIAM ATRAÇÃO IRRESISTÍVEL

Fator 1 — Presença Plena: pessoas irresistíveis fazem quem está com elas sentir que são a única pessoa no mundo. Elas escutam com os olhos, não só com os ouvidos. Fazem perguntas genuínas e se lembram de detalhes. Essa atenção total é rara — e extremamente magnética.

Fator 2 — Mistério Calculado: não revelar tudo de uma vez. Irresistibilidade é curiosidade não completamente satisfeita. Quando alguém te conhece completamente em 2 horas, a fascínação cai. Quando você mantém camadas de profundidade, a pessoa quer continuar descobrindo.

Fator 3 — Congruência Interna: agir de acordo com seus próprios valores, sem se dobrar à pressão social. Pessoas que mudam de opinião com base em quem está ao redor são previsíveis e sem atração. Quem mantém sua perspectiva mesmo sob pressão projeta solidez — e solidez é magneticamente atraente.

O DETECTOR DE VALOR SOCIAL

Todos nós temos um "detector" primitivo que avalia constantemente o valor social dos outros. Ele não analisa currículos — analisa postura, tom de voz, velocidade das respostas, como você fala de si mesmo, como reage a pressão. Em milissegundos, antes de qualquer lógica consciente, já formamos uma impressão de quem tem alto ou baixo valor social.

Este ebook te ensina a calibrar todos esses sinais para projetar o valor que você realmente tem — mas que talvez ainda não esteja comunicando.`,
      checklist: [
        "Observar: você busca aprovação na maioria das interações sociais?",
        "Praticar escuta ativa por 3 dias — olhar nos olhos, fazer perguntas de continuação",
        "Identificar um valor pessoal que você costuma esconder por medo de julgamento",
        "Criar o hábito de ser o último a responder mensagens (não imediatamente)",
        "Anotar 5 qualidades suas que você genuinamente admira",
      ],
      exercise: `ANÁLISE DO FRAME: Por 3 dias, observe cada interação social e responda:
• Você estava buscando aprovação ou oferecendo presença?
• Você revelou mais do que precisava ou manteve mistério natural?
• Você manteve seu ponto de vista ou cedeu à pressão do outro?

Este exercício não é sobre jogar games. É sobre reconhecer padrões que comunicam valor sem você perceber.`,
    },
    {
      id: "rel-c2",
      title: "Autoestima Magnética: O Alicerce que Transforma",
      badge: "Mentalidade",
      pullQuote: "Você não pode atrair amor que você não acredita merecer. A autoestima não é vaidade — é o pré-requisito de toda relação saudável.",
      body: `A baixa autoestima é a origem de 90% dos problemas relacionais. Não porque torna você menos atraente externamente — mas porque ela distorce cada interação, cada mensagem, cada silêncio do outro.

Com baixa autoestima, você interpreta uma resposta tarde como rejeição. Um "não sei" como desinteresse. Um dia difícil do outro como consequência da sua inadequação. Você vive em estado permanente de alerta emocional — o que drena tanto você quanto quem está com você.

O PROBLEMA DA VALIDAÇÃO EXTERNA

Pessoas que dependem de validação externa para se sentir bem vivem em uma montanha-russa emocional controlada pelos outros. Quando recebem atenção: euforia. Quando não recebem: ansiedade, ciúme, checagem compulsiva do celular.

Esse ciclo cria exatamente o comportamento que afasta as pessoas que você quer manter por perto.

A CONSTRUÇÃO DA AUTOESTIMA MAGNÉTICA

Autoestima magnética não é se convencer de que você é perfeito. É ter uma base sólida de identidade que não depende das reações dos outros para existir.

3 pilares práticos:

Pilar 1 — Padrões pessoais: defina como você quer viver, o que você aceita e o que não aceita em relacionamentos. Quando você tem padrões claros, para de perseguir quem não os cumpre.

Pilar 2 — Provas de competência: construa habilidades, conquistas e experiências que você genuinamente admira em si mesmo. Autoestima real vem de ações, não de afirmações.

Pilar 3 — Independência emocional: tenha uma vida que você ama, com amigos, projetos e interesses que não dependem de nenhum relacionamento específico. Quando sua vida é plena, você para de agarrar o que não serve.

A REGRA DO ESPELHO EMOCIONAL

As pessoas espelham nossa energia. Quando você entra em um relacionamento se sentindo completo, você atrai alguém que também se sente completo. Quando você entra carente, você atrai quem se alimenta de carência ou quem se afasta dela.

Sua vibração emocional é a sua maior ferramenta de atração.`,
      checklist: [
        "Listar 10 conquistas reais suas (não importa o tamanho)",
        "Definir 3 padrões inegociáveis para seus relacionamentos",
        "Identificar 1 hábito ou projeto que te faz sentir genuinamente orgulhoso de si mesmo",
        "Praticar a frase 'eu sou suficiente como sou' ao acordar por 21 dias",
        "Cancelar 1 compromisso que você aceita por medo de dizer não",
      ],
      exercise: `INVENTÁRIO DE IDENTIDADE: Responda sem pensar mais de 30 segundos:
• Quem eu sou além dos meus relacionamentos?
• O que eu faria se soubesse que ninguém estaria me julgando?
• Se a pessoa que eu quero conquistar me rejeitasse hoje, minha vida continuaria sendo boa?

Se a resposta à última pergunta for "não", você tem trabalho a fazer antes de reconquistar qualquer pessoa.`,
    },
    {
      id: "rel-c3",
      title: "Comunicação que Cativa: A Arte de Ser Inesquecível",
      badge: "Conexão",
      pullQuote: "As pessoas esquecerão o que você disse e o que você fez. Nunca esquecerão como você as fez sentir.",
      body: `A comunicação que cativa não é sobre falar bem. É sobre fazer a outra pessoa se sentir profundamente compreendida — o que é uma das experiências mais raras e poderosas que um ser humano pode ter.

Vivemos em um mundo de comunicação rasa: as pessoas ouvem para responder, não para entender. Quando você muda esse padrão, você se torna instantaneamente memorável.

A ESCUTA DE 3 NÍVEIS

Nível 1 — Escuta superficial: você ouve as palavras mas já está formulando sua resposta. 80% das pessoas ficam aqui.

Nível 2 — Escuta ativa: você ouve o conteúdo e faz perguntas de aprofundamento. "O que você quis dizer com isso?" / "Como isso te fez sentir?" Apenas 18% das pessoas chegam aqui.

Nível 3 — Escuta empática: você ouve as palavras, percebe a emoção por trás delas, e reflete a emoção de volta. "Parece que você ficou frustrado quando isso aconteceu, não foi?" Menos de 2% das pessoas praticam isso consistentemente. E é exatamente isso que cria a sensação de "finalmente alguém que me entende".

A TÉCNICA DA PERGUNTA PODEROSA

Perguntas comuns geram respostas comuns. Perguntas profundas geram conexão real.

Perguntas rasas: "Como foi seu dia?" / "O que você faz?"
Perguntas que criam conexão: "Qual foi o momento mais desafiador da sua semana e como você lidou com ele?" / "O que você faria se não tivesse medo de errar?"

A regra: faça 1 pergunta por vez, espere a resposta completa, e então aprofunde. Nunca interrogue — explore.

MIRRORING E RAPPORT INSTANTÂNEO

Espelhamento sutil — usar vocabulário parecido, ritmo de fala similar, linguagem corporal compatível — cria rapport em nível inconsciente. A pessoa sente que "há algo nesta pessoa que ressoa comigo" sem saber exatamente o quê.

Não copie roboticamente. Adapte naturalmente seu estilo de comunicação ao da pessoa com quem está.`,
      checklist: [
        "Praticar escuta de Nível 2 em pelo menos 3 conversas por dia",
        "Criar 5 'perguntas poderosas' sobre temas que te interessam genuinamente",
        "Eliminar o hábito de checar o celular durante conversas importantes",
        "Depois de cada conversa: o que a pessoa se sentiu ao falar comigo?",
        "Usar o nome da pessoa pelo menos 1 vez em cada conversa",
      ],
    },
    {
      id: "rel-c4",
      title: "A Linguagem do Corpo que Fala Mais Alto",
      badge: "Presença",
      pullQuote: "Seu corpo comunica 55% da sua mensagem antes de você abrir a boca. Aprenda o idioma que nunca para de falar.",
      body: `Pesquisas de Albert Mehrabian estabeleceram que em comunicações de conteúdo emocional: 55% da mensagem é transmitida pela linguagem corporal, 38% pelo tom de voz, e apenas 7% pelas palavras em si. Isso significa que a forma como você se apresenta fisicamente comunica mais do que o roteiro mais elaborado.

A linguagem corporal não pode ser fingida de forma sustentável — mas pode ser desenvolvida para refletir sua versão mais confiante e presente.

OS 5 ELEMENTOS DA PRESENÇA FÍSICA MAGNÉTICA

Elemento 1 — Postura de Abertura: ombros para trás, peito levemente aberto, posição ereta mas não rígida. Esta postura não é sobre parecer grande — é sobre estar aberto à conexão. Postura fechada (ombros curvados, braços cruzados) comunica insegurança ou hostilidade mesmo quando você está apenas nervoso.

Elemento 2 — Contato Visual Calibrado: 60-70% de contato visual durante escuta, 40-60% durante fala. Contato visual constante demais parece intensidade estranha; pouco de menos parece fuga. O olhar certo comunica: "Estou completamente aqui com você".

Elemento 3 — Velocidade dos Movimentos: pessoas seguras se movem com calma. Gestos rápidos e agitados sinalizam ansiedade. Falar mais devagar, fazer pausas confortáveis, não preencher todo silêncio com palavras — isso projeta domínio do momento.

Elemento 4 — O Sorriso Real: o sorriso genuíno (Duchenne) envolve os olhos, não só a boca. Você consegue distinguir instantaneamente entre um sorriso de fachada e um sorriso real. Use o segundo. E para ativá-lo genuinamente: pense em algo que você realmente aprecia antes de entrar em uma interação importante.

Elemento 5 — Proxêmica Intencional: a distância física comunica intimidade. Aproximar-se gradualmente (e observar se a pessoa espelha ou recua) é o radar mais preciso de interesse mútuo.

PRESENÇA VS. PERFORMANCE

A maior armadilha: tentar parecer confiante em vez de estar confiante. A performance é detectável — e ironicamente comunica insegurança. A presença genuína vem de estar tão absorto no momento e na pessoa à sua frente que você para de se monitorar. Esse estado é o que cria magnetismo real.`,
      checklist: [
        "Gravar 60 segundos de vídeo se apresentando e analisar postura, tom e contato visual",
        "Praticar postura de abertura ao sentar (não cruzar os braços por 1 semana)",
        "Exercício de respiração antes de interações importantes (4-7-8: inspire 4s, segure 7s, expire 8s)",
        "Observar: você preenche silêncios porque é natural ou porque sente desconforto?",
        "Praticar falar 20% mais devagar em conversas comuns",
      ],
      exercise: `CALIBRAÇÃO DE PRESENÇA: Em seu próximo encontro importante, monitore estes 3 pontos:
1. Seu telefone ficou no bolso/bolsa durante toda a conversa? (sim = presença total)
2. Você se lembrou de fazer pelo menos 2 perguntas de aprofundamento? (sim = escuta real)
3. Sua postura estava aberta e seus movimentos eram calmos? (sim = presença física)

O objetivo não é performance — é consciência.`,
    },
    {
      id: "rel-c5",
      title: "Gatilhos Emocionais: A Ciência do Desejo Sustentável",
      badge: "Psicologia",
      pullQuote: "O desejo não é sustentado pela presença constante. É sustentado pela antecipação, pelo mistério e pela certeza alternada com incerteza.",
      body: `A neurociência do desejo revela algo que parece paradoxal: dopamina (o neurotransmissor do desejo) não é liberada quando recebemos o que queremos — é liberada na antecipação de possivelmente receber. Isso explica por que a conquista é muitas vezes mais emocionante do que a posse, e por que relacionamentos que começam com 100% de disponibilidade frequentemente perdem a faísca rápido.

Entender isso não é sobre manipulação — é sobre criar dinâmicas que mantêm o desejo vivo de forma sustentável.

O SISTEMA DOPAMINÉRGICO NOS RELACIONAMENTOS

O sistema de recompensa cerebral responde mais intensamente a recompensas variáveis do que a recompensas previsíveis. Isso é o mesmo mecanismo que torna jogos de azar viciantes. Aplicado a relacionamentos de forma saudável: a imprevisibilidade calibrada mantém a pessoa genuinamente curiosa sobre você.

Imprevisibilidade saudável não é jogar games — é ter uma vida rica o suficiente para que você nem sempre esteja disponível. É ter opiniões que às vezes surpreendem. É ser consistente em valores mas nunca completamente previsível em ações.

OS 4 GATILHOS QUE SUSTENTAM O DESEJO

Gatilho 1 — Escassez Real: você tem uma vida que acontece independentemente de qualquer relacionamento. Você cancela planos quando precisa. Você não muda de agenda para agradar — isso não é descuido, é ter limites.

Gatilho 2 — Reconhecimento Específico: elogios genéricos não emocionam. Elogios específicos e sinceros criam conexão. "Você é incrível" não. "A forma como você lidou com aquela situação difícil na semana passada me impressionou muito" — sim.

Gatilho 3 — Tensão e Resolução: pequenas tensões e desafios seguidos de resolução criam os picos de dopamina mais poderosos. Uma brincadeira leve que cria tensão, seguida de afeto — é o padrão clássico de casais com alta atração mútua sustentada.

Gatilho 4 — Crescimento Compartilhado: o desejo se mantém quando ambos continuam evoluindo. Relacionamentos que estagnam em rotina perdem a faísca porque o cérebro para de liberar dopamina para o que é completamente familiar. Criar experiências novas juntos reinicia o sistema.

A DIFERENÇA ENTRE ATRAÇÃO E APEGO

Atração = eu quero estar com você porque você é fascinante.
Apego ansioso = eu preciso estar com você porque tenho medo de perdê-lo.

Um cria desejo. O outro cria sufocamento. A diferença está na sua relação com você mesmo — o que nos leva de volta ao Capítulo 2.`,
      checklist: [
        "Avaliar: você tem uma vida que existe independentemente de seus relacionamentos?",
        "Praticar dar 1 elogio específico e sincero por semana (não genérico)",
        "Criar pelo menos 1 experiência nova por mês com quem você quer manter próximo",
        "Identificar quando você age por medo de perder vs. genuína vontade de estar",
        "Reduzir a disponibilidade imediata em 30% (não responder toda mensagem em segundos)",
      ],
    },
    {
      id: "rel-c6",
      title: "O Protocolo Digital — Mensagens que Criam Desejo",
      badge: "Comunicação Digital",
      pullQuote: "No mundo digital, cada mensagem é uma escolha. As pessoas se apaixonam por como você as faz sentir — mesmo através de uma tela.",
      body: `Vivemos a maior parte da nossa comunicação interpessoal através de telas. Isso criou uma nova habilidade crítica: a arte de criar conexão e desejo através de texto, áudio e vídeo.

A maioria das pessoas destrói o interesse que construiu pessoalmente ao enviar mensagens genéricas, longas demais, cedo demais ou tarde demais. A comunicação digital tem regras próprias — não escritas, mas poderosas.

AS 5 REGRAS DO PROTOCOLO DIGITAL

Regra 1 — Timing calibrado: não responder sempre imediatamente cria a percepção (real) de que você tem uma vida. A regra geral: responda em proporção à intimidade atual da relação. No início: não mais rápido do que o outro responde. Com intimidade estabelecida: responsividade é sinal de cuidado.

Regra 2 — Mensagens com gancho: toda mensagem que você envia deve criar uma razão para continuar a conversa ou para pensar em você. Mensagens que terminam em declarações encerram a conversa. Mensagens que terminam em perguntas leves ou gancho de curiosidade a mantêm.

Regra 3 — A proporção 3:1: para cada pergunta que você faz, tenha 3 coisas interessantes para compartilhar. Conversas unilaterais (só você perguntando) criam desequilíbrio.

Regra 4 — Conteúdo específico vs. genérico: "Oi, como foi seu dia?" = conversa de elevador. "Passando aqui e lembrei da sua história sobre [algo específico]" = conexão real. Referências a conversas anteriores mostram que você esteve presente e se importou o suficiente para lembrar.

Regra 5 — A mensagem que não pede nada: periodicamente, envie algo genuinamente interessante (um artigo, vídeo, piada interna) sem nenhuma expectativa de resposta ou continuação. Isso cria presença positiva sem pressão.

COMO SAIR DO LIMBO DIGITAL

O "limbo digital" é quando você trocou mensagens mas não sabe onde está a relação. A saída: peça o encontro. "Tenho vontade de te ver, o que acha de [lugar/atividade] na [dia]?" — simples, direto, com uma proposta concreta. Pessoas que ficam no limbo digital por semanas constroem uma conexão artificial que raramente se converte em relação real.`,
      checklist: [
        "Auditar as últimas 10 mensagens que você enviou: elas criavam conexão ou eram genéricas?",
        "Criar 3 'mensagens de gancho' que você pode adaptar para diferentes contextos",
        "Praticar referenciar algo específico de conversas anteriores nas próximas 5 interações",
        "Reduzir o uso de figurinhas como substituto de texto (figurinha não cria conexão)",
        "Se está no limbo digital há mais de 1 semana: proponha um encontro real",
      ],
      exercise: `ANÁLISE DE CONVERSA: Pegue uma conversa de texto importante dos últimos 30 dias e analise:
• Qual a proporção de perguntas que você fez vs. conteúdo que você compartilhou?
• Suas mensagens terminavam em pontos finais (encerramento) ou criavam continuação?
• Havia referências específicas a conversas anteriores ou eram trocas genéricas?
• Você propôs encontros reais ou ficou no limbo digital?

A análise honesta é o primeiro passo da melhoria.`,
    },
    {
      id: "rel-c7",
      title: "Reconquista — O Protocolo dos 30 Dias",
      badge: "Reconquista",
      pullQuote: "Reconquistar alguém não é sobre recuperar o passado. É sobre se apresentar como a versão evoluída de si mesmo que essa pessoa nunca conheceu.",
      body: `A reconquista é o território mais emocionalmente carregado da psicologia dos relacionamentos. E também o mais cheio de erros evitáveis.

O maior erro de quem quer reconquistar: tentar voltar ao ponto onde estava quando a relação terminou. Isso falha por uma razão simples — a relação terminou exatamente porque estava naquele ponto.

O PROTOCOLO DOS 30 DIAS: POR QUE 30 DIAS?

30 dias é o tempo mínimo para que mudanças visíveis aconteçam, para que a saudade se estabeleça e para que a outra pessoa veja que você não vai mendigar. É também o tempo necessário para você trabalhar nos capítulos anteriores deste guia e aparecer como alguém genuinamente diferente — não porque está performando, mas porque cresceu.

SEMANA 1 — SILÊNCIO ESTRATÉGICO (Dias 1-7)

Zero contato. Não "curtir" posts, não ver stories deliberadamente, não enviar mensagem de "oi, como você está?". O silêncio serve a dois propósitos: permite que a ansiedade do outro em relação à sua ausência se estabeleça, e força você a parar de agir pela emoção.

Durante essa semana: foque exclusivamente no Capítulo 2 (autoestima) e no Capítulo 4 (presença física). Comece 1 hábito novo que te transforma visivelmente.

SEMANA 2 — RECUPERAÇÃO VISÍVEL (Dias 8-14)

Volte a ser ativo nas redes sociais — mas com conteúdo de qualidade que mostre sua vida em evolução. Não para provocar ciúme artificialmente, mas para comunicar que você está vivo, crescendo e não estava esperando. Primeira interação possível: responda a um story com algo genuíno (não uma pergunta vazia).

SEMANA 3 — PRIMEIRO CONTATO DE ALTO VALOR (Dias 15-21)

Uma mensagem única, específica e sem expectativa de resultado. Não "saudade de você". Não "você tem razão em tudo". Uma mensagem que referencia algo específico e mostra que você cresceu. Exemplo: "Vi um artigo sobre [tema que vocês discutiam] e pensei em você. Espero que esteja bem." Ponto final. Sem cobrar resposta.

Se houver resposta: aplique o Protocolo Digital do Capítulo 6.

SEMANA 4 — PROPOSTA DE REENCONTRO (Dias 22-30)

Se houve troca de mensagens: proponha um encontro casual e de baixa pressão. "Tenho passado pelo [lugar] que a gente costumava frequentar. O que acha de um café?" — Sem reconstrução do relacionamento no texto. Sem promessas. Sem declarações. Um encontro para mostrar presencialmente quem você se tornou.

O QUE VOCÊ NÃO DEVE FAZER (EM NENHUM DOS 30 DIAS)

• Discutir o relacionamento por mensagem
• Pedir desculpas longas por texto (se necessário, faça pessoalmente)
• Demonstrar insegurança ou necessidade de validação
• Monitorar compulsivamente as redes sociais da pessoa
• Agir por impulso emocional em vez de protocolo

O sucesso da reconquista depende de 90% do trabalho que você faz em você mesmo — e apenas 10% de como você se comunica com a outra pessoa.`,
      checklist: [
        "Comprometer-se com 7 dias de silêncio completo (sem contato, sem monitorar)",
        "Definir 1 transformação visível para fazer nos 30 dias (academia, visual, novo projeto)",
        "Escrever a mensagem do Dia 15 com antecedência — e pedir a um amigo honesto para avaliar",
        "Criar lista de tópicos genuinamente interessantes para a conversa do reencontro",
        "Estabelecer: qual mudança real houve em você que justifica tentar de novo?",
        "Manter o plano mesmo que emocionalmente difícil — especialmente na semana 1",
      ],
      exercise: `CARTA DE CLAREZA (não enviar — apenas escrever):

Escreva uma carta honesta para a pessoa que você quer reconquistar com 3 partes:
1. O que eu entendo que aconteceu de verdade (sem culpas, sem vitimismo)
2. O que mudou em mim desde então (específico, não genérico)
3. O que eu ofereço agora que não oferecia antes

Esta carta é para você, não para ela/ele. Ela vai clarear se a reconquista faz sentido — ou se o que você quer reconquistar é a sensação de segurança, não a pessoa em si.`,
    },
  ],
  bonus: {
    title: "Kit Protocolo da Atração: Scripts + Exercícios + Diagnóstico",
    description: "Ferramentas práticas para implementar cada protocolo nos 30 dias de transformação.",
    items: [
      "Diagnóstico de Autoestima: 15 perguntas que revelam onde está o bloqueio",
      "Banco de 20 Perguntas Poderosas para criar conexão profunda",
      "5 Scripts de Mensagens de Alto Valor (adapte para o seu contexto)",
      "Checklist diário dos 30 dias do Protocolo de Reconquista",
      "Guia de Linguagem Corporal: 10 posições e o que comunicam",
      "Exercício de Autoconhecimento: 'Quem sou eu quando ninguém está olhando?'",
    ],
  },
  cta: {
    headline: "Pronto para Se Tornar a Versão Mais Magnética de Você Mesmo?",
    body: "Este protocolo funciona porque ataca a raiz do problema: não como você se apresenta, mas quem você é. Com acompanhamento individual, o processo é mais rápido e mais profundo — você para de repetir os mesmos padrões e começa a atrair relacionamentos que realmente servem à sua versão mais evoluída.",
    buttonText: "Quero Acompanhamento Individual",
    urgency: "Apenas 5 vagas mensais para mentorias de relacionamento.",
  },
  finalPage: `Você chegou ao final com 7 protocolos completos.

A psicologia do desejo, a autoestima magnética, a comunicação que cativa, a presença física, os gatilhos emocionais, o protocolo digital e a reconquista — cada um deles sozinho pode transformar seus relacionamentos. Juntos, eles criam uma versão de você que não precisa perseguir amor porque já o atrai naturalmente.

O maior insight deste guia: a pessoa mais difícil de conquistar não é quem você ama. É você mesmo.

Comece por lá.

[SEU NOME]
[Seu contato]`,
};

// ─── Stub Templates (sem master content) ─────────────────────────────────────

function makeStub(
  id: string,
  name: string,
  category: string,
  pages: number,
  level: TemplateMaster["level"],
  colorA: string,
  colorB: string,
  emoji: string,
  title: string,
  subtitle: string,
  audience: string,
  chapTitles: string[],
  coverPrompt?: string,
): TemplateMaster {
  return {
    id, name, category, pages, level, colorA, colorB, emoji, coverPrompt,
    hasMasterContent: false,
    meta: {
      title,
      subtitle,
      authorPlaceholder: "Seu Nome Aqui",
      promise: `Este template te ajuda a criar um produto de ${category} de alto valor.`,
      uniqueMechanism: "Personalize com seu método único",
      transformation: "Do ponto A ao ponto B",
      audience,
    },
    chapters: chapTitles.map((t, i) => ({
      id: `${id}-c${i + 1}`,
      title: t,
      body: `Escreva aqui o conteúdo estratégico do capítulo "${t}".\n\nDica: inclua sua história pessoal, frameworks únicos, exemplos reais e exercícios práticos.`,
      checklist: ["Ação 1 deste capítulo", "Ação 2 deste capítulo", "Ação 3 deste capítulo"],
      exercise: `Exercício prático do capítulo "${t}": descreva o exercício que o leitor deve fazer para fixar o conteúdo.`,
    })),
    bonus: {
      title: "Bônus: Material Complementar",
      description: "Adicione aqui os materiais bônus do template.",
      items: ["Bônus 1: descreva o conteúdo", "Bônus 2: descreva o conteúdo", "Bônus 3: descreva o conteúdo"],
    },
    cta: {
      headline: "Próximo Passo",
      body: "Descreva aqui a chamada para ação principal do produto — o que o leitor deve fazer depois de terminar.",
      buttonText: "Quero Saber Mais",
      urgency: "Vagas limitadas.",
    },
    finalPage: `Obrigado por chegar até aqui.\n\nEscreva aqui a mensagem final do produto — pessoal, motivacional e com seu contato.\n\n[SEU NOME]\n[Seu contato]`,
  };
}

const PLANNER_FEMININO_STUB = makeStub(
  "planner-feminino", "Planner Feminino", "Organização", 45, "Premium", "#EC4899", "#831843", "🌸",
  "Planner da Mulher Realizada",
  "Organização, metas, bem-estar e equilíbrio em 30 dias",
  "Mulheres que querem mais organização, propósito e equilíbrio na vida",
  ["Quem Você Quer Se Tornar", "Organizando Sua Semana Perfeita", "Rotina Matinal que Transforma", "Metas que Você Realmente Alcança", "Cuide da Sua Energia", "Relacionamentos que Nutrem", "Seu Plano de 30 Dias"],
  "Elegant women's planner ebook cover, rose pink and gold gradient, floral botanical elements, feminine premium design, soft luxury lifestyle aesthetic, empowering and beautiful, professional quality",
);

const DEVOCIONAL_STUB = makeStub(
  "devocional-cristao", "Devocional Cristão", "Espiritual", 60, "Premium", "#7C3AED", "#2E1065", "✝️",
  "Devocionais que Transformam: 30 Dias na Presença de Deus",
  "Reflexões diárias para uma fé ativa, propósito claro e vida transformada",
  "Cristãos que buscam crescimento espiritual, propósito e intimidade com Deus",
  ["A Fé que Age", "Oração: Conversa ou Protocolo?", "Identidade no Evangelho", "Propósito Divino e Vocação", "Superando os Desertos", "Comunidade e Discipulado", "Vivendo a Missão"],
  "Premium Christian devotional ebook cover, deep purple and gold, cross with divine light rays, peaceful heavenly atmosphere, modern church aesthetic, inspiring and reverent, professional quality",
);

const KDP_STUB = makeStub(
  "kdp-amazon", "Ebook KDP Amazon", "Publicação", 70, "Premium", "#0EA5E9", "#0C4A6E", "📚",
  "KDP do Zero: Publique e Lucre na Amazon",
  "Como escrever, formatar e vender ebooks na Amazon KDP — do zero ao primeiro royalty",
  "Escritores e empreendedores que querem publicar na Amazon e gerar renda passiva",
  ["Por Que a Amazon KDP é a Maior Oportunidade do Momento", "Escolhendo Nicho e Validando sua Ideia", "Escrevendo Rápido e com Qualidade", "Formatação Profissional para KDP", "Capa que Vende: Guia Completo", "Upload, Precificação e Lançamento", "Estratégias para Escalar Royalties"],
  "Professional Amazon KDP publishing ebook cover, deep blue and cyan gradient, books and digital publishing concept, modern minimalist design, income and passive revenue theme, high quality",
);

const SEO_STUB = makeStub(
  "seo", "SEO na Prática", "Marketing Digital", 55, "Premium", "#16A34A", "#14532D", "🔍",
  "SEO na Prática: Ranqueie no Google e Atraia Clientes Grátis",
  "O método completo para dominar o SEO, aparecer no Google e gerar tráfego orgânico em 90 dias",
  "Empreendedores, freelancers e criadores de conteúdo que querem crescer organicamente",
  ["Como o Google Realmente Funciona", "Pesquisa de Palavras-chave Estratégica", "SEO On-Page: A Anatomia do Artigo Perfeito", "Link Building Sem Parecer Spam", "SEO Técnico Simplificado", "Conteúdo que Ranqueia e Converte", "Medindo e Escalando seus Resultados"],
  "Professional SEO marketing ebook cover, green gradient, search engine optimization concept, Google ranking, data analytics, modern digital marketing design, clean and authoritative",
);

const COPY_STUB = makeStub(
  "copywriting", "Copywriting que Vende", "Marketing", 65, "Premium", "#EA580C", "#7C2D12", "✍️",
  "Copy que Converte: O Método dos Copywriters de Alta Performance",
  "As técnicas de persuasão usadas pelos maiores copywriters para escrever textos que vendem 24/7",
  "Empreendedores, criadores de conteúdo e profissionais de marketing que querem escrever melhor",
  ["A Psicologia Por Trás de Todo Texto que Vende", "A Estrutura do Headline Irresistível", "Storytelling como Arma de Vendas", "Gatilhos Mentais: Guia Completo", "Escrevendo Páginas de Vendas", "Email Marketing que Abre e Compra", "Revisão e Otimização de Copy"],
  "Dynamic copywriting ebook cover, bold orange and dark brown, pen writing persuasive copy, marketing and sales energy, powerful typography, professional business book aesthetic",
);

const RECEITAS_STUB = makeStub(
  "receitas", "Livro de Receitas", "Culinária", 60, "Iniciante", "#DC2626", "#7F1D1D", "🍳",
  "Do Zero à Mesa: Receitas que Impressionam",
  "60 receitas práticas, saborosas e fáceis para o dia a dia — do café da manhã à sobremesa",
  "Pessoas que querem cozinhar melhor, comer bem e impressionar em casa",
  ["Os Segredos dos Chefs para o Dia a Dia", "Café da Manhã que Dá Energia", "Almoços Rápidos e Nutritivos", "Jantares para Momentos Especiais", "Sobremesas Irresistíveis", "Receitas Fitness e Saudáveis", "Dicas de Mise en Place e Organização"],
  "Beautiful recipe cookbook cover, warm red and cream colors, kitchen photography, fresh ingredients, herbs and spices, professional food styling, appetizing and inviting design",
);

const INFANTIL_STUB = makeStub(
  "ebook-infantil", "Ebook Infantil", "Educação", 35, "Iniciante", "#2563EB", "#1E3A8A", "🧒",
  "Aprender Brincando: Histórias que Ensinam",
  "Histórias pedagógicas, atividades lúdicas e aprendizado que encanta crianças de 4 a 8 anos",
  "Pais, educadores e criadores de conteúdo infantil",
  ["A Magia das Histórias na Aprendizagem", "Contando Histórias que Prendem a Atenção", "Valores pelo Exemplo — Não pela Regra", "Atividades que Desenvolvem a Criatividade", "O Mundo das Letras e dos Números", "Emoções: Nomear para Entender", "Um Final Feliz que Começa Aqui"],
  "Colorful children's educational ebook cover, bright blue and yellow, cute cartoon animals, stars and clouds, playful illustration style, fun and educational, warm and inviting for kids",
);

const STUB_TEMPLATES: TemplateMaster[] = [
  makeStub("dropshipping", "Ebook Dropshipping", "Negócios", 45, "Premium", "#8B5CF6", "#3B0764", "📦",
    "Dropshipping do Zero ao Primeiro R$10k", "O sistema validado para vender sem estoque e sem risco", "Empreendedores iniciantes que querem vender online sem estoque",
    ["O Modelo de Negócio Que Mudou o E-commerce", "Encontrando Produtos Vencedores", "Construindo Sua Loja em 24h", "Tráfego Pago para Iniciantes", "Escalando Para R$10.000/mês"],
    "Purple and dark premium dropshipping ebook cover, e-commerce and online store concept, boxes and packages, modern business aesthetic"),

  makeStub("instagram", "Guia Instagram", "Social Media", 30, "Iniciante", "#E879F9", "#701A75", "📸",
    "Instagram que Vende: Do 0 aos Primeiros Clientes", "Como transformar seu Instagram em uma máquina de vendas em 60 dias", "Empreendedores e profissionais que querem vender no Instagram",
    ["O Instagram que Converte vs. O que Apenas Aparece", "Criando um Perfil que Atrai Compradores", "Conteúdo Estratégico: O Método 4C", "Stories que Vendem Todo Dia", "Fechar Vendas pelo Direct"],
    "Vibrant pink and purple Instagram marketing ebook cover, social media growth, followers and engagement concept, modern influencer aesthetic"),
];

// ─── Exports ──────────────────────────────────────────────────────────────────

export const MASTER_TEMPLATES: TemplateMaster[] = [
  LOW_TICKET,
  PLANNER_FINANCEIRO,
  PLANNER_EMAGRECIMENTO,
  TIKTOK_SHOP,
  HIGH_TICKET,
  RELACIONAMENTO,
];

export const PREMIUM_TEMPLATES: TemplateMaster[] = [
  PLANNER_FEMININO_STUB,
  DEVOCIONAL_STUB,
  KDP_STUB,
  SEO_STUB,
  COPY_STUB,
  RECEITAS_STUB,
  INFANTIL_STUB,
];

export const ALL_TEMPLATES: TemplateMaster[] = [
  ...MASTER_TEMPLATES,
  ...PREMIUM_TEMPLATES,
  ...STUB_TEMPLATES,
];

export function getTemplate(id: string): TemplateMaster | null {
  return ALL_TEMPLATES.find((t) => t.id === id) ?? null;
}
