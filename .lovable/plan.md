## Objetivo

Fazer o módulo Playbook funcionar de ponta a ponta sem mexer no Ebook, Minerador ou Extensão. Foco em destravar fluxo, dados reais e fallbacks robustos.

## Diagnóstico dos problemas atuais

1. **Etapa 1 (escolher anúncio)** usa apenas `fetchSavedAds/fetchFavoriteAds/fetchScaledAds` que leem do `localStorage`. Quem nunca salvou nada vê lista vazia, mesmo com dados reais em `mined_offers` e `collected_ads`.
2. **Server functions de IA** lançam `Error` quando `LOVABLE_API_KEY` falta, gateway dá 402/429 ou modelo não responde — sem fallback, o wizard trava.
3. **Imagens remotas (URL http)** entram em `image_url` no DB; o exportador de carrossel usa Canvas e quebra com CORS quando a imagem não tem cabeçalho permissivo. Imagens grandes em `dataUrl` também podem estourar payload do `update` no Supabase.
4. **Runtime error** `Failed to fetch dynamically imported module: virtual:tanstack-start-client-entry` indica HMR perdido após criação do módulo — restart do dev server resolve.
5. **Editor**: ao reordenar/excluir, `pb.scenes` muta `s.order` direto no objeto state (mutação) — pode causar render inconsistente.
6. **Leitor**: chama `loadPlaybook` sem checar se `scenes` veio nulo (ok hoje, mas falta proteção); dropdown export sem feedback quando não há cenas.

## Mudanças propostas

### 1. Fonte de anúncios reais (etapa 1 do wizard)

Criar `src/lib/playbook/ads-source.ts` (cliente) que combina, em ordem de preferência:

- `mined_offers` (Supabase, leitura pública autenticada) — fonte principal usada pelo Ebook/Central de Mineração.
- `collected_ads` (Supabase) — para detalhes de copy/cta quando existirem.
- `fetchSavedAds/Favorite/Scaled` (localStorage) — apenas como complemento, deduplicado por chave.

Normalizar para `PlaybookAd { id, advertiser, headline, copy, cta, platform, niche, country, score, imageUrl, videoUrl, adUrl, source }`. Deduplicação por `advertiser+headline`.

`produtos.playbook.novo.tsx` passa a consumir essa função e mostra contador "X anúncios disponíveis". Sem dados reais cai numa tela explicando como minerar (não em mock).

### 2. Server functions resilientes (`src/lib/playbook.server.ts`)

- Não jogar `Error` cru. Padronizar resposta `{ ok: true, data }` ou `{ ok: false, code: "NO_KEY"|"RATE_LIMIT"|"NO_CREDITS"|"AI_ERROR", message }`.
- `aiExtractPlaybookBriefing` e `aiGenerateSceneOutline` ganham fallback determinístico: se `code !== ok`, geram briefing/outline a partir do próprio anúncio (regras locais) e marcam `isFallback: true`. Wizard mostra `toast.warning("IA indisponível — gerei estrutura base, edite à vontade")`.
- `aiGenerateSceneImage` falha de forma branda: retorna `{ dataUrl: null }` em vez de throw. Cena fica com placeholder neon premium (já existe nos componentes).
- Manter `model: google/gemini-3-flash-preview` (texto) e `google/gemini-3.1-flash-image-preview` (imagem).

### 3. Wizard `produtos.playbook.novo.tsx`

- Refletir o novo formato `{ ok, data, code }`.
- Permitir avançar mesmo se a IA falhou (com aviso visível).
- Botão "Pular geração de imagens" na etapa 4 para criar playbook só com texto (mais rápido).
- Ao final: salvar via `savePlaybook`, navegar para `/produtos/playbook/$id`.

### 4. Persistência de imagens (evitar payloads gigantes)

Quando `imageFn` retorna `dataUrl` base64, fazer upload para o bucket `playbook-images` (já existe e é público) e salvar **apenas a URL pública** em `image_url`. Cria helper `uploadPlaybookImage` em `src/lib/playbook.functions.ts` (server function autenticada que recebe base64, decodifica e usa o supabase do contexto). Mantém compat: se já vier URL http, salva direto.

### 5. Leitor `produtos.playbook.$id.tsx`

- Guard: se `scenes` vazio, mostrar CTA "Editar playbook" em vez de footer fantasma.
- Contador "Cena X/Y" também visível em mobile.
- Botão "Voltar para biblioteca" e "Editar" já existem — só validar.

### 6. Editor `produtos.playbook.$id.editar.tsx`

- Eliminar mutação direta de `s.order` ao reordenar/remover (criar novos objetos com `.map((s,i)=>({...s, order:i}))`).
- Botão "Adicionar balão" e "Remover balão" individuais (hoje só edita por textarea — manter, mas ok).
- Validação leve antes de salvar (título não vazio).

### 7. Exports (PDF + Carrossel)

- PDF: já usa `pdf-lib` + fetch da imagem; ok.
- Carrossel (Canvas): para evitar CORS com URLs remotas, baixar a imagem via `fetch` em modo blob e desenhar via `createImageBitmap`. Se falhar, desenha gradiente neon com o título.

### 8. Restart do dev server

Após as mudanças (sem instalar nada novo), garantir que o erro `virtual:tanstack-start-client-entry` suma com restart automático do HMR.

## Arquivos afetados

- **Novo**: `src/lib/playbook/ads-source.ts`
- **Editado**: `src/lib/playbook.server.ts`, `src/lib/playbook.functions.ts`, `src/routes/_authenticated/produtos.playbook.novo.tsx`, `src/routes/_authenticated/produtos.playbook.$id.tsx`, `src/routes/_authenticated/produtos.playbook.$id.editar.tsx`, `src/lib/playbook/carousel.ts`
- **Não tocar**: módulo Ebook, Minerador, Central de Mineração, extensão.

## Critérios de aceite

- Abrir `/produtos/playbook/novo` lista anúncios reais de `mined_offers` + salvos.
- Cada botão do fluxo (Gerar briefing, Estruturar cenas, Próximo, Anterior, Salvar, Abrir, Editar, Exportar PDF, Exportar Carrossel, Roteiro) responde sem travar.
- Se a IA falhar, o wizard continua com estrutura local + toast de aviso.
- Playbook salvo aparece na biblioteca; leitor abre com cenas e navegação anterior/próximo + contador.
- Imagens grandes não estouram payload (upload para bucket).
- Ebook e minerador continuam intactos.
