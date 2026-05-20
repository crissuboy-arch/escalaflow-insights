
# Automação Agentiva — Flow / EscalaFlow

Camada nova **dentro** da arquitetura atual. Nada existente é removido, renomeado ou simplificado. Sidebar, rotas, identidade visual, módulos (Ebook, Playbook, Copy, Página, Criativos, Checkout, Escala) permanecem **idênticos**.

## Fase 1 — Persistência real dos projetos (prioridade absoluta)

Hoje `projects` já tem `id, title, niche, mode, status, step, briefing, outline, meta, cover_url, created_at, updated_at`. Faltam campos estratégicos pedidos: país, idioma, tipo de produto, e tabelas-irmãs para histórico/timeline/scores.

### Migração (aditiva, sem dropar nada)

```sql
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS language text DEFAULT 'pt',
  ADD COLUMN IF NOT EXISTS product_type text,
  ADD COLUMN IF NOT EXISTS last_opened_at timestamptz;

-- Tabelas-irmãs (cada uma com RLS user_id = auth.uid())
CREATE TABLE project_outputs (
  id uuid PK, project_id uuid, user_id uuid,
  agent text,        -- 'minerador'|'analista'|'campanha'|'conteudo'|'escala'|'operacional'
  kind text,         -- 'analysis'|'campaign'|'content'|'plan'|'report'
  payload jsonb,     -- resposta da IA
  status text,       -- 'pending'|'processing'|'done'|'error'
  error text,
  created_at, updated_at
);

CREATE TABLE project_tasks (
  id, project_id, user_id, title, description,
  status text,       -- 'todo'|'doing'|'done'|'blocked'
  due_at, order_index, created_at, updated_at
);

CREATE TABLE project_timeline (
  id, project_id, user_id,
  event_type text,   -- 'created'|'agent_run'|'score'|'task_done'|'note'
  ref_id uuid,       -- aponta para output/task/score
  summary text, payload jsonb, created_at
);

CREATE TABLE project_campaigns (
  id, project_id, user_id, platform text, -- 'meta'|'google'|'instagram'
  name, audiences jsonb, angles jsonb, headlines jsonb,
  ad_copies jsonb, creatives jsonb, status, created_at, updated_at
);

CREATE TABLE project_assets (
  id, project_id, user_id, kind text,    -- 'image'|'video'|'doc'|'link'
  url text, meta jsonb, created_at
);

CREATE TABLE project_scores (
  id, project_id, user_id, dimension text, -- 'oferta'|'copy'|'criativo'|'funil'|'escala'
  value int, strengths jsonb, weaknesses jsonb, fixes jsonb, next_action text,
  created_at
);
```
Todas com RLS `auth.uid() = user_id` (select/insert/update/delete) + admins via `has_role`. `ai_history` existente continua sendo o log bruto da IA.

### Server functions novas (`src/lib/projects/`)
- `agents.functions.ts` — `runAgent({ projectId, agent, input })`, `regenerateOutput({ outputId })`, `listOutputs({ projectId })`.
- `tasks.functions.ts` — CRUD de `project_tasks`.
- `timeline.functions.ts` — `listTimeline({ projectId })`, `pushTimeline()` (interno).
- `scores.functions.ts` — `computeScores({ projectId })` e `listScores`.
- `projects.functions.ts` — estende `updateProject` para suportar `country|language|product_type|last_opened_at`; adiciona `touchProject({ id })` chamado no mount da rota para “continuar de onde parou”.

Autosave já existe (hook `useAutosave`); reaproveitar nos novos campos.

## Fase 2 — Agentes especializados

Cada agente é um prompt-template no servidor que chama Lovable AI Gateway (`google/gemini-2.5-pro` para reasoning, `gemini-2.5-flash` para listas/checklists), valida com Zod, persiste em `project_outputs`, registra em `project_timeline` e `ai_history`.

Arquivos: `src/lib/agents/<agent>.server.ts` + reexportados em `agents.functions.ts`.

1. **Minerador** — entrada: links/prints/descrições/anúncios da oferta. Saída: `{ competitors[], hooks[], creatives[], offers[], vsls[], summary }`.
2. **Analista** — usa briefing + outputs do Minerador. Saída: `{ promise, audience, mainPain, mechanism, cta, funnel, creativeNotes, copyNotes, page, offerStrength, overallScore }`.
3. **Campanha** — gera campanhas Meta/Google/Instagram → grava em `project_campaigns`: `{ audiences, angles, headlines[], adCopies[], creatives[] }`.
4. **Conteúdo** — calendário 14d + hooks virais + reels/stories/carrosséis adaptados por país/idioma.
5. **Escala** — planos D3/D7/D14, KPIs, orçamento, gatilhos de pause/test/scale. Reaproveita `scale.server.ts` existente para parsing/normalização.
6. **Operacional** — gera `project_tasks` (checklist), atualiza timeline, produz “Relatório Final” consolidando tudo.

