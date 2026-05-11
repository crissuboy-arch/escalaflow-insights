## Objetivo

Garantir que o módulo **Playbook** funcione de ponta a ponta (criar → escolher anúncio real → briefing → cenas → salvar → abrir → navegar) sem quebrar o **Ebook**, sem mexer no Minerador/Extensão e sem mock falso.

Não vou refatorar o Ebook agora — só preparar terreno (deixar o código limpo e a separação clara). Os 3 modos (KDP / Visual / Clean) ficam como evolução futura.

---

## Diagnóstico do que está quebrando

Após reler `playbook.functions.ts`, `playbook.server.ts`, `playbook/ads-source.ts`, `produtos.playbook.tsx`, `produtos.playbook.novo.tsx` e `produtos.playbook.$id.tsx`:

1. **`loadPlaybook` retorna o row cru do Supabase** — quando o `briefing` é grande ou tem tipo inesperado, o TanStack tenta serializar e às vezes estoura (`Response não serializável`). Vou normalizar a saída.
2. **Middleware `requireSupabaseAuth` lança `Response('Unauthorized', 401)`** — isso aparece como erro confuso no cliente. Vou capturar e devolver `{ ok:false, code:'unauthorized' }` nas funções públicas, para o front exibir mensagem clara.
3. **`extractPlaybookBriefing` / `aiGenerateSceneOutline` quebram a tela inteira quando a IA falha** — o wizard já tem fallback local, mas o erro vem como `throw` cru. Vou garantir que o `try/catch` do front sempre cubra (já cobre, mas estabilizar mensagens).
4. **`uploadPlaybookImage` joga erro se imagem vier vazia** — front já trata, ok, mas vou adicionar guard explícito.
5. **Persistência após F5** — o `savePlaybook` funciona, mas o reader (`/$id`) faz `loadPlaybook` que pode falhar silenciosamente quando `scenes` é `null`. Vou garantir default `[]`.
6. **Botão "Criar Playbook" e navegação** — funcionam; o problema reportado é o reader 404/branco quando o save falha. Vou adicionar toast de erro detalhado no save.

---

## Mudanças (escopo cirúrgico)

### `src/lib/playbook.functions.ts`
- `loadPlaybook`: normalizar saída (`scenes ?? []`, `briefing ?? {}`, garantir todos os campos do `Scene` defaults).
- `savePlaybook`: incluir `updated_at: new Date().toISOString()` explícito e devolver o row completo para o front evitar segundo round-trip.
- `uploadPlaybookImage`: validar `data:` prefix antes de tudo, retornar `{ url: null }` em vez de throw quando `dataUrl` for inválido.

### `src/routes/_authenticated/produtos.playbook.$id.tsx`
- Tipagem segura de `pb.scenes` (`Array.isArray(pb.scenes) ? pb.scenes : []`).
- Mensagem amigável quando o load falhar (já tem toast, vou adicionar botão "Voltar à biblioteca").

### `src/routes/_authenticated/produtos.playbook.novo.tsx`
- No `onGenerate`: se `saveFn` falhar, mostrar erro completo e **não navegar** (hoje já faz, mas o erro fica genérico). Vou logar `err` e exibir `err.message`.
- Persistir rascunho do wizard em `localStorage` (`playbook:draft:wizard`) — usuário não perde progresso ao dar F5 antes do save final.

### `src/lib/playbook/ads-source.ts`
- Sem mudanças funcionais. Só garantir que erro do Supabase (RLS / auth) não derrube tudo: continua silencioso (já está).

### Ebook
- **Nenhuma alteração agora.** Apenas adiciono um comentário no topo de `src/lib/ebook.functions.ts` marcando "TODO: 3 modos (KDP/Visual/Clean)" para evolução futura.

---

## Fora de escopo (explícito)

- Não toco em Minerador, Central de Mineração, extensão, `collected_ads`, `mined_offers`.
- Não mudo o design do Playbook.
- Não adiciono novos modos de Ebook agora.
- Não mexo em RLS nem em migrations.

---

## Aceite

- Clico em **Criar Playbook** → escolho anúncio real do Supabase → briefing gerado (ou fallback) → cenas → salva no Supabase → abre o reader → navego cenas → F5 → continua salvo.
- Ebook continua igual e funcional.
