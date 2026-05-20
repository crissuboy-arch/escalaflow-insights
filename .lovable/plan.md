# Refresh Visual Premium — Flow / EscalaFlow

## Objetivo
Atualizar **somente a camada visual** (logo, paleta, tokens, efeitos, loading) para um look AI Mission Control / Cyber Tech, **sem remover módulos, rotas, sidebar, dashboards ou funcionalidades**.

## Premissas
- Nenhuma mudança de rota, server function, schema ou lógica de negócio.
- Sidebar, AppHeader, dashboards e todos os componentes existentes permanecem — apenas trocam tokens/visual.
- Toda cor passa por tokens semânticos em `src/styles.css` (oklch). Nenhuma cor hardcoded em componentes.

---

## 1. Nova logo (a partir da imagem enviada)

Salvar a imagem enviada como base e gerar variantes em `src/assets/brand/`:
- `logo-mark.png` — só o símbolo "F" (substitui o atual)
- `logo-horizontal.png` — símbolo + wordmark "Flow" (substitui)
- `logo-mono.png` — versão dark-mode (mesma arte, já é escura)
- `logo-glow.png` — versão com glow azul mais intenso para splash/login
- `favicon.png` — 512×512, apenas o símbolo, fundo transparente
- `app-icon.png` — 512×512, símbolo em card arredondado

Também substituir `public/favicon.png` e `public/og-image.png`.

**Pontos de uso já existentes (apenas trocamos o arquivo, sem mexer em código):**
sidebar header, AppHeader, splash do `_authenticated.tsx`, tela `/login`, root metadata (`__root.tsx`: favicon + og:image + theme-color).

## 2. Paleta oficial nova (tokens em `src/styles.css`)

Substituir os blocos `:root` e `.dark` por uma paleta única **dark-first** baseada nos hex fornecidos, convertidos para oklch:

| Token | Hex alvo | Uso |
|---|---|---|
| `--background` | `#050816` | fundo app |
| `--card` / `--popover` | `#0E1628` | cards |
| `--secondary` / `--muted` | `#0A1020` | superfícies secundárias |
| `--border` / `--input` | `#163BFF` @ 20% | bordas com tom neon |
| `--primary` | `#0A6CFF` | azul principal |
| `--primary-glow` | `#3BA3FF` | glow |
| `--accent` | `#1D8FFF` | neon ativo |
| `--ring` | `#4DA3FF` | foco |
| `--foreground` | `#F8FAFC` | texto |
| `--muted-foreground` | `#94A3B8` | texto secundário |
| `--destructive` | vermelho mantido |
| `--sidebar*` | derivados de `#050816`/`#0E1628` |
| `--chart-1..5` | escala azul→ciano→roxo (`#7C3AED` como acento) |

Light mode: manter chave existente mas reespelhar como variação clara da mesma paleta (branco/cinza com primary `#0A6CFF`) — apenas para não quebrar o `ThemeToggle`. Default fica **dark**.

Novos tokens utilitários:
```
--gradient-primary: linear-gradient(135deg, #0A6CFF, #1D8FFF);
--gradient-mission: radial-gradient(1200px 600px at 20% 0%, #163BFF22, transparent 60%),
                    radial-gradient(800px 400px at 80% 100%, #7C3AED1A, transparent 60%);
--shadow-neon: 0 0 0 1px #163BFF33, 0 8px 32px -8px #0A6CFF4D;
--shadow-glow-strong: 0 0 40px #3BA3FF40;
--ring-neon: 0 0 0 1px #1D8FFF, 0 0 24px #1D8FFF55;
```

## 3. Background futurista

Adicionar em `body` (via `@layer base`) o `--gradient-mission` como camada fixa + um SVG/CSS grid sutil (`background-image: linear-gradient(...) , radial-gradient(...)`) com opacidade baixa. Sem partículas pesadas — apenas CSS.

## 4. Sidebar premium (mesma estrutura, novo skin)

Em `src/components/ui/sidebar.tsx` **não tocamos na API**, apenas atualizamos classes nos arquivos consumidores (`AppSidebar.tsx`):
- Item ativo: fundo `bg-primary/10`, borda esquerda `border-l-2 border-primary`, glow `shadow-[var(--ring-neon)]`.
- Hover: `hover:bg-white/[0.03]` + `transition-all duration-200`.
- Ícones: manter lucide; aplicar `text-primary` no ativo, `text-muted-foreground` no resto.
- Header: logo horizontal nova com leve `drop-shadow-[0_0_12px_#3BA3FF40]`.

## 5. Cards premium

