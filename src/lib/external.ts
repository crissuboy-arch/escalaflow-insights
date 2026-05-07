import { toast } from "sonner";

/**
 * Opens a URL in a new tab, escaping the preview iframe.
 * Accepts a list of candidate URLs and uses the first valid one.
 */
export function openExternal(...candidates: Array<string | null | undefined>): boolean {
  const url = candidates.find((u) => typeof u === "string" && /^https?:\/\//i.test(u));
  if (!url) {
    toast.error("Link não encontrado");
    return false;
  }
  console.log("abrindo url externa", url);
  // window.open first with noopener,noreferrer — escapes iframe and is the
  // requested behaviour. Fallback to anchor click if popup is blocked.
  try {
    const w = window.open(url, "_blank", "noopener,noreferrer");
    if (w) {
      try {
        w.opener = null;
      } catch {
        /* ignore */
      }
      return true;
    }
  } catch {
    /* fall through */
  }
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
    /* ignore */
  }
  toast.error("Não foi possível abrir o link.");
  return false;
}

export async function openChatGPTWithPrompt(prompt: string): Promise<void> {
  let copied = false;
  try {
    await navigator.clipboard.writeText(prompt);
    copied = true;
  } catch {
    /* clipboard may be unavailable */
  }
  openExternal("https://chatgpt.com/");
  if (copied) toast.success("Prompt copiado para o ChatGPT");
  else toast.message("Abra o ChatGPT e cole seu prompt.");
}
