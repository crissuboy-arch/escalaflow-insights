// Leitura client-side da resposta de /api/collector/run.
//
// Nunca deixa uma falha parecer "0 resultados": tempo limite da função
// (504 com HTML), erro do fornecedor, coleta vazia ou anúncios não gravados
// viram sempre uma mensagem clara para o utilizador.
import { publicProviderError } from "@/lib/integrations/provider-error";

export interface CollectorRunResponse {
  ok: boolean;
  error?: string;
  notice?: string;
  ads?: unknown[];
  saved?: number;
  persistFailed?: number;
  persistError?: string;
  media?: { imagesCopied?: number; videosCopied?: number } | { error: string } | null;
}

export type CollectorOutcome =
  | {
      kind: "success";
      found: number;
      saved: number;
      imagesCopied: number;
      videosCopied: number;
      /** aviso não-fatal (ex.: parte dos anúncios não foi gravada) */
      warning?: string;
    }
  | { kind: "empty"; message: string }
  | { kind: "error"; message: string };

export function interpretCollectorResponse(status: number, bodyText: string): CollectorOutcome {
  let data: CollectorRunResponse | null = null;
  try {
    data = JSON.parse(bodyText) as CollectorRunResponse;
  } catch {
    data = null;
  }
  if (!data || typeof data !== "object") {
    if (status === 504 || status === 408 || status === 524) {
      return {
        kind: "error",
        message:
          "A coleta demorou mais do que o servidor permite e foi interrompida. Tente com menos anúncios (10 ou 20).",
      };
    }
    if (status === 401) return { kind: "error", message: "Sessão expirada — entre novamente." };
    return {
      kind: "error",
      message: `O servidor respondeu de forma inesperada (HTTP ${status}). Tente novamente.`,
    };
  }
  if (!data.ok) {
    return {
      kind: "error",
      message: publicProviderError(data.error, `Falha na coleta (HTTP ${status}).`),
    };
  }
  const found = Array.isArray(data.ads) ? data.ads.length : 0;
  if (found === 0) {
    return {
      kind: "empty",
      message:
        data.notice ??
        "A coleta terminou sem anúncios para esta pesquisa. Tente outra palavra-chave ou outro país.",
    };
  }
  const saved = typeof data.saved === "number" ? data.saved : found;
  const media = data.media && !("error" in data.media) ? data.media : null;
  const out: CollectorOutcome = {
    kind: "success",
    found,
    saved,
    imagesCopied: media?.imagesCopied ?? 0,
    videosCopied: media?.videosCopied ?? 0,
  };
  if (saved === 0) {
    return {
      kind: "error",
      message: `Foram encontrados ${found} anúncios, mas nenhum foi gravado na biblioteca${data.persistError ? ` (${data.persistError})` : ""}.`,
    };
  }
  if (saved < found) {
    out.warning = `${found - saved} de ${found} anúncios não foram gravados e não vão aparecer depois de atualizar a página.`;
  }
  return out;
}
