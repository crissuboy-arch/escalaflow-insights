// Mensagens de erro do fornecedor de coleta que chegam à UI.
//
// O nome do fornecedor (e os nomes de variáveis de ambiente/actors dele)
// é detalhe de implementação: nunca deve aparecer num toast/erro mostrado ao
// utilizador. Os logs do servidor continuam com o detalhe técnico completo.

const ENV_NAME = /\bAPIFY_[A-Z0-9_]+\b/g;
const ACTOR_SLUG = /"?\b[a-z0-9_-]+[~/][a-z0-9_-]*(?:scraper|scrapper|actor)[a-z0-9_-]*\b"?/gi;
const PROVIDER = /\bapify\b/gi;

/** Remove o nome do fornecedor, actors e variáveis de ambiente de uma mensagem. */
export function publicProviderError(
  message: unknown,
  fallback = "Falha na fonte automática",
): string {
  const raw =
    message instanceof Error ? message.message : typeof message === "string" ? message : "";
  if (!raw.trim()) return fallback;
  let out = raw
    .replace(ENV_NAME, "configuração do coletor")
    .replace(ACTOR_SLUG, "coletor")
    .replace(/\bno \.env\b/gi, "na configuração do servidor")
    .replace(/\.env\b/gi, "configuração do servidor")
    .replace(/\bApify Actor\b/gi, "Coletor")
    .replace(/\bactor\b/gi, "coletor")
    .replace(PROVIDER, "fonte automática");
  // "fonte automática: ..." no início fica mais legível com maiúscula.
  out = out.replace(/^fonte automática/, "Fonte automática");
  return out.trim() || fallback;
}

/** true quando a resposta do fornecedor é só um objeto de erro (HTTP 200 com
 *  [{ error: "..." }]) — não são dados e nunca devem virar "0 resultados". */
export function extractProviderItemError(items: unknown[]): string | null {
  if (!items.length) return null;
  const errors: string[] = [];
  for (const it of items) {
    if (!it || typeof it !== "object") return null;
    const o = it as Record<string, unknown>;
    const keys = Object.keys(o);
    const err = o.error ?? o.errorDescription ?? o.errorMessage;
    const onlyError = keys.every((k) =>
      ["error", "errorDescription", "errorMessage", "url", "input", "inputUrl", "status"].includes(
        k,
      ),
    );
    if (!err || !onlyError) return null;
    errors.push(typeof err === "string" ? err : JSON.stringify(err));
  }
  return errors[0] ?? null;
}
