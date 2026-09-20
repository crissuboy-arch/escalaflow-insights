# ScalaFlow → Cris OS (MarketIntelligenceHandoff)

Transporte HTTPS+JSON, server-side only, entre o ScalaFlow e o receptor de
inteligência de mercado do Cris OS (Fase 9). Nenhum código do Cris OS vive
aqui — só o contrato de payload e o client HTTP.

## Arquivos

- `contract.ts` — tipo `MarketIntelligenceHandoff` + `computeHandoffId`
  (determinístico, para idempotência) + mappers por origem
  (`buildHandoffFromTikTokEscalate`, hoje o único).
- `client.ts` — `sendIntelligence`, `validateBeforeSend`, `healthCheck`,
  `isCrisOsConfigured`. Retry limitado só para erros transitórios
  (timeout/429/502/503/504); 400/401/403 falham imediatamente.
- `service.ts` — `handoffToCrisOs`: registra status em
  `intelligence_handoffs` (NOT_SENT/SENDING/SENT/FAILED) e nunca lança —
  uma falha do Cris OS nunca derruba a ação do ScalaFlow que a disparou.

## Único ponto conectado hoje

`escalateAnuncioFn` (TikTok, `src/lib/tiktok-radar.functions.ts`) — ver
auditoria na conversa. É a única ação server-side, em todo o repositório,
que já representa "oportunidade validada e pronta".

## Como conectar outra origem (Instagram/YouTube/Google Trends/Facebook)

Nenhuma dessas plataformas tem hoje uma ação equivalente a "escalar" — só
mine/list/analyze/delete/clear (Instagram/YouTube/Google Trends) ou
save/favorite/scale via `collected_ads` rodando no client (Facebook). Para
conectar uma delas sem tocar na mineração:

1. Escreva um `buildHandoffFrom<Origem>(row)` em `contract.ts`, preenchendo
   só os campos que a origem realmente captura — o resto é `UNKNOWN`/`null`,
   nunca inventado.
2. Chame `handoffToCrisOs(handoff, "<tabela>", "<id>", userId)` dentro da
   ação server-side já existente que representa "usuário decidiu que isso é
   uma oportunidade" (para Facebook, isso significa criar um pequeno server
   function novo, já que `saveCollectedAd`/`scaleCollectedAd` rodam no
   client hoje — não dá pra chamar o client Cris OS lá sem expor o token).
3. Nunca faça `await` bloqueante na resposta ao usuário — dispare e trate
   o erro com `.catch()`, como em `escalateAnuncioFn`.

## Variáveis de ambiente

`CRIS_OS_API_URL` — URL completa do endpoint receptor (não uma base; o
ScalaFlow nunca inventa nem completa um path). `CRIS_OS_INTEGRATION_TOKEN`
— enviado como `Authorization: Bearer <token>`. Ambas em `.env.example`
sem valor real; sem elas o handoff fica `NOT_SENT` e nenhuma chamada de
rede é feita.

## Situação do endpoint no Cris OS

Não há, neste repositório, nenhuma evidência de uma URL HTTP já publicada
pelo Cris OS. O lado ScalaFlow está pronto (client + contrato + testes);
falta o Cris OS expor um endpoint HTTP que aceite
`POST` + `Authorization: Bearer <token>` + o JSON de `MarketIntelligenceHandoff`
(ver `contract.ts`) e responda 2xx em sucesso, ou 400/401/403 em erro
definitivo, ou 429/502/503/504 se for para o ScalaFlow tentar de novo.
