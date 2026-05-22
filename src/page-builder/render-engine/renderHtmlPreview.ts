// Client-side utilities — no server imports

export function sanitizeHtml(html: string): string {
  // Ensure the HTML is well-formed and starts with DOCTYPE
  const trimmed = html.trim();
  if (!trimmed.startsWith("<!DOCTYPE") && !trimmed.startsWith("<!doctype")) {
    return "<!DOCTYPE html>" + trimmed;
  }
  return trimmed;
}

export function downloadHtml(html: string, filename = "landing-page.html"): void {
  const blob = new Blob([sanitizeHtml(html)], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function copyHtmlToClipboard(html: string): Promise<void> {
  return navigator.clipboard.writeText(sanitizeHtml(html));
}

export function estimateWordCount(html: string): number {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text.split(" ").filter(Boolean).length;
}

export function extractPageTitle(html: string): string {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m ? m[1].trim() : "Landing Page";
}

export function getSrcDoc(html: string): string {
  return sanitizeHtml(html);
}
