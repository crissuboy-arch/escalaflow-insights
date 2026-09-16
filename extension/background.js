// EscalaFlow background — orchestrates ChatGPT automation + real persistence.
const DEFAULT_ENDPOINT = "https://escalaflow-insights.vercel.app";

chrome.runtime.onInstalled.addListener(async () => {
  const { endpoint } = await chrome.storage.local.get(["endpoint"]);
  if (!endpoint) await chrome.storage.local.set({ endpoint: DEFAULT_ENDPOINT });
});

// Receives requests from content.js to open ChatGPT and inject a prompt.
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "ESCALA_INGEST") {
    // Real persistence: POST straight to /api/ingest -> collected_ads (Supabase).
    // Runs from the background service worker so it works even when the
    // EscalaFlow app isn't open in any tab.
    chrome.storage.local.get(["endpoint"], async ({ endpoint }) => {
      const base = (endpoint || DEFAULT_ENDPOINT).replace(/\/$/, "");
      try {
        const res = await fetch(`${base}/api/ingest`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(msg.payload),
        });
        const data = await res.json().catch(() => ({}));
        sendResponse({ ok: res.ok, status: res.status, data });
      } catch (e) {
        sendResponse({ ok: false, error: String(e?.message || e) });
      }
    });
    return true; // async
  }
  if (msg?.type === "ESCALA_DOWNLOAD") {
    // "Baixar criativo" — only fires when a direct media URL was captured.
    chrome.downloads.download(
      { url: msg.url, filename: msg.filename || undefined, saveAs: false },
      (downloadId) => sendResponse({ ok: !!downloadId, downloadId }),
    );
    return true; // async
  }
  if (msg?.type === "ESCALA_OPEN_CHATGPT") {
    const id = "esc_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const payload = { id, prompt: msg.prompt, ad: msg.ad, createdAt: Date.now() };

    chrome.storage.local.get(["pendingPrompts"], ({ pendingPrompts }) => {
      const list = Array.isArray(pendingPrompts) ? pendingPrompts : [];
      list.push(payload);
      // keep only last 20
      const trimmed = list.slice(-20);
      chrome.storage.local.set({ pendingPrompts: trimmed, lastPromptId: id }, () => {
        chrome.tabs.create({ url: "https://chatgpt.com/?escala=" + id }, (tab) => {
          sendResponse({ ok: true, tabId: tab?.id, id });
        });
      });
    });
    return true; // async
  }
  if (msg?.type === "ESCALA_CAPTURE") {
    chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
      sendResponse({ ok: !!dataUrl, dataUrl });
    });
    return true;
  }
});
