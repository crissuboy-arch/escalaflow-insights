## Ajustes de branding — Sidebar + Header + Microinterações

Escopo: presença visual da marca. Sem mudar funcionalidade, rotas ou dados.

---

### 1. Sidebar — logo com mais presença

`src/components/AppSidebar.tsx` (header da sidebar):

- Aumentar altura do logo em ~35%: `h-7` → `h-10` (horizontal) e `h-7 w-7` → `h-9 w-9` (mark colapsado).
- Aumentar padding do `SidebarHeader`: de `px-2 py-2` para `px-3 py-4` para dar respiro premium.
- Trocar o hack `dark:invert dark:brightness-200` (que distorce cores) por usar **`logo-mono.png` no dark** e `logo-horizontal.png` no light, via `useTheme()` do `ThemeProvider`. Isso melhora contraste sem inverter pixels.
- Adicionar `transition-opacity duration-300` + `animate-fade-in` no logo para entrada suave.
- Hover dos itens do menu: trocar o highlight atual por `hover:bg-sidebar-accent/60 transition-colors duration-200` e adicionar `data-[active=true]:bg-sidebar-accent` com borda esquerda sutil de 2px em `--primary` (estilo Linear/ClickUp).

### 2. Header — área de branding maior

`src/components/AppHeader.tsx`:

- Aumentar altura: `h-14` → `h-16`.
- Adicionar slot opcional à esquerda do `SidebarTrigger` com o `logo-mark` (`h-6 w-6`) visível **apenas quando a sidebar está colapsada** (via `useSidebar().state === "collapsed"`), garantindo branding contínuo.
- Refinar borda: `border-border/60` → `border-border/40` + `backdrop-blur-md` para look Notion/Perplexity.

### 3. Loading screen — animação leve premium

`src/routes/_authenticated.tsx`:

- Aumentar logo do loading: `h-12` → `h-14`.
- Substituir o shimmer atual por:
  - logo com `animate-fade-in` (300ms) + `animate-pulse` muito sutil (opacidade 0.85 → 1.0, 2s).
  - barra inferior fina (1px, w-32) com gradiente `from-transparent via-primary to-transparent` deslizando — animação `shimmer` já definida em `styles.css`.
- Sem glow forte, sem partículas.

### 4. Favicon separado do logo principal

`src/assets/brand/`:

- Gerar **novo `favicon.png`** (512×512, transparent) — apenas o símbolo geométrico, mais condensado e legível em 16×16, **sem wordmark**, traço mais grosso que o `logo-mark`.
- Atualizar `public/favicon.png` (cópia) e `__root.tsx` (`rel="icon"` aponta para o novo).
- Manter `logo-mark.png` como app icon (1024) e OG image — não recriar.

### 5. Microinterações globais (sutis)

`src/styles.css` (já tem `fade-in`, `shimmer`):

- Garantir keyframe `shimmer` existe (adicionar se faltar): `0% { transform: translateX(-100%) } 100% { transform: translateX(100%) }`.
- Adicionar utility `.menu-item-hover` com `transition: background-color 180ms ease, color 180ms ease` para reuso.

Aplicar `animate-fade-in` (300ms) no `<main>` do `_authenticated.tsx` para fade premium ao trocar de rota.

### 6. Correção runtime de RLS (paralelo, fora de branding)

Console mostra `permission denied for function has_role`. Criar migração para `GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, anon;` — desbloqueia policies que usam essa função. Sem isso, várias queries quebram silenciosamente.

---

### Arquivos editados

- `src/components/AppSidebar.tsx` (logo maior, theme-aware, hover)
- `src/components/AppHeader.tsx` (h-16, mark quando colapsado)
- `src/routes/_authenticated.tsx` (loading refinado, fade no main)
- `src/routes/__root.tsx` (favicon novo)
- `src/styles.css` (utility hover, garantir keyframes)
- `public/favicon.png` (substituído)
- nova migração SQL (grant has_role)

### Arquivos novos

- `src/assets/brand/favicon.png` (regerado, símbolo condensado)

### Referências visuais

Linear (sidebar com logo grande + borda ativa esquerda), Notion (header alto, hover suave bg), Perplexity (loading com shimmer fino), ClickUp (branding contínuo header+sidebar).

### Não fazer

- Sem glow forte, sem partículas, sem efeitos espaciais.
- Sem gerar novos logos horizontais — os atuais funcionam bem após o resize.
- Sem mexer em módulos da esteira, server functions ou banco (exceto o grant de RLS).
