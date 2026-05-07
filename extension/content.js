// EscalaFlow Miner — content script (Meta/Facebook Ads Library)
// Per-card "⚡ IA PRO" button + real DOM scraping with MutationObserver.
(() => {
  const BTN_CLASS = "escala-card-btn";
  const MENU_ID = "escala-card-menu";
  const TOAST_ID = "escala-toast";
  const FLOAT_ID = "escala-float";
  const CARD_ATTR = "data-escala-card";
  const DEFAULT_ENDPOINT =
    "https://id-preview--50293ad0-b4d2-4adf-8446-ff77f73ad3e6.lovable.app";

  // ---------------- styles ----------------
  if (!document.getElementById("escala-style")) {
    const style = document.createElement("style");
    style.id = "escala-style";
    style.textContent = `
      .${BTN_CLASS}{position:absolute;top:8px;right:8px;z-index:99999;
        padding:6px 10px;border:0;border-radius:999px;cursor:pointer;
        font:700 11px/1 -apple-system,system-ui,Segoe UI,Roboto,sans-serif;color:#fff;
        background:linear-gradient(135deg,#7c3aed,#3b82f6,#a855f7);
        box-shadow:0 6px 18px rgba(124,58,237,.45);transition:transform .12s ease,filter .12s ease;}
      .${BTN_CLASS}:hover{transform:scale(1.05);filter:brightness(1.1)}
      [${CARD_ATTR}]{position:relative}
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
  // The Ads Library renders each ad as a card containing an internal link
  // like /ads/library/?id=<adArchiveID>. We use that as the anchor to find cards.
  function findCards() {
    const cards = new Set();
    // Strategy 1: links to /ads/library/?id= → walk up to a tall container
    document.querySelectorAll('a[href*="/ads/library/?id="], a[href*="ads/library/?id="]').forEach((a) => {
      let el = a;
      for (let i = 0; i < 10 && el && el.parentElement; i++) {
        el = el.parentElement;
        if (!el) break;
        const r = el.getBoundingClientRect();
        if (r.height >= 260 && r.width >= 220) { cards.add(el); break; }
      }
    });
    // Strategy 2: explicit "Library ID" text — climb to card container
    if (cards.size === 0) {
      document.querySelectorAll('div').forEach((d) => {
        const t = d.textContent || "";
        if (/Library ID:|ID da biblioteca:/.test(t) && d.children.length < 20) {
          let el = d;
          for (let i = 0; i < 8 && el.parentElement; i++) {
            el = el.parentElement;
            const r = el.getBoundingClientRect();
            if (r.height >= 260 && r.width >= 220) { cards.add(el); break; }
          }
        }
      });
    }
    return Array.from(cards);
  }

  function tx(el) { return (el && el.textContent || "").trim(); }

  // ---------------- per-card scrape ----------------
  function capturarCardReal(card) {
    const html = card.innerHTML || "";
    const text = card.innerText || "";

    // adLibraryId
    let adLibraryId = "";
    const idLink = card.querySelector('a[href*="/ads/library/?id="], a[href*="ads/library/?id="]');
    if (idLink) {
      const m = idLink.href.match(/[?&]id=(\d+)/);
      if (m) adLibraryId = m[1];
    }
    if (!adLibraryId) {
      const m = text.match(/(?:Library ID|ID da biblioteca)[:\s]*([\d]{6,})/i);
      if (m) adLibraryId = m[1];
    }

    // advertiser — first strong link, often a page link
    const advLink =
      card.querySelector('a[href*="/ads/library/?view_all_page_id"]') ||
      card.querySelector('a[role="link"] strong') ||
      card.querySelector('a[role="link"]');
    const advertiser = tx(advLink).slice(0, 120);

    // status (Active / Inactive / Ativo / Inativo)
    let status = "";
    const statusMatch = text.match(/\b(Active|Inactive|Ativo|Inativo|Em veiculação|Não está em veiculação)\b/i);
    if (statusMatch) status = statusMatch[1];

    // start date
    let startDate = "";
    const dateMatch = text.match(/(?:Started running on|Iniciou a veicula(?:ç|c)[aã]o em|Começou a ser exibido em)\s*([^\n·•]+)/i);
    if (dateMatch) startDate = dateMatch[1].trim().slice(0, 60);

    // platforms (Facebook, Instagram, Audience Network, Messenger, Threads)
    const platforms = [];
    ["Facebook", "Instagram", "Messenger", "Audience Network", "Threads"].forEach((p) => {
      if (new RegExp(`\\b${p}\\b`, "i").test(text)) platforms.push(p);
    });

    // copy — the longest paragraph-like block inside the card body
    const candidates = Array.from(
      card.querySelectorAll('div[dir="auto"], span[dir="auto"], div[data-ad-preview="message"]'),
    )
      .map((el) => tx(el))
      .filter((t) => t && t.length > 20 && !/^Library ID|^ID da biblioteca|Started running|Iniciou a/i.test(t));
    candidates.sort((a, b) => b.length - a.length);
    const copy = (candidates[0] || "").slice(0, 2000);
    const description = (candidates[1] || "").slice(0, 800);

    // headline — common Meta preview headline node, fallback to short emphasized text
    let headline = "";
    const headlineEl =
      card.querySelector('[data-ad-preview="headline"]') ||
      card.querySelector('strong span, strong');
    if (headlineEl) headline = tx(headlineEl).slice(0, 200);
    if (!headline) {
      const short = candidates.find((t) => t.length < 120);
      headline = (short || advertiser || "Anúncio Facebook").slice(0, 200);
    }

    // CTA — typical CTA buttons appear as <a role="button"> or short capitalized link
    let cta = "";
    const ctaEl = card.querySelector('a[role="button"], div[role="button"]');
    if (ctaEl) cta = tx(ctaEl).slice(0, 60);
    if (!cta) {
      const m = text.match(/\b(Saiba mais|Comprar|Cadastre-se|Inscrever-se|Baixar|Assine|Solicitar|Reservar|Shop Now|Learn More|Sign Up|Download|Get Offer|Subscribe|Apply Now)\b/);
      if (m) cta = m[1];
    }

    // media
    const imgEl = card.querySelector('img[src*="scontent"], img[src^="https://"]:not([width="16"]):not([width="20"])');
    const videoEl = card.querySelector('video');
    const imageUrl = imgEl ? imgEl.src : "";
    const videoUrl = videoEl ? (videoEl.src || videoEl.currentSrc || "") : "";
    const thumbnail = videoEl && videoEl.poster ? videoEl.poster : imageUrl;

    // background-image fallback
    let bgImage = "";
    if (!imageUrl) {
      const bgEl = card.querySelector('[style*="background-image"]');
      if (bgEl) {
        const m = bgEl.getAttribute("style").match(/background-image:\s*url\(["']?([^"')]+)["']?\)/);
        if (m) bgImage = m[1];
      }
    }

    // url — preferred ad library deep link
    const url = (idLink && idLink.href) || location.href;

    // creativeType
    let creativeType = "image";
    if (videoUrl) creativeType = "video";
    else if (card.querySelectorAll('img[src*="scontent"]').length > 1) creativeType = "carousel";

    // country — try URL param
    let country = "BR";
    const cMatch = location.href.match(/[?&]country=([A-Z]{2})/);
    if (cMatch) country = cMatch[1];

    // niche inference (very rough)
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

    // score heuristic
    let score = 70;
    if (videoUrl) score += 5;
    if (copy.length > 400) score += 5;
    if (status && /Active|Ativo|veicula/i.test(status)) score += 10;
    if (platforms.length >= 3) score += 5;
    score = Math.min(99, score);

    const payload = {
      advertiser,
      headline,
      copy,
      cta,
      description,
      imageUrl: imageUrl || bgImage,
      videoUrl,
      thumbnail: thumbnail || bgImage,
      adLibraryId,
      startDate,
      platforms,
      country,
      status,
      creativeType,
      niche,
      score,
      url,
      link: url,
      platform: "Facebook",
      createdAt: new Date().toISOString(),
    };

    console.log("[EscalaFlow] card encontrado", { adLibraryId, advertiser });
    console.log("[EscalaFlow] mídia capturada", { imageUrl: payload.imageUrl, videoUrl, thumbnail: payload.thumbnail });
    console.log("[EscalaFlow] payload real", payload);
    return payload;
  }

  // ---------------- send ----------------
  function buildUrl(endpoint, ad, analysisType) {
    const u = new URL(endpoint + "/importar-anuncio");
    const set = (k, v) => v != null && v !== "" && u.searchParams.set(k, String(v));
    set("headline", ad.headline);
    set("copy", ad.copy);
    set("description", ad.description);
    set("link", ad.url);
    set("platform", ad.platform);
    set("country", ad.country);
    set("niche", ad.niche);
    set("score", ad.score);
    set("analysisType", analysisType || "manual");
    set("creativeUrl", ad.imageUrl || ad.thumbnail || ad.videoUrl);
    set("advertiser", ad.advertiser);
    set("adLibraryId", ad.adLibraryId);
    set("cta", ad.cta);
    set("startDate", ad.startDate);
    set("status", ad.status);
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
      ai: `${base}\nFaça engenharia reversa COMPLETA:\n1. Big Idea e ângulo\n2. Avatar (dores, desejos, objeções)\n3. Estrutura da copy (gancho, prova, CTA)\n4. Gatilhos mentais\n5. Por que funciona\n6. Como escalar`,
      variations: `${base}\nGere 10 variações:\n- 3 headlines\n- 3 copies\n- 2 ideias de criativo\n- 2 ângulos novos`,
      "offer-structure": `${base}\nBreakdown da OFERTA:\n1. Produto e promessa\n2. Bônus\n3. Garantia\n4. Stack de valor\n5. Preço e ancoragem\n6. Como melhorar`,
      "quiz-funnel": `${base}\nMonte um FUNIL DE QUIZ:\n- Hook\n- 6-8 perguntas\n- Segmentação\n- Página de resultado\n- Oferta`,
      "unique-mechanism": `${base}\nIdentifique o MECANISMO ÚNICO:\n- Mecanismo central\n- Por que é "novo"\n- Nome/posicionamento\n- Reforço na copy`,
      manual: `${base}\nResuma em 5 bullets e dê nota 0-100 de potencial de escala.`,
    };
    return prompts[type] || prompts.manual;
  }

  async function send(card, analysisType) {
    const ad = capturarCardReal(card);
    const endpoint = await getEndpoint();
    window.open(buildUrl(endpoint, ad, analysisType), "_blank", "noopener");
    toast("Anúncio minerado com sucesso");
    if (analysisType !== "manual") {
      try {
        chrome.runtime.sendMessage(
          { type: "ESCALA_OPEN_CHATGPT", prompt: buildPrompt(analysisType, ad), ad },
          (res) => console.log("[EscalaFlow] ChatGPT aberto", res),
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
    menu = document.createElement("div");
    menu.id = MENU_ID;
    document.body.appendChild(menu);
    return menu;
  }

  function openMenuFor(card, anchor) {
    const menu = ensureMenu();
    menu.innerHTML = "";
    ACTIONS.forEach(([label, type], i) => {
      const b = document.createElement("button");
      b.textContent = label;
      b.addEventListener("click", (e) => {
        e.preventDefault(); e.stopPropagation();
        menu.classList.remove("open");
        send(card, type);
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
    if (cards.length) console.log(`[EscalaFlow] ${cards.length} cards detectados`);
    ensureFloating(cards);
  }

  // Floating fallback button — uses topmost visible card
  function ensureFloating(cards) {
    let fb = document.getElementById(FLOAT_ID);
    if (!fb) {
      fb = document.createElement("button");
      fb.id = FLOAT_ID; fb.type = "button"; fb.textContent = "⚡ IA PRO";
      fb.title = "Capturar primeiro anúncio visível";
      document.body.appendChild(fb);
      fb.addEventListener("click", (e) => {
        e.preventDefault(); e.stopPropagation();
        const all = findCards();
        const visible = all.find((c) => {
          const r = c.getBoundingClientRect();
          return r.top >= 0 && r.top < innerHeight * 0.7;
        }) || all[0];
        if (!visible) { toast("Nenhum anúncio detectado"); return; }
        openMenuFor(visible, fb);
      });
    }
  }

  document.addEventListener("click", (e) => {
    const menu = document.getElementById(MENU_ID);
    if (!menu || !menu.classList.contains("open")) return;
    if (menu.contains(e.target)) return;
    if (e.target.classList && e.target.classList.contains(BTN_CLASS)) return;
    if (e.target.id === FLOAT_ID) return;
    menu.classList.remove("open");
  });

  // debounce + observe
  let scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => { scheduled = false; injectAll(); }, 400);
  }

  injectAll();
  const obs = new MutationObserver(schedule);
  if (document.body) obs.observe(document.body, { childList: true, subtree: true });
  setInterval(schedule, 2500);
})();
