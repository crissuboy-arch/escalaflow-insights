// EscalaFlow Miner — content script
// Injects a floating "⚡ IA PRO" button on Facebook (especially the Ads Library)
// and exposes a quick-action menu that sends the captured ad to /importar-anuncio.
(() => {
  const BTN_ID = "escala-ia-pro";
  const MENU_ID = "escala-ia-pro-menu";
  const DEFAULT_ENDPOINT =
    "https://id-preview--50293ad0-b4d2-4adf-8446-ff77f73ad3e6.lovable.app";

  // ---------- styles ----------
  if (!document.getElementById("escala-ia-pro-style")) {
    const style = document.createElement("style");
    style.id = "escala-ia-pro-style";
    style.textContent = `
      #${BTN_ID}{
        position:fixed;top:84px;right:20px;z-index:2147483647;
        padding:10px 16px;border:0;border-radius:999px;cursor:pointer;
        font:700 13px/1 -apple-system,system-ui,Segoe UI,Roboto,sans-serif;
        color:#fff;letter-spacing:.02em;
        background:linear-gradient(135deg,#7c3aed 0%,#3b82f6 50%,#a855f7 100%);
        box-shadow:0 10px 30px rgba(124,58,237,.45),0 2px 6px rgba(0,0,0,.2);
        transition:transform .15s ease, box-shadow .15s ease, filter .15s ease;
      }
      #${BTN_ID}:hover{transform:translateY(-1px) scale(1.03);
        filter:brightness(1.08);
        box-shadow:0 14px 36px rgba(124,58,237,.55),0 4px 10px rgba(0,0,0,.25);}
      #${BTN_ID}:active{transform:translateY(0) scale(.98)}
      #${MENU_ID}{
        position:fixed;top:130px;right:20px;z-index:2147483647;
        min-width:240px;border-radius:14px;overflow:hidden;
        background:rgba(15,18,32,.96);backdrop-filter:blur(10px);
        border:1px solid rgba(168,85,247,.35);
        box-shadow:0 20px 50px rgba(0,0,0,.45);
        font:600 13px -apple-system,system-ui,Segoe UI,Roboto,sans-serif;
        color:#e6edf7;display:none;
      }
      #${MENU_ID}.open{display:block;animation:escFade .12s ease-out}
      #${MENU_ID} button{
        display:flex;align-items:center;gap:8px;width:100%;
        padding:11px 14px;background:transparent;border:0;color:#e6edf7;
        font:600 13px inherit;cursor:pointer;text-align:left;
      }
      #${MENU_ID} button:hover{background:rgba(124,58,237,.18)}
      #${MENU_ID} .sep{height:1px;background:rgba(255,255,255,.06)}
      @keyframes escFade{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}
    `;
    document.head.appendChild(style);
  }

  // ---------- helpers ----------
  function getEndpoint() {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.get(["endpoint"], ({ endpoint }) =>
          resolve((endpoint || DEFAULT_ENDPOINT).replace(/\/$/, "")),
        );
      } catch {
        resolve(DEFAULT_ENDPOINT);
      }
    });
  }

  function scrapeAd() {
    const text = (sel) => {
      const el = document.querySelector(sel);
      return el ? el.textContent.trim() : "";
    };
    const headline =
      text('div[role="article"] strong') ||
      text('div[role="main"] h2') ||
      document.title.replace(/ \| Facebook.*/, "").slice(0, 140) ||
      "Anúncio Facebook";
    const copies = Array.from(
      document.querySelectorAll('div[role="article"] div[dir="auto"], div[role="article"] span[dir="auto"]'),
    )
      .map((e) => e.textContent.trim())
      .filter((t) => t.length > 30);
    const copy = copies.sort((a, b) => b.length - a.length)[0] || "";
    const img = document.querySelector('div[role="article"] img');
    const video = document.querySelector('div[role="article"] video');
    const creativeUrl = (video && video.poster) || (img && img.src) || "";
    return {
      headline: headline.slice(0, 200),
      copy: copy.slice(0, 1000),
      link: location.href,
      platform: "Facebook",
      country: "BR",
      niche: "Geral",
      score: 80,
      creativeUrl,
      createdAt: new Date().toISOString(),
    };
  }

  function buildUrl(endpoint, data, analysisType) {
    const u = new URL(endpoint + "/importar-anuncio");
    const set = (k, v) => v != null && v !== "" && u.searchParams.set(k, String(v));
    set("headline", data.headline);
    set("copy", data.copy);
    set("link", data.link);
    set("platform", data.platform);
    set("country", data.country);
    set("niche", data.niche);
    set("score", data.score);
    set("analysisType", analysisType || "manual");
    set("creativeUrl", data.creativeUrl);
    set("createdAt", data.createdAt);
    return u.toString();
  }

  async function send(analysisType) {
    const endpoint = await getEndpoint();
    const data = scrapeAd();
    console.log("[EscalaFlow] anúncio capturado", { analysisType, data });
    window.open(buildUrl(endpoint, data, analysisType), "_blank", "noopener");
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
        e.preventDefault();
        e.stopPropagation();
        menu.classList.remove("open");
        send(type);
      });
      menu.appendChild(b);
      if (i < ACTIONS.length - 1) {
        const s = document.createElement("div");
        s.className = "sep";
        menu.appendChild(s);
      }
    });
    document.body.appendChild(menu);
    return menu;
  }

  // ---------- button ----------
  function inject() {
    if (document.getElementById(BTN_ID)) return;
    if (!document.body) return;
    const btn = document.createElement("button");
    btn.id = BTN_ID;
    btn.type = "button";
    btn.textContent = "⚡ IA PRO";
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const menu = ensureMenu();
      menu.classList.toggle("open");
    });
    document.body.appendChild(btn);
    ensureMenu();
    console.log("[EscalaFlow] botão inserido");
  }

  // close menu on outside click
  document.addEventListener("click", (e) => {
    const menu = document.getElementById(MENU_ID);
    const btn = document.getElementById(BTN_ID);
    if (!menu || !menu.classList.contains("open")) return;
    if (menu.contains(e.target) || (btn && btn.contains(e.target))) return;
    menu.classList.remove("open");
  });

  // initial + observer for SPA navigation
  inject();
  const obs = new MutationObserver(() => {
    if (!document.getElementById(BTN_ID)) inject();
  });
  if (document.body) obs.observe(document.body, { childList: true, subtree: true });
  setInterval(inject, 2000);

  window.postMessage({ source: "escalaflow-extension", type: "ping" }, "*");
})();
