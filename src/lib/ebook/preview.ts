import { marked } from "marked";
import DOMPurify from "dompurify";

export function renderMarkdownSafe(md: string): string {
  const html = marked.parse(md ?? "", { async: false }) as string;
  if (typeof window === "undefined") return html;
  return DOMPurify.sanitize(html);
}