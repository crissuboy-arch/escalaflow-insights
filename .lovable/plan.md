# Fase 3 — Inteligência Contínua e Persistência Global

Objetivo: transformar a esteira em um sistema único onde cada módulo alimenta os outros, tudo salva sozinho, nada se perde, e o produto deixa de parecer "Lovable" para virar EscalaFlow.

Escopo restrito: integração, persistência, automação. **Sem novos módulos, sem novo visual.**

---

## 1. Semeadura cross-módulo (server-side)

Centralizar em `src/lib/project/seeding.server.ts` uma função `seedFromModule(projectId, module, payload)` que monta o patch correto em `meta.*_seed` e chama `updateProject` com merge profundo.

Gatilhos (todos em `*.functions.ts` server-side, dentro do `.handler`):

- `generateProjectEbook` → semeia `copy_seed`, `salesPage_seed`, `creative_seed`, `checkout_seed`, `scale_seed` (título, promessa, avatar, dores, mecanismo, capítulos-chave).
- `generateSalesCopy` (kind=project) → semeia `creative_seed.headlines/hooks` + `salesPage_seed.copyBlocks`.
- `generateCreative` → push em `meta.creatives_history[]` + atualiza `creative_seed.bestHeadlines`.
- `generateSalesPage` → semeia `checkout_seed` (preço, bônus, garantia, CTA).
- `generatePlaybookStrategy` → semeia `copy_seed.strategy` e `creative_seed.angles`.

Regra: semear **apenas inputs default**, nunca disparar geração em cascata (custo).

---

## 2. Botão universal "Salvar em Projeto"

Componente reutilizável `src/components/pipeline/SaveToProjectButton.tsx`:

- Props: `kind` (`copy|salesPage|creative|checkout|escala|ebook|playbook`), `payload`, `prompts?`.
- Abre `Dialog` com:
  - Select de projetos existentes (`listProjects`).
  - Opção "Criar novo projeto" (chama `createProject({ source:"scratch", title })`).
- Ao confirmar: `updateProject({ id, patch:{ meta:{ [kind]: payload, [`${kind}_history`]: [...prev, entry] } } })` + toast + Link "Abrir projeto".

Inserir o botão em **todas as telas standalone**: `StandaloneSalesPage`, `StandaloneCheckout`, `StandaloneEscala`, `CreativeWizard` (modo standalone), `CopyResult`, `EbookHub` (modo avulso).

---

## 3. Autosave global

Hook `src/hooks/useAutosave.ts`:

```ts
useAutosave({ key, data, save, debounceMs: 1500, enabled })
```

- Debounce + dirty check (compara hash JSON).
- Persistência dupla: `localStorage` (key `autosave:<key>`) + chamada server (`save`).
- Indicador visual via callback `onStatus("saving"|"saved"|"error")`.

Hook complementar `useDraftRecovery({ key, onRecover })`:
- Na montagem, se `localStorage` tem rascunho mais novo que server, mostra toast "Restaurar rascunho não salvo?" com ação.

Aplicar em:
- `CopyTab`, `SalesPageTab`, `CheckoutTab`, `CreativesTab`, `EscalaTab` (project mode).
- `StandaloneCheckout`, `StandaloneSalesPage`, `StandaloneBriefingForm`.
- Editor de Playbook (`produtos.playbook.$id.editar.tsx`).
- Editor de Ebook (`EbookHub`).

Indicador único no `AppHeader`: ponto verde "Salvo" / amarelo "Salvando…" / vermelho "Falha — repetir" via context global `AutosaveProvider`.

---

## 4. Histórico IA por projeto

Migração Supabase — nova tabela:

```sql
create table public.ai_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  project_id uuid references public.projects(id) on delete cascade,
  module text not null,        -- copy|salesPage|creative|checkout|escala|ebook|playbook
  prompt jsonb not null,
  response jsonb not null,
  model text,
  version int not null default 1,
  created_at timestamptz not null default now()
);
alter table public.ai_history enable row level security;
-- policies: select/insert/delete own
create index ai_history_project_idx on public.ai_history(project_id, module, created_at desc);
```

Helper server `src/lib/ai/history.server.ts`:
- `recordAi({ projectId, module, prompt, response, model })`.
- `listAiHistory({ projectId, module? })`.

Chamar `recordAi` ao final de cada server fn de geração (copy, criativos, página, ebook, playbook strategy/scene).

UI: aba "Histórico IA" no workspace do projeto (`projetos.$id.tsx`):
- Lista cronológica com filtro por módulo.
- Ações: **Reutilizar** (preenche o input do módulo), **Duplicar** (clona como nova versão), **Continuar geração** (envia ao server fn correspondente), **Exportar JSON**.

---

## 5. Auditoria final do Playbook

Checklist de execução em `produtos.playbook.$id.tsx`, `.editar.tsx`, `.novo.tsx`:
- Remover qualquer branch que renderize dados sintéticos sem `loadPlaybook`.
- Garantir `<Loader2>` real enquanto carrega; erro com retry.
- Salvar via `savePlaybook` (autosave + manual).
- "Continuar geração" reusa `generatePlaybookSceneContent` por cena faltante.
- Exportar PDF/DOCX (já existem) testar com playbook real.
- Recarregar (F5) restaura estado idêntico.

---

## 6. Links externos seguros

Criar `src/lib/external/openExternal.ts`:

```ts
export function openExternal(url: string, fallbackLabel?: string) {
  const w = window.open(url, "_blank", "noopener,noreferrer");
  if (!w || w.closed) {
    // popup bloqueado → toast com link clicável
    toast("Popup bloqueado", { action: { label: fallbackLabel ?? "Abrir", onClick: () => location.assign(url) } });
  }
}
```

