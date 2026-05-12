# Página de Venda + Criativos — geradores completos

Implementar dois módulos no padrão dual-mode já estabelecido (`DualModeHub` + `StandaloneBriefingForm` + server fn discriminada `kind: project | standalone`).

---

## 1. Página de Venda — Gerador Mestre (projeto + avulso)

### 1.1 Server
- `src/lib/sales-page.server.ts`
  - Reusa o helper `aiChat` (mesmo pattern de `copy.server.ts`).
  - `SalesPageSchema` (zod) com blocos: hero, headline, subheadline, lead, dor, mecanismo, beneficios[], objecoes[{q,a}], depoimentos[{nome,texto}], oferta, bonus[], garantia, faq[{q,a}], cta, estruturaVisual.
  - `aiGenerateSalesPage(ctx)` → 1 chamada `google/gemini-3-flash-preview`, `response_format: json_object`.
  - `buildExternalPrompts(page, ctx)` → devolve `{ lovable, googleAiStudio, v0, claude }` (4 prompts prontos para colar em ferramentas externas; cada um com instruções específicas do destino — Lovable pede React+Tailwind, V0 pede shadcn, Google AI Studio pede HTML+Tailwind único, Claude pede design system descritivo).

### 1.2 Server function
- `src/lib/sales-page.functions.ts`
  - `generateSalesPage` com `discriminatedUnion("kind")` igual a `copy.functions.ts`:
    - `kind: "project"` → carrega `projects.briefing` + `projects.meta.copy` (se existir, usa headline/promessa da copy), grava em `projects.meta.salesPage = { page, prompts }`.
    - `kind: "standalone"` → usa `StandaloneBriefing`, devolve sem persistir.

### 1.3 UI
- `src/components/pipeline/SalesPageResult.tsx`
  - Renderiza cada bloco em `Card`s (Hero/Headline → Dor → Mecanismo → Benefícios → Objeções → Prova → Oferta → Bônus → Garantia → FAQ → CTA), cada um com botão `Copiar`.
  - Seção "Estrutura Visual" em `pre`.
  - Seção destacada **"Prompts para IA externa"** com 4 botões grandes:
    - Copiar Prompt Lovable
    - Copiar Prompt Google AI Studio
    - Copiar Prompt V0
    - Copiar Prompt Claude
  - Botão "Exportar DOCX" usando `docx` (já no projeto via ebook).
- `src/routes/_authenticated/pagina-venda.tsx`
  - Substitui `<StandaloneSoon>` por `<StandalonePage />` que monta `StandaloneBriefingForm module="pagina-venda"` + chama `generateSalesPage({ kind:"standalone" })` + renderiza `SalesPageResult`.
- `src/routes/_authenticated/projetos.$id.tsx`
  - Aba "Página": botão **"Gerar página com IA"** chama `generateSalesPage({ kind:"project", projectId })` e renderiza o mesmo `SalesPageResult`. Se `meta.salesPage` já existir, mostra resultado salvo + botão "Regenerar".

---

## 2. Criativos & Anúncios — esteira 6 passos (modo avulso)

Modo projeto continua usando o grid atual `PipelineHub` (sem mudança nesta rodada).

### 2.1 Catálogo
- `src/lib/ads/catalog.ts`
  - `PLATFORMS` = TikTok · Instagram · Facebook · Pinterest · Shorts · Marketplace · Amazon · Shopee
  - `OBJECTIVES` = CTR · Conversão · Viralização · Branding · Remarketing · Escala
  - `ADS_FORMATS` = 18 itens `{ id, name, description, emocao, anguloPadrao }` (Native Notes, Portal de Notícias, Cupom Fiscal, POV Ebook, Super Headline, Problema vs Solução, Post X, Oferta Direta Mockup, Ebook Promo, Ebook Depoimento, Procura-se, Traço a Lápis, Price Anchor, Before/After, Checklist, Micro Aula, Manchete Jornal, Comparativo Método).
  - `DIMENSIONS` = ['1:1','4:5','9:16'].

