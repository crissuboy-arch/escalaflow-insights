## Escopo

Finalizar 3 módulos comerciais + gating admin + esconder badge Lovable. Branding (favicon/logo/header) já está EscalaFlow — apenas conferir rodapé.

---

## 1. Página de Venda (`/pagina-venda` + tab no projeto)

**Standalone — adicionar seletor de modo no topo:**
- "Selecionar projeto existente" (Select com lista de `projects` do usuário) → roda `generateSalesPage({ kind: "project", projectId })`
- "Criar produto avulso" → mantém `StandaloneBriefingForm` atual
- Mesma tela de resultado para ambos

**Em `sales-page.server.ts → buildExternalPrompts`:**
- Renomear/expor 3 prompts solicitados: `googleAiStudio`, `lovable`, `html` (HTML puro autocontido com Tailwind CDN)
- Manter `v0` e `claude` como extras

**`SalesPageResult.tsx`:**
- Trocar a aba/cards de prompts para mostrar os 3 oficiais (Google AI Studio · Lovable · HTML) com botão "Copiar"
- Adicionar botão **Exportar DOCX** (novo `src/lib/sales-page/docx.ts` usando lib `docx` já presente, mesmo padrão de `playbook/docx.ts`) com todas as dobras (Hero, Lead, Dor, Mecanismo, Benefícios, Objeções, Depoimentos, Oferta, Bônus, Garantia, FAQ, CTA, Estrutura visual)

---

## 2. Checkout & Oferta (`/checkout` + tab no projeto)

Hoje é só formulário manual. Adicionar geração IA real.

**Novo `src/lib/checkout.server.ts` + `checkout.functions.ts`:**
- `generateCheckoutOffer({ kind: "project"|"standalone", ... })` → IA Lovable Gateway (`google/gemini-3-flash-preview`)
- Schema retornado: `{ oferta, stack: string[], bonus: [{nome, valorPercebido, descricao}], garantia, orderBump, upsell, downsell, anchoring: {de, por, justificativa}, urgencia, cta, kiwify, hotmart, stripe }` onde os 3 últimos são blocos de descrição/bullets prontos para colar nos campos de cada plataforma.
- Salva em `meta.checkout` (modo project) e em `ai_history`.

**UI `StandaloneCheckout.tsx` e `CheckoutTab.tsx`:**
- Botão "Gerar oferta com IA" no topo (em standalone usa `StandaloneBriefingForm`; em project usa dados do projeto)
- Exibe resultado em cards: Oferta · Stack de valor · Bônus · Garantia · Order bump · Upsell · Downsell · Ancoragem · Urgência · CTA
- Sub-abas Kiwify · Hotmart · Stripe com texto pronto + botão Copiar
- Mantém formulário manual (campos preço/link) abaixo, prefilled com a oferta gerada

---

## 3. Escala do Produto (`/escala` + tab no projeto)

Hoje é checklist estático. Adicionar plano gerado por IA.

**Novo `src/lib/escala.server.ts` + `escala.functions.ts`:**
- `generateScalePlan({ kind, ... })` → schema:
  ```
  {
    planoConteudo: { semana1, semana2, semana3, semana4 } com 5 posts/dia tipados,
    anuncios: [{ angulo, headline, copy, formato, cta }] (5–8),
    canais: { organico, pago, tiktok, instagram, shorts, whatsapp, email },
    recorrencia: { ideias: string[], oferta: string },
    assinatura: { tiers: [{nome, preco, beneficios[]}], retencao: string }
  }
  ```
- Salva em `meta.scale`.

**UI:**
- `StandaloneEscala.tsx` ganha botão "Gerar plano de escala com IA" + briefing curto
- `EscalaTab.tsx` mantém checklist atual mas adiciona seção "Plano de Escala IA" com tabs (Conteúdo · Anúncios · Canais · Recorrência · Assinatura), cada uma com cards copiáveis
- Botão Exportar DOCX do plano

---

## 4. Supabase / Roles

Já existe: `user_roles` table, função `has_role`, trigger `handle_new_user` insere role `user`, RLS por user_id, login/cadastro funcionando, projetos salvos com RLS.

**Falta:** gating de UI para admin.
- Criar hook `useIsAdmin()` em `src/hooks/useIsAdmin.ts` que consulta `user_roles` via supabase client
- Em `src/routes/_authenticated/configuracoes.tsx`: `beforeLoad` checa role admin via server function `getMyRole` (nova, em `src/lib/roles.functions.ts` com `requireSupabaseAuth`); se não admin → `redirect({ to: "/dashboard" })` + toast
- Esconder item "Configurações" no `AppSidebar.tsx` e no menu do `AppHeader.tsx` quando não admin

Nenhuma migration nova necessária.

---

## 5. Marca própria

Já feito: favicon (`@/assets/brand/favicon.png`), logo (`logo-mark.png`), título EscalaFlow, OG tags.

**Falta:**
- Esconder badge "Edit with Lovable" via `publish_settings--set_badge_visibility({ hide_badge: true })` (Pro)
- Conferir rodapé: se houver menção a Lovable em algum footer, trocar por "© EscalaFlow" (busca rápida em src/components/AppSidebar.tsx + páginas públicas)

---

## 6. Verificação final

- Build automático do harness valida typecheck
- Testar manualmente: login, criar projeto, abrir cada tab (ebook/playbook/copy/criativos/pagina/checkout/escala), gerar IA em cada um, exportar DOCX/PDF, salvar, recarregar página e ver dados persistidos
- Confirmar que usuário comum não vê `/configuracoes` e é redirecionado se acessar pela URL

---

## Arquivos novos

- `src/lib/sales-page/docx.ts`
- `src/lib/checkout.server.ts`, `src/lib/checkout.functions.ts`
- `src/lib/escala.server.ts`, `src/lib/escala.functions.ts`, `src/lib/escala/docx.ts`
- `src/lib/roles.functions.ts`
- `src/hooks/useIsAdmin.ts`

## Arquivos editados

- `src/lib/sales-page.server.ts` (prompt HTML), `SalesPageResult.tsx`, `StandaloneSalesPage.tsx` (seletor projeto/avulso)
- `src/components/pipeline/StandaloneCheckout.tsx`, `project/CheckoutTab.tsx`
- `src/components/pipeline/StandaloneEscala.tsx`, `project/EscalaTab.tsx`
- `src/routes/_authenticated/configuracoes.tsx` (admin gate)
- `src/components/AppSidebar.tsx`, `AppHeader.tsx` (esconder item Configurações)
- Toolcall: hide badge

Sem novas dependências, sem migrations.