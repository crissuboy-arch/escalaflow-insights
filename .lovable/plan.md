
## Objetivo

Reescrever a inteligência do módulo Escala para parar de gerar respostas genéricas. A IA passa a agir como uma agência de performance: lê prints reais, diagnostica oferta/funil/criativo, gera planos executáveis por placement, KPIs adaptados a país/nicho/ticket, plano de escala D1–D3 e um “Diagnóstico Completo” único.

A maior parte do trabalho é em **prompt engineering + schemas + UI de resultado**. A infraestrutura de upload, compressão, timeout e retry já está pronta e será mantida.

---

## 1. Novos schemas no servidor (`src/lib/scale.server.ts`)

Adicionar (sem quebrar os existentes — o `CampaignPlanSchema` ganha campos opcionais com default):

- `VisualDiagnosisSchema`
  - `strengths[]`, `weaknesses[]`, `reducesConversion[]`, `increasesTrust[]`
  - `headline`, `subheadline`, `cta`, `colors`, `contrast`, `informationOverload`, `socialProof`, `scarcity`, `bonuses`, `blockOrder`, `promiseClarity`, `designLevel` (`amador|intermediario|profissional`), `visualTrust`, `mobileLegibility`
  - `score` 0–10 + `scoreColor` (`green|yellow|red`)
- `OfferDiagnosisSchema`
  - `promiseLevel`, `mechanismStrength`, `transformationClarity`, `perceivedValue`, `perceivedRisk`, `viralPotential`, `cpmPotential`, `ctrPotential`, `saturationLevel`
  - `verdict` (`fraca|media|forte`), `urgencyLevel`, `conversionProbability`, `score` 0–10
- `CreativeRecommendationSchema` (substitui o array atual `creatives`, mantendo campos antigos por compat)
  - `format`, `placement` (`reels|feed|stories|youtube|tiktok|search|pmax`), `type` (`ugc|vsl|reels_viral|carrossel|imagem`)
  - `hook3s`, `patternBreak`, `script` (roteiro completo), `onScreenText`, `caption`, `cta`
  - `dominantEmotion`, `editStyle`, `pace`, `cuts`, `soundtrack`, `brollSuggestions[]`
  - `viralScore` 0–100, `conversionScore` 0–100
- `MetaPlanSchema` (estende o atual `meta`): `cbo` (boolean), `adsetsCount`, `creativesPerAdset`, `budgetDistribution`, `remarketing`, `lookalike`, `coldAudience`, `exclusions[]`, `idealFrequency`
- `GooglePlanSchema` (estende `google`): `search`, `pmax`, `youtube`, `shopping`, `display`, `buyingIntent`, `keywords[]`, `customAudiences[]`
- `InstagramPlanSchema` por placement: `feed`, `reels`, `stories` cada um com `{ creativeType, hook, duration, cta }`
- `ExpectedKpisSchema` (estende): `ctr`, `cpc`, `cpm`, `cpa`, `roas`, `cpmByCountry[]`, `nicheBenchmark`
- `ScalePlanByDaySchema`
  - `day1`: `{ objective, expectedMetrics, positiveSignals[], negativeSignals[] }`
  - `day2`: `{ whenPause[], whenScale[], whenSwapCreative[] }`
  - `day3`: `{ decisionRules[], budgetIncrease, duplication, horizontalScaling, verticalScaling }`
- `ScoreSetSchema`: `{ offer, creative, copy, funnel, page, scale }` cada um `{ value 0-100, color: green|yellow|red, reason }`
- `CriticalAlertsSchema`: `alerts[]`, `priorityImprovements[]`, `biggestBottleneck`, `nextSteps[]`
- `FullDiagnosisSchema` (saída do botão Diagnóstico Completo): combina `visual`, `offer`, `scores`, `criticalAlerts`, `strategicSummary`.

Atualizar `CampaignPlanSchema` para incluir:
```
visualDiagnosis: VisualDiagnosisSchema.optional()
offerDiagnosis: OfferDiagnosisSchema.optional()
scores: ScoreSetSchema.optional()
criticalAlerts: CriticalAlertsSchema.optional()
scaleByDay: ScalePlanByDaySchema.optional()
strategicSummary: z.string().optional()
```

Os campos antigos (`day1/day2/day3`, `creatives`, `expectedKpis`...) continuam preenchidos para retrocompat com `CampaignPlanResult` enquanto a UI evolui.

## 2. Novos prompts

- `PLAN_SYSTEM` reescrito para persona “media buyer sênior + copywriter + estrategista de funil + CRO + growth hacker”, com instrução explícita de NÃO usar respostas genéricas, sempre adaptar a país/nicho/ticket, e citar benchmarks reais (CPM BR baixo, US/UK/DE alto, etc.).
- Prompt do `aiCreateCampaignPlan` ampliado para cobrir todos os blocos novos (diagnóstico visual, oferta, scores, scaleByDay).
- Novo `aiFullDiagnosis(ctx)` retornando `FullDiagnosisSchema` — usa o `extractedContext` (Stage A) + briefing como entrada, sem reler imagens.
- `aiExtractCreativeContext` (Stage A) recebe instruções adicionais para mapear: cores dominantes, contraste, ordem dos blocos, prova social, bônus, escassez, legibilidade mobile (campos extras no `CreativeContextSchema`).
- KPIs: prompt instrui a IA a usar tabela mental de benchmark por país + nicho + ticket (infoproduto baixo/médio/alto) e devolver faixas com mínimo/médio/máximo.

## 3. Novo server function: `fullDiagnosis`

