// EscalaFlow IA PRO — content script (Meta/Facebook Ads Library)
// 9 módulos estratégicos + integração ChatGPT + Salvar no Flow
(() => {
  const BTN_CLASS = "escala-card-btn";
  const MENU_ID = "escala-card-menu";
  const TOAST_ID = "escala-toast";
  const FLOAT_ID = "escala-float";
  const CARD_ATTR = "data-escala-card";
  const DEFAULT_ENDPOINT = "http://localhost:8082"; // produção: trocar para URL do deploy
  const DEBUG = true;
  const log = (...a) => DEBUG && console.log("[EscalaFlow]", ...a);

  // ---------------- styles ----------------
  if (!document.getElementById("escala-style")) {
    const style = document.createElement("style");
    style.id = "escala-style";
    style.textContent = `
      .${BTN_CLASS}{position:absolute;top:8px;right:8px;z-index:99999;
        padding:6px 12px;border:0;border-radius:999px;cursor:pointer;
        font:700 11px/1 -apple-system,system-ui,Segoe UI,Roboto,sans-serif;color:#fff;
        background:linear-gradient(135deg,#7c3aed,#3b82f6,#a855f7);
        box-shadow:0 6px 18px rgba(124,58,237,.45);
        opacity:0;transition:opacity .15s ease,transform .12s ease,filter .12s ease;}
      [${CARD_ATTR}]:hover .${BTN_CLASS},.${BTN_CLASS}:hover,.${BTN_CLASS}:focus{opacity:1}
      .${BTN_CLASS}:hover{transform:scale(1.05);filter:brightness(1.1)}
      [${CARD_ATTR}]{position:relative !important}
      #${FLOAT_ID}{position:fixed;top:84px;right:20px;z-index:2147483647;
        padding:10px 18px;border:0;border-radius:999px;cursor:pointer;
        font:700 13px -apple-system,system-ui,sans-serif;color:#fff;
        background:linear-gradient(135deg,#7c3aed,#3b82f6,#a855f7);
        box-shadow:0 10px 30px rgba(124,58,237,.45);letter-spacing:.01em}
      #${MENU_ID}{position:fixed;z-index:2147483647;min-width:260px;border-radius:14px;
        overflow:hidden;background:rgba(11,15,26,.98);backdrop-filter:blur(16px);
        border:1px solid rgba(168,85,247,.3);box-shadow:0 24px 60px rgba(0,0,0,.6);
        font:600 13px -apple-system,system-ui,sans-serif;color:#e6edf7;display:none}
      #${MENU_ID}.open{display:block}
      #${MENU_ID} .menu-header{padding:10px 14px 8px;font-size:10px;color:#7c8db8;
        text-transform:uppercase;letter-spacing:.08em;border-bottom:1px solid rgba(255,255,255,.06)}
      #${MENU_ID} button{display:flex;align-items:center;gap:8px;width:100%;
        padding:9px 14px;background:transparent;border:0;color:#e6edf7;
        text-align:left;cursor:pointer;font:600 13px inherit;transition:background .1s}
      #${MENU_ID} button:hover{background:rgba(124,58,237,.18)}
      #${MENU_ID} button .icon{font-size:15px;width:20px;text-align:center}
      #${MENU_ID} .sep{height:1px;background:rgba(255,255,255,.05);margin:2px 0}
      #${TOAST_ID}{position:fixed;bottom:24px;right:24px;z-index:2147483647;
        padding:12px 18px;border-radius:12px;color:#fff;
        font:600 13px -apple-system,system-ui,sans-serif;
        background:linear-gradient(135deg,#16a34a,#22c55e);
        box-shadow:0 12px 30px rgba(34,197,94,.45);opacity:0;transform:translateY(8px);
        transition:opacity .2s,transform .2s;pointer-events:none;max-width:300px}
      #${TOAST_ID}.error{background:linear-gradient(135deg,#dc2626,#ef4444)}
      #${TOAST_ID}.show{opacity:1;transform:translateY(0)}
    `;
    document.head.appendChild(style);
  }

  function toast(msg, type = "success") {
    let el = document.getElementById(TOAST_ID);
    if (!el) { el = document.createElement("div"); el.id = TOAST_ID; document.body.appendChild(el); }
    el.textContent = msg;
    el.className = type === "error" ? "error show" : "show";
    clearTimeout(el._t);
    el._t = setTimeout(() => el.className = el.className.replace(" show", ""), 2800);
  }

  function getEndpoint() {
    return new Promise((resolve) => {
      try { chrome.storage.local.get(["endpoint"], ({ endpoint }) =>
        resolve((endpoint || DEFAULT_ENDPOINT).replace(/\/$/, ""))); }
      catch { resolve(DEFAULT_ENDPOINT); }
    });
  }

  // ---------------- card detection ----------------
  function findCards() {
    const cards = new Set();

    // Strategy A: anchors that point to a specific ad library entry.
    const anchorSelectors = [
      'a[href*="/ads/library/?id="]',
      'a[href*="ads/library/?id="]',
      'a[href*="view_all_page_id"]',
    ];
    document.querySelectorAll(anchorSelectors.join(",")).forEach((a) => {
      const card = climbToCard(a);
      if (card) cards.add(card);
    });

    // Strategy B: text markers visible on every ad card.
    if (cards.size < 2) {
      const TEXT_RX = /(Library ID|ID da biblioteca|Identificação da biblioteca|Started running on|Em circulação desde|Ver detalhes do an[úu]ncio|See ad details|Veiculando|Identifiant de la biblioth)/i;
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode: (n) => TEXT_RX.test(n.nodeValue || "") ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT,
      });
      let n;
      while ((n = walker.nextNode())) {
        const card = climbToCard(n.parentElement);
        if (card) cards.add(card);
      }
    }

    // Strategy C: role=article (some Meta surfaces use it).
    if (cards.size === 0) {
      document.querySelectorAll('[role="article"]').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.height >= 220 && r.width >= 200) cards.add(el);
      });
    }

    // De-dupe nested: drop any card that contains another card.
    const arr = Array.from(cards);
    return arr.filter((c) => !arr.some((o) => o !== c && c.contains(o)));
  }

  function climbToCard(start) {
    if (!start) return null;
    let el = start;
    let best = null;
    for (let i = 0; i < 14 && el && el !== document.body; i++) {
      const r = el.getBoundingClientRect();
      const hasMedia = el.querySelector("img, video, [style*='background-image']");
      if (r.height >= 280 && r.width >= 200 && r.width <= 700 && hasMedia) {
        best = el;
        const parent = el.parentElement;
        if (parent) {
          const pr = parent.getBoundingClientRect();
          if (pr.width > 760 || pr.height > r.height * 1.6) break;
        }
      }
      el = el.parentElement;
    }
    return best;
  }

  function tx(el) { return (el && el.textContent || "").trim(); }

  // ---------------- per-card scrape ----------------
  function capturarCardReal(card) {
    const text = card.innerText || "";

    let adLibraryId = "";
    const idLink = card.querySelector('a[href*="/ads/library/?id="], a[href*="ads/library/?id="]');
    if (idLink) {
      const m = idLink.href.match(/[?&]id=(\d+)/);
      if (m) adLibraryId = m[1];
    }
    if (!adLibraryId) {
      const m = text.match(/(?:Library ID|ID da biblioteca|Identificação da biblioteca)[:\s]*([\d]{6,})/i);
      if (m) adLibraryId = m[1];
    }

    const advLink =
      card.querySelector('a[href*="view_all_page_id"]') ||
      card.querySelector('a[role="link"] strong') ||
      card.querySelector('a[role="link"]');
    const advertiser = tx(advLink).slice(0, 120);

    let status = "";
    const statusMatch = text.match(/\b(Active|Inactive|Ativo|Inativo|Em veiculação|Não está em veiculação|Veiculando)\b/i);
    if (statusMatch) status = statusMatch[1];

    let startDate = "";
    const dateMatch = text.match(/(?:Started running on|Iniciou a veicula(?:ç|c)[aã]o em|Em circula[cç][aã]o desde|Começou a ser exibido em)\s*([^\n·•]+)/i);
    if (dateMatch) startDate = dateMatch[1].trim().slice(0, 60);

    const platforms = [];
    ["Facebook", "Instagram", "Messenger", "Audience Network", "Threads"].forEach((p) => {
      if (new RegExp(`\\b${p}\\b`, "i").test(text)) platforms.push(p);
    });

    const candidates = Array.from(
      card.querySelectorAll('div[dir="auto"], span[dir="auto"], div[data-ad-preview="message"]'),
    )
      .map((el) => tx(el))
      .filter((t) => t && t.length > 20 && !/^Library ID|^ID da biblioteca|Started running|Iniciou a|Em circula/i.test(t));
    candidates.sort((a, b) => b.length - a.length);
    const copy = (candidates[0] || "").slice(0, 2000);
    const description = (candidates[1] || "").slice(0, 800);

    let headline = "";
    const headlineEl =
      card.querySelector('[data-ad-preview="headline"]') ||
      card.querySelector('strong span, strong');
    if (headlineEl) headline = tx(headlineEl).slice(0, 200);
    if (!headline) {
      const short = candidates.find((t) => t.length < 120);
      headline = (short || advertiser || "Anúncio Facebook").slice(0, 200);
    }

    let cta = "";
    const ctaEl = card.querySelector('a[role="button"], div[role="button"]');
    if (ctaEl) cta = tx(ctaEl).slice(0, 60);
    if (!cta) {
      const m = text.match(/\b(Saiba mais|Comprar|Cadastre-se|Inscrever-se|Baixar|Assine|Solicitar|Reservar|Shop Now|Learn More|Sign Up|Download|Get Offer|Subscribe|Apply Now)\b/);
      if (m) cta = m[1];
    }

    // Media capture — multi-strategy
    const imgEls = Array.from(card.querySelectorAll(
      'img[src*="scontent"], img[src*="fbcdn"], img[src^="https://"]:not([width="16"]):not([width="20"]):not([width="24"])'
    ));
    const videoEl = card.querySelector('video');
    const videoUrl = videoEl ? (videoEl.src || videoEl.currentSrc || "") : "";
    const imageUrl = imgEls[0] ? imgEls[0].src : "";
    const thumbnail = (videoEl && videoEl.poster) || imageUrl;
    // Detect carousel: multiple distinct images
    const isCarousel = imgEls.length > 1;
    const carouselImages = isCarousel ? imgEls.slice(0, 5).map((i) => i.src).filter(Boolean) : [];

    let bgImage = "";
    if (!imageUrl) {
      const bgEl = card.querySelector('[style*="background-image"]');
      if (bgEl) {
        const m = bgEl.getAttribute("style").match(/background-image:\s*url\(["']?([^"')]+)["']?\)/);
        if (m) bgImage = m[1];
      }
    }

    const url = (idLink && idLink.href) || location.href;
    let creativeType = "image";
    if (videoUrl) creativeType = "video";
    else if (isCarousel) creativeType = "carousel";

    let country = "BR";
    const cMatch = location.href.match(/[?&]country=([A-Z]{2})/);
    if (cMatch) country = cMatch[1];

    const lower = (headline + " " + copy + " " + advertiser).toLowerCase();
    const nicheMap = [
      ["Emagrecimento", /(emagrec|peso|gordura|barriga|jejum|low carb|weight loss)/],
      ["Renda Online", /(renda extra|trabalh.* casa|ganhar dinheiro|afiliad|dropshipping)/],
      ["Beleza", /(skincare|beleza|cabelo|maquiag|rejuvenesc|botox)/],
      ["Saúde", /(diabet|press[aã]o|colesterol|sa[uú]de|articulaç|enxaqueca)/],
      ["Finanças", /(invest|cripto|trader|bolsa|d[óo]lar|renda fixa)/],
      ["Relacionamento", /(relacionamento|conquist|namor|sedu)/],
      ["Educação", /(curso|aula|treinamento|certificad|mentoria)/],
      ["Espiritualidade", /(or(a|aç)|salmo|f[ée]|deus|espiritual)/],
    ];
    let niche = "Geral";
    for (const [name, rx] of nicheMap) { if (rx.test(lower)) { niche = name; break; } }

    let score = 70;
    if (videoUrl) score += 5;
    if (copy.length > 400) score += 5;
    if (status && /Active|Ativo|veicula/i.test(status)) score += 10;
    if (platforms.length >= 3) score += 5;
    if (isCarousel) score += 3;
    score = Math.min(99, score);

    const payload = {
      advertiser, headline, copy, cta, description,
      imageUrl: imageUrl || bgImage, videoUrl,
      thumbnail: thumbnail || bgImage,
      carouselImages,
      adLibraryId, startDate, platforms, country, status,
      creativeType, niche, score,
      url, link: url, platform: "Facebook",
      createdAt: new Date().toISOString(),
    };
    log("anúncio capturado", payload);
    return payload;
  }

  // ---------------- prompts estruturados ----------------
  function buildBase(ad) {
    const media = [
      ad.imageUrl ? `🖼 Imagem: ${ad.imageUrl}` : null,
      ad.videoUrl ? `🎬 Vídeo: ${ad.videoUrl}` : null,
      ad.thumbnail && ad.thumbnail !== ad.imageUrl ? `🎞 Thumbnail: ${ad.thumbnail}` : null,
      ad.carouselImages && ad.carouselImages.length > 1
        ? `🎠 Carrossel (${ad.carouselImages.length} imgs): ${ad.carouselImages.slice(0, 3).join(" | ")}` : null,
    ].filter(Boolean).join("\n");

    return `=== ANÚNCIO REAL — META ADS LIBRARY ===
🏢 Anunciante: ${ad.advertiser || "—"}
📝 Headline: ${ad.headline}
📄 Copy: ${ad.copy}
💬 Descrição: ${ad.description || "—"}
🔗 CTA: ${ad.cta || "—"}
${media}
🌍 País: ${ad.country} | Nicho: ${ad.niche}
📱 Plataformas: ${(ad.platforms || []).join(", ") || "Facebook"}
🎯 Tipo criativo: ${ad.creativeType}
📅 Ativo desde: ${ad.startDate || "—"} | Status: ${ad.status || "—"}
🔑 ID Biblioteca: ${ad.adLibraryId || "—"}
🔗 URL: ${ad.url}`;
  }

  function buildPrompt(type, ad) {
    const base = buildBase(ad);
    const prompts = {
      ai: `${base}

Você é um estrategista sênior de marketing direto. Faça engenharia reversa COMPLETA:

1. **BIG IDEA** — Qual é a grande ideia central? O que a torna magnética e irresistível?
2. **AVATAR** — Perfil detalhado do comprador ideal: dor, desejo, nível de consciência, sofisticação de mercado.
3. **ESTRUTURA DE COPY** — Framework usado (PAS, AIDA, PASTOR, Story-Offer-CTA), análise bloco a bloco.
4. **GATILHOS MENTAIS** — Liste e analise cada gatilho (escassez, prova social, autoridade, reciprocidade, etc.).
5. **MECANISMO ÚNICO** — O que diferencia esta oferta? Nome, mecanismo, elemento de novidade.
6. **POR QUE FUNCIONA** — Análise psicológica profunda. O que torna este anúncio irresistível?
7. **COMO ESCALAR** — Ângulos de escala, variações de criativo, novos mercados, públicos lookalike.
8. **SCORE ESTRATÉGICO** — Avalie 0-100 com breakdown: copy / criativo / oferta / funil / escala.`,

      "offer-structure": `${base}

Você é especialista em estruturação de ofertas (escola Alex Hormozi). Faça breakdown COMPLETO:

1. **PRODUTO PRINCIPAL** — O que exatamente está sendo vendido? Entregáveis, formato, duração.
2. **STACK DE VALOR** — Bônus, add-ons, upgrades, comunidades identificados na copy.
3. **GARANTIA** — Tipo de garantia implícita ou explícita. Como está posicionada.
4. **ÂNCORA DE PREÇO** — Como o preço é justificado e percebido como barganha.
5. **VALUE EQUATION** — (Resultado ideal × probabilidade) ÷ (tempo × esforço). Score atual e melhorado.
6. **OFERTA IRRESISTÍVEL** — Como tornar impossível dizer não? 5 melhorias concretas.
7. **UPSELL/DOWNSELL** — Oportunidades não exploradas na sequência de oferta.
8. **COPY DE OFERTA REESCRITA** — Reescreva o bloco de oferta para maximizar conversão.`,

      "unique-mechanism": `${base}

Você é copywriter especialista em mecanismos únicos (Eugene Schwartz). Analise:

1. **MECANISMO CENTRAL** — Qual é o mecanismo específico que gera o resultado prometido?
2. **NOME PROPRIETÁRIO** — Tem nome? Se não, crie 3 opções de nome de mecanismo único.
3. **NOVIDADE** — O que é genuinamente novo? Como se distancia de soluções convencionais?
4. **PROVA DO MECANISMO** — Como é validado/comprovado na copy? Falta alguma prova?
5. **DIFERENCIAÇÃO** — Como se diferencia dos concorrentes que prometem o mesmo resultado?
6. **MECANISMO MELHORADO** — Versão mais crível, específica e poderosa do mecanismo.
7. **5 HEADLINES COM O MECANISMO** — Headlines que destacam o mecanismo único como hero.`,

      hooks: `${base}

Você é o maior especialista em hooks virais. Análise e criação completa:

1. **HOOK ATUAL** — Analise os primeiros 3 segundos/palavras. Pontos fortes e fracos.
2. **PSICOLOGIA DO HOOK** — Que loop cognitivo ou emoção ele abre? Por que (ou não) funciona.
3. **10 HOOKS VIRAIS** — Para este anúncio:
   • 3 hooks de curiosidade extrema
   • 2 hooks de dor aguda e específica
   • 2 hooks de resultado numérico concreto
   • 2 hooks de prova social inusitada
   • 1 hook contra-intuitivo / paradoxal
4. **HOOK DE VÍDEO** — Roteiro dos primeiros 5 segundos: cena, fala, texto na tela.
5. **THUMBNAIL IRRESISTÍVEL** — Descrição visual detalhada da thumbnail ideal.
6. **RANKING A/B** — Os 3 melhores hooks para testar primeiro, com justificativa.`,

      variations: `${base}

Você é diretor criativo de performance marketing. Gere VARIAÇÕES COMPLETAS:

1. **3 HEADLINES** — Ângulos distintos: curiosidade, dor específica, resultado numérico.
2. **3 COPIES COMPLETAS** — Variações com estruturas diferentes (PAS, Story, Bullets).
3. **5 CRIATIVOS** — Descrição detalhada de cada:
   • Formato (estático / vídeo / carrossel / reels / UGC)
   • Conceito visual, paleta, texto na imagem, call-to-action visual
4. **ADAPTAÇÃO POR TEMPERATURA** — Público frio vs. morno vs. quente: ajustes na copy.
5. **ADAPTAÇÃO POR PLATAFORMA** — Facebook Feed / Instagram Reels / TikTok / Stories.
6. **PLANO DE TESTES** — Estrutura: X ângulos × Y variações × Z públicos. Métricas de corte.`,

      funnel: `${base}

Você é especialista em funis de vendas (Russell Brunson + Sam Ovens). Monte o FUNIL COMPLETO:

1. **TOPO DE FUNIL** — Conteúdo e anúncios de consciência para atrair esse avatar.
2. **ISCA DIGITAL** — Lead magnet ideal: formato, título, conteúdo, landing page.
3. **FUNIL DE VENDAS** — VSL, carta de vendas, ou página de oferta. Estrutura completa.
4. **SEQUÊNCIA DE E-MAIL (7 e-mails)** — Assunto + corpo resumido de cada e-mail pós opt-in.
5. **RETARGETING (3 ângulos)** — Para quem viu mas não converteu: ângulo, copy, criativo.
6. **ORDER BUMP + OTO** — Oferta no checkout + upsell pós-compra. Pitch e preço.
7. **FUNIL DE QUIZ** — Se aplicável: hook → 5-7 perguntas → resultado segmentado → oferta.
8. **MÉTRICAS ESPERADAS** — CPL, CPF, CPA, ROAS estimados para este funil.`,

      psychology: `${base}

Você é psicólogo comportamental especializado em persuasão e neuromarketing. Analise:

1. **ESTADO EMOCIONAL ATIVADO** — Que emoção/estado mental este anúncio ativa imediatamente?
2. **GATILHOS CIALDINI** — Quais dos 7 princípios são usados? Profundidade de cada um.
3. **VIESES COGNITIVOS** — Quais vieses são explorados? (ancoragem, aversão à perda, FOMO, efeito halo, etc.)
4. **NÍVEL DE CONSCIÊNCIA (Schwartz)** — Em qual nível fala? Inconsciente, consciente do problema, da solução, do produto ou mais consciente?
5. **ARCO EMOCIONAL** — Sequência: dor → esperança → curiosidade → desejo → urgência → ação.
6. **OBJEÇÕES TRABALHADAS** — Quais objeções são respondidas implicitamente na copy?
7. **LINGUAGEM DO AVATAR** — Como a copy usa as exatas palavras do público para criar espelhamento?
8. **ANÁLISE ÉTICA** — Está dentro dos limites éticos? O que pode ser melhorado para ser mais honesto e ainda mais persuasivo?`,

      strategy: `${base}

Você é consultor estratégico de escala para infoprodutos e e-commerce. Monte a ESTRATÉGIA COMPLETA:

1. **POSICIONAMENTO** — Como este anunciante está posicionado? Nível de sofisticação do mercado.
2. **ESCALA HORIZONTAL** — Novos públicos, países, nichos adjacentes para a mesma oferta.
3. **ESCALA VERTICAL** — Aumentar budget sem perder ROAS: estrutura de campanha, bid strategy.
4. **BUDGET RECOMENDADO** — Fase de validação → escala → dominância. Valores e cronograma.
5. **COMPETIÇÃO** — Como se diferenciar de concorrentes usando copy similar?
6. **SAZONALIDADE** — Ajustes por datas comemorativas, eventos e sazonalidade do nicho.
7. **PLANO 30/60/90 DIAS** — Cronograma detalhado de escala com marcos e métricas.
8. **RED FLAGS** — O que pode dar errado? Riscos e como mitigá-los.`,

      save: `${base}

Resuma este anúncio em 5 bullets estratégicos e atribua nota 0-100.`,
    };
    return prompts[type] || prompts.save;
  }

  // ---------------- send ----------------
  async function send(card, analysisType) {
    const ad = capturarCardReal(card);

    // Screenshot fallback for thumbnail
    try {
      await new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: "ESCALA_CAPTURE" }, (res) => {
          if (res?.ok && res.dataUrl && !ad.imageUrl && !ad.thumbnail) ad.thumbnail = res.dataUrl;
          resolve();
        });
      });
    } catch {}

    const endpoint = await getEndpoint();

    // Always send full payload to EscalaFlow via postMessage
    try {
      window.postMessage({
        source: "escalaflow-extension",
        type: "ingest",
        payload: {
          headline: ad.headline,
          copy: ad.copy,
          adUrl: ad.url,
          platform: ad.platform,
          country: ad.country,
          niche: ad.niche,
          score: ad.score,
          analysisType,
          creativeUrl: ad.imageUrl || ad.thumbnail || ad.videoUrl,
          imageUrl: ad.imageUrl || ad.thumbnail || "",
          videoUrl: ad.videoUrl || "",
          advertiser: ad.advertiser,
          cta: ad.cta,
          description: ad.description,
          adLibraryId: ad.adLibraryId,
          startDate: ad.startDate,
          creativeType: ad.creativeType,
          platforms: ad.platforms,
          carouselImages: ad.carouselImages,
          createdAt: ad.createdAt,
        },
      }, "*");
    } catch {}

    if (analysisType === "save") {
      // Salvar no Flow only — no ChatGPT, no new tab
      toast("✅ Anúncio salvo na Central do EscalaFlow");
      return;
    }

    if (analysisType === "strategy") {
      // Open EscalaFlow app to model strategy
      const u = new URL(endpoint + "/minerar");
      window.open(u.toString(), "_blank", "noopener");
    } else {
      // Open ad on Facebook for reference
      if (ad.adLibraryId) {
        window.open(`https://www.facebook.com/ads/library/?id=${ad.adLibraryId}`, "_blank", "noopener");
      }
    }

    // Open ChatGPT with structured prompt
    try {
      const prompt = buildPrompt(analysisType, ad);
      chrome.runtime.sendMessage(
        { type: "ESCALA_OPEN_CHATGPT", prompt, ad },
        (res) => log("ChatGPT aberto", res),
      );
    } catch (e) { console.warn("[EscalaFlow] falha ChatGPT", e); }

    toast("⚡ Análise enviada para o ChatGPT");
  }

  // ---------------- menu (9 módulos) ----------------
  const ACTIONS = [
    { emoji: "🧠", label: "Análise do Anúncio",    type: "ai",               sep: false },
    { emoji: "📦", label: "Estrutura da Oferta",   type: "offer-structure",  sep: false },
    { emoji: "⚙️", label: "Mecanismo Único",       type: "unique-mechanism", sep: false },
    { emoji: "🔥", label: "Hooks Virais",           type: "hooks",            sep: true  },
    { emoji: "🎨", label: "Variações de Criativo",  type: "variations",       sep: false },
    { emoji: "🎯", label: "Funil Completo",         type: "funnel",           sep: false },
    { emoji: "🧬", label: "Psicologia do Anúncio", type: "psychology",        sep: true  },
    { emoji: "🚀", label: "Modelar Estratégia",    type: "strategy",          sep: false },
    { emoji: "⭐", label: "Salvar no Flow",         type: "save",             sep: false },
  ];

  function ensureMenu() {
    let menu = document.getElementById(MENU_ID);
    if (menu) return menu;
    menu = document.createElement("div");
    menu.id = MENU_ID;
    document.body.appendChild(menu);
    return menu;
  }

  function openMenuFor(card, anchor) {
    const menu = ensureMenu();
    menu.innerHTML = "";

    const header = document.createElement("div");
    header.className = "menu-header";
    header.textContent = "⚡ EscalaFlow IA PRO";
    menu.appendChild(header);

    ACTIONS.forEach(({ emoji, label, type, sep }) => {
      if (sep) {
        const s = document.createElement("div");
        s.className = "sep";
        menu.appendChild(s);
      }
      const b = document.createElement("button");
      const iconEl = document.createElement("span");
      iconEl.className = "icon";
      iconEl.textContent = emoji;
      b.appendChild(iconEl);
      b.appendChild(document.createTextNode(label));
      b.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        menu.classList.remove("open");
        const origText = b.querySelector(".icon").textContent;
        b.querySelector(".icon").textContent = "⏳";
        b.style.opacity = "0.6";
        b.style.pointerEvents = "none";
        Promise.resolve(send(card, type)).finally(() => {
          b.querySelector(".icon").textContent = origText;
          b.style.opacity = "";
          b.style.pointerEvents = "";
        });
      });
      menu.appendChild(b);
    });

    const r = anchor.getBoundingClientRect();
    menu.style.top = (r.bottom + 6) + "px";
    menu.style.left = Math.max(8, r.right - 268) + "px";
    menu.classList.add("open");
  }

  // ---------------- inject buttons ----------------
  function attachToCard(card) {
    if (card.hasAttribute(CARD_ATTR)) return;
    card.setAttribute(CARD_ATTR, "1");
    if (getComputedStyle(card).position === "static") card.style.position = "relative";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = BTN_CLASS;
    btn.textContent = "⚡ IA PRO";
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      openMenuFor(card, btn);
    });
    card.appendChild(btn);
  }

  function injectAll() {
    const cards = findCards();
    cards.forEach(attachToCard);
    log("cards encontrados:", cards.length);
    ensureFloating();
  }

  function ensureFloating() {
    if (document.getElementById(FLOAT_ID)) return;
    const fb = document.createElement("button");
    fb.id = FLOAT_ID;
    fb.type = "button";
    fb.textContent = "⚡ IA PRO";
    fb.title = "EscalaFlow — capturar anúncio visível";
    document.body.appendChild(fb);
    fb.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const all = findCards();
      log("[float] cards encontrados:", all.length);
      const visible = all.find((c) => {
        const r = c.getBoundingClientRect();
        return r.top >= 0 && r.top < innerHeight * 0.9 && r.bottom > 0;
      }) || all[0];
      if (!visible) { toast("Nenhum anúncio detectado na página", "error"); return; }
      openMenuFor(visible, fb);
    });
  }

  document.addEventListener("click", (e) => {
    const menu = document.getElementById(MENU_ID);
    if (!menu || !menu.classList.contains("open")) return;
    if (menu.contains(e.target)) return;
    if (e.target.classList && e.target.classList.contains(BTN_CLASS)) return;
    if (e.target.id === FLOAT_ID) return;
    menu.classList.remove("open");
  });

  let scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => { scheduled = false; injectAll(); }, 500);
  }

  injectAll();
  const obs = new MutationObserver(schedule);
  if (document.body) obs.observe(document.body, { childList: true, subtree: true });
  setInterval(schedule, 2500);
  window.addEventListener("scroll", schedule, { passive: true });
})();
