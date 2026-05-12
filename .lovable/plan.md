# Corrigir abertura de links externos (Facebook / ChatGPT / perfis)

## Diagnóstico

O problema não está nos call sites — todos já passam pelo helper `openExternal` em `src/lib/external.ts`. O problema é o **ambiente do preview**: o app roda dentro de um iframe do Lovable, então `window.open(url, "_blank")` chamado a partir do `window` interno às vezes:

- abre uma popup que herda o sandbox do iframe (cross-origin para Facebook/ChatGPT é bloqueada),
- ou é silenciosamente ignorada por bloqueador de popup,
- ou é interpretada como navegação dentro do iframe.

A correção definitiva é **delegar a abertura para o top frame** e usar um `<a target="_blank">` com clique sintético, que é o método que escapa do sandbox do iframe de preview de forma mais confiável (mantendo o gesto do usuário).

## Mudanças

### 1. `src/lib/external.ts` — reescrever o helper

Nova ordem de tentativas, todas dentro do mesmo gesto de clique:

1. Criar um `<a href={url} target="_blank" rel="noopener noreferrer">` invisível, anexar ao `document.body`, `.click()`, remover. Esta é a forma mais robusta dentro de iframes.
2. Se falhar (try/catch), tentar `window.top?.open(url, "_blank", "noopener,noreferrer")` (pode lançar por cross-origin — silenciar).
3. Se ainda falhar, tentar `window.open(url, "_blank", "noopener,noreferrer")`.
4. Se nada abrir, `toast.error("Permita popups para abrir links externos.")` e copiar a URL para o clipboard como fallback.

Continua aceitando lista de candidatos (`adUrl`, `snapshot.page_profile_uri`, `advertiserUrl`, `facebookUrl`, `instagramUrl`) e usando o primeiro `https?://` válido.

### 2. `openChatGPTWithPrompt`

Comportamento exigido:

1. `await navigator.clipboard.writeText(prompt)` (com fallback `document.execCommand("copy")` via `<textarea>` se Clipboard API não disponível dentro do iframe).
2. Chamar o novo `openExternal("https://chatgpt.com/")`.
3. `toast.success("Prompt copiado")` no sucesso da cópia, senão `toast.message("Abra o ChatGPT e cole seu prompt.")`.

### 3. Call sites do Facebook — garantir lista completa de fallbacks

Auditar e padronizar a ordem de candidatos do FB em todos os botões "Abrir anúncio" / "Perfil anunciante":

```
openExternal(
  ad.adUrl,
  ad.snapshot?.page_profile_uri,
  ad.advertiserUrl,
  ad.facebookUrl,
  ad.instagramUrl,
  ad.ad_library_id ? `https://www.facebook.com/ads/library/?id=${ad.ad_library_id}` : null,
  { errorMessage: "Link do anúncio não encontrado" },
)
```

Arquivos atingidos (apenas a lista de candidatos, sem mudar layout):

- `src/routes/_authenticated/minerar.tsx` (botão Abrir e botão Perfil)
- `src/routes/_authenticated/radar.tsx`
- `src/routes/_authenticated/central-mineracao.tsx`
- `src/routes/_authenticated/favoritos.tsx`
- `src/routes/_authenticated/ofertas-salvas.tsx`
- `src/routes/_authenticated/ofertas-escaladas.tsx`
- `src/routes/_authenticated/analise-ia.tsx`

### 4. ChatGPT call sites

Verificar que todos os botões "Enviar para ChatGPT" / "Abrir no ChatGPT" usam `openChatGPTWithPrompt(prompt)` e não `openExternal` direto. Hoje só `central-mineracao.tsx` usa; conferir se outras telas precisam.

## Fora de escopo

- Não mexer na extensão (`extension/`).
- Não mexer em layout/estilos.
- Não mexer em lógica de negócio dos cards.

## Validação

- Testar no preview do Lovable: clicar "Abrir" em Favoritos, Salvas, Escaladas, Minerar, Radar — deve abrir o Facebook em aba real.
- Clicar "Enviar para ChatGPT" — deve abrir `chatgpt.com` em aba nova com toast "Prompt copiado".
- Testar também na URL publicada (fora do iframe) para garantir que não regredimos.
