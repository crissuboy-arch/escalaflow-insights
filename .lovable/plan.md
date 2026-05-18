## Objetivo

1. Comparar lado a lado as versões salvas do plano da Escala — KPIs e o plano D1/D2/D3 — para enxergar evolução entre gerações.
2. Botão **Abrir estratégia** que reabre o projeto exatamente no ponto em que o usuário parou (mesma aba, mesma seção, mesmo resultado/diagnóstico carregado).

Hoje cada geração do plano já é empilhada em `projects.meta.scale.plans[]` (até 10 últimas), e `lastPlanInput`, `lastImages`, `lastExtractedContext`, `plan`, `fullDiagnosis` já são persistidos. A base existe; falta UI de comparação e um deep-link de retomada confiável.

---

## 1. Tela "Comparar versões" da Escala

### Onde
- Novo botão **Comparar versões** no header do `CampaignPlanResult` (aba Escala do projeto), ao lado de Exportar PDF.
- Abre um `Dialog` em tela cheia (`max-w-6xl`) com a comparação.

### Funcionamento
- Lê `meta.scale.plans` do projeto (já existe; ordenado do mais recente para o mais antigo, com `{ at, plan, input }`).
- Dois `Select` no topo: **Versão A** e **Versão B**, pré-selecionando as duas mais recentes; rótulo `"Versão N — DD/MM HH:mm"`.
- Layout em 2 colunas com seções espelhadas:
  - **KPIs**: CPM, CTR, CPC, CPA, ROAS, Frequência. Para cada métrica mostro valor A, valor B e o delta colorido (verde quando melhora, vermelho quando piora — considerando se a métrica é "quanto menor melhor" como CPA/CPM ou "quanto maior melhor" como ROAS/CTR).
  - **Plano D1 / D2 / D3**: três blocos, um por dia. Em cada bloco listo os campos do `ScaleDayCard` (objetivo, budget, estrutura CBO/ABO, criativos, ajustes), com diff visual: linhas iguais ficam normais, removidas em vermelho riscado, adicionadas em verde.
  - **Criativos & Alertas (resumo)**: contagem de criativos, principais hooks repetidos, gargalo crítico.
- Botão **Restaurar esta versão**: usa `updateProject` para gravar `meta.scale.plan = versão.plan` e `meta.scale.lastPlanInput = versão.input`, dispara toast e fecha o dialog — o `CampaignPlanResult` rehidrata pelo `meta` atualizado.
- Botão **Exportar comparação em PDF**: reaproveita `src/lib/scale/pdf.ts` chamando `exportElementToPdf` no nó do dialog.

### Diff helper
- Função pequena `diffLines(a: string[], b: string[])` em `src/lib/scale/diff.ts` usando set/multiset (sem dependência nova). Devolve `{ same, added, removed }` para alimentar a UI.

### Estado vazio
- Se houver menos de 2 versões, o dialog mostra `"Gere mais uma versão para começar a comparar"` + botão fechar.

---

## 2. Botão "Abrir estratégia" com retomada exata

### Persistir o ponto de parada
- Adicionar `meta.scale.lastView` salvo em autosave:
  ```
  lastView: { stage: "form" | "result" | "diagnosis", resultTab?: "plan" | "creatives" | "kpis" | "days" }
  ```
- `CampaignPlanForm` e `CampaignPlanResult` chamam `saveScaleDraft` (já existe) sempre que o usuário troca de aba/seção, atualizando `lastView`.

### Reabrir
- `EscalaTab` lê `meta.scale.lastView` na hidratação inicial e:
  - Se `stage === "result"` e há `meta.scale.plan` → renderiza direto o `CampaignPlanResult` com a aba salva ativa.
  - Se `stage === "diagnosis"` e há `meta.scale.fullDiagnosis` → renderiza `FullDiagnosisResult`.
  - Caso contrário → form, com inputs/prints rehidratados (já funciona).
- Pequeno banner discreto no topo: `"Retomando de onde você parou (atualizado em ...)"` com botão `Recomeçar` que reseta para o form sem apagar dados.

### Botão "Abrir estratégia" mais visível
- Já existe na lista `/projetos`. Adicionar também em:
  - `ScaledOffersPage` (ações da tabela): se o anúncio já tem projeto associado (via `source_ad_key` → match em `projects`), botão **Abrir estratégia** que navega para `/projetos/$id?tab=escala`; caso contrário, mantém **Modelar Estratégia**.
  - Header do projeto (`projetos.$id.tsx`): atalho rápido `Abrir estratégia` quando a aba ativa não é `escala` e existe `meta.scale.plan`.
  - Sidebar / dashboard: card "Continuar última estratégia" usa o projeto mais recente com `meta.scale.plan` e leva direto para `/projetos/$id?tab=escala`.

### Deep-link
- A rota `/projetos/$id` já aceita `?tab=escala`. Estender o `validateSearch` para aceitar opcionalmente `?view=form|result|diagnosis&resultTab=...` e o `EscalaTab` usa esse search param como override do `lastView`, garantindo que um link compartilhado abra exatamente a mesma visão.

---

## Arquivos afetados

- `src/lib/scale/diff.ts` (novo) — helper de diff de listas/strings.
- `src/components/pipeline/scale/PlanVersionsDialog.tsx` (novo) — UI de comparação.
- `src/components/pipeline/scale/CampaignPlanResult.tsx` — botão "Comparar versões", salvar `lastView.resultTab`.
- `src/components/pipeline/scale/CampaignPlanForm.tsx` — salvar `lastView.stage = "form"` no autosave.
- `src/components/pipeline/scale/FullDiagnosisResult.tsx` — salvar `lastView.stage = "diagnosis"`.
- `src/components/pipeline/ScaleAnalyzer.tsx` / `src/components/pipeline/project/EscalaTab.tsx` — hidratar `lastView`, banner "Retomando…", `Recomeçar`.
- `src/lib/scale.functions.ts` — aceitar `lastView` no schema do `saveScaleDraft` (sem migration; tudo em `meta` jsonb).
- `src/routes/_authenticated/projetos.$id.tsx` — `validateSearch` aceita `view`/`resultTab`; atalho "Abrir estratégia" no header.
- `src/routes/_authenticated/ofertas-escaladas.tsx` — botão condicional Abrir/Modelar estratégia (consulta `projects` por `source_ad_key` no carregamento).
- `src/routes/_authenticated/dashboard.tsx` — card "Continuar última estratégia".

## Banco
Nenhuma migration. Tudo persiste em `projects.meta.scale.{plans, lastPlanInput, lastView, plan, fullDiagnosis}` (já em uso).

## Critérios de aceite
- Gerar 2+ planos → abrir "Comparar versões" → KPIs com deltas coloridos e D1/D2/D3 com diff verde/vermelho.
- "Restaurar versão" troca o plano ativo sem perder histórico.
- Sair da aba Escala no meio de uma edição e voltar → abre exatamente na mesma seção/aba do resultado, com inputs e plano carregados.
- Clicar "Abrir estratégia" em `/projetos`, `/ofertas-escaladas` ou no header do projeto leva ao mesmo estado.
- Link `/projetos/:id?tab=escala&view=result&resultTab=days` abre direto na aba "Dias" do plano.