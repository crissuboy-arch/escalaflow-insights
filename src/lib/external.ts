import { toast } from "sonner";

/**
 * Opens a URL in a new tab, escaping the preview iframe.
 * Accepts a list of candidate URLs and uses the first valid one.
 */
export function openExternal(...candidates: Array<string | null | undefined>): boolean {
  const url = candidates.find((u) => typeof u === "string" && /^https?:\/\//i.test(u));
  if (!url) {
    toast.error("Link original não encontrado.");
    return false;
  }
  try {
    const w = window.open(url, "_blank", "noopener,noreferrer");
    if (w) {
      w.opener = null;
      return true;
    }
  } catch {
    /* ignore */
  }
  // Fallback: anchor click (escapes some iframe blockers)
  try {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
    return true;
  } catch {
    toast.error("Não foi possível abrir o link.");
    return false;
  }
}

export async function openChatGPTWithPrompt(prompt: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(prompt);
    toast.success("Prompt copiado. Cole no ChatGPT.");
  } catch {
    toast.message("Abra o ChatGPT e cole seu prompt.");
  }
  openExternal("https://chatgpt.com/");
}
