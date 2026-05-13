# Rebrand visual EscalaFlow — SaaS premium de IA

Objetivo: tirar a aparência "gamer/crypto" (glow forte, partículas, gradientes saturados) e aproximar de Linear, Notion, Jasper, Framer, Perplexity. Manter conceito de crescimento, fluxo, escala, IA, performance.

Escopo: branding + tokens visuais. **Sem mexer em funcionalidade, rotas, módulos, server functions ou banco.**

---

## 1. Sistema de logo (5 versões)

Gerar via IA (premium, fundo transparente PNG) e salvar em `src/assets/brand/`:

1. **`logo-horizontal.png`** — símbolo + wordmark "EscalaFlow" lado a lado. Para `AppHeader`, login, footer.
2. **`logo-flat.png`** — wordmark sem efeitos, peso médio, espaçamento amplo. Para contextos densos.
3. **`logo-mono.png`** — versão monocromática (branco para dark, preto para light). Para overlays, e-mails, exportações.
4. **`logo-mark.png`** — apenas o símbolo (app icon, 1024×1024, cantos com respiro). Para PWA, OG image, avatar.
5. **`favicon.png`** — símbolo simplificado 512×512 (legível em 16×16). Substitui `public/favicon.ico`.

**Direção do símbolo**: forma geométrica única e estável — uma seta/curva ascendente integrada a uma "barra" sutil, sem partículas, sem rastro, sem glow. Linha limpa, traço médio, dois tons sólidos (azul elétrico + roxo) em transição suave (não arco-íris). Inspiração: marca Linear (geometria pura), Vercel (silhueta sólida), Perplexity (símbolo único reconhecível).

**Wordmark**: "EscalaFlow" em uma única cor sólida (não bicolor por letra). Tipografia premium geométrica (ver §3). Sem sublinhado "MINERE. CRIE. ESCALE." no logo principal — esse slogan vira tagline opcional fora da marca.

---

## 2. Paleta — repintar tokens em `src/styles.css`

Substituir a paleta atual (roxo saturado #7C3AED + cyan #06B6D4 com glow forte) por uma versão sóbria SaaS:

```
Dark (principal):
  --background: oklch(0.16 0.02 265)   /* near-black com leve azul */
  --card:       oklch(0.20 0.02 265)
  --foreground: oklch(0.96 0.005 250)
  --primary:    oklch(0.62 0.20 265)   /* azul elétrico contido */
  --accent:     oklch(0.58 0.22 295)   /* roxo premium */
  --border:     oklch(1 0 0 / 6%)
  --muted-foreground: oklch(0.65 0.01 260)

Light:
  --background: oklch(0.99 0.003 250)
  --card:       oklch(1 0 0)
  --primary:    oklch(0.55 0.22 265)
  --accent:     oklch(0.52 0.22 295)
  --border:     oklch(0.92 0.005 255)
```

Reduzir intensidade de:
- `--shadow-glow`, `--shadow-elegant` → blur menor, opacidade 0.10–0.15 (era 0.35–0.40).
- `--gradient-primary` → gradiente sutil 165° entre primary e accent, **sem** o terceiro tom magenta.
- `--gradient-glow` → opacidade 0.08.

Remover/atenuar utilities "gamer" em `@layer utilities`:
- `.ai-glow` → manter mas com background-size estático e animação opcional via prop (default off).
- `.ai-pulse` → reduzir blur de 14px → 6px, opacidade máx 0.25.
- `.scan-line`, `.shimmer` → manter mas remover dos componentes globais (só usar em loading explícito).

Tokens do Playbook (`--playbook-neon`, `--shadow-neon`, `--shadow-gold`) ficam isolados ao módulo Playbook (telas internas que pedem visual diferenciado). **Não tocar.**

---

## 3. Tipografia premium

Adicionar via Google Fonts em `index.html`:
- **Display/headings**: `Geist` ou `Inter Display` (peso 500–600, tracking -0.02em).
- **Body**: `Inter` (400/500).
- **Mono** (badges, códigos): `Geist Mono` ou `JetBrains Mono`.

Atualizar `src/styles.css` com `--font-display`, `--font-body`, `--font-mono` e aplicar em `body` + `h1–h6`. Remover qualquer uso de `Space Grotesk`/`Sora` fora do Playbook.

---

## 4. Aplicação no app (sem mudar layout)

- **`src/components/AppHeader.tsx`**: trocar texto "EscalaFlow" por `<img src={logoHorizontal} alt="EscalaFlow" className="h-7" />`. Importar de `@/assets/brand/logo-horizontal.png`.
- **`src/components/AppSidebar.tsx`**: usar `logo-mark.png` colapsado, `logo-horizontal.png` expandido.
- **`src/routes/_authenticated.tsx`** (loading screen): trocar `<Loader2>` genérico por `logo-mark` + spinner discreto (border 2px primary, sem glow forte).
- **`src/routes/login.tsx`**: header com `logo-horizontal`.
- **`src/routes/__root.tsx`** + **`index.html`**: `<title>EscalaFlow — IA para criar, escalar e monetizar</title>`, meta description, og:image (`logo-mark` 1024 com fundo dark), favicon.
- **`public/favicon.ico`**: substituir por novo favicon (PNG renomeado ou via export). Limpar `public/placeholder.svg`, `public/og-image.png` se existirem com asset default.
- Botões `variant="default"`: revisar para usar `bg-primary` puro (sem `ai-glow`/`ai-pulse` no estado padrão).
- Cards do `PipelineHub`, `DualModeHub`, `ModePicker`: remover classes `ai-pulse`/`shadow-glow` do estado idle; manter apenas hover sutil.

---

## 5. QA visual

Após implementar:
- Rodar `bun run build` para validar bundle.
- Capturar screenshots: `/dashboard`, `/projetos`, `/criativos`, `/login` em dark + light.
- Comparar lado a lado com Linear/Jasper/Framer (referência mental) — checar contraste, peso de glow, harmonia de cor.
- Verificar favicon na aba do navegador.

---

## Arquivos novos

- `src/assets/brand/logo-horizontal.png`
- `src/assets/brand/logo-flat.png`
- `src/assets/brand/logo-mono.png`
- `src/assets/brand/logo-mark.png`
- `src/assets/brand/favicon.png`

## Arquivos editados

- `src/styles.css` (paleta, sombras, gradientes, fontes)
- `index.html` (fontes, favicon, meta, title)
- `src/routes/__root.tsx` (head, og)
- `src/routes/_authenticated.tsx` (loading)
- `src/routes/login.tsx`
- `src/components/AppHeader.tsx`
- `src/components/AppSidebar.tsx`
- `public/favicon.ico` (substituído)

## Ordem de execução

1. Gerar 5 logos (premium, transparent).
2. Atualizar `styles.css` (paleta + sombras + fontes).
3. Atualizar `index.html` + `__root.tsx` (fontes, meta, favicon).
4. Trocar logo em Header/Sidebar/Login/Loading.
5. Sweep de utilities `ai-pulse`/`shadow-glow` em estados idle de cards/botões globais.
6. Build + QA visual + screenshots.

## Pergunta antes de começar

Confirma que posso **gerar os 5 logos via IA** com a direção descrita (símbolo geométrico azul→roxo, wordmark "EscalaFlow" em Geist/Inter, sem partículas)? Ou prefere enviar uma versão final do logo já desenhada por você, e eu só faço a paleta + tipografia + integração?
