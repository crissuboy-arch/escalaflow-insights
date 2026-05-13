## Escopo

Apenas dois módulos: **Copy de Vendas** (`/copy`) e **Criativos & Anúncios** (`/criativos`). Não toco em Página, Checkout, Escala, Auth ou Branding nesta rodada.

A infraestrutura existente é mantida — projeto vs avulso, gateway IA, persistência em `projects.meta` e `ai_history`. Apenas estendo schemas, catálogo e UI.

---

## 1) Copy de Vendas

### Mudanças no servidor
**`src/lib/copy.server.ts`**
- Estender `SalesCopySchema` com novos campos:
  - `vslScript: string` — roteiro de VSL (lead, dor, mecanismo, oferta, garantia, CTA)
  - `shortCopy: string` — copy curta (anúncio/Stories ~300 caracteres)
  - `longCopy: string` — copy longa (já existe como `fullCopy`; renomeio mental, mantenho `fullCopy` por retrocompat)
  - `checkoutCopy: string` — copy de checkout (acima do botão, reforça oferta + garantia)
- Atualizar `buildPrompt` para pedir todos os campos novos no JSON.
- Atualizar `SYSTEM` para mencionar suporte a qualquer tipo de produto.

**`src/lib/standalone/briefing.ts`**
- Acrescentar enum sugerido de `productType` (UI vai sugerir, não bloquear): `ebook | curso | plr | fisico | amazon | shopee | saas | afiliado | servico | outro`. Mantém `z.string()` no schema (sem breaking change).

### Mudanças na UI
**`src/components/pipeline/StandaloneBriefingForm.tsx`**
- Trocar input de "Tipo do produto" por `Select` shadcn com as 10 opções acima + "Outro" (free text quando "Outro").

**`src/components/pipeline/CopyResult.tsx`**
- Adicionar 4 novos cards: "Copy Curta", "Copy de Checkout", "Roteiro VSL" e renomear seção da copy longa para "Copy Longa". Cada um com botão Copiar.
- Tornar opcional o render quando o campo vier vazio (compatibilidade com gerações antigas em `projects.meta.copy`).

### Modo "projeto"
Já funciona — só adapto o `CopyContext` para passar `productType` se vier do briefing do projeto.

---

## 2) Criativos & Anúncios — 40 formatos

### Catálogo
**`src/lib/ads/catalog.ts`** — substituir `ADS_FORMATS` pelos exatos 40 itens enviados pelo usuário, na mesma ordem (1–40). Cada formato vira:
```ts
{ id, name, description, emocao, angulo, gatilho, uso }
```
Onde:
- `gatilho` — gatilho mental dominante (ex: "prova social", "autoridade", "urgência", "curiosidade", "pertencimento").
- `uso` — quando/como usar (ex: "topo de funil — alta retenção", "remarketing — fechar venda", "validação — feed orgânico").

Os campos `gatilho` e `uso` alimentam o **Tooltip** na UI de seleção.

### Schema do criativo
**`src/lib/ads.server.ts`** — estender `CreativeSchema`:
```ts
{
  hook, headline, body, cta,
  caption,        // legenda pronta para Instagram/TikTok com hashtags
  shortScript,    // roteiro curto 15–30s (cenas + falas)
  imagePrompt,    // prompt MidJourney/DALL-E/Nano Banana para imagem
  videoPrompt,    // prompt Sora/Runway para vídeo
  estrutura, emocao, angulo
}
```
Mantenho `visualPrompt` como alias de `imagePrompt` para retrocompat com criativos já salvos. `copy` legado vira `body`.

Atualizar `userPrompt` para pedir todos os campos no JSON e mencionar gatilho/uso do formato selecionado.

### Multi-seleção até 3 formatos
**`src/lib/ads-creative.functions.ts`** — adicionar nova server fn:
```ts
generateMultiFormatCreatives({ source, platform, objective, formatIds: string[] (1-3), dimension })
```
Internamente itera por formato e chama `aiGenerateCreative` (Promise.all com cap de 3). Devolve `{ creatives: Array<{ formatId, creative }> }`. Persiste todas em `projects.meta.creatives` e em `ai_history`.

### Wizard reformulado
**`src/components/pipeline/CreativeWizard.tsx`** — passo "Formato" passa a:
- Grid de 40 cards com ícone + nome + descrição curta.
- `Tooltip` (shadcn) no hover com **Gatilho** e **Uso**.
- Checkbox de seleção; até 3 simultâneos. Contador "2/3 selecionados".
- Busca por nome/gatilho mantida.
- Botão "Continuar" habilitado com 1–3 formatos.

Passo "Resultado":
- Renderiza um `CreativeCard` por formato gerado, com label do formato.
- Botão "Gerar 3 variações" passa a operar **por card** (nova prop callback no `CreativeCard`).

**`src/components/pipeline/CreativeCard.tsx`** — adicionar campos novos:
- Seções: Headline, Corpo, CTA, Legenda, Roteiro Curto, Prompt de Imagem, Prompt de Vídeo.
- Botão "Copiar prompt" individual em cada bloco de prompt.
- Botão **Exportar** (popover): copia tudo como Markdown OU baixa `.txt` com nome `criativo-<formato>-<data>.txt`. Sem dependências novas — usa `Blob` + `URL.createObjectURL`.

### Persistência
- `projects.meta.creatives` já é `unknown[]`. Apenas adicionamos os novos campos; nada quebra.
- `ai_history` continua recebendo prompt+response.

---

## 3) Verificação final

1. `bun run build` deve passar sem erros — checar typecheck dos novos campos.
2. Geração avulsa de copy com `productType="amazon"` retorna todos os 4 novos campos.
3. Geração de criativos com 3 formatos selecionados retorna 3 cards distintos com gatilho/uso visível.
4. Botões Copiar e Exportar funcionando.
5. Sem regressão em projetos existentes (campos antigos continuam renderizando).

---

## Arquivos editados (estimativa)

- `src/lib/copy.server.ts` — estender schema + prompt
- `src/lib/standalone/briefing.ts` — sugestões de productType (sem breaking)
- `src/lib/ads/catalog.ts` — 40 formatos com gatilho/uso
- `src/lib/ads.server.ts` — estender CreativeSchema + prompt
- `src/lib/ads-creative.functions.ts` — `generateMultiFormatCreatives`
- `src/components/pipeline/StandaloneBriefingForm.tsx` — Select de tipo
- `src/components/pipeline/CopyResult.tsx` — 4 novas seções
- `src/components/pipeline/CreativeWizard.tsx` — multi-select + tooltips
- `src/components/pipeline/CreativeCard.tsx` — novos campos + exportar

Sem novas tabelas, sem novas migrações, sem novas dependências.