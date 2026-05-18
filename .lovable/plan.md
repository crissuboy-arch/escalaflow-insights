# Corrigir ZodError no diagnóstico de Escala

## Problema
Ao gerar a estratégia, o serverFn `createCampaignPlan` quebra com `ZodError`:
- `creativesAdvanced[*].cuts` veio como `number`, schema exige `string`.
- `scaleByDay.day2.whenPause | whenScale | whenSwapCreative` vieram como `string`, schema exige `string[]`.

Causa: a IA (Gemini/GPT) ocasionalmente devolve tipos próximos mas não idênticos ao JSON Schema. O Zod atual em `src/lib/scale.server.ts` é estrito demais, então o erro derruba toda a geração — mesmo com 90% do payload correto.

## Solução
Tornar o schema do plano tolerante via *preprocess helpers* reutilizáveis, sem mudar a UI nem a forma final dos dados consumidos pelos componentes.

### Helpers (em `scale.server.ts`)
```ts
const zStr = z.preprocess(
  (v) => (v == null ? "" : typeof v === "string" ? v : String(v)),
  z.string()
).default("");

const zStrArr = z.preprocess((v) => {
  if (Array.isArray(v)) return v.map((x) => (typeof x === "string" ? x : String(x ?? "")));
  if (v == null || v === "") return [];
  if (typeof v === "string") {
    // aceita "a; b; c", "a, b, c" ou linha única
    return v.split(/\r?\n|;|•|·/).map((s) => s.trim()).filter(Boolean);
  }
  return [String(v)];
}, z.array(z.string())).default([]);

const zNum = z.preprocess((v) => {
  if (typeof v === "number") return v;
  if (typeof v === "string") { const n = Number(v.replace(",", ".")); return Number.isFinite(n) ? n : 0; }
  return 0;
}, z.number()).default(0);
```

### Aplicação
Substituir nos campos sensíveis do `CampaignPlanSchema` (linhas ~100–230):
- Todos os `z.string().default("")` dentro de `creatives`, `creativesAdvanced`, `visualDiagnosis`, `offerDiagnosis`, `expectedKpis` → `zStr`.
- Todos os `z.array(z.string()).default([])` em `creativesAdvanced.brollSuggestions`, `scaleByDay.day1.positiveSignals|negativeSignals`, `scaleByDay.day2.*`, `scaleByDay.day3.decisionRules`, `criticalAlerts.alerts|priorityImprovements`, `copyAngles`, `hooks`, `warnings` → `zStrArr`.
- `viralScore`, `conversionScore`, `scores.*.value`, `visualDiagnosis.score`, `offerDiagnosis.score` → `zNum`.

Manter `z.object({...}).optional()` para grupos; só os campos primitivos trocam o validador.

### Arquivos tocados
- `src/lib/scale.server.ts` — adicionar helpers + trocar validadores primitivos no `CampaignPlanSchema`.

Sem alterações em UI, server functions, banco ou tipos exportados (`CampaignPlan` continua igual em runtime; o tipo inferido permanece compatível pois os helpers resolvem para `string` / `string[]` / `number`).

## Verificação
- Build (typecheck automático do harness).
- Recarregar `/escala`, regenerar plano → não deve mais lançar ZodError mesmo se a IA devolver `cuts: 3` ou `whenScale: "regra única"`.
