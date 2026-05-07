// EscalaFlow ChatGPT injector — pastes and submits the pending prompt.
(() => {
  console.log("[EscalaFlow] chatgpt.js carregado");
  const params = new URLSearchParams(location.search);
  const wantedId = params.get("escala");

  function getPending(cb) {
    chrome.storage.local.get(["pendingPrompts", "lastPromptId"], ({ pendingPrompts, lastPromptId }) => {
      const list = Array.isArray(pendingPrompts) ? pendingPrompts : [];
      const id = wantedId || lastPromptId;
      const found = list.find((p) => p.id === id) || list[list.length - 1];
      cb(found, list, id);
    });
  }

  function consume(id) {
    chrome.storage.local.get(["pendingPrompts"], ({ pendingPrompts }) => {
      const list = Array.isArray(pendingPrompts) ? pendingPrompts : [];
      chrome.storage.local.set({ pendingPrompts: list.filter((p) => p.id !== id) });
    });
  }

  function findInput() {
    return (
      document.querySelector('div#prompt-textarea[contenteditable="true"]') ||
      document.querySelector('textarea#prompt-textarea') ||
      document.querySelector('textarea[data-id="root"]') ||
      document.querySelector('form textarea')
    );
  }

  function findSendButton() {
    return (
      document.querySelector('button[data-testid="send-button"]') ||
      document.querySelector('button[aria-label*="Send"]') ||
      document.querySelector('button[aria-label*="Enviar"]')
    );
  }

  function setText(el, text) {
    if (el.tagName === "TEXTAREA") {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
      setter.call(el, text);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    } else {
      el.focus();
      el.innerHTML = "";
      const p = document.createElement("p");
      p.textContent = text;
      el.appendChild(p);
      el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }));
    }
  }

  function tryInject(prompt, id, attempt = 0) {
    const input = findInput();
    if (!input) {
      if (attempt > 60) return console.warn("[EscalaFlow] input ChatGPT não encontrado");
      return setTimeout(() => tryInject(prompt, id, attempt + 1), 500);
    }
    setText(input, prompt);
    console.log("[EscalaFlow] prompt injetado");
    setTimeout(() => {
      const btn = findSendButton();
      if (btn && !btn.disabled) {
        btn.click();
        console.log("[EscalaFlow] prompt enviado");
        consume(id);
      } else {
        // Fallback: simulate Enter
        input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", keyCode: 13, bubbles: true }));
        consume(id);
      }
    }, 600);
  }

  function start() {
    getPending((found, _list, id) => {
      if (!found) {
        console.log("[EscalaFlow] sem prompt pendente");
        return;
      }
      console.log("[EscalaFlow] aplicando prompt", id);
      tryInject(found.prompt, found.id);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
