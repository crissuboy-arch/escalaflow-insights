## Página Individual da Oferta

Criar uma rota dinâmica `/oferta/$id` que abre ao clicar em qualquer card de oferta (em Minerar, Escaladas, Salvas, Favoritos), exibindo análise profissional completa com dados demo locais.

### 1. Nova rota

**Arquivo:** `src/routes/_authenticated/oferta.$id.tsx`

Carrega a oferta de `DEMO_OFFERS` por id e a análise correspondente de `DEMO_ANALYSES` (ou gera fallback se não existir). Se id inválido → estado "oferta não encontrada" com link de volta.

### 2. Estrutura visual (top → bottom)

**Cabeçalho premium**
- Botão "Voltar"
- Capa em banner com gradiente sobreposto
- Nome do anunciante (h1), nicho, país (com bandeira), plataforma, data detectada (mock), badge de status (Escalando / Validando / Quente)
- Score destacado em círculo no canto direito

**Bloco de criativo**
- Imagem mock (image_url)
- Headline (gerada a partir do nome/nicho)
- Copy principal (parágrafo demo)
- CTA destacado em botão estilizado
- Formato do anúncio (Vídeo / Carrossel / Imagem) — badge

**Análise IA** (grid 2 colunas em desktop, 1 em mobile)
- Cards separados para: Mecanismo único, Promessa principal, Dores exploradas (lista), Desejos ativados (lista), Público-alvo, Gatilhos mentais (chips)

**Score de escala**
- Barra horizontal animada (framer-motion) preenchendo até `scale_score`
- Label dinâmico baseado em faixa:
  - 0–20: Oferta fria
  - 21–40: Validando
  - 41–60: Oferta quente
  - 61–80: Escalando
  - 81–100: Dominando

**Ações** (sticky bottom em mobile, barra horizontal em desktop)
- Salvar oferta (toggle real via `toggleSaveOffer` no localStorage)
- Gerar variações (toast "em breve")
- Modelar produto (toast "em breve")
- Criar funil (toast "em breve")
- Exportar análise (download JSON da análise via Blob — funcional)

### 3. Integrações com páginas existentes

- `OfferCard.tsx`: trocar o botão "Analisar" para navegar a `/oferta/$id` em vez de `/analise-ia` com search param. O botão Sparkles continua sendo o CTA principal do card.
- `ofertas-escaladas.tsx`: tornar linhas da tabela clicáveis para abrir a página da oferta.
- Sidebar: nenhuma mudança (rota acessada via cards/tabela).

### 4. Design

- Tokens de `src/styles.css` (sem cores hardcoded)
- `var(--gradient-primary)` no banner e na barra de score
- `var(--shadow-elegant)` nos cards principais
- Animações de entrada com framer-motion (fade + slide)
- Totalmente responsivo (grid colapsa, ações viram sticky bar no mobile)
- Funciona em dark e light mode

### 5. Sem backend

- Tudo lido de `DEMO_OFFERS` / `DEMO_ANALYSES` em `src/lib/queries.ts`
- Ações de salvar usam o `localStorage` já implementado
- Exportar análise gera arquivo JSON local via `Blob` + `URL.createObjectURL`

### Arquivos afetados

- **Novo:** `src/routes/_authenticated/oferta.$id.tsx`
- **Editado:** `src/components/OfferCard.tsx` (link do CTA)
- **Editado:** `src/routes/_authenticated/ofertas-escaladas.tsx` (linhas clicáveis)
- **Editado:** `src/lib/queries.ts` (helper `getOfferById` + `getAnalysisByOfferId` se necessário)
