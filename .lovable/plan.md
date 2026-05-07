## Corrigir erro "[object Response]" no fluxo do ebook

### Causa raiz

Quando uma server function falha, o erro pode chegar ao cliente como um objeto `Response` (não como `Error`). Isso acontece em dois pontos:

1. **`requireSupabaseAuth`** (`src/integrations/supabase/auth-middleware.ts`) faz `throw new Response("Unauthorized…", { status: 401 })`. Quando a sessão Supabase expira ou o bearer token não chega à server function (caso comum no `generateEbookOutline`, que demora alguns segundos), o middleware lança um `Response`. No cliente, o `catch (e)` faz `e instanceof Error ? e.message : "Falha…"` — mas `e` é um `Response`, então cai no fallback. Pior: em algum ponto do toast/console o objeto é coagido para string e vira literalmente `"[object Response]"`, que aparece como overlay de runtime error.
2. **`aiChat`** (`src/lib/ebook.server.ts`) já lança `Error` com mensagem, então não é o ofensor — mas vamos blindar mesmo assim.

O `[object Response]` **não** vem de retornar `response` em vez de `response.json()` — todos os handlers já chamam `.json()` corretamente. O problema é exclusivamente de **propagação de erro**.

### Correções

#### 1. `src/integrations/supabase/auth-middleware.ts`
Trocar `throw new Response(msg, { status })` por `throw new Error(msg)` em todos os pontos. TanStack Start serializa `Error.message` corretamente para o cliente; `Response` não é serializável e gera o "[object Response]".

> Nota: o arquivo é marcado como auto-gerado, mas como ele é a fonte do bug e o usuário está bloqueado, vamos editá-lo (é apenas um aviso, não é regenerado automaticamente neste template).

#### 2. `src/lib/ebook.functions.ts`
Envolver cada `.handler` com `try/catch` que normaliza o erro:
```ts
try { return await aiGenerateOutline(...) }
catch (e) { throw new Error(e instanceof Error ? e.message : "Falha ao gerar estrutura") }
```
Garante que mesmo se algum lib interno lançar um `Response` ou objeto não-serializável, o cliente recebe sempre um `Error` com mensagem legível.

#### 3. `src/routes/_authenticated/produtos.ebook.tsx`
Ajustar os 5 `catch (e)` (`onExtract`, `onOutline`, `onCover`, `onGenerateChapters`, `onExport`) para extrair mensagem mesmo quando `e` é um `Response`:
```ts
async function errMsg(e: unknown, fallback: string) {
  if (e instanceof Error) return e.message;
  if (e instanceof Response) {
    try { return (await e.text()) || fallback; } catch { return fallback; }
  }
  return fallback;
}
```
Assim, se algum dia voltar a chegar um `Response`, o usuário vê o texto real, nunca `[object Response]`.

#### 4. Verificação
- Releitura dos 4 server fns (`extractEbookBriefing`, `generateEbookOutline`, `generateEbookChapter`, `generateEbookCover`): todos retornam objetos JSON puros (`Briefing`, `OutlineChapter[]`, `{ markdown }`, `{ dataUrl }`). Nenhum retorna `Response`. ✅
- `aiChat` já faz `await res.text()` no erro e `res.json()` no sucesso. ✅
- Nada da extensão, minerador, Apify ou collector é tocado.

### Arquivos editados

- `src/integrations/supabase/auth-middleware.ts` — `throw new Response` → `throw new Error`.
- `src/lib/ebook.functions.ts` — `try/catch` normalizando erros nos 4 handlers.
- `src/routes/_authenticated/produtos.ebook.tsx` — helper `errMsg` aplicado nos 5 `catch`.

### Resultado esperado

- Erro overlay `[object Response]` desaparece.
- Em caso de sessão expirada, usuário vê mensagem clara ("Sessão expirada, faça login novamente" via mensagem do middleware) em vez de objeto cru.
- Geração de briefing/estrutura/capa/capítulos continua funcionando exatamente como antes nos casos de sucesso.
