// src/lib/integrations/apify/client.ts

const APIFY_TOKEN = process.env.APIFY_TOKEN;

export async function runApifyActor(actorId: string, input: any) {
  if (!APIFY_TOKEN) throw new Error("APIFY_TOKEN não configurado.");

  const response = await fetch(`https://api.apify.com/v2/acts/${actorId}/runs?token=${APIFY_TOKEN}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) throw new Error("Falha ao executar Apify Actor");
  
  return await response.json();
}
