// EscalaFlow background — orchestrates ChatGPT automation.
const DEFAULT_ENDPOINT =
  "https://id-preview--50293ad0-b4d2-4adf-8446-ff77f73ad3e6.lovable.app";

chrome.runtime.onInstalled.addListener(async () => {
  const { endpoint } = await chrome.storage.local.get(["endpoint"]);
  if (!endpoint) await chrome.storage.local.set({ endpoint: DEFAULT_ENDPOINT });
});

// Receives requests from content.js to open ChatGPT and inject a prompt.
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
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
