
# EscalaFlow — Esteira Completa de Produtos Digitais

Objetivo: transformar o app numa esteira linear **Minerar → Radar → Análise IA → Projeto → Ebook → Playbook → Copy → Criativos → Página → Checkout → Escala**, mantendo tudo que já existe e adicionando os módulos faltantes.

Tudo persistido em `projects` (campo `meta` jsonb já existente) — sem novas tabelas. Cada projeto vira o "dossiê" do produto, agregando ebook, playbook, copy, criativos, página, checkout e escala.

---

## Fase 1 — Reorganização + Persistência + Esqueleto da Esteira

### 1.1 Menu lateral (AppSidebar.tsx)
Reordenar exatamente nesta ordem, mantendo badges atuais:

```
1  Dashboard               /dashboard
2  Minerar Ofertas         /minerar
3  Radar                   /radar
4  Central de Mineração    /central-mineracao
5  Ofertas Salvas          /ofertas-salvas
6  Ofertas Escaladas       /ofertas-escaladas
7  Análise IA              /analise-ia
8  Favoritos               /favoritos
9  Projetos                /projetos
10 Criar Ebook             /produtos/ebook
11 Criar Playbook          /produtos/playbook
12 Copy de Vendas          /copy           (NOVO)
13 Criativos & Anúncios    /criativos      (NOVO)
14 Página de Venda         /pagina-venda   (NOVO)
15 Checkout & Oferta       /checkout       (NOVO)
16 Escala do Produto       /escala         (NOVO)
17 Configurações           /configuracoes
```

Agrupar visualmente em 3 seções com `SidebarGroupLabel`:
- **Mineração** (1–8)
- **Esteira do Produto** (9–16)
- **Conta** (17)

Remover do header da preview qualquer chip de debug remanescente.

### 1.2 Persistência (correção do "some ao atualizar")
- Auditar `src/lib/queries.ts` + `initAdActionsCache`: garantir que `getFavCount/getSavedCount/getScaledCount` leem do Supabase (`saved_offers`, `user_ad_actions`) na montagem **e** revalidam após mutação.
- Trocar qualquer `localStorage`-only por leitura via `useQuery` com `staleTime: 0` no mount do `__root`/`AppSidebar`.
- Em `OfferCard` e ações de salvar/favoritar/escalar: invalidar query e disparar `subscribeChange` após `await` da mutação (não otimisticamente sem fallback).

### 1.3 Modelo "Projeto = produto"
Estender `ModeSchema` em `src/lib/project.functions.ts` para aceitar tipo de produto:
```
type: ebook | playbook | curso | planner | apostila | pack | app | fisico | romance
status: ideia | validado | em_criacao | pronto | publicado | escalando
```
Salvos em `projects.meta.product = { type, status, files[], links[], history[] }`.

`/projetos/$id` ganha abas: **Visão geral · Ebook · Playbook · Copy · Criativos · Página · Checkout · Escala** — cada aba lê/escreve em `projects.meta.<modulo>`.

### 1.4 Scaffold das 5 rotas novas
Criar arquivos com layout dark premium (mesmo padrão do StoryBook hub) já funcionando como hub + listagem por projeto:
- `src/routes/_authenticated/copy.tsx`
- `src/routes/_authenticated/criativos.tsx`
- `src/routes/_authenticated/pagina-venda.tsx`
- `src/routes/_authenticated/checkout.tsx`
- `src/routes/_authenticated/escala.tsx`

Cada hub: lista projetos do usuário + botão "Abrir esteira do projeto" → leva para `/projetos/$id` com aba certa pré-selecionada via `?tab=copy` etc.

---

## Fase 2 — Módulos de Conteúdo (Copy, Criativos, Página, Checkout)

### 2.1 Copy de Vendas (`src/lib/copy.server.ts` + `copy.functions.ts`)
Wizard 8 passos (Produto → Público → Promessa → Método → Avatar → Expert → Oferta → Garantia/FAQ).
Server fn `aiGenerateCopy` (Lovable AI Gateway, `google/gemini-3-flash-preview`) gera em uma chamada streaming:
headline, subheadline, big idea, mecanismo único, oferta, stack de valor, bônus, garantia, FAQ, CTA, copy completa.
Persistir em `projects.meta.copy`. Exportação DOCX (já temos lib `docx` no projeto pelo ebook) + botão "Copiar tudo".

