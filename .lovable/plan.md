# Plano: Refinamento Premium EscalaFlow

Tudo mock/local, sem backend.

## 1. Página Favoritos como biblioteca premium (`src/routes/_authenticated/favoritos.tsx`)

- Cabeçalho com contador de itens e ícone Heart em destaque.
- Grid responsivo: 1 col mobile, 2 col md, 3 col lg (cards maiores que o padrão de Minerar).
- Novo `<FavoriteCard />` inline com:
  - imagem maior (aspect 16/10), overlay gradiente
  - estrela amarela grande no canto com glow constante
  - badges modernos (rounded-full, ícones)
  - score grande sobre a imagem
  - hover: glow + lift via `card-glow` e `framer-motion`
  - botão "Analisar" com gradient + botão para remover favorito
- Empty state visual com ícone, mensagem e CTA "Minerar ofertas".

## 2. Botão "Minerar com IA" mais premium (`src/routes/_authenticated/minerar.tsx`)

- Wrap do botão com camada de glow pulsante (div absolute blur).
- Ícone Wand2 com pequena rotação no hover (motion).
- Pequena partícula/sparkle animado ao lado do texto.
- Loading dentro do dialog: substituir spinner por animação de "scan" — barra horizontal cruzando + 3 dots digitando "Analisando padrões…".

## 3. Tendências detectadas pela IA enriquecidas

Atualizar mock no array `TRENDS` em minerar.tsx para cada item conter: emoji, título, subtítulo, **score**, **growth %**, **time**, **country**, **trendDirection** (up/down/stable). Renderizar:
- linha do topo: emoji + título + badge de país
- linha meio: barra de score mini + % crescimento (verde com seta)
- rodapé: "há 2h" + indicador visual de tendência (sparkline minimalista CSS ou ícone TrendingUp animado)

## 4. Página individual da oferta — header premium (`src/routes/_authenticated/oferta.$id.tsx`)

Nova grade de métricas abaixo do banner (4 cards):
- **Score gigante**: círculo SVG com progresso animado, valor central enorme, label de status.
- **Anúncios ativos**: número derivado mock (ex.: `score * 1.7`), com ícone Megaphone.
- **Países detectados**: chips de bandeiras (3-5 países mock).
- **Tempo estimado de escala**: ex. "12 dias", ícone Clock.
- **Tendência de crescimento**: % + seta + sparkline mock.
- **Status premium**: badge gradiente "🔥 Hot", "🚀 Escalando" etc.

## 5. Mapa Estratégico da Oferta

Novo card `MapaEstrategico` na página da oferta. Layout em grid 2x4 (responsivo) com 8 blocos visuais conectados:
- Mecanismo, Promessa, Dores, Desejos, Avatar, CTA, Tipo de criativo, Tipo de funil.
- Cada bloco: ícone colorido + título + texto curto da `analysis`.
- Estilo "mapa": fundo gradient sutil, bordas glow, micro animação de fade-in com stagger.

## 6. Score de Oportunidade

Novo card `ScoreOportunidade` na página da oferta. 5 métricas com barras horizontais animadas:
- Fácil de copiar (0-100)
- Concorrência (0-100, invertido visualmente — vermelho alto = ruim)
- Potencial viral
- Saturação (invertido)
- Ticket provável (R$ XX-XXX, mostrado como faixa)

Valores derivados deterministicamente do `offer.id`/`scale_score` para serem consistentes. Cada barra com cor semântica (verde/amarelo/vermelho) e ícone.

## 7. Refinamento visual geral

- Adicionar utilitário `.glass` em `src/styles.css` (backdrop-blur + border sutil) para uso em headers de cards premium.
- Reduzir uso de `Badge variant="secondary"` em favor de chips com ícones.
- Garantir contraste em dark/light verificando os novos componentes.
- Stagger animations consistentes (delay 0.05s entre filhos).

## Arquivos afetados

- `src/styles.css` — utilitário `.glass`, animação pulse para botão IA, sparkline base.
- `src/lib/queries.ts` — enriquecer `getAITrends`/novo helper `getOfferMetrics(id)` retornando ads ativos, países, tempo escala, growth, opportunity scores.
- `src/routes/_authenticated/minerar.tsx` — botão IA premium, trends enriquecidas, loading scan.
- `src/routes/_authenticated/favoritos.tsx` — biblioteca premium com `FavoriteCard` inline.
- `src/routes/_authenticated/oferta.$id.tsx` — métricas no header, Mapa Estratégico, Score de Oportunidade.

Sem novas dependências.
