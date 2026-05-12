# Esteira Dual-Mode (Projeto + Produto Avulso)

Tornar todos os 5 módulos da esteira (Copy, Criativos, Página, Checkout, Escala) utilizáveis **sem obrigar criação prévia de projeto**, mantendo 100% do fluxo atual baseado em `projects.meta`.

---

## 1. Padrão arquitetural

### 1.1 Componente `ModePicker`
Novo componente reutilizável `src/components/pipeline/ModePicker.tsx` exibido no topo de cada hub:
- Dois cards grandes: **"Usar Projeto Existente"** vs **"Produto Avulso"**.
- Estado em URL (`?source=project|standalone`) para sobreviver a refresh.
- Quando "project": mostra grid atual do `PipelineHub`.
- Quando "standalone": mostra `StandaloneForm` específico do módulo.

### 1.2 Briefing avulso compartilhado
Novo `src/lib/standalone/briefing.ts` define o schema mínimo reusado por todos:
```ts
StandaloneBriefing = {
  productName, productType, description, niche,
  audience, promise, price?, platform?, link?, tone?
}
```
Persistência opcional: salvar em `localStorage` (`escalaflow:standalone:<module>`) + botão **"Salvar como Projeto"** que chama `createProject` com `meta.briefingAvulso = ...` e migra o conteúdo gerado para `projects.meta.<module>`.

### 1.3 Server fns aceitam `source` discriminado
Cada server fn de geração recebe:
```ts
input: { source: { kind: 'project', projectId } } 
     | { source: { kind: 'standalone', briefing: StandaloneBriefing } }
```
Quando `kind=project`: lê `projects.meta` (briefing, copy, avatar…).
Quando `kind=standalone`: usa o briefing direto. Resultado retorna pro cliente; persistência só ocorre se houver projeto.

---

## 2. Módulo a módulo

### 2.1 Copy de Vendas (`/copy`)
- Server fn `aiGenerateCopy` (Lovable AI Gateway, `google/gemini-3-flash-preview`).
- Output: headline, sub, big idea, mecanismo, bullets, benefícios, CTA, objeções, ângulos.
- UI: wizard 1 tela; render markdown + botão "Copiar tudo" + DOCX.

### 2.2 Criativos & Anúncios (`/criativos`) — esteira 6 passos
Stepper visual:
1. Origem (projeto/avulso)
2. Plataforma (TikTok, IG, FB, Pinterest, Shorts, Marketplace, Amazon, Shopee)
3. Objetivo (CTR, Conversão, Viral, Branding, Remarketing, Escala)
4. Formato (catálogo `ADS_FORMATS` — Native Notes, Portal, Cupom Fiscal, POV, Super Headline, etc.)
5. Geração IA → `{ hook, headline, cta, copy, visualPrompt, estrutura, emocao, angulo }`
6. Ações: variações, favoritar, copiar prompt, exportar
Persistência: `projects.meta.creatives[]` (modo projeto) ou histórico local (avulso).

### 2.3 Página de Venda (`/pagina-venda`) — Gerador Mestre
- **NÃO** renderiza HTML; gera estrutura textual + 4 prompts prontos.
- Output: Hero, Headline, Sub, Dor, Mecanismo, Benefícios, Objeções, Depoimentos, Oferta, Garantia, FAQ, CTA, estrutura visual.
- Botões: **Copiar Prompt Lovable / Google AI Studio / V0 / Claude** + Export DOCX.

### 2.4 Checkout & Oferta (`/checkout`)
IA gera: oferta, stack de valor, bônus, garantia, order bump, upsell, downsell, preço âncora, CTA, urgência.
Saídas formatadas para **Kiwify · Hotmart · Stripe** (campos prontos para colar) + prompt genérico.

### 2.5 Escala do Produto (`/escala`) — "Missão Completa"
Painel cinematográfico:
- Checklist ✅ Ebook · Copy · Criativos · Página · Checkout (lê `projects.meta`).
- Em modo avulso: pula checklist, vai direto para **Sugestões de Escala IA**.
- Server fn `aiSuggestScale` retorna: anúncios sugeridos, hooks, ideias de escalada, canais ideais, perfis de influenciadores, formatos que mais convertem, plano de conteúdo 7d, próximos passos.

---

## 3. Detalhes técnicos

- **Sem migrations**: tudo cabe em `projects.meta` (jsonb) ou localStorage no modo avulso.
- **IA**: `google/gemini-3-flash-preview` por padrão; `gpt-5-mini` para textos longos (página/copy completas) com `streamText`.
- **Auth**: server fns usam `requireSupabaseAuth` (mesmo no modo avulso — apenas não persistem em DB).
- **Tema**: tokens de `src/styles.css`, glow/glass igual ao StoryBook hub.
- **Mobile**: stepper colapsa em accordion < md.
- **Rotas**: reusar arquivos existentes em `src/routes/_authenticated/{copy,criativos,pagina-venda,checkout,escala}.tsx` — só trocar conteúdo de `PipelineHub` por novo `<DualModeHub>`.

---

## 4. Arquivos novos

```
src/components/pipeline/
  ModePicker.tsx            (cards Projeto vs Avulso)
  DualModeHub.tsx           (substitui PipelineHub nos 5 hubs)
  StandaloneBriefingForm.tsx
  Stepper.tsx               (usado em criativos)

src/lib/standalone/
  briefing.ts               (schema + storage local)

src/lib/copy.server.ts + copy.functions.ts
src/lib/ads.server.ts (estende ads.functions.ts)
src/lib/ads/catalog.ts      (18 formatos)
src/lib/sales-page.server.ts + sales-page.functions.ts
src/lib/checkout.server.ts + checkout.functions.ts
src/lib/scale.server.ts + scale.functions.ts
```

## 5. Arquivos editados
- `src/routes/_authenticated/{copy,criativos,pagina-venda,checkout,escala}.tsx` (passam a usar `DualModeHub`)
- `src/routes/_authenticated/projetos.$id.tsx` (abas já existem; passam a chamar as mesmas server fns no modo `kind:'project'`)
- `src/components/PipelineHub.tsx` (mantido — usado dentro do `DualModeHub` quando `source=project`)

---

## 6. Ordem de entrega

1. Infra dual-mode (`ModePicker`, `DualModeHub`, `StandaloneBriefingForm`, schemas).
2. **Copy** ponta-a-ponta (modo projeto + avulso) — valida o padrão.
3. **Criativos** esteira 6 passos.
4. **Página** Gerador Mestre + 4 prompts.
5. **Checkout** + saídas Kiwify/Hotmart/Stripe.
6. **Escala** Missão Completa + Sugestões IA.

Confirma para eu seguir nessa ordem (passo 1 + 2 já nesta rodada)?
