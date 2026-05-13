## Goal

Cobrir o fluxo **Oferta → Projeto** com testes Playwright headless reais e instrumentar logs estruturados no servidor para que qualquer perda de estado seja diagnosticável via `stack_modern--server-function-logs`.

Sem alterar UI. Sem mexer em design tokens.

---

## 1. Logs de debug (server functions)

Criar `src/lib/debug/log.server.ts` com um helper único:

```ts
export function dlog(scope: "hydrate"|"persist"|"seed"|"read-fail", event: string, ctx: Record<string, unknown>)
```

Formato de saída:
`[hydrate|persist|seed|read-fail] event projectId=... module=... keys=[...]`

Pontos de instrumentação:

- `src/lib/project.functions.ts`
  - `loadProject` → `dlog("hydrate", "project.load", { id, hasMeta, metaKeys })`
  - `loadProject` no erro → `dlog("read-fail", "project.load", { id, error })`
  - `updateProject` → `dlog("persist", "project.update", { id, patchKeys, mergedMetaKeys })`
- `src/lib/project/seeding.server.ts`
  - antes do update → `dlog("seed", "fanout.start", { module, projectId, seedKeys })`
  - depois do update → `dlog("seed", "fanout.done", { module, projectId })`
  - no catch → `dlog("read-fail", "seed.fanout", { module, projectId, error })`
- `src/lib/copy.functions.ts`, `sales-page.functions.ts`, `checkout.functions.ts`, `ads-creative.functions.ts`, `scale.functions.ts`
  - Em cada handler que escreve em `projects.meta.*`, logar `dlog("persist", "<module>.save", { projectId, metaKey })` antes do `updateProject`/insert.

Os logs vão para o console do Worker e ficam acessíveis via `stack_modern--server-function-logs`.

## 2. Suite Playwright

Adicionar dependências:
- `@playwright/test` (devDep)
- script `package.json` → `"e2e": "playwright test"`, `"e2e:install": "playwright install --with-deps chromium"`

Estrutura:
```
playwright.config.ts
e2e/
  fixtures/
    auth.ts          // login programático + storageState reutilizável
    test-user.ts     // lê E2E_USER_EMAIL / E2E_USER_PASSWORD do env
  oferta-projeto.spec.ts
  hidratacao.spec.ts
  multi-projetos.spec.ts
```

`playwright.config.ts`:
- `baseURL` = `process.env.E2E_BASE_URL` (preview URL do Lovable, default ao Preview URL atual)
- `use.storageState` carregado por fixture
- `projects: [{ name: "chromium", use: devices["Desktop Chrome"] }]`
- timeout 60s, retries 1

`auth.ts`:
- Faz `supabase.auth.signInWithPassword` via API REST do Supabase (anon key) para gerar sessão, grava `storageState.json` em `.auth/`. Evita digitar no formulário.

### Specs

**`oferta-projeto.spec.ts`** — Fluxo principal
1. Vai em `/ofertas-salvas`, clica "Usar como projeto" na primeira oferta.
2. Espera redirect para `/projetos/:id?tab=briefing`.
3. Valida que aba **Briefing** está ativa e os campos estão preenchidos (`title`, `niche`, `promise`).
4. Para cada aba (`copy`, `criativos`, `pagina-venda`, `checkout`, `escala`): clica → preenche um campo único marcador (ex: `price = "R$ 199 E2E"`) → salva → verifica toast.
5. Recarrega (`page.reload()`) e confirma que cada marcador continua presente.

**`hidratacao.spec.ts`** — Estabilidade de estado
- Reload no meio de cada aba → marcador persiste.
- `page.goBack()` após salvar → ao voltar, marcador persiste.
- Troca rápida entre 5 abas em sequência → não perde nada (assert via `loadProject` indiretamente, lendo do DOM após reload).

**`multi-projetos.spec.ts`** — Isolamento
- Cria 2 projetos a partir de 2 ofertas distintas.
- Salva valores diferentes em `meta.copy` em cada um.
- Abre o outro e confirma que valores não vazaram.

### Cleanup

`global.teardown.ts` deleta projetos criados pelo run via `deleteProject` (chamada HTTP autenticada com o storageState).

## 3. Documentação

`e2e/README.md` curto:
- Variáveis: `E2E_BASE_URL`, `E2E_USER_EMAIL`, `E2E_USER_PASSWORD`.
- Comandos: `bun run e2e:install`, `bun run e2e`, `bun run e2e -- --ui`.
- Como ler logs: `stack_modern--server-function-logs` filtrando por `[hydrate]`, `[persist]`, `[seed]`, `[read-fail]`.

## 4. Não-objetivos

- Sem mudanças em componentes ou estilos.
- Sem nova migration.
- Sem alterar fluxo de criação/edição existente.

## Arquivos tocados

Novos:
- `src/lib/debug/log.server.ts`
- `playwright.config.ts`
- `e2e/fixtures/auth.ts`, `e2e/fixtures/test-user.ts`
- `e2e/oferta-projeto.spec.ts`, `e2e/hidratacao.spec.ts`, `e2e/multi-projetos.spec.ts`
- `e2e/global.teardown.ts`, `e2e/README.md`

Editados (apenas adicionar chamadas `dlog(...)`):
- `src/lib/project.functions.ts`
- `src/lib/project/seeding.server.ts`
- `src/lib/copy.functions.ts`
- `src/lib/sales-page.functions.ts`
- `src/lib/checkout.functions.ts`
- `src/lib/ads-creative.functions.ts`
- `src/lib/scale.functions.ts`
- `package.json` (scripts + devDependency)

## Aceitação

- `bun run e2e` passa localmente contra o preview URL com credenciais de teste.
- Cada cenário falho aponta o tab e o campo perdido.
- Logs `[hydrate]`/`[persist]`/`[seed]`/`[read-fail]` aparecem no `server-function-logs` com `projectId` correlacionável.
