## Problema

O `createCampaignPlan` chama `google/gemini-2.5-pro` com até 6 imagens base64 numa única request síncrona. O Worker (Cloudflare) tem limite de ~100s por subrequest — Pro + imagens grandes estoura → `upstream request timeout`.

Streaming SSE pelo TanStack server function não é viável (serverFn retorna JSON). Em vez de reescrever a infra, vamos atacar as causas reais.

## O que mudar

### 1. `src/lib/scale.server.ts` — modelo + timeout + retry + fallback

- Novo helper `callGateway(messages, { model, timeoutMs, retries })`:
  - `AbortController` com timeout configurável (default **110s**, abaixo do limite do Worker).
  - `retries: 2` com backoff (1s, 3s) em: `429`, `408`, `502/503/504`, network/abort.
  - Logs `dlog("hydrate", "ai.call", { model, attempt, ms, status })`.
- `aiCreateCampaignPlan`: trocar `gemini-2.5-pro` por **`google/gemini-2.5-flash`** (multimodal, muito mais rápido, mesmo gateway). Pro fica como fallback opcional só se Flash falhar com erro de qualidade — não por timeout.
- `aiAnalyzeScale`, `aiNextTests`, `aiScalePlan`: também migrar para `gemini-2.5-flash` (já são tarefas curtas; Pro era exagero).
- Cap defensivo no servidor: se alguma `imageDataUrl` > ~3MB base64, recortar a lista (logar warning) — o cliente já comprime, isso é cinto+suspensório.

### 2. `src/lib/scale.functions.ts` — quebrar em 2 etapas + status

Em vez de uma chamada gigante, dividir o "Criar Plano" em etapas independentes, cada uma curta:

- **Etapa A — `extractCreativeContext`** (nova serverFn): recebe `imageDataUrls` + url/preço/oferta, chama Flash só para OCR/leitura visual e devolve um JSON pequeno (`headline`, `cta`, `precoVisivel`, `bonus`, `prova`, `layout`, `criativos[]`, `metricas?`). Timeout 60s, sem schema pesado.
- **Etapa B — `createCampaignPlan`** (existente, refatorada): passa a receber `extractedContext` em texto e **não recebe mais imagens** quando o cliente já chamou a etapa A. Prompt fica menor, resposta muito mais rápida.
- Compatibilidade: se cliente mandar só `imageDataUrls` (sem `extractedContext`), o servidor faz as duas etapas em sequência (mesma URL, sem mudar contrato externo).

### 3. `CampaignPlanForm.tsx` — progresso visual real

- Estado `stage: "idle" | "reading" | "planning" | "done"`.
- Fluxo do botão:
  1. Se houver imagens → `await extractCreativeContext({ imageDataUrls, ... })`, mostra "Lendo imagens e página…".
  2. `await createCampaignPlan({ extractedContext, ... })`, mostra "Gerando plano de campanha…".
- Substituir spinner único por um bloco com 2 linhas que ficam ✓ ao completar. Toast de erro amigável por etapa, com retry no botão.
- Sem trava de tela; estado `busy` continua bloqueando só o botão.

### 4. Logs (`dlog`) em pontos-chave

- `scale.plan.start { images, hasContext }`
- `scale.plan.extract.ok { ms, bytesIn }`
- `scale.plan.ai.start { model, attempt }`
- `scale.plan.ai.ok { ms }` / `scale.plan.ai.timeout { ms, attempt }` / `scale.plan.ai.retry`
- `scale.plan.done { totalMs }`

### 5. Cliente — compressão já existe, ajuste fino

`src/lib/scale/compressImage.ts` já comprime para ~2MB WebP. Manter; apenas:
- Forçar `maxBytes = 1.5 * 1024 * 1024` quando `images.length > 2` (várias imagens = menos bytes cada).
- Mensagem clara se uma imagem não comprimir abaixo do limite.

## Fora de escopo

- Streaming SSE real (exigiria sair de `createServerFn` para `createFileRoute` API + EventSource no cliente — overkill agora; o split em 2 etapas + Flash resolve o sintoma).
- Fila/jobs em background com polling (não há tabela `jobs` e o tempo final esperado com Flash + split fica ~15–40s, dentro do limite confortável).
- Mudar `aiAnalyzeScale` (1 imagem só) para etapas — já é curto.

## Critérios de aceite

- Gerar plano com 6 prints grandes não retorna mais `upstream request timeout`.
- UI mostra "Lendo imagens… → Gerando plano…" com checkmarks.
- Falha de rede num passo permite re-clicar sem reenviar tudo (etapa A em cache de estado local até nova edição de imagens).
- Logs no `stack_modern--server-function-logs` mostram a sequência das etapas com duração.

## Arquivos afetados

- `src/lib/scale.server.ts` (helper de gateway, modelo, novo `aiExtractCreativeContext`).
- `src/lib/scale.functions.ts` (nova serverFn `extractCreativeContext`, refator de `createCampaignPlan`).
- `src/components/pipeline/scale/CampaignPlanForm.tsx` (fluxo em 2 etapas + UI de progresso).
- `src/lib/scale/compressImage.ts` (cap dinâmico por nº de imagens).
