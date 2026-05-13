# Plano: fluxo, estado e navegação entre módulos

Foco: fazer o que já existe **funcionar de verdade** nos dois modos (Novo / Projeto Existente). Sem novas telas, sem mudar design.

---

## 1. Modo "Selecionar Projeto Existente" funcionando em todos os módulos

Hoje `DualModeHub` (modo `project`) renderiza `PipelineHub` que lista projetos e abre `/projetos/$id?tab=...`. Falhas:

- Em **Ebook** e **Playbook** o hub dual nem é usado — as rotas `/produtos.ebook` e `/produtos.playbook` só listam itens, sem opção "abrir num projeto existente".
- Em **Copy / Criativos / Página / Checkout / Escala**, o clique no card do projeto navega, mas:
  - `projetos.$id.tsx` recebe `?tab=` mas só hidrata `briefing/outline/meta`; não dispara fetch incremental do histórico IA nem dos assets vinculados (ebook/playbook).
  - Tabs `CopyTab`, `CreativesTab`, `SalesPageTab`, `CheckoutTab`, `EscalaTab` dependem de `project.meta[chave]` mas, quando o usuário entra direto via `?tab=criativos`, o `useState` inicial fica nulo e o componente trata como "ainda não gerado" mesmo havendo dado em `meta`.

Ações:

1. `DualModeHub` (modo project): ao clicar num card, além de navegar, pré-fetch `loadProject` via `react-query` cache (ou simples `router.preloadRoute`) para abrir já hidratado.
2. `projetos.$id.tsx`:
   - No `refresh()`, sempre passar `meta.copy / meta.salesPage / meta.creatives / meta.checkout / meta.scale` como `initial` para cada `*Tab`.
   - Garantir que mudar `?tab=` por URL aciona render da aba correta (já há `useEffect`; validar com a lista TABS atual).
3. Criar `EbookHubDual` e `PlaybookHubDual` reutilizando `DualModeHub`:
   - Modo "novo" = comportamento atual (`/produtos/ebook` listagem + criar).
   - Modo "projeto" = lista projetos e ao clicar abre `/projetos/$id?tab=ebook` (ou `playbook`). Já existem essas tabs no workspace.
4. Renomear/expor entradas no `AppSidebar` para "Criar Ebook" e "Criar Playbook" abrirem o hub dual.

## 2. Botões mortos / módulos que não abrem

Auditoria + correções pontuais:

- **Playbook / Ebook**: links no dashboard apontam para `/produtos/ebook` e `/produtos/playbook`; verificar `to=` com strings exatas declaradas no `routeTree.gen.ts`.
- **Criativos / Escala**: rotas existem (`/criativos`, `/escala`) — confirmar links do sidebar e dashboard.
- **Oferta Minerada**: cards em `/ofertas-salvas` hoje vão para `/analise-ia?ad=...`. Trocar para fluxo do item 3.

Para cada botão suspeito: garantir `Link to="..."` válido (sem template strings em `to`), e nada de `<a href>` para rota interna.

## 3. Fluxo Oferta Minerada → Projeto

Hoje termina em `/analise-ia`. Novo fluxo:

```text
ofertas-salvas → "Usar esta oferta"
  → modal de confirmação (nicho / promessa pré-preenchidos do análise IA)
  → server fn createProjectFromOffer({ offerId })
       cria projects row com briefing seedado
       (title, niche, promise, avatar, pains, desires, mechanism)
  → navigate /projetos/$id?tab=briefing
```

Implementação:

- Nova server fn `createProjectFromOffer` em `src/lib/project.functions.ts` usando `getAnalysisForOffer` + `getOfferById` (já existem).
- Botão "Usar como projeto" no card de `/ofertas-salvas` e em `/oferta/$id`.
- O briefing já alimenta automaticamente os outros módulos via `meta.copy` etc. (ações geradas sob demanda nas tabs).

## 4. Escala IA real (substituir checklist superficial)

Tab `EscalaTab` no workspace passa a ter:

- Upload de screenshot do Facebook Ads (storage bucket `ads-metrics`, criar via migration).
- Campos manuais: CTR, CPC, CPM, ROAS, frequência, gasto, dias rodando.
- Textarea "colar resultados".
- Botão "Analisar com IA" → server fn `analyzeAdsPerformance` (Gemini 2.5 Pro com vision para o screenshot).
- Output estruturado (Zod): diagnóstico, criativo vencedor, ângulo vencedor, fadiga, recomendação de escala (2x/manter/cortar), próximos testes.
- Persistir em `projects.meta.scale.analyses[]` + `ai_history`.

`StandaloneEscala` (modo standalone) ganha o mesmo formulário, sem persistência por projeto (só `ai_history`).

## 5. Links externos (Facebook / ChatGPT / Gemini)

Já existe `openExternal` em `src/lib/external/openExternal.ts` (usa `window.open` + fallback toast). Migrar TODOS os pontos que ainda usam `<a target="_blank">` ou `window.location` direto para `openExternal()`:

- `/link-externo`
- Cards de oferta (links Meta Ads Library)
- Botões "Abrir no ChatGPT" / "Abrir no Gemini" nos resultados de Copy, Página e Criativos (passam o prompt via clipboard antes de abrir).

## 6. Modo duplo confirmado em todos os módulos

Tabela final (verificar pós-fix):

| Módulo | Standalone | Projeto |
|---|---|---|
| Ebook | listagem `/produtos/ebook` | tab `ebook` |
| Playbook | listagem `/produtos/playbook` | tab `playbook` |
| Copy | `StandaloneBriefingForm` | `CopyTab` |
| Criativos | `CreativeWizard` | `CreativesTab` |
| Página | `StandaloneSalesPage` | `SalesPageTab` |
| Checkout | `StandaloneCheckout` | `CheckoutTab` |
| Escala | `StandaloneEscala` (com IA nova) | `EscalaTab` (com IA nova) |

## 7. Detalhes técnicos

- Nova server fn `createProjectFromOffer` (em `src/lib/project.functions.ts`).
- Nova server fn `analyzeAdsPerformance` (em novo arquivo `src/lib/scale.functions.ts` + `scale.server.ts`, Gemini 2.5 Pro multimodal).
- Migration: bucket `ads-metrics` (privado, RLS por user_id no path).
- Sem mudanças de schema em `projects` — usar `meta.scale.analyses` (array de objetos).
- Sem mudanças de design — só substituir conteúdo dos componentes existentes.

## 8. Verificação final

Após implementar, rodar manualmente (browser tools):

1. Sidebar: cada item abre rota correta.
2. Cada módulo: alternar Modo Novo ↔ Projeto.
3. Ofertas Salvas → Usar oferta → projeto criado → tabs hidratadas.
4. Escala: upload screenshot → análise IA retorna JSON.
5. Links externos: Meta Ads Library, ChatGPT, Gemini abrem (com fallback toast).
6. Build limpo.

---

**Não inclui**: novas telas, mudanças de design, novos módulos. Apenas conserto de fluxo, hidratação e integração.
