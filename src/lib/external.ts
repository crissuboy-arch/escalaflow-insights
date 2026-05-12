import { toast } from "sonner";

/** Open a URL directly in a new tab. No interstitial, no auto-redirect.
 *  If the popup is blocked, copy the URL and notify the user. */
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
  return openInNewTab(url);
}

export function openInNewTab(url: string): boolean {
  // Synthetic anchor click — best chance of escaping sandboxed iframes.
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
  try {
    const w = window.open(url, "_blank", "noopener,noreferrer");
    if (w) return true;
  } catch {
    /* fall through */
  }
  void copyToClipboard(url).then((ok) => {
    if (ok) toast.error("Não foi possível abrir. Link copiado para a área de transferência.");
    else toast.error("Não foi possível abrir o link.");
  });
  return false;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    /* fall through */
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

export const META_ADS_LIBRARY_BASE = "https://www.facebook.com/ads/library/";

export function buildAdsLibraryUrl(adLibraryId?: string | null): string {
  if (adLibraryId) return `${META_ADS_LIBRARY_BASE}?id=${encodeURIComponent(adLibraryId)}`;
  return META_ADS_LIBRARY_BASE;
}

export type AdLinkInput = {
  adUrl?: string | null;
  adLibraryId?: string | null;
  profileUrl?: string | null;
  advertiser?: string | null;
  headline?: string | null;
};

/** Navigate to the internal "Link externo" page. Never auto-opens Meta links. */
export function openAdLink(input: AdLinkInput): void {
  const params = new URLSearchParams();
  if (input.adUrl) params.set("url", input.adUrl);
  if (input.adLibraryId) params.set("id", input.adLibraryId);
  if (input.profileUrl) params.set("profile", input.profileUrl);
  if (input.advertiser) params.set("advertiser", input.advertiser);
  if (input.headline) params.set("headline", input.headline);
  if (!params.toString()) {
    toast.error("Link do anúncio não encontrado");
    return;
  }
  // Internal navigation — full assign keeps it simple and avoids router import here.
  window.location.assign(`/link-externo?${params.toString()}`);
}

export async function openChatGPTWithPrompt(prompt: string): Promise<void> {
  const copied = await copyToClipboard(prompt);
  if (copied) toast.success("Prompt copiado");
  const opened = openInNewTab("https://chatgpt.com/");
  if (!opened) {
    toast("Permita popups para abrir o ChatGPT", {
      action: {
        label: "Copiar prompt",
        onClick: () => {
          void copyToClipboard(prompt).then((ok) => {
            if (ok) toast.success("Prompt copiado");
          });
        },
      },
    });
  }
}
