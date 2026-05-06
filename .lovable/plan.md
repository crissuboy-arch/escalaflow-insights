# Completar EscalaFlow — páginas faltantes e correções

## Estado atual

Já está implementado: schema (profiles, user_roles, mined_offers, saved_offers, ai_analyses) com RLS e seed, auth (Email + Google via Lovable Cloud), i18n (pt/en/es/fr), tema dark/light, sidebar, header, login, dashboard e Minerar Ofertas.

## Problema

A sidebar referencia rotas que ainda não existem (`/ofertas-salvas`, `/ofertas-escaladas`, `/analise-ia`, `/favoritos`, `/configuracoes`). Como o TanStack Router faz checagem de tipo das rotas, isso quebra o build e o preview fica em branco.

## O que vou fazer

1. **Criar as rotas autenticadas faltantes** em `src/routes/_authenticated/`:
   - `ofertas-salvas.tsx` — grid de `OfferCard`s das ofertas salvas pelo usuário (join `saved_offers` × `mined_offers`), com botão remover.
   - `ofertas-escaladas.tsx` — tabela moderna (shadcn `Table`) com colunas anunciante, score, nº anúncios, nicho, país, status (badge: Teste / Validando / Escalando / Oferta Quente), data.
   - `analise-ia.tsx` — listagem das análises (`ai_analyses`) em cards; ao clicar, modal/painel detalhado com promessa, mecanismo, dores, desejos, público, gatilhos mentais, estrutura e sugestões de criativos.
   - `favoritos.tsx` — mesma estrutura de Salvas, filtrando `is_favorite = true`, com toggle estrela.
   - `configuracoes.tsx` — perfil (nome, idioma preferido com persistência em `profiles.preferred_language`) + preferências de tema (dark/light/system).

2. **Reaproveitar componentes existentes** (`OfferCard`, `StatusBadge`, shadcn Table/Card/Dialog/Tabs).

3. **i18n** — acrescentar chaves novas (títulos, labels, placeholders, status) nos 4 idiomas.

4. **Validar** — após editar, conferir build/dev-log e abrir preview em `/login` para confirmar render.

## Fora do escopo (conforme solicitado)

Checkout, Stripe, geração de ebooks, SEO, automações, blogs. Sem alteração de schema — tabelas atuais já cobrem tudo.
