// Service worker — currently used only to keep storage defaults set on install.
chrome.runtime.onInstalled.addListener(async () => {
  const { endpoint } = await chrome.storage.local.get(["endpoint"]);
  if (!endpoint) {
    await chrome.storage.local.set({
      endpoint: "https://id-preview--50293ad0-b4d2-4adf-8446-ff77f73ad3e6.lovable.app",
    });
  }
});