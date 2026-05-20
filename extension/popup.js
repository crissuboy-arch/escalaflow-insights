const DEFAULT_ENDPOINT = "https://id-preview--50293ad0-b4d2-4adf-8446-ff77f73ad3e6.lovable.app";

const $ = (id) => document.getElementById(id);

function setStatus(msg, state = "idle") {
  $("status-text").textContent = msg;
  const dot = $("status-dot");
  dot.className = "dot" + (state === "active" ? " active" : state === "error" ? " error" : "");
}

// Load saved endpoint
chrome.storage.local.get(["endpoint"], ({ endpoint }) => {
  $("endpoint").value = endpoint || DEFAULT_ENDPOINT;
  checkConnection(endpoint || DEFAULT_ENDPOINT);
});

// Check if EscalaFlow app is reachable
function checkConnection(endpoint) {
  setStatus("Verificando conexão…");
  const url = endpoint.replace(/\/$/, "");
  fetch(url, { method: "HEAD", mode: "no-cors" })
    .then(() => setStatus("Conectado ao EscalaFlow", "active"))
    .catch(() => setStatus("App offline ou URL incorreta", "error"));
}

$("save").addEventListener("click", () => {
  const endpoint = $("endpoint").value.trim().replace(/\/$/, "");
  chrome.storage.local.set({ endpoint }, () => {
    const orig = $("save").textContent;
    $("save").textContent = "Salvo ✓";
    checkConnection(endpoint);
    setTimeout(() => ($("save").textContent = orig), 1400);
  });
});

$("capture").addEventListener("click", async () => {
  const endpoint = ($("endpoint").value.trim() || DEFAULT_ENDPOINT).replace(/\/$/, "");
  await chrome.storage.local.set({ endpoint });

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !/facebook\.com\/ads\/library/.test(tab.url || "")) {
    alert("Abra a Facebook Ads Library em uma aba ativa.\nhttps://www.facebook.com/ads/library/");
    return;
  }

  // Inject content script if not already running, then trigger capture
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        // Trigger the floating IA PRO button click
        const floatBtn = document.getElementById("escala-float");
        if (floatBtn) {
          floatBtn.click();
        } else {
          alert("EscalaFlow: recarregue a página da Ads Library e tente novamente.");
        }
      },
    });
  } catch (e) {
    alert("Erro ao injetar script: " + e.message);
  }

  window.close();
});
