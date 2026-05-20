// src/lib/integrations/apify/client.ts

const BASE = "https://api.apify.com/v2";
const MAX_TIMEOUT_SEC = 120;

function getToken(): string {
  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error("APIFY_TOKEN não configurado.");
  return token;
}

export async function runApifyActor(actorId: string, input: any) {
  const token = getToken();
  const response = await fetch(`${BASE}/acts/${actorId}/runs?token=${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error("Falha ao executar Apify Actor");
  return await response.json();
}

export async function runSyncGetDatasetItems<T = any>(
  actorId: string,
  input: any,
  timeoutSec = MAX_TIMEOUT_SEC,
): Promise<T[]> {
  const token = getToken();
  const url = `${BASE}/acts/${actorId}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}&timeout=${timeoutSec}`;
  console.log(`[apify] starting sync run: actor=${actorId}, timeout=${timeoutSec}s`);
  const start = Date.now();
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    console.error(`[apify] sync run FAILED after ${elapsed}s: ${response.status}`);
    throw new Error(`Apify sync run failed (${response.status}) after ${elapsed}s: ${text.slice(0, 300)}`);
  }
  const data = (await response.json()) as unknown;
  const items = Array.isArray(data) ? data : [];
  console.log(`[apify] sync run COMPLETE: ${items.length} items in ${elapsed}s`);
  return items;
}