### 2.2 Server
- `src/lib/ads.server.ts` (novo, separado do `ads.functions.ts` existente)
  - `aiChat` reutilizado.
  - `CreativeSchema` = `{ hook, headline, cta, copy, visualPrompt, estrutura, emocao, angulo }`.
  - `aiGenerateCreative({ briefing, platform, objective, formatId, dimension, variation? })` — prompt customizado por formato/plataforma (TikTok = pede ritmo + falas/Cuts; estática = pede composição visual). Retorna 1 criativo.
  - `aiGenerateCreativeVariations(...)` retorna 3 variações em uma chamada.

### 2.3 Server function
- `src/lib/ads-creative.functions.ts`
  - `generateCreative` com `discriminatedUnion("kind")` (project | standalone) + `platform`, `objective`, `formatId`, `dimension`.
    - Modo projeto: lê `projects.meta.copy + briefing` para enriquecer contexto e dá `push` em `projects.meta.creatives[]`.
    - Modo avulso: só retorna.
  - `generateCreativeVariations` mesmo input, retorna `creative[]`.

### 2.4 UI — Stepper
- `src/components/pipeline/Stepper.tsx` — header com 6 bolinhas + labels, click navega para passos já preenchidos.
- `src/components/pipeline/CreativeWizard.tsx` (modo avulso):
  1. **Origem**: já resolvido pelo `ModePicker` do hub — entra direto no passo 2.
  2. **Plataforma**: grid de cards.
  3. **Objetivo**: grid.
  4. **Formato**: grid filtrável (busca + categoria) sobre `ADS_FORMATS`.
  5. **Briefing**: `StandaloneBriefingForm module="criativos"`.
  6. **Resultado**: card grande com hook/headline/cta/copy/visualPrompt/estrutura/emoção/ângulo + botões **Gerar variações**, **Favoritar** (localStorage), **Copiar prompt visual**, **Exportar** (txt). Permite voltar para o passo 4 e trocar de formato sem perder briefing.
- Estado em `useState` com `?step=N&platform=…&objective=…&formatId=…` na URL para sobreviver a refresh (validateSearch).
- `src/routes/_authenticated/criativos.tsx` — substitui `<StandaloneSoon>` por `<CreativeWizard />`.

---

## 3. Detalhes técnicos

- **IA**: `google/gemini-3-flash-preview` em ambos, `response_format: json_object`, `temperature: 0.85` para criativos.
- **Persistência**:
  - Página/projeto → `projects.meta.salesPage`.
  - Criativos/projeto → `projects.meta.creatives[]` (append).
  - Avulso → só localStorage para o briefing; resultados ficam em memória da sessão.
- **Sem migrations**.
- **Auth**: `requireSupabaseAuth` em todas as server fns (mesmo no modo avulso).
- **Tema**: tokens de `src/styles.css`, mesmo glow/glass do hub atual.
- **Mobile**: stepper colapsa em accordion < md; grids `grid-cols-1 md:grid-cols-2 xl:grid-cols-3`.
- **Sem quebrar**: `PipelineHub` continua funcionando para o modo projeto dos demais módulos.

---

## 4. Arquivos novos
```
src/lib/sales-page.server.ts
src/lib/sales-page.functions.ts
src/lib/ads/catalog.ts
src/lib/ads.server.ts
src/lib/ads-creative.functions.ts
src/components/pipeline/SalesPageResult.tsx
src/components/pipeline/Stepper.tsx
src/components/pipeline/CreativeWizard.tsx
src/components/pipeline/CreativeCard.tsx
```

## 5. Arquivos editados
```
src/routes/_authenticated/pagina-venda.tsx     (StandaloneSoon → StandalonePage)
src/routes/_authenticated/criativos.tsx        (StandaloneSoon → CreativeWizard)
src/routes/_authenticated/projetos.$id.tsx     (aba "Página" + aba "Criativos" chamam server fns reais)
```

---

## 6. Ordem de entrega

Tudo nesta rodada:
1. Página de Venda (server + UI + projeto + avulso + 4 prompts + DOCX).
2. Criativos esteira 6 passos (catalog + server + wizard + variações).

Confirma para eu seguir?
