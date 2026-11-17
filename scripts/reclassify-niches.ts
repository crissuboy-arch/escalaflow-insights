/**
 * Reclassifica o nicho de collected_ads com o classificador partilhado.
 *
 * PADRÃO = DRY RUN (nada é escrito na base de dados).
 *
 *   # a partir de um ficheiro exportado (recomendado):
 *   node --experimental-strip-types scripts/reclassify-niches.ts --input rows.json --out report.json
 *   npx tsx scripts/reclassify-niches.ts --input rows.json --out report.csv
 *
 *   # a partir do Supabase (só SELECT), com SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY no ambiente:
 *   node --experimental-strip-types scripts/reclassify-niches.ts --out report.json
 *
 *   # aplicar (só com AMBOS: a flag --apply E CONFIRM_RECLASSIFY=yes):
 *   CONFIRM_RECLASSIFY=yes node --experimental-strip-types scripts/reclassify-niches.ts --apply --out report.json
 *
 * Entrada --input: array JSON de linhas com id, a|advertiser, h|headline, c|copy,
 * k|keyword, n|niche, g|tags (array ou "a, b"), u|landing_page_url (opcional).
 */
import { readFileSync, writeFileSync } from "node:fs";
import {
  NICHE_LABEL,
  classifyNiche,
  storedNicheLabel,
  type NicheId,
} from "../src/lib/niche/classifier.ts";
import { KEYWORD_CATEGORIES, inferTagsFromText } from "../src/lib/mining/keywords.ts";

// ── Lógica ANTIGA (main) do detectNiche, só para comparação ─────────────────
const LEGACY_WORDS: [NicheId, string[]][] = [
  [
    "saude",
    [
      "emagrec",
      "peso",
      "dieta",
      "saúde",
      "saude",
      "gordura",
      "diabet",
      "dor ",
      "dores",
      "articula",
      "pressão",
      "suplement",
      "colágeno",
      "colageno",
      "detox",
      "barriga",
      "jejum",
      "nutri",
      "weight",
      "fat ",
      "health",
      "pérdida de peso",
      "adelgaz",
      "glp",
      "ozempic",
      "keto",
      "fitness",
      "treino",
      "academia",
      "próstata",
      "prostata",
      "visão",
      "ansiedade",
      "sono",
    ],
  ],
  [
    "renda",
    [
      "renda",
      "dinheiro",
      "ganhar",
      "lucro",
      "faturar",
      "fatura",
      "invest",
      "finan",
      "cripto",
      "bitcoin",
      "trader",
      "trade",
      "bolsa",
      "afiliad",
      "money",
      "income",
      "dinero",
      "ingresos",
      "negócio",
      "negocio",
      "empreend",
      "vender",
      "vendas",
      "home office",
      "trabalhar de casa",
    ],
  ],
  [
    "beleza",
    [
      "beleza",
      "pele",
      "cabelo",
      "rugas",
      "maquiag",
      "unha",
      "estética",
      "estetica",
      "skincare",
      "skin",
      "hair",
      "cílios",
      "sobrancelha",
      "manchas",
      "belleza",
      "cabello",
      "perfume",
    ],
  ],
  [
    "relacionamento",
    [
      "relacionamento",
      "namor",
      "casamento",
      "conquist",
      "ex ",
      "amor",
      "sedução",
      "seducao",
      "marido",
      "esposa",
      "dating",
      "relationship",
      "pareja",
      "reconquist",
    ],
  ],
  [
    "educacao",
    [
      "curso",
      "aula",
      "aprenda",
      "aprender",
      "concurso",
      "enem",
      "inglês",
      "ingles",
      "idioma",
      "certificado",
      "faculdade",
      "estudo",
      "estudar",
      "professor",
      "course",
      "learn",
      "mentoria",
      "treinamento",
      "workshop",
      "masterclass",
      "ebook",
      "e-book",
      "apostila",
    ],
  ],
  [
    "desenvolvimento",
    [
      "mentalidade",
      "hábito",
      "habito",
      "produtiv",
      "autoestima",
      "foco",
      "disciplina",
      "propósito",
      "proposito",
      "lei da atração",
      "manifest",
      "coach",
      "motivação",
      "inteligência emocional",
    ],
  ],
  [
    "religioso",
    [
      "deus",
      "jesus",
      "bíblia",
      "biblia",
      "oração",
      "oracao",
      "fé ",
      "igreja",
      "cristão",
      "cristao",
      "devocional",
      "salmo",
      "espiritual",
      "god",
      "prayer",
      "bible",
      "oración",
    ],
  ],
  [
    "infantil",
    [
      "criança",
      "crianca",
      "filho",
      "bebê",
      "bebe",
      "mãe",
      "mae ",
      "maternidade",
      "infantil",
      "colorir",
      "atividades",
      "alfabetiza",
      "kids",
      "baby",
      "niños",
      "figurinha",
    ],
  ],
  [
    "produtos",
    [
      "frete",
      "compre",
      "loja",
      "promoção",
      "promocao",
      "desconto",
      "oferta imperdível",
      "kit ",
      "unidades",
      "shop",
      "envio",
      "entrega",
      "garanta o seu",
      "estoque",
      "pague na entrega",
    ],
  ],
  [
    "marketing",
    [
      "marketing",
      "tráfego",
      "trafego",
      "instagram",
      "tiktok",
      "seguidores",
      "anúncio",
      "anuncio",
      "copy",
      "lançamento",
      "lancamento",
      "infoproduto",
      "chatgpt",
      " ia ",
      "inteligência artificial",
      "inteligencia artificial",
      "automação",
      "automacao",
      "saas",
      "app ",
      "site",
      "landing",
      "social media",
    ],
  ],
];