`src/lib/scale.functions.ts`:
```
export const fullDiagnosis = createServerFn(...)
  .inputValidator(... { projectId?, extractedContext?, imageDataUrls?, briefing })
  .handler(... → roda Stage A se necessário, depois aiFullDiagnosis, persiste em meta.scale.fullDiagnosis)
```
Salva no `projects.meta.scale.fullDiagnosis` e em `ai_history` (module=`escala`).

## 4. Memória estratégica (sem nova tabela)

Reusar `projects.meta.scale` que já existe. Estender com:
- `history.creatives[]`, `history.campaigns[]`, `history.metrics[]` (slice 20).
- A cada `createCampaignPlan`, `analyzeAdsPerformance` e `fullDiagnosis`, anexar entrada com `{ at, niche, country, audience, snapshot }`.
- Prompt do plano recebe `history` resumido em texto para a IA comparar evolução (“CTR subiu de X→Y”, “mudou de público frio para LAL”).

Nada novo no schema do banco; o `meta jsonb` já existe.

## 5. UI — `src/components/pipeline/scale/CampaignPlanResult.tsx`

Reorganizar em cards conforme a estrutura pedida:

```text
[Resumo Estratégico]
[Scores: oferta · criativo · copy · funil · página · escala]  ← chips verdes/amarelos/vermelhos
[Diagnóstico Visual]      [Diagnóstico da Oferta]
[Estratégia Meta Ads]     [Estratégia Google Ads]    [Estratégia Instagram (Feed/Reels/Stories)]
[Criativos Recomendados]  [Hooks]   [Ângulos de Copy]
[KPIs Esperados (por país/nicho)]
[Plano de Escala — Dia 1 / Dia 2 / Dia 3]
[Alertas Críticos]        [Melhorias Prioritárias]
```

Componentes novos pequenos:
- `ScoreChip` (valor + cor)
- `DiagnosisCard` (visual/oferta com bullets + score)
- `PlacementCard` (Feed/Reels/Stories/PMax/Search/YouTube)
- `CreativeCardAdvanced` (roteiro, hook 3s, score viral/conversão)
- `ScaleDayCard` (D1/D2/D3 com sinais positivos/negativos e regras)
- `AlertsCard` (críticos vs melhorias)

Tudo só renderiza se o campo correspondente existir no `plan` (retrocompat).

## 6. UI — Botão “Diagnóstico Completo”

Em `CampaignPlanForm.tsx`, adicionar segundo botão `Diagnóstico Completo` ao lado de “Criar Plano”. Fluxo:
1. Reusa Stage A (mesma cache de extração).
2. Chama `fullDiagnosis`.
3. Renderiza `<FullDiagnosisResult />` (novo) acima do `CampaignPlanResult`.

## 7. UX / Loading / Export

- Skeletons (`src/components/ui/skeleton.tsx` já existe) para cada card durante `busy`.
- Histórico de análises: nova sub-aba “Histórico” em `ScaleAnalyzer.tsx` lendo `meta.scale.plans` e `meta.scale.analyses`.
- Exportar PDF: usar `src/lib/playbook/pdf.ts` como referência → novo `src/lib/scale/pdf.ts` com `exportPlanToPdf(plan)`. Botão “Exportar PDF” no header do resultado.
- Responsividade: trocar grids fixos por `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` e revisar paddings dos cards.

## 8. Técnico (já existe — manter / pequenos ajustes)

- Upload, compressão, timeout 110s, retry 2x, fallback amigável já estão em `compressImage.ts` + `callGateway`. **Sem mudanças estruturais.**
- Adicionar logs `scale.fullDiagnosis.start/ok/timeout` no novo serverFn.
- Manter modelo `google/gemini-2.5-flash` para Stage A e diagnóstico; promover para `gemini-2.5-pro` apenas no `fullDiagnosis` quando ≤2 imagens (qualidade > velocidade aqui), com fallback automático para Flash em timeout.

## 9. Fora de escopo (não fazer agora)

- Nova tabela `scale_history` (a `meta jsonb` cobre o caso).
- Streaming SSE.
- Tradução automática de toda a UI.
- Integração direta com APIs de Meta/Google (a IA continua gerando o plano para o usuário executar).

## Arquivos afetados

- `src/lib/scale.server.ts` — novos schemas, prompts reescritos, `aiFullDiagnosis`, KPIs por país/nicho, persona media buyer.
- `src/lib/scale.functions.ts` — nova serverFn `fullDiagnosis`, persistência de histórico estendido.
- `src/components/pipeline/scale/CampaignPlanResult.tsx` — reorganização em cards + novos componentes.
- `src/components/pipeline/scale/CampaignPlanForm.tsx` — botão “Diagnóstico Completo”, skeletons.
- `src/components/pipeline/scale/FullDiagnosisResult.tsx` — novo.
- `src/components/pipeline/scale/ScoreChip.tsx`, `DiagnosisCard.tsx`, `PlacementCard.tsx`, `CreativeCardAdvanced.tsx`, `ScaleDayCard.tsx`, `AlertsCard.tsx` — novos componentes pequenos.
- `src/components/pipeline/ScaleAnalyzer.tsx` — nova aba “Histórico”, botão Exportar PDF.
- `src/lib/scale/pdf.ts` — novo, gera PDF do plano + diagnóstico.

## Critérios de aceite

- Gerar plano retorna estrutura nova com todos os cards (Visual, Oferta, Scores, Placements, Criativos avançados, KPIs por país, ScaleByDay, Alertas).
- Botão “Diagnóstico Completo” devolve análise consolidada apontando maior gargalo.
- Scores aparecem com cor (verde/amarelo/vermelho) coerente com o valor.
- KPIs variam quando troco país (BR vs US) e ticket.
- Histórico mostra planos/análises anteriores do projeto.
- Exportar PDF gera arquivo legível com o plano completo.
- Sem regressão: planos antigos salvos continuam renderizando.
