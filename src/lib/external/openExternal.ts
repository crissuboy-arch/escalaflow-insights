import { toast } from "sonner";

/**
 * Open a URL in a new tab safely. If the popup is blocked, fall back to a
 * toast with a clickable action so the user can still reach the destination.
 */
export function openExternal(url: string, label = "Abrir") {
  if (!url) return;
  try {
    const w = window.open(url, "_blank", "noopener,noreferrer");
    if (!w || w.closed || typeof w.closed === "undefined") {
      toast.message("Popup bloqueado pelo navegador", {
        description: url,
        action: {
          label,
          onClick: () => {
            window.location.assign(url);
          },
        },
      });
    }
  } catch {
    toast.error("Não foi possível abrir o link.", {
      action: { label, onClick: () => window.location.assign(url) },
    });
  }
}