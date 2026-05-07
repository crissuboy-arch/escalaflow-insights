// Content script: injected into Facebook Ads Library pages.
// Adds a floating "Minerar para EscalaFlow" button on each ad card.
(() => {
  const BTN_CLASS = "escalaflow-mine-btn";
  const DEFAULT_ENDPOINT = "https://id-preview--50293ad0-b4d2-4adf-8446-ff77f73ad3e6.lovable.app";

  const style = document.createElement("style");
  style.textContent = `
    .${BTN_CLASS}{position:absolute;top:8px;right:8px;z-index:9999;
      padding:6px 10px;border:0;border-radius:8px;cursor:pointer;
      font:600 12px -apple-system,system-ui,sans-serif;color:#fff;
      background:linear-gradient(135deg,#3b82f6,#8b5cf6);
      box-shadow:0 4px 12px rgba(59,130,246,.35);}
    .${BTN_CLASS}:hover{filter:brightness(1.1)}
    .escalaflow-host{position:relative}
  `;
  document.head.appendChild(style);

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

  function extract(card) {
    const text = (sel) => {
      const el = card.querySelector(sel);
      return el ? el.textContent.trim() : "";
    };
    const headline =
      text("strong") || text('span[dir="auto"]') || "Anúncio Facebook";
    const copies = Array.from(card.querySelectorAll('div[dir="auto"], span[dir="auto"]'))
      .map((e) => e.textContent.trim())
      .filter((t) => t.length > 30);
    const copy = copies.sort((a, b) => b.length - a.length)[0] || "";
    const img = card.querySelector("img");
    const video = card.querySelector("video");
    const creativeUrl = (video && video.poster) || (img && img.src) || "";
    const link =
      (card.querySelector('a[href*="/ads/library/"]') || {}).href || location.href;
    return {
      headline: headline.slice(0, 200),
      copy: copy.slice(0, 1000),
      link,
      platform: "Facebook",
      country: "BR",
      niche: "Geral",
      score: 80,
      analysisType: "manual",
      creativeUrl,
      createdAt: new Date().toISOString(),
    };
  }

  function buildUrl(endpoint, data) {
    const u = new URL(endpoint + "/importar-anuncio");
    Object.entries(data).forEach(([k, v]) => {
      if (v != null && v !== "") u.searchParams.set(k, String(v));
    });
    return u.toString();
  }

  async function attach(card) {
    if (card.querySelector(`.${BTN_CLASS}`)) return;
    card.classList.add("escalaflow-host");
    const btn = document.createElement("button");
    btn.className = BTN_CLASS;
    btn.textContent = "Minerar → EscalaFlow";
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const endpoint = await getEndpoint();
      const data = extract(card);
      window.open(buildUrl(endpoint, data), "_blank", "noopener");
    });
    card.appendChild(btn);
  }

  function scan() {
    document
      .querySelectorAll('div[role="article"]')
      .forEach((c) => attach(c));
  }

  const obs = new MutationObserver(() => scan());
  obs.observe(document.body, { childList: true, subtree: true });
  scan();

  // Handshake for the in-page bridge (window.postMessage)
  window.postMessage({ source: "escalaflow-extension", type: "ping" }, "*");
})();