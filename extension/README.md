# EscalaFlow Miner (extensão Chrome)

Extensão MV3 que injeta um menu de inteligência nos cards da Meta Ads Library
(`facebook.com/ads/library`) e persiste os anúncios direto na Central de
Ofertas do EscalaFlow (`collected_ads` no Supabase).

## Arquitetura

- `content.js` — detecta os cards de anúncio na página, extrai os dados
  (anunciante, copy, CTA, mídia, plataformas, país, link de destino) e
  injeta o botão/menu "⚡ IA PRO" por card.
- `background.js` — service worker: faz o POST real para `/api/ingest`,
  dispara downloads de criativo (`chrome.downloads`) e abre o ChatGPT com o
  prompt estruturado.
- `popup.html`/`popup.js` — configura a URL do EscalaFlow e o mercado/país
  padrão da busca.

## Persistência (importante)

Antes desta versão, "Salvar no Flow" só mostrava um toast de sucesso sem
persistir nada de verdade: usava `window.postMessage` para se comunicar com
a aba do EscalaFlow, o que não funciona entre abas diferentes (o
comentário no código antigo já dizia isso: "Currently mocked locally").

Agora `background.js` faz um `fetch` real para `{endpoint}/api/ingest`, que
grava direto em `collected_ads` — a mesma tabela usada pelo coletor
server-side (Playwright/Apify) do "Minerar com Motor de Coleta". Não existe
mais armazenamento paralelo no navegador para esse fluxo.

## Longevidade (first_seen_at / last_seen_at)

Todo upsert em `collected_ads` passa por `src/lib/collector/persist.ts`:
- Ad novo (por `ad_library_id`, ou `ad_url` na ausência de ID) → grava
  `first_seen_at = now()`.
- Ad já visto antes → **preserva** `first_seen_at` e atualiza só
  `last_seen_at = now()`.

Isso é separado do `start_date` (quando a própria Meta informa a data de
início de veiculação do anúncio).

## Detecção de rede da oferta

`src/lib/offer-network.ts` classifica a URL de destino por padrão de
domínio/path (Hotmart, Kiwify, ClickBank, Digistore24, Shopify, Braip,
checkout próprio, ou "desconhecido" com confiança `alta`/`media`/`baixa`).
É puramente heurístico — nunca inventa uma rede sem evidência de URL.

## Pendente (não implementado nesta versão)

- **Transcrição de vídeo / tradução para PT-BR**: os botões existem no menu,
  mas mostram um aviso claro em vez de fingir que funcionam. O projeto não
  tem nenhuma integração de speech-to-text configurada (`aiService.ts` só
  fala com OpenAI/Anthropic para texto). Habilitar isso exige escolher um
  serviço pago (ex.: OpenAI Whisper) e configurar a chave — decisão que
  gera custo por uso, então não foi ativada automaticamente. As colunas
  `transcript_original` / `transcript_language` / `transcript_translated_pt`
  já existem em `collected_ads` para quando isso for implementado.
- **Seguir redirects da landing page**: hoje a URL de destino é a que está
  visível no HTML do card (ou o parâmetro `u=` de um redirect `l.facebook.com`
  já conhecido). Não fazemos uma requisição extra para resolver redirects
  em cadeia — isso é mais lento e teria custo de rede por anúncio.
- **Painel persistente sobre o card**: por segurança contra quebrar o layout
  da Ads Library (não há como testar visualmente essa extensão neste
  ambiente), a inteligência (Score, formato, CTA, país, data) aparece no
  menu ao clicar em "⚡ IA PRO", não como um overlay sempre visível.