function legacyDetectNiche(text: string, declaredNiche?: string | null): NicheId {
  const hay = ` ${text.toLowerCase()} ${(declaredNiche ?? "").toLowerCase()} `;
  let best: NicheId = "outros";
  let bestHits = 0;
  for (const [id, words] of LEGACY_WORDS) {
    let hits = 0;
    for (const w of words) if (hay.includes(w)) hits++;
    if (hits > bestHits) {
      bestHits = hits;
      best = id;
    }
  }
  return best;
}

// ── Args / entrada ──────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const arg = (name: string) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};
const inputPath = arg("--input");
const outPath = arg("--out");
const wantApply = argv.includes("--apply");
const confirmed = process.env.CONFIRM_RECLASSIFY === "yes";
const BATCH = Number(arg("--batch") ?? 50);

interface Row {
  id: string;
  advertiser: string;
  headline: string;
  copy: string;
  keyword: string | null;
  niche: string | null;
  landingPageUrl: string | null;
  tags: string[];
}

function str(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}
function tagsOf(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(str).filter(Boolean);
  if (typeof v === "string")
    return v
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  return [];
}
function fromLoose(o: Record<string, unknown>): Row {
  const enriched = (o.enriched ?? (o.raw as Record<string, unknown> | undefined)?.enriched) as
    Record<string, unknown> | undefined;
  return {
    id: str(o.id),
    advertiser: str(o.a ?? o.advertiser),
    headline: str(o.h ?? o.headline),
    copy: str(o.c ?? o.copy),
    keyword: str(o.k ?? o.keyword) || null,
    niche: str(o.n ?? o.niche) || null,
    landingPageUrl: str(o.u ?? o.landing_page_url) || null,
    tags: tagsOf(o.g ?? o.tags ?? enriched?.tags),
  };
}

// Tags que não vêm do etiquetador de texto (padrões do lote) — preservadas.
const PATTERN_TAGS = new Set([
  "VSL",
  "VSL escalando",
  "Hook repetido",
  "Padrão de copy",
  "Estrutura viral",
]);

function newTagsFor(r: Row): { tags: string[]; subniche: string | null } {
  const inferred = inferTagsFromText(`${r.headline}\n${r.copy}`);
  const kept = r.tags.filter((t) => PATTERN_TAGS.has(t));
  return {
    tags: Array.from(new Set([...inferred.tags, ...kept])),
    subniche: inferred.categories[0] ? KEYWORD_CATEGORIES[inferred.categories[0]].label : null,
  };
}

