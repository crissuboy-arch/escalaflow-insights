
# Internacionalização do módulo Escala do Produto

Escopo restrito: **somente** o módulo Escala. Sem mexer em menu, rotas vizinhas, mineração, radar, ebook, playbook, copy, criativos, página ou checkout. Mantém os fluxos atuais (Plano · Métricas · Próximos passos) e a persistência em `projects.meta.scale`.

## 1. Catálogo internacional (`src/lib/scale/i18n.ts` — novo)

Arquivo único, pequeno, para alimentar os selects e o prompt.

- `COUNTRIES`: lista com `{ code, name, flag (emoji), region, defaultCurrency }` cobrindo BR, PT, ES, GB, FR, DE, IT, NL, IE, MX, US, CA, AR, CL, CO, PE, UY, JP, AU, NZ, IN, AE, SA, ZA (e ~10 outros principais).
- `CURRENCIES`: `{ code, symbol, name }` para BRL, EUR, USD, GBP, MXN, CAD, JPY, AUD, ARS, CLP, COP, INR, AED, ZAR, etc.
- `REGION_PRESETS`: `Brasil`, `América Latina`, `Europa`, `EUA + Canadá`, `Global` → arrays de country codes.
- `PLATFORM_CATALOG`: árvore agrupada
  - Meta Ads → Facebook Feed, Instagram Feed, Reels, Stories, Audience Network
  - Google Ads → Pesquisa, Display, YouTube, Performance Max, Shopping
  - TikTok Ads → Feed, Spark Ads
  - Kwai Ads, Pinterest Ads, LinkedIn Ads (flat)

## 2. Selects internacionais (componentes novos em `src/components/pipeline/scale/`)

- `CountryMultiSelect.tsx` — Popover + Command (`cmdk` já presente via shadcn) com:
  - busca por nome
  - chips com bandeira + nome dos selecionados
  - botões de preset regional acima da lista
  - "Selecionar todos" / "Limpar"
- `CurrencySelect.tsx` — Select shadcn com `code · símbolo · nome`. Auto-sugere a moeda do primeiro país escolhido (se o usuário ainda não trocou manualmente).
- `PlatformPicker.tsx` — grupos colapsáveis (Meta / Google / TikTok / Outros) com checkbox por placement; resultado é `string[]` no formato `"Meta · Reels"`, `"Google · YouTube"`, etc., para o prompt consumir sem ambiguidade. Tooltips curtos explicando cada placement.

Tudo usa tokens do design system (sem cores cruas).

## 3. Form do plano (`CampaignPlanForm.tsx`)

Substituir os 3 campos atuais:
- "Países" (texto livre) → `<CountryMultiSelect>`
- "Moeda" (input) → `<CurrencySelect>`
- Botões `[Meta][Google][Instagram]` → `<PlatformPicker>`

Estado passa de strings/CSV para `countryCodes: string[]`, `currency: string`, `platforms: string[]` (placements).
Preço continua input; ao lado mostra badge com o símbolo da moeda atual.

## 4. Backend (`src/lib/scale.server.ts`)

Ajustes mínimos, sem quebrar contratos atuais:

- `CampaignPlanContext`: trocar `countries?: string[]` por `countryCodes?: string[]` **e** `countryNames?: string[]` (derivado no client). Adicionar `currency`, `currencySymbol`, `platforms` (placements), `region?: string` (preset escolhido, se houver).
- Acrescentar bloco de instruções internacionais ao prompt de `aiCreateCampaignPlan`:
  - "Adapte idioma e tom da copy ao(s) país(es) primário(s); se múltiplos, gere copy no idioma do mercado dominante e cite variações para os demais."
  - "Use SEMPRE a moeda informada (`${currency} ${symbol}`) em orçamentos, CPA, CPC, CPM, ROAS; faixas devem refletir CPMs realistas da região (BR baixo, US/UK/DE altos, JP médio etc)."
  - "Detalhe estrutura por placement quando o usuário escolher Reels/Stories/PMax/YouTube/Spark Ads/etc."
  - "Para presets multi-país (Europa, LATAM, Global), gere estrutura com 1 campanha por cluster e explique segmentação."
- Mesmas instruções repetidas (versão curta) em `aiNextTests` e `aiScalePlan` para manter consistência de moeda/idioma quando essas saídas forem geradas depois.
- Schemas (`CampaignPlanSchema`, etc.) ficam compatíveis: campos textuais já aceitam qualquer string. Adicionar campo opcional `localization: { language: string, currency: string, marketNotes: string }.default({})` em `CampaignPlanSchema` para a IA devolver explicitamente o que adaptou — renderizado num bloco novo em `CampaignPlanResult`.

## 5. Render do resultado (`CampaignPlanResult.tsx`)

- Mostrar chips de país (bandeira + nome) e badge da moeda no topo.
- Novo bloco "Adaptação internacional" usando `localization` (idioma, moeda, notas por mercado). Esconde se vazio.
- Restante inalterado.

## 6. Persistência

Salvar em `projects.meta.scale.plan` o objeto completo (já inclui agora os campos internacionais). Nada de migração — `meta` é JSONB.
Standalone: o `localStorage` `escalaflow.scale.standalone.v1` passa a guardar também `countryCodes/currency/platforms` para sobreviver reload.

## 7. Fora de escopo

- Não alterar análise de métricas existente (só herda moeda do plano se houver, via prop opcional — sem mudar UI).
- Não tocar sidebar, rotas, outros módulos, schema do banco.
- Sem novas dependências (usa `cmdk`/Popover/Command já instalados pelo shadcn).

## Arquivos tocados

Novos:
- `src/lib/scale/i18n.ts`
- `src/components/pipeline/scale/CountryMultiSelect.tsx`
- `src/components/pipeline/scale/CurrencySelect.tsx`
- `src/components/pipeline/scale/PlatformPicker.tsx`

Editados (cirúrgico):
- `src/components/pipeline/scale/CampaignPlanForm.tsx` — usar os 3 novos selects.
- `src/components/pipeline/scale/CampaignPlanResult.tsx` — chips de país/moeda + bloco `localization`.
- `src/lib/scale.server.ts` — contexto + prompt + campo `localization` no schema.
- `src/lib/scale.functions.ts` — repassar os novos campos do contexto (sem mudar assinatura pública além de aceitar os novos opcionais).

