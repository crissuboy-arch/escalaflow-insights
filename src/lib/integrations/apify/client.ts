// src/lib/integrations/apify/client.ts

const BASE = "https://api.apify.com/v2";
const MAX_TIMEOUT_SEC = 120;

function getToken(): string {
  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error("APIFY_TOKEN não configurado.");
  return token;
}

/** Mask token for safe logging: show first 8 chars only. */
function maskToken(token: string): string {
  return token.slice(0, 8) + "…(masked)";
}

export async function runApifyActor(actorId: string, input: any) {
  const token = getToken();
  console.log(`[apify] ▶ runApifyActor actor=${actorId}`);
  const response = await fetch(`${BASE}/acts/${actorId}/runs?token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    if (response.status === 403) throw new Error(`Apify: actor "${actorId}" desativado ou sem permissão (403).`);
    if (response.status === 401) throw new Error(`Apify: token inválido (401). Verifique APIFY_TOKEN.`);
    throw new Error(`Apify Actor falhou (${response.status}): ${body.slice(0, 200)}`);
  }
  return await response.json();
}

export async function runSyncGetDatasetItems<T = any>(
  actorId: string,
  input: any,
  timeoutSec = MAX_TIMEOUT_SEC,
): Promise<T[]> {
  const token = getToken();

  const url =
    `${BASE}/acts/${actorId}/run-sync-get-dataset-items` +
    `?token=${encodeURIComponent(token)}&timeout=${timeoutSec}`;

  // Log for debugging — token masked, full URL visible
  const safeUrl =
    `${BASE}/acts/${actorId}/run-sync-get-dataset-items` +
    `?token=${maskToken(token)}&timeout=${timeoutSec}`;

  console.log(`[apify] ▶ actor=${actorId}`);
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
    if (response.status === 401) {
      throw new Error(`Apify: token inválido ou expirado (401). Verifique APIFY_TOKEN no .env.`);
    }
    if (response.status === 403) {
      throw new Error(`Apify: actor desativado ou sem permissão (403). Verifique o actor "${actorId}" no .env.`);
    }
    if (response.status === 404) {
      throw new Error(`Apify: actor "${actorId}" não encontrado (404). Verifique o nome no .env.`);
    }
    throw new Error(
      `Apify sync run failed (${response.status}) after ${elapsed}s: ${body.slice(0, 300)}`,
    );
  }

  const data = (await response.json()) as unknown;
  const items = Array.isArray(data) ? data : [];
  console.log(`[apify] ✓ ${items.length} items in ${elapsed}s`);
  return items;
}