async function supabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Sem --input: defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente.");
  }
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function loadRows(): Promise<Row[]> {
  if (inputPath) {
    const data = JSON.parse(readFileSync(inputPath, "utf8"));
    if (!Array.isArray(data)) throw new Error("--input tem de ser um array JSON");
    return data.map((o) => fromLoose(o as Record<string, unknown>));
  }
  const sb = await supabaseClient();
  const rows: Row[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb
      .from("collected_ads")
      .select(
        "id, advertiser, headline, copy, keyword, niche, landing_page_url, enriched:raw->enriched",
      )
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []).map((o) => fromLoose(o as Record<string, unknown>)));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const rows = await loadRows();
  const results = rows.map((r) => {
    const oldGroup = legacyDetectNiche(
      `${r.headline} ${r.copy} ${r.tags.join(" ")} ${r.keyword ?? ""}`,
      r.niche,
    );
    const res = classifyNiche({
      headline: r.headline,
      copy: r.copy,
      advertiser: r.advertiser,
      landingPageUrl: r.landingPageUrl,
      keyword: r.keyword,
      declaredNiche: r.niche,
      tags: r.tags,
    });
    const nt = newTagsFor(r);
    return {
      id: r.id,
      advertiser: r.advertiser,
      headline: r.headline.slice(0, 120),
      keyword: r.keyword,
      oldStoredNiche: r.niche,
      oldGroup,
      newGroup: res.niche,
      newStoredNiche: storedNicheLabel(res.niche),
      score: res.score,
      matched: res.matched,
      oldTags: r.tags,
      newTags: nt.tags,
      newSubniche: nt.subniche,
    };
  });

  const count = (key: "oldGroup" | "newGroup") => {
    const m: Record<string, number> = {};
    for (const x of results) m[NICHE_LABEL[x[key]]] = (m[NICHE_LABEL[x[key]]] ?? 0) + 1;
    return Object.fromEntries(Object.entries(m).sort((a, b) => b[1] - a[1]));
  };
  const changed = results.filter((x) => x.oldGroup !== x.newGroup);
  const trans: Record<string, number> = {};
  for (const x of changed) {
    const k = `${NICHE_LABEL[x.oldGroup]} → ${NICHE_LABEL[x.newGroup]}`;
    trans[k] = (trans[k] ?? 0) + 1;
  }
  const topTransitions = Object.entries(trans)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);
  const storedChanges = results.filter((x) => (x.oldStoredNiche ?? "") !== x.newStoredNiche).length;
  const tagChanges = results.filter(
    (x) => JSON.stringify(x.oldTags) !== JSON.stringify(x.newTags),
  ).length;

  // Amostra determinística: 25 linhas que mudam, espalhadas pela lista.
  const pool = changed.length ? changed : results;
  const step = Math.max(1, Math.floor(pool.length / 25));
  const samples = pool.filter((_, i) => i % step === 0).slice(0, 25);

  const summary = {
    mode: wantApply && confirmed ? "APPLY" : "DRY RUN",
    rowsTotal: results.length,
    displayedNicheChanges: changed.length,
    storedNicheChanges: storedChanges,
    tagChanges,
    distributionOld: count("oldGroup"),
    distributionNew: count("newGroup"),
    topTransitions,
  };

  console.log(JSON.stringify(summary, null, 2));
  console.log("\n── 25 amostras ──");
  for (const s of samples) {
    console.log(
      `[${s.id}] ${s.advertiser} | ${s.headline}\n    ${NICHE_LABEL[s.oldGroup]} → ${NICHE_LABEL[s.newGroup]} (score ${s.score}; ${s.matched.join(", ") || "—"})`,
    );
  }

  if (outPath) {
    if (outPath.endsWith(".csv")) {
      const esc = (v: unknown) =>
        `"${str(Array.isArray(v) ? v.join("|") : v).replace(/"/g, '""')}"`;
      const cols = [
        "id",
        "advertiser",
        "headline",
        "keyword",
        "oldStoredNiche",
        "oldGroup",
        "newGroup",
        "newStoredNiche",
        "score",
        "matched",
        "oldTags",
        "newTags",
      ] as const;
      const lines = [cols.join(","), ...results.map((r) => cols.map((c) => esc(r[c])).join(","))];
      writeFileSync(outPath, lines.join("\n"));
    } else {
      writeFileSync(outPath, JSON.stringify({ summary, samples, rows: results }, null, 2));
    }
    console.log(`\nRelatório escrito em ${outPath}`);
  }

  if (!wantApply) {
    console.log(
      "\nDRY RUN — nada foi escrito. Use --apply com CONFIRM_RECLASSIFY=yes para aplicar.",
    );
    return;
  }
  if (!confirmed) {
    console.log(
      "\n--apply ignorado: defina CONFIRM_RECLASSIFY=yes para confirmar. Nada foi escrito.",
    );
    return;
  }
  if (inputPath) {
    console.log(
      "\nAVISO: a aplicar a partir de --input; os ids do ficheiro serão atualizados no Supabase.",
    );
  }

  const toUpdate = results.filter(
    (x) =>
      (x.oldStoredNiche ?? "") !== x.newStoredNiche ||
      JSON.stringify(x.oldTags) !== JSON.stringify(x.newTags),
  );
  console.log(
    `\nAPPLY: vai atualizar ${toUpdate.length} linhas em collected_ads (niche + raw.enriched.tags/subniche), em lotes de ${BATCH}.`,
  );
  const sb = await supabaseClient();
  let ok = 0;
  let failed = 0;
  for (let i = 0; i < toUpdate.length; i += BATCH) {
    const batch = toUpdate.slice(i, i + BATCH);
    const { data: raws, error } = await sb
      .from("collected_ads")
      .select("id, raw")
      .in(
        "id",
        batch.map((b) => b.id),
      );
    if (error) throw new Error(error.message);
    const rawById = new Map(
      (raws ?? []).map((r) => [r.id as string, (r.raw ?? {}) as Record<string, unknown>]),
    );
    await Promise.all(
      batch.map(async (b) => {
        const raw = rawById.get(b.id) ?? {};
        const enriched = {
          ...((raw.enriched as Record<string, unknown>) ?? {}),
          tags: b.newTags,
          subniche: b.newSubniche,
        };
        const { error: e } = await sb
          .from("collected_ads")
          .update({ niche: b.newStoredNiche, raw: { ...raw, enriched } })
          .eq("id", b.id);
        if (e) {
          failed++;
          console.error(`  ✗ ${b.id}: ${e.message}`);
        } else ok++;
      }),
    );
    console.log(
      `  lote ${i / BATCH + 1}: ${Math.min(i + BATCH, toUpdate.length)}/${toUpdate.length}`,
    );
  }
  console.log(`\nAPPLY concluído: ${ok} atualizadas, ${failed} falharam.`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