Adicionar utilitário `.card-premium` em `styles.css`:
```
.card-premium {
  background: linear-gradient(180deg, #0E1628, #0A1020);
  border: 1px solid color-mix(in oklab, var(--primary) 18%, transparent);
  box-shadow: var(--shadow-neon);
  transition: box-shadow .3s, transform .3s, border-color .3s;
}
.card-premium:hover { box-shadow: var(--shadow-glow-strong); border-color: var(--primary); }
```
Aplicar apenas onde o Card já é usado **adicionando** a classe via `className` — sem trocar componente.

## 6. Loading / splash

Atualizar o bloco de loading em `src/routes/_authenticated.tsx`:
- Logo central nova (`logo-glow.png`) com `animate-pulse` + ring rotativo (CSS keyframes `spin-slow`).
- Anel concêntrico com `border-primary/40` e segundo anel com glow.
- Texto rotativo: "Inicializando Inteligência…" / "Conectando Agentes…" (i18n keys novas em `pt/en/es/fr`).
- Mesma tela usada como splash inicial em `__root.tsx` (componente compartilhado novo `src/components/BrandSplash.tsx`).

## 7. Login

Em `src/routes/login.tsx`: trocar background pelo `--gradient-mission`, logo nova com glow, card de form com `.card-premium`. Sem mudar formulários/funções de auth.

## 8. AppHeader

Em `src/components/AppHeader.tsx`: leve backdrop-blur, borda inferior `border-primary/15`, badge de notificação com glow neon. Logo reduzida só em mobile.

## 9. Dashboard vivo

Em `src/routes/_authenticated/dashboard.tsx`:
- Stat cards: classe `.card-premium`, número com `tabular-nums` + animação de contagem (componente novo `CountUp.tsx`, framer-motion já instalado).
- Recharts: `stroke="var(--primary)"`, `Line` com `filter: drop-shadow(0 0 6px var(--primary))` via wrapper `<g>`.
- Tooltip: fundo `#0E1628`, borda neon.
- Pequenas partículas decorativas no topo via `.scan-line` já existente.

Sem alteração nas queries ou dados.

## 10. Motion UI

- Hover em itens da sidebar e cards: `transition-all 200ms ease-out`.
- Fade-in de rota: já existe `animate-fade-in` no `<main>`. Adicionar `animate-scale-in` nos cards via stagger framer-motion onde já é usado.
- Botões primários: ganham `.btn-glow` (gradient + glow hover).

## 11. Metadata & PWA

Em `src/routes/__root.tsx`:
- `theme-color` → `#050816`.
- `og:image` → novo `og-image.png` (1200×630 com logo + slogan "Minere. Crie. Escale.").
- Favicon e apple-touch-icon → novos arquivos.
- Title mantém, description mantém.

## 12. i18n

Adicionar chaves em `src/i18n/locales/{pt,en,es,fr}.json`:
- `splash.initializing` = "Inicializando Inteligência…"
- `splash.connectingAgents` = "Conectando Agentes…"

---

## Arquivos tocados

**Editar:**
- `src/styles.css` (paleta + utilitários novos)
- `src/routes/__root.tsx` (metadata + theme-color)
- `src/routes/_authenticated.tsx` (splash usa BrandSplash)
- `src/routes/login.tsx` (skin)
- `src/components/AppHeader.tsx` (skin)
- `src/components/AppSidebar.tsx` (classes ativo/hover + drop-shadow logo)
- `src/routes/_authenticated/dashboard.tsx` (card-premium + CountUp + recharts glow)
- `src/i18n/locales/{pt,en,es,fr}.json`

**Criar:**
- `src/components/BrandSplash.tsx`
- `src/components/CountUp.tsx`
- `src/assets/brand/logo-mark.png` (novo, sobrescreve)
- `src/assets/brand/logo-horizontal.png` (novo, sobrescreve)
- `src/assets/brand/logo-mono.png` (novo)
- `src/assets/brand/logo-glow.png` (novo)
- `src/assets/brand/favicon.png` (novo, sobrescreve)
- `src/assets/brand/app-icon.png` (novo)
- `public/favicon.png` (novo, sobrescreve)
- `public/og-image.png` (novo, sobrescreve)

**Não tocar:** server functions, supabase, rotas, sidebar API, router, lógica de agentes, playbook, ebook, scale, etc.

## Geração da logo
A nova logo será gerada com `imagegen` a partir da referência enviada (símbolo "F" estilizado azul neon com motion blur + wordmark "Flow"), em PNG transparente, premium quality, gerando as 6 variantes listadas. Cada variante passará por QA visual antes do uso.

## Verificação final
1. Visitar `/login`, `/dashboard`, `/projetos`, `/produtos/playbook`, `/produtos/ebook`, `/escala` — confirmar consistência.
2. Conferir favicon na aba e theme-color no mobile.
3. Toggle light/dark sem cores residuais antigas.
4. Glow sem exagero (passa em contraste WCAG AA para texto).
5. Logo nítida em 1×, 2× e mobile.
