export const PLATFORMS = [
  { id: "tiktok", name: "TikTok", desc: "Vídeos verticais virais" },
  { id: "instagram", name: "Instagram", desc: "Reels, stories e feed" },
  { id: "facebook", name: "Facebook", desc: "Feed, marketplace e ads" },
  { id: "pinterest", name: "Pinterest", desc: "Pins visuais e shopping" },
  { id: "shorts", name: "Shorts (YouTube)", desc: "Vídeos curtos verticais" },
  { id: "marketplace", name: "Marketplace", desc: "Anúncios diretos" },
  { id: "amazon", name: "Amazon", desc: "PDP e listings" },
  { id: "shopee", name: "Shopee", desc: "PDP e ads de marketplace" },
] as const;

export type PlatformId = (typeof PLATFORMS)[number]["id"];

export const OBJECTIVES = [
  { id: "ctr", name: "CTR", desc: "Maximizar cliques e curiosidade" },
  { id: "conversao", name: "Conversão", desc: "Vender direto, fundo de funil" },
  { id: "viralizacao", name: "Viralização", desc: "Gerar saves, shares, comentários" },
  { id: "branding", name: "Branding", desc: "Construir marca e percepção" },
  { id: "remarketing", name: "Remarketing", desc: "Recuperar leads aquecidos" },
  { id: "escala", name: "Escala", desc: "Bater grandes volumes com CPA estável" },
] as const;

export type ObjectiveId = (typeof OBJECTIVES)[number]["id"];

export const DIMENSIONS = ["1:1", "4:5", "9:16"] as const;
export type Dimension = (typeof DIMENSIONS)[number];

