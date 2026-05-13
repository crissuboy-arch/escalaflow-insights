## Finalizar módulos Criar Ebook e Criar Playbook

Escopo: completar campos faltantes, integrar entradas/saídas reais e fechar o que já existe. **Sem nova rota, sem novo módulo, sem mexer em visual.**

---

### 1. Ebook — campos do autor

`src/routes/_authenticated/produtos.ebook.tsx` + tipo `Briefing` local:

- Adicionar painel **"Identidade do autor"** no Step 1 (Briefing): `authorName`, `authorBio`, `brand` (opcional). Persistido em `briefing.identity` (já é jsonb, não precisa migração).
- Passar `identity` via `opts.identity` para `aiGenerateOutline` e `aiGenerateChapter` (server.ts já aceita).
- Renderizado nos exports (ver §5).

### 2. Ebook — seletor de páginas (20/30/60/80/100/120/150)

`PRODUCT_SIZES` e `sizeSpec()` já existem em `src/lib/ebook/niches.ts` mas a UI só expõe `chapterCount`.

- Substituir o `Input number` de capítulos no Step 2 por um grupo de chips com os 7 tamanhos.
- Ao escolher tamanho: derivar `chapterCount = sizeSpec(pages).chapters`, salvar `pages` em `briefing.size = sizeSpec(pages)`.
- Passar `size` para `aiGenerateChapter` (já aceita `opts.size`) — controla `wordsPerChapter` e blocos extras (storytelling/exemplo/exercício/FAQ/bônus).
- Manter o input numérico de capítulos como ajuste fino, default vindo do tamanho.

### 3. Ebook — catálogo de estilos cobrindo as 12 categorias pedidas

`src/lib/ebook/styles.ts`:

- Estender `STYLES[]` com: `low-ticket`, `apostila`, `planner`, `receita`, `emagrecimento`, `beleza`, `romance`, `negocio`, `plr` (KDP, premium, infantil já existem).
- Cada um com `mode`/`layout`/`promptHint` adequados (KDP para apostila/planner/PLR; premium para receita/beleza/romance; etc.).
- `EBOOK_CATEGORIES` ajustado para casar 1‑para‑1 com os IDs novos.

### 4. Ebook — Sumário, Conclusão, Sobre o Autor, CTA final

A função `aiGenerateBookExtras` em `ebook.server.ts` já existe e devolve `{ introduction, conclusion, aboutAuthor, bonus }` mas **nunca é chamada**.

- Novo server fn `generateEbookExtras` em `src/lib/ebook.functions.ts` (wrapper).
- No Step 4 (Capítulos & exportar): botão **"Gerar introdução, conclusão, sobre o autor e bônus"** + edição inline.
- Estado novo `extras: BookExtras | null` salvo em `briefing.extras`.
- Estender `DraftPayloadSchema` (briefing já é record genérico — só garantir que `extras` é serializado no autosave).
- Adicionar campo separado **"CTA final"** (string editável, default `"Acesse [link] e dê o próximo passo."`) salvo em `briefing.finalCta`.

### 5. Ebook — PDF/DOCX premium (sumário + extras + autor)

`src/lib/ebook/pdf.ts` e `src/lib/ebook/docx.ts`:

- **PDF**: capa com `identity.author`; nova página de **Sumário** numerada (parsea `chapters[].title`); página de **Introdução** antes do cap. 1; página de **Conclusão + CTA final** após o último capítulo; página de **Sobre o autor** com `authorName + authorBio`; página de **Bônus** se houver.
- **DOCX**: usa `TableOfContents` (já importado mas não usado); paragráfos para intro/conclusão/CTA/autor/bônus; mantém imagens de capítulo se existentes.
- Atualizar tipos `EbookPdfInput`/`EbookDocxInput` com `identity`, `extras`, `finalCta`.

### 6. Playbook — criar a partir do Ebook

`src/routes/_authenticated/produtos.ebook.tsx`:

- Botão **"Criar Playbook a partir deste Ebook"** no Step 4, chama `navigate({ to: "/produtos/playbook/novo", search: { fromEbook: ebookId } })`.

`src/routes/_authenticated/produtos.playbook.novo.tsx`:

- Ao montar, ler `?fromEbook=<id>`. Se presente: chamar `loadEbookDraft({id})` (já existe), montar `briefing` Playbook com base no briefing do ebook (mapear `title/niche/promise/avatar/uniqueMechanism/pains/desires`) e pular Step 0 (anúncio). Skip do `selectedAd` (já trata `selectedAd` opcional na chamada `saveFn`).
- Pré-popular `outline` com os títulos de `ebook.outline` se quiser ("usar capítulos como cenas").

### 7. Playbook — criar do zero (sem anúncio)

`src/routes/_authenticated/produtos.playbook.novo.tsx`:

- No Step 0, adicionar botão **"Começar do zero"** ao lado do "Gerar briefing". Ao clicar: setar `briefing` vazio (`{ title:"", niche:"", promise:"", avatar:"", uniqueMechanism:"", pains:[], desires:[] }`) e ir direto para Step 1 (briefing manual).
- `onOutline` já tem fallback local — funciona mesmo sem IA.
- `selectedAd` continua opcional ao salvar (`source_ad_key` aceita `null`).

### 8. Playbook — Estratégia já gera tudo pedido

A função `aiGeneratePlaybookStrategy` já cobre: bigIdea, promise, uniqueMechanism, avatar, pains, desires, objections, mentalTriggers, headlines, vslStructure, pageStructure, funnel, offer, bonuses, stack, cta, scripts, angles, scale. Já existe botão **"Estratégia"** no leitor (`/produtos/playbook/$id`). **Sem mudança aqui** — apenas garantir que o sheet aparece e a chamada funciona (já testado com migração `has_role` corrigida).

### 9. Correções diversas

- Garantir que `i18n/locales/pt.json` tem chaves usadas em `PdfUploadCard` e no leitor de Playbook (assumir já existentes; se faltarem, adicionar).
- Autosave do ebook: incluir `extras`, `identity`, `finalCta`, `pages` em `briefing` para não perder estado.
- Tipo `Briefing` do route file: estender com `identity`, `extras`, `finalCta`, `size`.

---

### Arquivos editados

- `src/routes/_authenticated/produtos.ebook.tsx` — identidade, seletor de páginas, extras, CTA final, botão "Criar Playbook a partir deste Ebook"
- `src/routes/_authenticated/produtos.playbook.novo.tsx` — botão "Começar do zero", import por `?fromEbook=`
- `src/lib/ebook.functions.ts` — novo `generateEbookExtras`
- `src/lib/ebook/styles.ts` — 9 estilos novos + categorias
- `src/lib/ebook/pdf.ts` — sumário, intro, conclusão+CTA, sobre o autor, bônus
- `src/lib/ebook/docx.ts` — TableOfContents real, intro, conclusão+CTA, autor, bônus

### Arquivos novos

Nenhum (tudo cabe nos arquivos existentes).

### Banco de dados

Sem migração. `briefing` já é `jsonb`; `identity`, `extras`, `finalCta`, `size` ficam dentro dele.

### O que não fazer

- Não criar nova rota.
- Não alterar visual/branding.
- Não mexer em outros módulos da esteira (copy, criativos, página, checkout, escala).
- Não tocar em `client.ts`/`types.ts` Supabase.