Aplicar em todos os botões que apontam para Facebook Ad Library, ChatGPT, Google AI Studio, v0, Claude (procurar `target="_blank"` em `CopyResult`, `SalesPageResult`, `CreativeCard`, `OfferCard`, `oferta.$id.tsx`, `link-externo.tsx`).

Garantir `rel="noopener noreferrer"` em todos os `<a target="_blank">`.

---

## 7. Hardening Supabase (auth, roles, isolation)

Migração:

```sql
-- enum já existe? garantir admin/user
do $$ begin
  if not exists (select 1 from pg_type where typname='app_role') then
    create type public.app_role as enum ('admin','user');
  end if;
end $$;

-- has_role já existe (ver schema)
-- adicionar policy admin-bypass em projects/ebooks/playbooks
create policy "admins read all projects" on public.projects
  for select to authenticated using (public.has_role(auth.uid(),'admin'));
-- idem update/delete admin para projects, ebooks, playbooks, ai_history
```

Auditoria de RLS (já OK em `projects`, `ebooks`, `playbooks`, `profiles`, `user_roles`, `saved_offers`, `ai_analyses`, `user_ad_actions`). Confirmar:
- Nenhuma server fn usa `supabaseAdmin` para CRUD de usuário comum (usar `requireSupabaseAuth`).
- Prompts globais (catálogos em `src/lib/ads/catalog.ts`, `storybook/catalog.ts`) ficam em código — não editáveis pelo usuário.

UI:
- Esconder rotas admin (se houver) atrás de `has_role('admin')` checado via server fn `getMyRole`.
- Bloquear edição de `project.user_id` no client (já garantido por RLS).

---

## 8. Remover identidade Lovable / branding EscalaFlow

- `index.html`: trocar `<title>`, meta description, og:image, favicon (`/favicon.ico` próprio).
- `src/routes/__root.tsx`: head() com title/description EscalaFlow; remover qualquer `gpteng.co` / referências Lovable visíveis ao usuário (script `cdn.gpteng.co` é injetado pelo runtime — não tocar no script tag, mas remover badges/footers visuais).
- Loading screen em `_authenticated.tsx`: trocar spinner genérico por logo EscalaFlow + cor da marca.
- Conferir `public/` por assets default (placeholder.svg, robots.txt, og-image).
- Manifest PWA (se existir) atualizado.

Pedir ao usuário: cor primária + logo (PNG/SVG). Default temporário: paleta atual + texto "EscalaFlow".

---

## 9. Performance

- Lazy load de rotas pesadas via `createFileRoute` + dynamic import nos componentes de export (PDF/DOCX — `pdf-lib`, `docx`, `epub`): já estão em `*.server.ts`, validar que não vazam pro client (regras `tanstack-supabase-import-graph`).
- Imagens com `loading="lazy"` em `OfferCard`, `CreativeCard`, capas de ebook/playbook.
- Code-split do `CreativeWizard`, `EbookHub`, `EscalaTab`.
- Rodar `bun run build` e checar bundle (alerta se >500KB por chunk).
- Validar hydration sem warning.

---

## 10. Pré-deploy

- `tsc --noEmit` + build verde.
- Smoke manual: criar projeto → ebook → copy → criativos → página → checkout → escala → exportar tudo → fechar aba → reabrir → estado intacto.
- Verificar `cloud_status` ACTIVE_HEALTHY.

---

## Ordem de execução

1. Migração `ai_history` + admin policies (aprovação do usuário).
2. `seeding.server.ts` + gatilhos cross-módulo.
3. `useAutosave` + `AutosaveProvider` + aplicar nos tabs.
4. `SaveToProjectButton` + integrar nos standalones.
5. `recordAi` em todas server fns + aba Histórico IA no workspace.
6. Auditoria Playbook.
7. `openExternal` + sweep de links.
8. Branding EscalaFlow (após user enviar logo/cor).
9. Performance pass + build final.

---

## Arquivos novos

- `src/lib/project/seeding.server.ts`
- `src/lib/ai/history.server.ts`, `src/lib/ai/history.functions.ts`
- `src/hooks/useAutosave.ts`, `src/hooks/useDraftRecovery.ts`
- `src/providers/AutosaveProvider.tsx`
- `src/components/pipeline/SaveToProjectButton.tsx`
- `src/components/project/AiHistoryTab.tsx`
- `src/lib/external/openExternal.ts`
- Migração SQL: `ai_history` + admin policies.

## Arquivos editados

- Todos os `*Tab.tsx` (project), `Standalone*.tsx`, `EbookHub.tsx`, `produtos.playbook.*.tsx`.
- Server fns de geração (copy, sales-page, ads-creative, ebook, playbook) → adicionar `recordAi` + `seedFromModule`.
- `__root.tsx`, `index.html`, `_authenticated.tsx` para branding.
- `AppHeader.tsx` para indicador autosave global.

## Entregável final

Ao concluir, lista:
- **100% operacionais**: módulos validados ponta-a-ponta com semeadura, autosave, histórico, save-to-project.
- **Parciais**: o que ficou para próxima rodada.
- **Dependências Supabase pendentes**: migrations a aprovar, secrets a configurar.
- **Pronto para deploy**: checklist verde (build, smoke, RLS, branding).

---

## Pergunta antes de começar

Para o item 8 (branding) preciso de:
- **Cor primária** (hex ou oklch).
- **Logo** (PNG/SVG transparente) — ou autorizo gerar uma temporária com IA?
- **Nome final** confirmado: "EscalaFlow"?

Se preferir, executo 1–7 e 9 primeiro e deixo branding (8) por último quando você enviar os assets.