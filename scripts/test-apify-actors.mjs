// Teste de baixo custo para cada actor Apify configurado no .env local.
// Uso: node scripts/test-apify-actors.mjs [nome-do-actor]
//   sem argumento -> roda todos, na ordem: trends, tiktok, instagram, youtube, facebook, ecommerce
//   com argumento -> roda só aquele (ex: node scripts/test-apify-actors.mjs tiktok)
import dotenv from "dotenv";
dotenv.config();

const BASE = process.env.APIFY_BASE_URL?.trim() || "https://api.apify.com/v2";
const TOKEN = process.env.APIFY_TOKEN?.trim();

function normalizeActorId(id) {
  return id.replace(/\//g, "~");
}

async function runActor(label, actorEnvVar, fallbackActor, payload, timeoutSec = 90) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`▶ ${label}`);
  const actorId = process.env[actorEnvVar]?.trim() || fallbackActor;
  if (!actorId) {
    console.log(`  ❌ SKIP — ${actorEnvVar} não configurado e sem fallback.`);
    return { label, ok: false, reason: "actor não configurado" };
  }
  const safeId = normalizeActorId(actorId);
  console.log(`  actor: ${actorId} (${safeId})`);
  console.log(`  payload: ${JSON.stringify(payload)}`);

  if (!TOKEN) {
    console.log(`  ❌ SKIP — APIFY_TOKEN não configurado no .env local.`);
    return { label, ok: false, reason: "sem token" };
  }

  const url = `${BASE}/acts/${safeId}/run-sync-get-dataset-items?token=${encodeURIComponent(TOKEN)}&timeout=${timeoutSec}`;
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    const runId = res.headers.get("x-apify-run-id") || res.headers.get("apify-run-id") || null;

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.log(`  ❌ HTTP ${res.status} após ${elapsed}s`);
      console.log(`  body: ${body.slice(0, 400)}`);
      return { label, ok: false, status: res.status, elapsed, reason: body.slice(0, 200) };
    }

    const data = await res.json();
    const items = Array.isArray(data) ? data : [];
    console.log(`  ✅ HTTP ${res.status} em ${elapsed}s — ${items.length} item(ns) retornado(s)`);
    if (runId) console.log(`  run_id: ${runId} (verifique custo exato em https://console.apify.com/actors/runs/${runId})`);
    if (items[0]) {
      console.log(`  sample keys: ${Object.keys(items[0]).slice(0, 15).join(", ")}`);
    }
    return { label, ok: true, status: res.status, elapsed, count: items.length, runId };
  } catch (err) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`  ❌ ERRO após ${elapsed}s: ${err.message}`);
    return { label, ok: false, reason: err.message, elapsed };
  }
}

const TESTS = {
  trends: () =>
    runActor("Google Trends", "APIFY_GOOGLE_TRENDS_ACTOR", "apify~google-trends-scraper", {
      searchTerms: ["emagrecimento"],
      geo: "BR",
      timeRange: "today 1-m",
      maxItems: 1,
    }),
  tiktok: () =>
    runActor("TikTok", "APIFY_TIKTOK_ACTOR", "clockworks~tiktok-scraper", {
      hashtags: ["emagrecimento"],
      resultsPerPage: 3,
      proxyCountryCode: "None",
      excludePinnedPosts: false,
      scrapeRelatedVideos: false,
    }),
  instagram: () =>
    runActor("Instagram", "APIFY_INSTAGRAM_ACTOR", "apify~instagram-scraper", {
      directUrls: ["https://www.instagram.com/explore/tags/emagrecimento/"],
      resultsType: "posts",
      resultsLimit: 3,
    }),
  youtube: () =>
    runActor("YouTube", "APIFY_YOUTUBE_ACTOR", "streamers~youtube-scraper", {
      searchKeywords: "emagrecimento",
      maxResults: 3,
    }),
  facebook: () =>
    runActor("Facebook Ad Library", "APIFY_META_ADS_ACTOR", "curious_coder~facebook-ads-library-scraper", {
      urls: [
        {
          url: "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=BR&q=emagrecimento&search_type=keyword_unordered",
        },
      ],
      count: 3,
      "scrapePageAds.activeStatus": "active",
      scrapeAdDetails: true,
      scrapeAdvertiserPage: false,
    }),
  ecommerce: () =>
    runActor("E-commerce", "APIFY_ECOMMERCE_ACTOR", "", {
      startUrls: [{ url: "https://www.amazon.com.br/s?k=emagrecimento" }],
      maxItems: 3,
    }),
};

async function main() {
  const arg = process.argv[2];
  const order = arg ? [arg] : ["trends", "tiktok", "instagram", "youtube", "facebook", "ecommerce"];

  console.log("=== TESTE DE BAIXO CUSTO — APIFY ACTORS ===");
  console.log(`Token presente: ${TOKEN ? "sim (" + TOKEN.slice(0, 8) + "...)" : "NÃO — configure APIFY_TOKEN no .env"}`);

  const results = [];
  for (const name of order) {
    const fn = TESTS[name];
    if (!fn) {
      console.log(`\n❌ Teste desconhecido: "${name}". Opções: ${Object.keys(TESTS).join(", ")}`);
      continue;
    }
    results.push(await fn());
  }

  console.log(`\n${"═".repeat(60)}`);
  console.log("RESUMO");
  console.log("═".repeat(60));
  for (const r of results) {
    console.log(
      `${r.ok ? "✅" : "❌"} ${r.label.padEnd(22)} ${r.ok ? `${r.count} itens em ${r.elapsed}s` : r.reason ?? "falhou"}`,
    );
  }
}

main();
