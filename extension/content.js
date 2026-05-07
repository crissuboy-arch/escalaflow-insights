// EscalaFlow Miner — content script (Meta/Facebook Ads Library)
// Robust card detection + per-card "⚡ IA PRO" button.
(() => {
  const BTN_CLASS = "escala-card-btn";
  const MENU_ID = "escala-card-menu";
  const TOAST_ID = "escala-toast";
  const FLOAT_ID = "escala-float";
  const CARD_ATTR = "data-escala-card";
  const DEFAULT_ENDPOINT =
    "https://id-preview--50293ad0-b4d2-4adf-8446-ff77f73ad3e6.lovable.app";
  const DEBUG = true;
  const log = (...a) => DEBUG && console.log("[EscalaFlow]", ...a);

  // ---------------- styles ----------------
  if (!document.getElementById("escala-style")) {
    const style = document.createElement("style");
    style.id = "escala-style";
    style.textContent = `
      .${BTN_CLASS}{position:absolute;top:8px;right:8px;z-index:99999;
        padding:6px 10px;border:0;border-radius:999px;cursor:pointer;
        font:700 11px/1 -apple-system,system-ui,Segoe UI,Roboto,sans-serif;color:#fff;
        background:linear-gradient(135deg,#7c3aed,#3b82f6,#a855f7);
        box-shadow:0 6px 18px rgba(124,58,237,.45);
        opacity:0;transition:opacity .15s ease,transform .12s ease,filter .12s ease;}
      [${CARD_ATTR}]:hover .${BTN_CLASS},.${BTN_CLASS}:hover,.${BTN_CLASS}:focus{opacity:1}
      .${BTN_CLASS}:hover{transform:scale(1.05);filter:brightness(1.1)}
      [${CARD_ATTR}]{position:relative !important}
      #${FLOAT_ID}{position:fixed;top:84px;right:20px;z-index:2147483647;
        padding:10px 16px;border:0;border-radius:999px;cursor:pointer;
        font:700 13px -apple-system,system-ui,sans-serif;color:#fff;
        background:linear-gradient(135deg,#7c3aed,#3b82f6,#a855f7);
        box-shadow:0 10px 30px rgba(124,58,237,.45)}
      #${MENU_ID}{position:fixed;z-index:2147483647;min-width:240px;border-radius:12px;
        overflow:hidden;background:rgba(15,18,32,.97);backdrop-filter:blur(10px);
        border:1px solid rgba(168,85,247,.35);box-shadow:0 20px 50px rgba(0,0,0,.5);
        font:600 13px -apple-system,system-ui,sans-serif;color:#e6edf7;display:none}
      #${MENU_ID}.open{display:block}
      #${MENU_ID} button{display:block;width:100%;padding:10px 14px;background:transparent;
        border:0;color:#e6edf7;text-align:left;cursor:pointer;font:600 13px inherit}
      #${MENU_ID} button:hover{background:rgba(124,58,237,.2)}
      #${MENU_ID} .sep{height:1px;background:rgba(255,255,255,.06)}
      #${TOAST_ID}{position:fixed;bottom:24px;right:24px;z-index:2147483647;
        padding:12px 16px;border-radius:12px;color:#fff;font:600 13px -apple-system,system-ui,sans-serif;
        background:linear-gradient(135deg,#16a34a,#22c55e);
        box-shadow:0 12px 30px rgba(34,197,94,.45);opacity:0;transform:translateY(8px);
        transition:opacity .2s,transform .2s;pointer-events:none}
      #${TOAST_ID}.show{opacity:1;transform:translateY(0)}
    `;
    document.head.appendChild(style);
  }

  function toast(msg) {
    let el = document.getElementById(TOAST_ID);
    if (!el) { el = document.createElement("div"); el.id = TOAST_ID; document.body.appendChild(el); }
    el.textContent = msg; el.classList.add("show");
    clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove("show"), 2400);
  }

  function getEndpoint() {
    return new Promise((resolve) => {
      try { chrome.storage.local.get(["endpoint"], ({ endpoint }) =>
        resolve((endpoint || DEFAULT_ENDPOINT).replace(/\/$/, ""))); }
      catch { resolve(DEFAULT_ENDPOINT); }
    });
  }

  // ---------------- card detection ----------------
  // Multi-strategy resilient card finder.
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
    const filtered = arr.filter((c) => !arr.some((o) => o !== c && c.contains(o)));
    return filtered;
  }

  function climbToCard(start) {
    if (!start) return null;
    let el = start;
    let best = null;
    for (let i = 0; i < 14 && el && el !== document.body; i++) {
      const r = el.getBoundingClientRect();
      // Heuristic for an ad card: tall-ish, narrowish column, has an image or video inside.
      const hasMedia = el.querySelector("img, video, [style*='background-image']");
      if (r.height >= 280 && r.width >= 200 && r.width <= 700 && hasMedia) {
        best = el;
        // Prefer the tightest enclosing card → keep climbing only one more level.
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

    const imgEl = card.querySelector('img[src*="scontent"], img[src*="fbcdn"], img[src^="https://"]:not([width="16"]):not([width="20"])');
    const videoEl = card.querySelector('video');
    const imageUrl = imgEl ? imgEl.src : "";
    const videoUrl = videoEl ? (videoEl.src || videoEl.currentSrc || "") : "";
    const thumbnail = videoEl && videoEl.poster ? videoEl.poster : imageUrl;

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
    else if (card.querySelectorAll('img[src*="scontent"], img[src*="fbcdn"]').length > 1) creativeType = "carousel";

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
    score = Math.min(99, score);

    const payload = {
      advertiser, headline, copy, cta, description,
      imageUrl: imageUrl || bgImage, videoUrl,
      thumbnail: thumbnail || bgImage,
      adLibraryId, startDate, platforms, country, status,
      creativeType, niche, score,
      url, link: url, platform: "Facebook",
      createdAt: new Date().toISOString(),
    };
    log("anúncio capturado", payload);
    return payload;
  }

  // ---------------- send ----------------
  function buildUrl(endpoint, ad, analysisType) {
    const u = new URL(endpoint + "/importar-anuncio");
    const set = (k, v) => v != null && v !== "" && u.searchParams.set(k, String(v));
    set("headline", ad.headline); set("copy", ad.copy); set("description", ad.description);
    set("link", ad.url); set("platform", ad.platform); set("country", ad.country);
    set("niche", ad.niche); set("score", ad.score); set("analysisType", analysisType || "manual");
    set("creativeUrl", ad.imageUrl || ad.thumbnail || ad.videoUrl);
    set("advertiser", ad.advertiser); set("adLibraryId", ad.adLibraryId);
    set("cta", ad.cta); set("startDate", ad.startDate); set("status", ad.status);
    set("creativeType", ad.creativeType);
    set("platforms", (ad.platforms || []).join(","));
    set("createdAt", ad.createdAt);
    return u.toString();
  }

  function buildPrompt(type, ad) {
    const base = `Anúncio REAL capturado da Meta Ads Library:
- Anunciante: ${ad.advertiser || "—"}
- Headline: ${ad.headline}
- Copy: ${ad.copy}
- Descrição: ${ad.description || "—"}
- CTA: ${ad.cta || "—"}
- Status: ${ad.status || "—"} | Início: ${ad.startDate || "—"}
- Plataformas: ${(ad.platforms || []).join(", ") || "—"}
- País: ${ad.country} | Nicho: ${ad.niche}
- Tipo de criativo: ${ad.creativeType}
- Criativo: ${ad.imageUrl || ad.videoUrl || ad.thumbnail || "—"}
- Link: ${ad.url}
- ID da Biblioteca: ${ad.adLibraryId || "—"}
`;
    const prompts = {
      ai: `${base}\nFaça engenharia reversa COMPLETA:\n1. Big Idea\n2. Avatar\n3. Estrutura da copy\n4. Gatilhos\n5. Por que funciona\n6. Como escalar`,
      variations: `${base}\nGere 10 variações: 3 headlines, 3 copies, 2 criativos, 2 ângulos`,
      "offer-structure": `${base}\nBreakdown da OFERTA: produto, bônus, garantia, stack, preço, melhorias`,
      "quiz-funnel": `${base}\nMonte FUNIL DE QUIZ: hook, 6-8 perguntas, segmentação, resultado, oferta`,
      "unique-mechanism": `${base}\nIdentifique MECANISMO ÚNICO: central, novidade, nome, reforço`,
      manual: `${base}\nResuma em 5 bullets e dê nota 0-100.`,
    };
    return prompts[type] || prompts.manual;
  }

  async function send(card, analysisType) {
    const ad = capturarCardReal(card);
    try {
      await new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: "ESCALA_CAPTURE" }, (res) => {
          if (res?.ok && res.dataUrl && !ad.imageUrl && !ad.thumbnail) ad.thumbnail = res.dataUrl;
          resolve();
        });
      });
    } catch {}
    const endpoint = await getEndpoint();
    window.open(buildUrl(endpoint, ad, analysisType), "_blank", "noopener");
    try {
      window.postMessage({ source: "escalaflow-extension", type: "ingest", payload: {
        headline: ad.headline, copy: ad.copy, adUrl: ad.url, platform: ad.platform,
        country: ad.country, niche: ad.niche, score: ad.score, analysisType,
        creativeUrl: ad.imageUrl || ad.thumbnail || ad.videoUrl,
        advertiser: ad.advertiser, cta: ad.cta, description: ad.description,
        adLibraryId: ad.adLibraryId, startDate: ad.startDate,
        creativeType: ad.creativeType, platforms: ad.platforms, createdAt: ad.createdAt,
      }}, "*");
    } catch {}
    toast("Anúncio salvo na Central");
    if (analysisType !== "manual") {
      try {
        chrome.runtime.sendMessage(
          { type: "ESCALA_OPEN_CHATGPT", prompt: buildPrompt(analysisType, ad), ad },
          (res) => log("ChatGPT aberto", res),
        );
      } catch (e) { console.warn("[EscalaFlow] falha ChatGPT", e); }
    }
  }

  // ---------------- menu ----------------
  const ACTIONS = [
    ["🧠 Análise do Anúncio", "ai"],
    ["🎨 Variações de Criativo", "variations"],
    ["📦 Estrutura de Oferta", "offer-structure"],
    ["❓ Funil de Quiz", "quiz-funnel"],
    ["⚙️ Mecanismo Único", "unique-mechanism"],
    ["⭐ Salvar Anúncio", "manual"],
  ];

  function ensureMenu() {
    let menu = document.getElementById(MENU_ID);
    if (menu) return menu;
    menu = document.createElement("div"); menu.id = MENU_ID;
    document.body.appendChild(menu); return menu;
  }

  function openMenuFor(card, anchor) {
    const menu = ensureMenu(); menu.innerHTML = "";
    ACTIONS.forEach(([label, type], i) => {
      const b = document.createElement("button");
      b.textContent = label;
      b.addEventListener("click", (e) => {
        e.preventDefault(); e.stopPropagation();
        menu.classList.remove("open"); send(card, type);
      });
      menu.appendChild(b);
      if (i < ACTIONS.length - 1) {
        const s = document.createElement("div"); s.className = "sep"; menu.appendChild(s);
      }
    });
    const r = anchor.getBoundingClientRect();
    menu.style.top = (r.bottom + 6) + "px";
    menu.style.left = Math.max(8, r.right - 240) + "px";
    menu.classList.add("open");
  }

  // ---------------- inject buttons ----------------
  function attachToCard(card) {
    if (card.hasAttribute(CARD_ATTR)) return;
    card.setAttribute(CARD_ATTR, "1");
    if (getComputedStyle(card).position === "static") card.style.position = "relative";
    const btn = document.createElement("button");
    btn.type = "button"; btn.className = BTN_CLASS; btn.textContent = "⚡ IA PRO";
    btn.addEventListener("click", (e) => {
      e.preventDefault(); e.stopPropagation();
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
    let fb = document.getElementById(FLOAT_ID);
    if (fb) return;
    fb = document.createElement("button");
    fb.id = FLOAT_ID; fb.type = "button"; fb.textContent = "⚡ IA PRO";
    fb.title = "Capturar primeiro anúncio visível";
    document.body.appendChild(fb);
    fb.addEventListener("click", (e) => {
      e.preventDefault(); e.stopPropagation();
      const all = findCards();
      log("[float] cards encontrados:", all.length);
      const visible = all.find((c) => {
        const r = c.getBoundingClientRect();
        return r.top >= 0 && r.top < innerHeight * 0.9 && r.bottom > 0;
      }) || all[0];
      if (!visible) { toast("Nenhum anúncio detectado"); return; }
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
