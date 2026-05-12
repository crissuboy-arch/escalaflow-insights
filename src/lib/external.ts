import { toast } from "sonner";

/**
 * Opens a URL in a new browser tab, escaping the Lovable preview iframe.
 * Accepts a list of candidate URLs and uses the first valid one.
 *
 * Strategy (in order, all inside the user gesture):
 *  1. Synthetic <a target="_blank" rel="noopener noreferrer"> click — most
 *     reliable inside sandboxed iframes when allow-popups is granted.
 *  2. window.top.open — escapes the iframe when same-origin allows.
 *  3. window.open — last resort.
 *  4. Copy URL to clipboard + error toast.
 */
export function openExternal(
  ...args: Array<string | null | undefined | { errorMessage?: string }>
): boolean {
  let errorMessage = "Link não encontrado";
  const candidates: Array<string | null | undefined> = [];
  for (const arg of args) {
    if (arg && typeof arg === "object") {
      if (arg.errorMessage) errorMessage = arg.errorMessage;
    } else {
      candidates.push(arg as string | null | undefined);
    }
  }
  const url = candidates.find((u) => typeof u === "string" && /^https?:\/\//i.test(u));
  if (!url) {
    toast.error(errorMessage);
    return false;
  }

  // 1) Synthetic anchor click — escapes iframe sandbox most reliably.
  try {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
    return true;
  } catch {
    /* fall through */
  }

  // 2) Try the top frame (may throw cross-origin — silence).
  try {
    const w = window.top?.open?.(url, "_blank", "noopener,noreferrer");
    if (w) return true;
  } catch {
    /* fall through */
  }

  // 3) Plain window.open as last resort.
  try {
    const w = window.open(url, "_blank", "noopener,noreferrer");
    if (w) return true;
  } catch {
    /* fall through */
  }

  // 4) Nothing worked — copy URL to clipboard so the user can paste it.
  try {
    void navigator.clipboard?.writeText(url);
    toast.error("Permita popups para abrir links externos. URL copiada.");
  } catch {
    toast.error("Não foi possível abrir o link.");
  }
  return false;
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    /* fall through to legacy method */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

export async function openChatGPTWithPrompt(prompt: string): Promise<void> {
  // Open first while we still have the user gesture, then copy.
  openExternal("https://chatgpt.com/");
  const copied = await copyToClipboard(prompt);
  if (copied) toast.success("Prompt copiado");
  else toast.message("Abra o ChatGPT e cole seu prompt.");
}