Cada execução escreve um evento em `project_timeline` para a aba histórico/timeline.

### Sistema de Scores
`computeScores` chama o Analista em modo `scores-only` e grava 5 linhas em `project_scores` (Oferta, Copy, Criativo, Funil, Escala). Cada uma com `value`, `strengths`, `weaknesses`, `fixes`, `next_action`.

## Fase 3 — UX dentro do projeto

Adicionar **uma nova aba** “Automação Agentiva” em `src/routes/_authenticated/projetos.$id.tsx` (entre “escala” e “exportar”) — abas existentes intactas.

Componente novo `src/components/agents/AgentDeck.tsx` com 7 cards:
- Minerar Mercado · Analisar Oferta · Criar Campanha · Criar Conteúdo · Plano de Escala · Criar Tarefas · Relatório Final

Cada card (`AgentCard.tsx`):
- ícone + título + descrição curta
- badge de status (`pendente`/`processando`/`concluído`/`erro`) ligado ao último `project_outputs` do agente
- botões: **Executar**, **Regenerar**, **Copiar**, **Editar**, **Ver detalhes** (abre Drawer com payload)
- mostra resumo em 2 linhas do output mais recente

Painéis auxiliares (mesma aba, abaixo do deck):
- **Scores** — 5 medidores (componente `ScoreRing` reutilizando tokens do design-system) com expand para forte/fraco/corrigir/próxima ação.
- **Timeline** — feed de `project_timeline`.
- **Tarefas** — lista editável de `project_tasks` com drag reorder + status.

Header do projeto ganha:
- botão **Continuar Projeto** (vai para a última aba/etapa registrada em `meta.lastView` — infra já existe via `EscalaTab`, estender para todas as abas).
- botões **Duplicar** e **Excluir** (server-fns `duplicateProject`/`deleteProject` já existem; expor no header).
- botão **Abrir Projeto** já é o card na lista `/projetos`.

Lista `/projetos`: cards ganham `Abrir`, `Continuar` (usa `last_opened_at`), `Editar`, `Duplicar`, `Excluir`.

## Fase 4 — Conectores “coming soon”

`src/lib/connectors/registry.ts` declara Apify, Canva, Notion, Stripe, Gmail com `status: "coming_soon"`. UI em `Configurações → Integrações` mostra cada um como card desabilitado com badge “Em breve”. Nenhuma chamada externa nova.

## Identidade visual

Tudo dentro do design system atual (tokens em `src/styles.css`, shadcn/ui, Tabs, Card, Badge). Nenhum hex hardcoded. Cards do AgentDeck usam o mesmo padrão visual das abas Escala/Copy.

## Estrutura técnica (detalhes)

```
src/
  lib/
    agents/
      minerador.server.ts
      analista.server.ts
      campanha.server.ts
      conteudo.server.ts
      escala.server.ts        (wrapper sobre scale.server.ts)
      operacional.server.ts
      shared.server.ts        (gateway, schemas, recordOutput, pushTimeline)
    projects/
      agents.functions.ts
      tasks.functions.ts
      timeline.functions.ts
      scores.functions.ts
    connectors/registry.ts
  components/
    agents/
      AgentDeck.tsx
      AgentCard.tsx
      AgentResultDrawer.tsx
      ScoreRing.tsx
      ProjectTimeline.tsx
      ProjectTasks.tsx
    project/ProjectHeaderActions.tsx   (Continuar/Duplicar/Excluir)
  routes/_authenticated/
    projetos.$id.tsx           (apenas adiciona aba "agentes")
    projetos.tsx               (apenas adiciona botões nos cards)
    configuracoes.tsx          (adiciona seção "Integrações coming soon")
```

## Ordem de implementação

1. Migração SQL aditiva + tipos.
2. Server fns: tasks/timeline/scores/agents (com o `runAgent` chamando primeiro o Analista como prova de conceito).
3. UI: aba “Automação Agentiva” + AgentDeck + Scores + Timeline + Tasks.
4. Header actions (Continuar / Duplicar / Excluir) na rota do projeto e na lista.
5. Restantes dos agentes (Minerador, Campanha, Conteúdo, Escala-wrapper, Operacional, Relatório Final).
6. Conectores “coming soon”.
7. Verificação via build + abrir um projeto real e rodar cada agente.

## Não-objetivos (explícitos)
- Não alterar Ebook/Playbook/Copy/Página/Checkout/Escala existentes além de **ler** seus dados para os agentes.
- Não trocar Tabs/Sidebar/tema.
- Não integrar Apify/Canva/Notion/Stripe/Gmail nesta entrega.
