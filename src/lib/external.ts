import { toast } from "sonner";

/**
 * Opens a URL in a real new browser tab, escaping the Lovable preview iframe.
 *
 * Why an interstitial: when window.open is called from a sandboxed iframe
 * (Lovable preview), the new tab can inherit sandbox flags / COOP relations,
 * which makes sites like Facebook fail with ERR_BLOCKED_BY_RESPONSE. We open
 * a same-origin /go.html page instead — that page is a top-level document on
 * our own origin, with no sandbox, and it then redirects to the real URL.
 */
function buildGoUrl(target: string): string {
  const origin =
    typeof window !== "undefined" && window.location ? window.location.origin : "";
  return `${origin}/go.html?url=${encodeURIComponent(target)}`;
}

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

  const goUrl = buildGoUrl(url);

  // 1) Synthetic anchor click to a same-origin redirector — most reliable
  //    way to open a real top-level tab from inside a sandboxed iframe.
  try {
    const a = document.createElement("a");
    a.href = goUrl;
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

  // 2) window.open fallback (still through the redirector).
  try {
    const w = window.open(goUrl, "_blank", "noopener,noreferrer");
    if (w) return true;
  } catch {
    /* fall through */
  }

  // 3) Last resort — copy URL so the user can paste it manually.
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
