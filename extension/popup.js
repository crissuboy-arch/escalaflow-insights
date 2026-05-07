const DEFAULT_ENDPOINT = "https://id-preview--50293ad0-b4d2-4adf-8446-ff77f73ad3e6.lovable.app";

const $ = (id) => document.getElementById(id);

chrome.storage.local.get(["endpoint"], ({ endpoint }) => {
  $("endpoint").value = endpoint || DEFAULT_ENDPOINT;
});

$("save").addEventListener("click", () => {
  const endpoint = $("endpoint").value.trim().replace(/\/$/, "");
  chrome.storage.local.set({ endpoint }, () => {
    $("save").textContent = "Salvo ✓";
    setTimeout(() => ($("save").textContent = "Salvar URL"), 1200);
  });
});

$("capture").addEventListener("click", async () => {
  const endpoint = ($("endpoint").value.trim() || DEFAULT_ENDPOINT).replace(/\/$/, "");
  await chrome.storage.local.set({ endpoint });

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !/facebook\.com\/ads\/library/.test(tab.url || "")) {
    alert("Abra a Facebook Ads Library em uma aba ativa.");
    return;
  }

  const [{ result } = {}] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: scrapeAd,
  });

  if (!result || !result.headline) {
    alert("Não foi possível capturar o anúncio. Abra um card de anúncio específico.");
    return;
  }

  const url = buildImportUrl(endpoint, { ...result, link: result.link || tab.url });
  await chrome.tabs.create({ url });
  window.close();
});

function buildImportUrl(endpoint, data) {
  const u = new URL(endpoint + "/importar-anuncio");
  const set = (k, v) => v != null && v !== "" && u.searchParams.set(k, String(v));
  set("headline", data.headline);
  set("copy", data.copy);
  set("link", data.link);
  set("platform", data.platform || "Facebook");
  set("country", data.country || "BR");
  set("niche", data.niche || "Geral");
  set("score", data.score ?? 75);
  set("analysisType", data.analysisType || "manual");
  set("creativeUrl", data.creativeUrl);
  set("createdAt", data.createdAt || new Date().toISOString());
  return u.toString();
}

// Executed inside the Facebook tab context.
function scrapeAd() {
  const text = (sel) => {
    const el = document.querySelector(sel);
    return el ? el.textContent.trim() : "";
  };
  const allText = (sel) =>
    Array.from(document.querySelectorAll(sel))
      .map((e) => e.textContent.trim())
      .filter(Boolean);

  const headline =
    text('div[role="article"] strong') ||
    text('div[role="main"] h2') ||
    document.title.replace(/ \| Facebook.*/, "").slice(0, 140);

  const copyCandidates = allText('div[role="article"] div[dir="auto"]');
  const copy = copyCandidates.sort((a, b) => b.length - a.length)[0] || "";

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
    analysisType: "manual",
    creativeUrl,
    createdAt: new Date().toISOString(),
  };
}