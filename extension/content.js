// EscalaFlow Miner — content script (Facebook/Meta Ads Library)
// Injects a floating "⚡ IA PRO" button with quick actions:
// - captures the ad data
// - saves it to EscalaFlow (/importar-anuncio)
// - asks background.js to open ChatGPT and auto-inject a tailored prompt.
(() => {
  const BTN_ID = "escala-ia-pro";
  const MENU_ID = "escala-ia-pro-menu";
  const TOAST_ID = "escala-ia-pro-toast";
  const DEFAULT_ENDPOINT =
    "https://id-preview--50293ad0-b4d2-4adf-8446-ff77f73ad3e6.lovable.app";

  // ---------- styles ----------
  if (!document.getElementById("escala-ia-pro-style")) {
    const style = document.createElement("style");
    style.id = "escala-ia-pro-style";
    style.textContent = `
      #${BTN_ID}{position:fixed;top:84px;right:20px;z-index:2147483647;
        padding:10px 16px;border:0;border-radius:999px;cursor:pointer;
        font:700 13px/1 -apple-system,system-ui,Segoe UI,Roboto,sans-serif;
        color:#fff;letter-spacing:.02em;
        background:linear-gradient(135deg,#7c3aed 0%,#3b82f6 50%,#a855f7 100%);
        box-shadow:0 10px 30px rgba(124,58,237,.45),0 2px 6px rgba(0,0,0,.2);
        transition:transform .15s ease, box-shadow .15s ease, filter .15s ease;}
      #${BTN_ID}:hover{transform:translateY(-1px) scale(1.03);filter:brightness(1.08);
        box-shadow:0 14px 36px rgba(124,58,237,.55),0 4px 10px rgba(0,0,0,.25);}
      #${BTN_ID}:active{transform:translateY(0) scale(.98)}
      #${MENU_ID}{position:fixed;top:130px;right:20px;z-index:2147483647;
        min-width:260px;border-radius:14px;overflow:hidden;
        background:rgba(15,18,32,.96);backdrop-filter:blur(10px);
        border:1px solid rgba(168,85,247,.35);
        box-shadow:0 20px 50px rgba(0,0,0,.45);
        font:600 13px -apple-system,system-ui,Segoe UI,Roboto,sans-serif;
        color:#e6edf7;display:none;}
      #${MENU_ID}.open{display:block;animation:escFade .12s ease-out}
      #${MENU_ID} button{display:flex;align-items:center;gap:8px;width:100%;
        padding:11px 14px;background:transparent;border:0;color:#e6edf7;
        font:600 13px inherit;cursor:pointer;text-align:left;}
      #${MENU_ID} button:hover{background:rgba(124,58,237,.18)}
      #${MENU_ID} .sep{height:1px;background:rgba(255,255,255,.06)}
      #${TOAST_ID}{position:fixed;bottom:24px;right:24px;z-index:2147483647;
        padding:12px 16px;border-radius:12px;color:#fff;font:600 13px -apple-system,system-ui,sans-serif;
        background:linear-gradient(135deg,#16a34a,#22c55e);
        box-shadow:0 12px 30px rgba(34,197,94,.45);opacity:0;transform:translateY(8px);
        transition:opacity .2s ease, transform .2s ease;pointer-events:none}
      #${TOAST_ID}.show{opacity:1;transform:translateY(0)}
      @keyframes escFade{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}
    `;
    document.head.appendChild(style);
  }

  function toast(msg) {
    let el = document.getElementById(TOAST_ID);
    if (!el) {
      el = document.createElement("div");
      el.id = TOAST_ID;
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove("show"), 2400);
  }

  function getEndpoint() {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.get(["endpoint"], ({ endpoint }) =>
          resolve((endpoint || DEFAULT_ENDPOINT).replace(/\/$/, "")));
      } catch { resolve(DEFAULT_ENDPOINT); }
    });
  }

  // ---------- scrape ----------
  function scrapeAd() {
    const text = (sel) => {
      const el = document.querySelector(sel);
      return el ? el.textContent.trim() : "";
    };
    const allText = (sel) =>
      Array.from(document.querySelectorAll(sel))
        .map((e) => e.textContent.trim())
        .filter(Boolean);

    const advertiser =
      text('a[role="link"][href*="/ads/library/?view_all_page_id"]') ||
      text('div[role="article"] a[role="link"] strong') ||
      "";

    const headline =
      text('div[role="article"] strong') ||
      text('div[role="main"] h2') ||
      advertiser ||
      document.title.replace(/ \| Facebook.*/, "").slice(0, 140) ||
      "Anúncio Facebook";

    const copies = allText('div[role="article"] div[dir="auto"], div[role="article"] span[dir="auto"]');
    const copy = copies.sort((a, b) => b.length - a.length)[0] || "";
    const description = copies.filter((c) => c !== copy).sort((a, b) => b.length - a.length)[0] || "";

    const img = document.querySelector('div[role="article"] img');
    const video = document.querySelector('div[role="article"] video');
    const creativeUrl = (video && video.poster) || (img && img.src) || "";

    const idMatch = location.href.match(/id=(\d+)/) || document.body.innerHTML.match(/"adArchiveID":"(\d+)"/);
    const adLibraryId = idMatch ? idMatch[1] : "";

    return {
      headline: headline.slice(0, 200),
      copy: copy.slice(0, 1500),
      description: description.slice(0, 600),
      link: location.href,
      platform: "Facebook",
      country: "BR",
      niche: "Geral",
      score: 80,
      creativeUrl,
      advertiser,
      adLibraryId,
      createdAt: new Date().toISOString(),
    };
  }

  function buildUrl(endpoint, data, analysisType) {
    const u = new URL(endpoint + "/importar-anuncio");
    const set = (k, v) => v != null && v !== "" && u.searchParams.set(k, String(v));
    set("headline", data.headline);
    set("copy", data.copy);
    set("description", data.description);
    set("link", data.link);
    set("platform", data.platform);
    set("country", data.country);
    set("niche", data.niche);
    set("score", data.score);
    set("analysisType", analysisType || "manual");
    set("creativeUrl", data.creativeUrl);
    set("advertiser", data.advertiser);
    set("adLibraryId", data.adLibraryId);
    set("createdAt", data.createdAt);
    return u.toString();
  }

  // ---------- prompts ----------
  function buildPrompt(type, ad) {
    const base = `Anúncio capturado da Meta Ads Library:
- Anunciante: ${ad.advertiser || "—"}
- Headline: ${ad.headline}
- Copy: ${ad.copy}
- Descrição: ${ad.description || "—"}
- Link: ${ad.link}
- País: ${ad.country} | Plataforma: ${ad.platform} | Nicho: ${ad.niche}
- ID da Biblioteca: ${ad.adLibraryId || "—"}
`;

    const prompts = {
      ai: `${base}
Faça engenharia reversa COMPLETA deste anúncio:
1. Big Idea e ângulo de marketing
2. Avatar (dores, desejos, objeções)
3. Estrutura da copy (gancho, prova, CTA)
4. Gatilhos mentais usados
5. Por que este criativo funciona
6. Sugestões para escalar`,
      variations: `${base}
Gere 10 variações de criativos baseadas neste anúncio:
- 3 variações de headline
- 3 variações de copy
- 2 ideias de criativo (vídeo/imagem)
- 2 ângulos novos`,
      "offer-structure": `${base}
Faça o breakdown da OFERTA:
1. Produto principal e promessa
2. Bônus aparentes
3. Garantia
4. Stack de valor
5. Preço e ancoragem
6. Como melhorar esta oferta`,
      "quiz-funnel": `${base}
Monte um FUNIL DE QUIZ baseado neste anúncio:
- Hook do quiz
- 6 a 8 perguntas
- Segmentação por respostas
- Página de resultado
- Oferta no final`,
      "unique-mechanism": `${base}
Identifique o MECANISMO ÚNICO deste anúncio:
- Qual o mecanismo central
- Por que é "novo"
- Como nomear/posicionar
- Como reforçar o mecanismo na copy`,
      manual: `${base}
Resuma este anúncio em 5 bullets e dê uma nota de 0 a 100 para potencial de escala.`,
    };
    return prompts[type] || prompts.manual;
  }

  // ---------- send ----------
  async function send(analysisType) {
    const endpoint = await getEndpoint();
    const ad = scrapeAd();
    console.log("[EscalaFlow] anúncio capturado", { analysisType, ad });

    // 1) Salvar no EscalaFlow (abre aba de importação que persiste no localStorage)
    const importUrl = buildUrl(endpoint, ad, analysisType);
    window.open(importUrl, "_blank", "noopener");
    toast("Anúncio minerado com sucesso");

    // 2) Disparar ChatGPT automatizado (exceto "manual" / Salvar Anúncio)
    if (analysisType !== "manual") {
      const prompt = buildPrompt(analysisType, ad);
      try {
        chrome.runtime.sendMessage(
          { type: "ESCALA_OPEN_CHATGPT", prompt, ad },
          (res) => console.log("[EscalaFlow] ChatGPT aberto", res),
        );
      } catch (e) {
        console.warn("[EscalaFlow] falha ao abrir ChatGPT", e);
      }
    }
  }

  // ---------- menu ----------
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
    ACTIONS.forEach(([label, type], i) => {
      const b = document.createElement("button");
      b.textContent = label;
      b.addEventListener("click", (e) => {
        e.preventDefault(); e.stopPropagation();
        menu.classList.remove("open");
        send(type);
      });
      menu.appendChild(b);
      if (i < ACTIONS.length - 1) {
        const s = document.createElement("div"); s.className = "sep"; menu.appendChild(s);
      }
    });
    document.body.appendChild(menu);
    return menu;
  }

  function inject() {
    if (document.getElementById(BTN_ID)) return;
    if (!document.body) return;
    const btn = document.createElement("button");
    btn.id = BTN_ID; btn.type = "button"; btn.textContent = "⚡ IA PRO";
    btn.addEventListener("click", (e) => {
      e.preventDefault(); e.stopPropagation();
      const menu = ensureMenu();
      menu.classList.toggle("open");
    });
    document.body.appendChild(btn);
    ensureMenu();
    console.log("[EscalaFlow] botão inserido");
  }

  document.addEventListener("click", (e) => {
    const menu = document.getElementById(MENU_ID);
    const btn = document.getElementById(BTN_ID);
    if (!menu || !menu.classList.contains("open")) return;
    if (menu.contains(e.target) || (btn && btn.contains(e.target))) return;
    menu.classList.remove("open");
  });

  inject();
  const obs = new MutationObserver(() => {
    if (!document.getElementById(BTN_ID)) inject();
  });
  if (document.body) obs.observe(document.body, { childList: true, subtree: true });
  setInterval(inject, 2000);
})();
