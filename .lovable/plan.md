## Objetivo

Padronizar todos os links externos do app (Facebook, ChatGPT, Gemini/AI Studio, perfis, biblioteca de anúncios, etc.) em um único helper robusto, com `target="_blank"`, `rel="noopener noreferrer"`, fallback `window.open` e proteção contra popup bloqueado. Garantir que nenhum clique falhe, em desktop, mobile e preview (iframe sandbox).

## Diagnóstico

Existem hoje DOIS helpers paralelos, o que causa comportamento inconsistente:

- `src/lib/external.ts` — robusto: tenta clique em `<a>` sintético → `window.open` → fallback de copiar para clipboard com toast. Exporta `openExternal`, `openInNewTab`, `openAdLink`, `openChatGPTWithPrompt`, `buildAdsLibraryUrl`.
- `src/lib/external/openExternal.ts` — simples: só `window.open`, sem fallback de anchor click (falha em iframes sandbox de preview).

Componentes consumidores misturam os dois imports. Há também ocorrências diretas de `window.open` e `window.location.assign` para links externos.

## Plano

### 1. Unificar em um único helper (`src/lib/external.ts`)

Manter o arquivo já robusto e adicionar funções específicas para os destinos pedidos:

- `openFacebook(url)` — abre Facebook/Meta com fallback.
- `openChatGPT(prompt?)` — copia prompt (se houver) e abre `https://chatgpt.com/`.
- `openGemini(prompt?)` — copia prompt e abre `https://gemini.google.com/app`.
- `openAIStudio(prompt?)` — copia prompt e abre `https://aistudio.google.com/`.

Todas reutilizam `openInNewTab`, que já implementa:
1. `<a target="_blank" rel="noopener noreferrer">` sintético + `.click()` (funciona em iframes/preview).
2. fallback `window.open(url, "_blank", "noopener,noreferrer")`.
3. fallback final: copia URL para clipboard + toast com instrução.

### 2. Remover o helper duplicado

- Deletar `src/lib/external/openExternal.ts`.
- Atualizar qualquer import que aponte para `@/lib/external/openExternal` para usar `@/lib/external`.

### 3. Substituir chamadas diretas

- `window.open(...)` em código de UI → `openInNewTab(...)` ou helper específico.
- `window.location.assign("https://...")` para links externos → `openInNewTab(...)`. Manter `window.location.assign("/rota-interna")` apenas para navegação interna.
- Qualquer `<a href="https://...">` em componentes → adicionar `target="_blank" rel="noopener noreferrer"` (auditar e padronizar).

### 4. Página `/link-externo` (interstitial)

Já usa `openInNewTab`. Garantir que todos os botões (anúncio, biblioteca, perfil) chamem o helper unificado e que o `<a class="btn">` em `public/go.html` tenha `rel="noopener noreferrer"` (já tem).

### 5. Validação

Após implementação:
- `bun run build` para garantir sem regressão.
- Browser tools: navegar até `/minerar`, `/ofertas-salvas`, `/central-mineracao`, `/analise-ia`, `/link-externo`. Clicar em "Abrir anúncio", "Abrir ChatGPT", "Abrir Gemini" e verificar que nova aba abre OU que o toast de fallback aparece.
- Testar viewport mobile (375px) com `set_viewport_size`.

### Detalhes técnicos

Arquivos a editar:

- `src/lib/external.ts` — adicionar `openFacebook`, `openChatGPT` (renomear de `openChatGPTWithPrompt` mantendo alias retro-compatível), `openGemini`, `openAIStudio`.
- `src/lib/external/openExternal.ts` — remover.
- `src/routes/_authenticated/central-mineracao.tsx` — trocar `openChatGPTWithPrompt` por `openChatGPT`; conferir uso de `openExternal`.
- Buscar e migrar qualquer outro consumidor de `@/lib/external/openExternal`.
- Auditar `<a href="http">` em todos os componentes para garantir `target="_blank" rel="noopener noreferrer"`.

Sem mudanças de design, layout ou lógica de negócio — apenas confiabilidade de navegação externa.
