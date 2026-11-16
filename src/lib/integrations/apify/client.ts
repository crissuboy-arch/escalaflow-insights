// src/lib/integrations/apify/client.ts
import { extractProviderItemError, publicProviderError } from "@/lib/integrations/provider-error";

const BASE = "https://api.apify.com/v2";
const MAX_TIMEOUT_SEC = 120;

// Normalize actor ID: Apify URLs require "username~actorName" (tilde), not slash.
// Accept both formats so .env can use either. Use /g to replace ALL slashes.
function normalizeActorId(id: string): string {
  return id.replace(/\//g, "~");
}

function getToken(): string {
  const token = process.env.APIFY_TOKEN;
  if (!token)
    throw new Error("Fonte automática não configurada no servidor (token do coletor ausente).");
  return token;
}

/** Mask token for safe logging: show first 8 chars only. */
function maskToken(token: string): string {
  return token.slice(0, 8) + "…(masked)";
}

export async function runApifyActor(actorId: string, input: any) {
  const token = getToken();
  const safeId = normalizeActorId(actorId);
  console.log(`[apify] ▶ runApifyActor actor=${safeId}`);
  const response = await fetch(`${BASE}/acts/${safeId}/runs?token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error(
      `[apify] ✗ runApifyActor actor=${safeId} status=${response.status}: ${body.slice(0, 300)}`,
    );
    if (response.status === 403)
      throw new Error("Fonte automática: coletor desativado ou sem permissão (403).");
    if (response.status === 401)
      throw new Error(
        "Fonte automática: credencial inválida (401). Verifique a configuração do servidor.",
      );
    throw new Error(`Fonte automática falhou (${response.status}).`);
  }
  return await response.json();
}

export async function runSyncGetDatasetItems<T = any>(
  actorId: string,
  input: any,
  timeoutSec = MAX_TIMEOUT_SEC,
): Promise<T[]> {
  const token = getToken();
  const safeId = normalizeActorId(actorId);

  const url =
    `${BASE}/acts/${safeId}/run-sync-get-dataset-items` +
    `?token=${encodeURIComponent(token)}&timeout=${timeoutSec}`;

  const safeUrl =
    `${BASE}/acts/${safeId}/run-sync-get-dataset-items` +
    `?token=${maskToken(token)}&timeout=${timeoutSec}`;

  console.log(`[apify] ▶ actor_original=${actorId} actor_normalized=${safeId}`);
  console.log(`[apify] ▶ url=${safeUrl}`);
  console.log(`[apify] ▶ payload=${JSON.stringify(input)}`);

  const start = Date.now();

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error(`[apify] ✗ status=${response.status} after ${elapsed}s`);
    console.error(`[apify] ✗ response body: ${body.slice(0, 500)}`);
    // Mensagens para a UI: sem nome do fornecedor/actor/variáveis (o detalhe
    // técnico completo fica no log acima). Os radares que procuram "401"/
    // "403"/"404" na mensagem continuam a funcionar.
    if (response.status === 401) {
      throw new Error(
        "Fonte automática: credencial inválida ou expirada (401). Verifique a configuração do servidor.",
      );
    }
    if (response.status === 402) {
      throw new Error("Fonte automática sem créditos disponíveis (402).");
    }
    if (response.status === 403) {
      throw new Error("Fonte automática: coletor desativado ou sem permissão (403).");
    }
    if (response.status === 404) {
      throw new Error(
        "Fonte automática: coletor não encontrado (404). Verifique a configuração do servidor.",
      );
    }
    if (response.status === 408 || response.status === 504) {
      throw new Error(
        `A fonte automática não terminou a coleta a tempo (${elapsed}s). Tente com menos resultados.`,
      );
    }
    throw new Error(`Fonte automática falhou (${response.status}) após ${elapsed}s.`);
  }

  const data = (await response.json().catch(() => null)) as unknown;
  if (!Array.isArray(data)) {
    // Resposta inesperada (objeto de erro em vez de lista) — nunca tratar
    // como "0 resultados" silencioso.
    const detail =
      data && typeof data === "object" && "error" in data
        ? JSON.stringify((data as { error: unknown }).error).slice(0, 300)
        : typeof data;
    console.error(`[apify] ✗ resposta não é uma lista: ${detail}`);
    throw new Error("A fonte automática devolveu uma resposta inválida.");
  }
  const items = data;
  const itemError = extractProviderItemError(items);
  if (itemError) {
    console.error(`[apify] ✗ dataset só com erro: ${itemError.slice(0, 300)}`);
    throw new Error(
      `A fonte automática recusou o pedido: ${publicProviderError(itemError).slice(0, 200)}`,
    );
  }
  console.log(`[apify] ✓ ${items.length} items in ${elapsed}s`);
  return items;
}