### 2.2 Criativos & Anúncios (`src/lib/ads/`)
Catálogo `ADS_FORMATS` com 18 formatos solicitados (Native Notes, Problema vs Solução, Portal de Notícias, Post X, Oferta Direta Mockup, Ebook Promo, Ebook Depoimento, Procura-se, Traço a Lápis, Price Anchor, Before/After, Checklist, Micro Aula, Super Headline, Cupom Fiscal, POV Ebook na Mão, Manchete Jornal, Comparativo Método).
Cada formato: `{ id, name, description, fields[], promptTemplate, dimensions: ['1:1','4:5','9:16'] }`.
Server fn `aiGenerateCreative({projectId, formatId, dimension})` retorna `{ headline, body, cta, visualPrompt }`. UI em grid de cards com botão "Copiar prompt" e seletor de dimensão. Persiste em `projects.meta.creatives[]`.

### 2.3 Página de Venda (`src/lib/sales-page.server.ts`)
Gera estrutura por seções (Hero, Dor, Promessa, Mecanismo, Benefícios, Prova, Oferta, Bônus, Garantia, FAQ, CTA). Reusa dados de `meta.copy` se existir. Saída editável bloco-a-bloco + export HTML/Markdown + preview iframe.

### 2.4 Checkout & Oferta (form puro, sem IA)
Formulário em `projects.meta.checkout`: preço, preço âncora, bônus[], order bump, upsell, downsell, garantia, link Kiwify/Hotmart/Stripe. Validação Zod. Render preview tipo "card de checkout".

---

## Fase 3 — Esteira final (Escala) + Melhorias Ebook/Playbook

### 3.1 Escala do Produto (`/escala` + aba do projeto)
Painel cinematográfico que lê `projects.meta` e mostra checklist:
- ✅/⬜ Ebook criado · Playbook criado · Copy criada · Criativos (≥3) · Página criada · Checkout configurado
- Barra de progresso "Pronto para escalar"
- Card "Ideias de anúncios" → server fn que sugere 5 ângulos baseados em `meta.copy.bigIdea`
- Card "Próximos passos de tráfego" (Meta Ads, TikTok, Google) com checklist
- Status: ideia → validado → em_criacao → pronto → publicado → escalando (toggle)

### 3.2 Melhorias Ebook (sem quebrar fluxo existente)
3 origens de criação no hub `/produtos/ebook`:
1. **A partir de oferta minerada** (já existe via `source_ad_key`)
2. **Briefing manual** (form completo)
3. **IA do zero** (só nicho + tipo, IA preenche o resto)

Adicionar tipos: tradicional, KDP, emagrecimento, receita, infantil, romance, apostila, planner, guia, workbook, playbook complementar.
Campos novos: nome do autor, bio, idioma, tom de escrita, problema, solução. Páginas: 20/30/60/80/100/120/150. Export DOCX além do PDF.

### 3.3 Melhorias Playbook
Mesmas 3 origens (anúncio / a partir de ebook criado / do zero com IA).
Catálogo de tipos expandido: estratégico, passo a passo, romance interativo, história em capítulos, quadrinho digital, receita, fitness, beleza, negócios, IA, infoproduto, infantil, drama/romance popular (CEO×empregada, traficante, amor proibido, superação feminina).
Saída: capa, episódios/cenas, texto interativo, prompt visual por cena, navegação tipo livro, link compartilhável (`/p/$slug` público), export.

### 3.4 Radar enriquecido
Filtros adicionais em `/radar`: tipo de produto (low ticket, infoproduto, físico, beleza, emagrecimento, IA, curso, app, planner, apostila, figurinha, livro digital, romance digital). Reusa `mined_offers` + filtro client-side por `niche/keyword` mapeados.

---

## Detalhes técnicos

- **Sem migrations**: tudo cabe em `projects.meta` (jsonb). Apenas estendemos `ModeSchema` no zod do server fn.
- **IA**: 100% via Lovable AI Gateway (`LOVABLE_API_KEY` já configurado), modelos `gemini-3-flash-preview` (rápido) e `gpt-5-mini` (textos longos).
- **Streaming**: usar `streamText` do AI SDK nas gerações longas (copy, página).
- **Auth**: todas as server fn novas usam `requireSupabaseAuth`.
- **Tema**: continuar usando tokens de `src/styles.css` (nada de cores hard-coded). Glow neon + glass nos novos hubs, igual StoryBook.
- **Mobile**: grids `grid-cols-1 md:grid-cols-2 xl:grid-cols-3`, sidebar `collapsible="icon"` já cobre.
- **Routes type-safe**: criar arquivos antes de qualquer `<Link to=...>`. `routeTree.gen.ts` é regenerado automaticamente.

---

## Entrega sugerida (ordem de PRs)

1. **Fase 1** (menu + persistência + scaffold das 5 rotas + tabs no /projetos/$id) — pronto para testar a navegação completa.
2. **Fase 2** (Copy + Criativos + Página + Checkout funcionais com IA).
3. **Fase 3** (Escala + upgrades Ebook/Playbook + filtros Radar).

Confirma que sigo nessa ordem (Fase 1 já nesta rodada) ou prefere outro recorte?
