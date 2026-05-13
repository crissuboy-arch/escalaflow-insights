## Fase 2 — Hubs funcionais (integração real)

Não criar telas novas, não mudar visual, não inventar módulos. Foco em ligar tudo que já existe ao fluxo do projeto, com persistência e fallback de uso avulso.

### 1. Padronizar todos os hubs como `DualModeHub`

Hoje só `/copy` usa `DualModeHub`. `/criativos`, `/pagina-venda`, `/checkout` e `/escala` ainda usam `PipelineHub` puro (só lista projetos, sem modo avulso) — por isso parecem "mockados" e morrem no estado vazio.

Trocar cada hub para `DualModeHub` reaproveitando os componentes que já existem:

- `/criativos` → standalone = `<CreativeWizard />` (já implementado, modo `standalone` no briefing).
- `/pagina-venda` → standalone = novo wrapper fino que reusa `StandaloneBriefingForm` + `generateSalesPage({ kind:"standalone", briefing })` + `<SalesPageResult />`.
- `/checkout` → standalone = formulário avulso reusando `CheckoutTab` (sem `projectId`) que apenas exibe os campos e oferece "Salvar em projeto" (cria projeto novo on-demand).
- `/escala` → standalone = checklist genérico apontando o usuário para criar projeto (não há "escala avulsa" real).

### 2. Estado vazio cria projeto automaticamente

`PipelineHub` hoje aponta para `/projetos` quando não há projeto. Mudar para:

- Botão "Criar projeto e abrir [aba]" → navega `to: "/projetos", search: { novo: 1, tab }`.
- `projetos.tsx`: ler `?novo=1` no `validateSearch`, abrir o card "Criar do Zero" expandido (ou disparar `startScratch` direto se houver `tab`), e após `createProject` redirecionar para `/projetos/$id?tab=<tab>`.
- Adicionar `Link` to `/projetos?novo=1&tab=<tab>` no empty state do `PipelineHub` em vez do link genérico.

### 3. Modo duplo real em cada módulo

- `CopyTab`, `SalesPageTab`, `CreativesTab`, `CheckoutTab` já aceitam `projectId` + `initial` — usar como modo "ligado".
- Modo "avulso" usa as MESMAS server fns com `kind: "standalone"` + briefing inline; resultado fica em estado local com botão **"Salvar em projeto"** que chama `createProject({ source:"scratch" })` e em seguida `updateProject({ patch:{ meta:{ <key>: data } } })`.

### 4. Playbook real (sem mock)

- Verificar e garantir que `/produtos/playbook/$id` não tenha branches mockados; toda renderização vem de `loadPlaybook`.
- Garantir loading real (`<Loader2 />`), salvar via `savePlaybook`, "Continuar geração" reusa `generatePlaybookSceneContent` por cena faltante, exportar via `playbook/pdf.ts` e `playbook/docx.ts` já existentes.
- Strategy: já usa `generatePlaybookStrategy` server-side — confirmar que botão "Regenerar estratégia" persiste o resultado.

### 5. Integração entre módulos

- Em `generateProjectEbook` (já existe): após gerar, gravar `meta.copy_seed`, `meta.creatives_seed`, `meta.salesPage_seed` com briefing/outline para que `CopyTab`/`SalesPageTab`/`CreativesTab` usem como input default na primeira geração.
- Em `createProject` com `source:"ad"`: já popula briefing — adicionar também `meta.fromAd = { headline, copy, cta, advertiser }` para alimentar criativos/copy/página.
- Não disparar gerações automáticas em cascata (custo) — apenas pré-popular inputs.

### 6. Criativos via Mago Criativo

`CreativeWizard` já é o engine. Garantir que `CreativesTab` (modo projeto) também usa o mesmo wizard (selecionar plataforma → objetivo → formato → gerar com briefing do projeto) e salva cada criativo em `meta.creatives[]` via `updateProject`. Botões: gerar, gerar variações, copiar headline/CTA/prompt visual, remover.

### 7. Erro `virtual:tanstack-start-client-entry`

Investigar o log do dev-server (`sqlite3 /tmp/sandbox-state.db ...`) para identificar o módulo culpado. Causas comuns nesta base:
- import de `*.server.ts` chegando ao client via cadeia transitiva.
- `useServerFn` dentro de hub novo importando módulo errado.

Ação: rodar `bun run build` (via harness automático) e corrigir o leaf reportado. Não tocar lockfile/cache manualmente.

### 8. Persistência e retomada

- `updateProject` já faz merge profundo de `meta` — usar consistentemente em todos os tabs (já feito em CopyTab/SalesPageTab/CheckoutTab/CreativesTab).
- `loadProject` hidrata `meta` → cada tab recebe `initial` → usuário continua de onde parou.
- Adicionar autosave debounced no `CheckoutTab` (já tem botão Salvar — manter, opcional).

### 9. Garantias finais

- Nenhum botão sem `onClick`/`Link`.
- Nenhum tab com "Em construção".
- `PipelineHub`: adicionar tratamento de erro real (toast + retry) em vez de `.catch(() => setRows([]))` silencioso.

### 10. Fora de escopo

Sem novos módulos, sem novo visual, sem novos formatos. Apenas integração + persistência + correções.

---

### Detalhes técnicos

**Arquivos a editar:**
- `src/components/PipelineHub.tsx` — tratar erro com toast + botão retry; trocar empty state para link `?novo=1&tab=...`.
- `src/components/pipeline/DualModeHub.tsx` — sem alterações estruturais.
- `src/routes/_authenticated/criativos.tsx`, `pagina-venda.tsx`, `checkout.tsx`, `escala.tsx` — converter para `DualModeHub` com componente standalone.
- `src/routes/_authenticated/projetos.tsx` — `validateSearch({ novo, tab })`, auto-abrir criação ao carregar com `?novo=1`, redirecionar com `?tab=` após criar.
- `src/lib/project.functions.ts` — em `createProject`, popular `meta.fromAd` quando aplicável; em `generateProjectEbook`, semear `meta.*_seed`.
- `src/components/pipeline/project/CreativesTab.tsx` — confirmar uso do `CreativeWizard` interno; se hoje for form simplificado, embutir wizard.
- `src/routes/_authenticated/produtos.playbook.$id.tsx` — auditar para remover qualquer branch mock/placeholder (ler arquivo completo na execução).

**Componentes standalone novos (finos, sem nova UI):**
- `src/components/pipeline/StandaloneSalesPage.tsx`
- `src/components/pipeline/StandaloneCheckout.tsx`
- `src/components/pipeline/StandaloneEscala.tsx` (texto + CTA criar projeto)

**Validação:**
- Build do harness deve passar (`tsc --noEmit` + vite build).
- Smoke manual via `browser--navigate_to_sandbox` em `/criativos`, `/pagina-venda`, `/checkout`, `/escala` (modo projeto vazio + modo avulso).

### Entregável final

Lista no fim da execução:
- Integrado: hubs migrados, fluxo `?novo=1`, modo duplo, semeação cross-módulo, persistência.
- Falta: itens não cobertos (ex: autosave global, regeneração inteligente).
- 100% operacionais: módulos confirmados ponta-a-ponta.
