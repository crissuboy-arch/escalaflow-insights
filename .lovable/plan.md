## EscalaFlow — Núcleo da Plataforma SaaS

Plataforma internacional de mineração de ofertas e análise de criativos com IA. Esta primeira versão entrega o **núcleo navegável e autenticado**, sem checkout, Stripe, geração de ebooks, automações ou SEO.

---

### 1. Backend (Lovable Cloud)

Habilitar Lovable Cloud e configurar:

- **Auth**: Email/senha + Google OAuth
- **Tabela `profiles`** (vinculada a `auth.users`, com trigger de criação automática):
  - `id`, `email`, `full_name`, `avatar_url`, `preferred_language` (default `pt`), `theme` (default `dark`), `created_at`
  - RLS: usuário só lê/edita o próprio perfil
- **Tabela `user_roles`** (enum `app_role`: `admin`, `user`) + função `has_role()` security definer (preparada para futuros módulos admin)
- **Tabela `mined_offers`** (estrutura limpa para popular com seed):
  - `id`, `advertiser_name`, `image_url`, `summary`, `scale_score`, `platform`, `country`, `niche`, `keyword`, `ads_count`, `status` (enum: `teste`, `validando`, `escalando`, `quente`), `created_at`
- **Tabela `saved_offers`**: `id`, `user_id`, `offer_id`, `is_favorite`, `created_at` — RLS por `user_id`
- **Tabela `ai_analyses`**: `id`, `offer_id`, `user_id`, `promise`, `mechanism`, `pains` (jsonb), `desires` (jsonb), `target_audience`, `mental_triggers` (jsonb), `offer_structure`, `creative_suggestions` (jsonb), `created_at`
- **Seed**: ~20 ofertas demo realistas (marcadas como `is_demo = true`) populando `mined_offers` e algumas `ai_analyses` para visualização imediata da UI

---

### 2. Estrutura de Rotas (TanStack Start)

```text
src/routes/
  __root.tsx                 → providers (theme, i18n, auth context)
  index.tsx                  → redirect → /login ou /dashboard
  login.tsx                  → página pública
  _authenticated.tsx         → guard + layout com sidebar
  _authenticated/
    dashboard.tsx
    minerar.tsx              → Minerar Ofertas
    ofertas-salvas.tsx
    ofertas-escaladas.tsx
    analise-ia.tsx
    favoritos.tsx
    configuracoes.tsx        → idioma, tema, perfil
```

---

### 3. Sistema Multilíngue

- Biblioteca: **i18next + react-i18next** (preparada para escalar)
- Estrutura: `src/i18n/locales/{pt,en,es,fr}/common.json`
- Detector automático + persistência via `profiles.preferred_language`
- Toggle no header e em Configurações
- Todas as strings da UI já externalizadas desde o início

---

### 4. Tema Dark/Light

- Provider próprio (`next-themes` style) com toggle no header
- Tokens definidos em `src/styles.css` via `oklch`:
  - **Dark**: `--background: #0F172A`, `--card: #111827`, `--primary: #7C3AED` (roxo), `--accent: #06B6D4` (cyan)
  - **Light**: `--background: #F8FAFC`, `--card: #FFFFFF`, mesma identidade de primário/accent
- Gradientes premium (`--gradient-primary`, `--gradient-glow`) e sombras (`--shadow-elegant`) como tokens reutilizáveis

---

### 5. Layout & Componentes

- **AppSidebar** (shadcn `Sidebar`, collapsible icon): Dashboard · Minerar Ofertas · Ofertas Salvas · Ofertas Escaladas · Análise IA · Favoritos · Configurações
- **Header**: SidebarTrigger, seletor de idioma (PT/EN/ES/FR), toggle dark/light, avatar com menu (perfil, sair)
- **Cards** com bordas suaves, glass effect sutil no dark, animações em hover (framer-motion)

---

### 6. Páginas — Conteúdo

**Dashboard**: 4 KPI cards (ofertas mineradas, salvas, análises IA, ofertas quentes), gráfico de tendência de score, lista das últimas 5 ofertas escaladas.

**Minerar Ofertas**: formulário (Palavra-chave, Nicho, País, Plataforma select, Quantidade slider) + botão "Minerar Ofertas". Resultados em grid de cards com imagem, anunciante, resumo, badge de score, plataforma, ações **Analisar com IA** e **Salvar**. Nesta versão a busca filtra os dados seed.

**Ofertas Escaladas**: tabela shadcn com colunas (anunciante, score, qtd anúncios, nicho, país, status, data), busca, ordenação. Badges coloridas por status (Teste cinza, Validando azul, Escalando roxo, Oferta Quente cyan/gradiente).

**Análise IA**: seleção de oferta → painel com seções: Promessa principal, Mecanismo único, Dores, Desejos, Público-alvo, Gatilhos mentais, Estrutura da oferta, Sugestões de criativos. Layout em grid de cards, dados vindos de `ai_analyses` seed.

**Ofertas Salvas / Favoritos**: grid filtrado de `saved_offers` do usuário, com toggle de favorito.

**Configurações**: dados do perfil, troca de idioma, troca de tema, logout.

---

### 7. Stack & Padrões

- TanStack Start + Vite + React 19 (já configurado no template)
- Tailwind v4 + shadcn/ui + framer-motion
- Supabase via clients gerados (`client`, `auth-middleware`, `client.server`)
- `createServerFn` com `requireSupabaseAuth` para queries autenticadas
- Estrutura modular: `src/features/{auth,offers,analysis,i18n,theme}/` para preparar futuros módulos

---

### Fora do escopo desta entrega

Checkout, Stripe, integração real de mineração via APIs externas, geração automática de ebooks, automações, SEO/blog, módulos admin avançados. A arquitetura fica preparada para receber esses módulos depois sem refactor.