export const ADS_FORMATS = [
  { id: "slack-empilhamento", name: "Slack Empilhamento", description: "Print de Slack/chat com mensagens empilhadas — sensação de bastidores e prova interna.", emocao: "intimidade", angulo: "bastidor revelado", gatilho: "curiosidade + prova social", uso: "topo de funil — gera tempo de leitura e shares" },
  { id: "native-notes", name: "Native Notes", description: "Print de bloco de notas estilo iOS — confessional, próximo, alto CTR.", emocao: "intimidade", angulo: "confissão pessoal", gatilho: "identificação", uso: "topo/meio de funil — alta retenção em feed" },
  { id: "us-vs-them", name: "Us vs Them", description: "Comparativo 'nós vs eles' — quem somos versus o método antigo do mercado.", emocao: "diferenciação", angulo: "tribo", gatilho: "pertencimento + tribalismo", uso: "meio de funil — fortalece posicionamento" },
  { id: "notification", name: "Notification", description: "Mockup de notificação de celular (push, banco, app) — abre loop instantâneo.", emocao: "urgência", angulo: "loop aberto", gatilho: "FOMO", uso: "topo de funil — para CTR" },
  { id: "annotated-print", name: "Annotated Print", description: "Print com setas, círculos e marcações destacando o ponto-chave.", emocao: "clareza", angulo: "demonstração visual", gatilho: "autoridade didática", uso: "remarketing — explica diferencial" },
  { id: "news-advertorial", name: "News / Advertorial", description: "Layout de portal de notícia / matéria patrocinada — vira história, não anúncio.", emocao: "credibilidade", angulo: "matéria jornalística", gatilho: "autoridade implícita", uso: "topo de funil frio — escala alta" },
  { id: "conversa-whatsapp", name: "Conversa WhatsApp", description: "Mockup de conversa real no WhatsApp — depoimento ou roteiro de venda.", emocao: "proximidade", angulo: "diálogo real", gatilho: "prova social", uso: "remarketing — fechar venda quente" },
  { id: "anatomy", name: "Anatomy", description: "Anatomia do produto/método com partes rotuladas — explica componentes.", emocao: "racionalidade", angulo: "demonstração técnica", gatilho: "autoridade", uso: "meio de funil — qualifica lead" },
  { id: "price-anchor", name: "Price Anchor", description: "Preço cheio riscado + preço promocional gigante.", emocao: "urgência", angulo: "âncora de preço", gatilho: "ganância + escassez", uso: "fundo de funil — fechar venda" },
  { id: "warning-sign", name: "Warning Sign", description: "Aviso/placa amarela de perigo com headline forte — interrompe scroll.", emocao: "alerta", angulo: "aviso urgente", gatilho: "aversão à perda", uso: "topo de funil — alta interrupção" },
  { id: "checklist-manual", name: "Checklist Manual", description: "Checklist desenhada à mão num caderno — orgânico e nativo.", emocao: "organização", angulo: "passo-a-passo manual", gatilho: "clareza", uso: "meio de funil — aquece lead" },
  { id: "micro-aula", name: "Micro Aula", description: "Reel/Short de 30s ensinando 1 dica curta + CTA pro produto.", emocao: "valor entregue", angulo: "ensina e vende", gatilho: "reciprocidade", uso: "topo/meio — content-led ad" },
  { id: "dor-solucao", name: "Dor → Solução", description: "Mostra a dor concreta e na sequência a solução exata.", emocao: "alívio", angulo: "transformação direta", gatilho: "dor + esperança", uso: "topo de funil frio — alto CTR" },
  { id: "prova-explicada", name: "Prova Explicada", description: "Print de resultado + explicação por que aconteceu — racionaliza a prova.", emocao: "credibilidade", angulo: "prova com método", gatilho: "lógica + prova social", uso: "meio de funil — vence ceticismo" },
  { id: "antes-depois-cognitivo", name: "Antes/Depois Cognitivo", description: "Antes/depois mental: como pensava antes vs como pensa agora.", emocao: "transformação", angulo: "mudança de mindset", gatilho: "identificação", uso: "meio de funil — vende método" },
  { id: "native-feed-post", name: "Native Feed Post", description: "Post estilo orgânico do Instagram/Twitter — não parece anúncio.", emocao: "naturalidade", angulo: "post de amigo", gatilho: "prova social", uso: "topo de funil — burla saturação" },
  { id: "checklist-irresistivel", name: "Checklist Irresistível", description: "Lista marcada com 5–7 itens — promessa segmentada e tangível.", emocao: "clareza", angulo: "o que você ganha", gatilho: "específico-é-crível", uso: "meio/fundo — qualifica e converte" },
  { id: "comparativo-metodo", name: "Comparativo de Método", description: "Tabela 'método antigo vs seu método' com bullets.", emocao: "diferenciação", angulo: "por que somos diferentes", gatilho: "novidade + autoridade", uso: "meio de funil — vende mecanismo único" },
  { id: "a-revelacao", name: "A Revelação", description: "Headline 'a verdade que ninguém te conta sobre…' — abre loop forte.", emocao: "curiosidade", angulo: "verdade oculta", gatilho: "curiosidade + insider info", uso: "topo de funil — alto CTR" },
  { id: "caixinha-perguntas", name: "Caixinha de Perguntas", description: "Mockup de caixinha de perguntas do Instagram com pergunta + resposta forte.", emocao: "intimidade", angulo: "Q&A real", gatilho: "prova social + autoridade", uso: "meio de funil — engajamento" },
  { id: "oferta-beneficios", name: "Oferta + Benefícios", description: "Produto + lista de benefícios com ícones, valor e CTA visível.", emocao: "valor", angulo: "tudo que vai receber", gatilho: "ganância + clareza", uso: "fundo de funil — fechamento" },
  { id: "jeito-antigo-novo", name: "Jeito Antigo vs Novo", description: "Comparativo direto: o jeito antigo (ruim) vs o jeito novo (seu).", emocao: "modernidade", angulo: "novo paradigma", gatilho: "novidade", uso: "meio de funil — vende método" },
  { id: "prova-social", name: "Prova Social", description: "Múltiplos depoimentos/prints empilhados como mosaico.", emocao: "validação", angulo: "todo mundo está dentro", gatilho: "prova social", uso: "remarketing/fundo — quebra última objeção" },
  { id: "super-headline", name: "Super Headline", description: "Headline gigante centralizada — promessa pura e específica.", emocao: "promessa", angulo: "promessa direta", gatilho: "específico-é-crível", uso: "topo de funil — testar promessa" },
  { id: "cartaz-poste", name: "Cartaz no Poste", description: "Foto de cartaz colado em poste com headline manuscrita — orgânico e local.", emocao: "humano", angulo: "anúncio de rua", gatilho: "curiosidade + nostalgia", uso: "topo de funil — burla saturação" },
  { id: "cartaz-amassado", name: "Cartaz Amassado", description: "Cartaz amassado / textura de papel rasgado — rústico, ganha atenção.", emocao: "tátil", angulo: "achado raro", gatilho: "curiosidade", uso: "topo de funil — pattern interrupt" },
  { id: "post-it", name: "Post-it", description: "Mensagem escrita à mão num post-it amarelo — pessoal, urgente.", emocao: "pessoalidade", angulo: "lembrete urgente", gatilho: "intimidade", uso: "remarketing — relembrar oferta" },
  { id: "portal-noticias", name: "Portal de Notícias", description: "Mockup de manchete de portal — autoridade implícita, vira história.", emocao: "curiosidade", angulo: "notícia bombástica", gatilho: "autoridade implícita", uso: "topo de funil frio — escala alta" },
  { id: "procura-se", name: "Procura-se", description: "Cartaz de 'procura-se' chamando o avatar específico.", emocao: "pertencimento", angulo: "isso é para você se…", gatilho: "exclusividade", uso: "topo/meio — segmenta avatar" },
  { id: "oferta-direta-ebook", name: "Oferta Direta Ebook", description: "Capa do ebook + headline de promessa + CTA direto.", emocao: "oferta", angulo: "produto na cara", gatilho: "clareza + ganância", uso: "fundo de funil — converter" },
  { id: "manchete-jornal", name: "Manchete Jornal", description: "Mockup de página de jornal impresso — autoridade vintage.", emocao: "autoridade", angulo: "destaque na imprensa", gatilho: "autoridade", uso: "meio de funil — credibilidade" },
  { id: "site-noticia", name: "Site Notícia", description: "Layout de site de notícia (G1, CNN) com matéria sobre o tema.", emocao: "credibilidade", angulo: "validação na mídia", gatilho: "autoridade + prova social", uso: "topo frio — escala em massa" },
  { id: "oferta-direta-mockup", name: "Oferta Direta Mockup", description: "Mockup do produto (digital ou físico) + preço + CTA direto.", emocao: "oferta", angulo: "preço imperdível", gatilho: "ganância + clareza", uso: "fundo de funil — fechar venda" },
  { id: "cupom-fiscal", name: "Cupom Fiscal", description: "Recibo/nota fiscal ilustrando ganho ou economia — prova tangível.", emocao: "prova", angulo: "evidência financeira", gatilho: "prova concreta", uso: "meio/fundo — vence ceticismo financeiro" },
  { id: "post-twitter", name: "Post Twitter (X)", description: "Mockup de post viral do X com curtidas e comentários.", emocao: "validação social", angulo: "tweet polêmico", gatilho: "prova social + polêmica", uso: "topo de funil — viralização" },
  { id: "passo-a-passo", name: "Passo a Passo", description: "Sequência numerada (1, 2, 3) explicando o método de forma visual.", emocao: "clareza", angulo: "método didático", gatilho: "autoridade didática", uso: "meio de funil — qualifica e vende" },
  { id: "pov-ebook", name: "POV: Ebook na Mão", description: "Câmera POV segurando o ebook/playbook — imersão e desejo.", emocao: "desejo", angulo: "POV imersivo", gatilho: "antecipação", uso: "meio/fundo — gera desejo do produto" },
  { id: "traco-lapis", name: "Traço a Lápis", description: "Ilustração simples a lápis com texto manuscrito — orgânico e nativo.", emocao: "humano", angulo: "história desenhada", gatilho: "intimidade", uso: "topo de funil — burla saturação visual" },
  { id: "ebook-promo", name: "Ebook Promo", description: "Capa do ebook em destaque + bullets dos capítulos.", emocao: "valor", angulo: "tudo que vai aprender", gatilho: "específico-é-crível", uso: "meio/fundo — qualifica conteúdo" },
  { id: "ebook-depoimento", name: "Ebook + Depoimento", description: "Capa + screenshot de depoimento real do produto.", emocao: "prova social", angulo: "quem já comprou aprovou", gatilho: "prova social", uso: "remarketing — fechar venda" },
] as const;

export type AdsFormat = (typeof ADS_FORMATS)[number];
export type AdsFormatId = AdsFormat["id"];

export function findFormat(id: string): AdsFormat | undefined {
  return ADS_FORMATS.find((f) => f.id === id);
}
export function findPlatform(id: string) {
  return PLATFORMS.find((p) => p.id === id);
}
export function findObjective(id: string) {
  return OBJECTIVES.find((o) => o.id === id);
}
