# Fase 1 — Correções Críticas EscalaFlow

Foco: deixar a esteira atual estável **sem adicionar módulos novos**. Nada de tocar em ebook avançado, criativos 40 formatos, upload de PDF, escala ou auth-roles agora — esses entram nas próximas fases.

## 1. Playbook (prioridade #1)

Sintomas reportados: botão gerar não responde, abrir em nova aba quebra, exportar não funciona, geração trava.

Vou auditar e corrigir nesta ordem:

1. **`/produtos/playbook/novo`** — verificar o submit do wizard: garantir que `aiExtractPlaybookBriefing` e `aiGenerateSceneOutline` (server fns) sejam invocados via `useServerFn` (não chamada direta) e que erros de IA virem toast em vez de loader infinito.
2. **`/produtos/playbook/$id`** — garantir loader gateado por `_authenticated` (já está), tratar `notFoundComponent` e `errorComponent`, e trocar qualquer `window.open` quebrado por `<Link to="..." target="_blank">` tipado.
3. **Geração de cenas** — `aiGenerateSceneContent` e `aiGenerateSceneImage`: capturar `429`/`402` do gateway e mostrar mensagem clara; persistir resultado parcial após cada cena (UPDATE em `playbooks.scenes`) para não perder progresso.
4. **Exportações** — corrigir export PDF (`src/lib/playbook/pdf.ts`) e adicionar export DOCX usando `docx` (já em uso no ebook). Botão "Copiar conteúdo" copiando markdown completo do playbook.
5. **Conteúdos faltando do escopo** (Big Idea, Promessa, Mecanismo Único, Avatar, Dores, Desejos, Objeções, Gatilhos, Headlines, VSL, Funil, Oferta, Bônus, Stack, CTA, Scripts, Ângulos, Escala) — estender `PlaybookBriefingSchema` no server e o prompt do `aiExtractPlaybookBriefing` para retornar TODOS esses campos em um JSON estruturado, salvos em `playbooks.briefing`. UI nova: aba "Estratégia" no `/produtos/playbook/$id` renderizando cada bloco em `Card` com botão "Copiar".

## 2. Rotas, Loaders e Botões Mortos

Varredura sistemática de `src/routes/_authenticated/*` procurando:

- Rotas que usam `useState(true)` para loading sem `finally` → adicionar try/catch/finally.
- `useQuery` sem `errorComponent`/`notFoundComponent` na rota → adicionar os dois em todas as rotas com loader.
- Botões `<Button>` sem `onClick` ou com handler vazio → conectar à server fn correta ou remover.
- `<Link to="...">` apontando para rotas inexistentes → tipar com `routeTree` (já é gerado, vai falhar em build se quebrado) e corrigir destinos.

Rotas suspeitas a auditar: `radar`, `central-mineracao`, `analise-ia`, `favoritos`, `ofertas-escaladas`, `escala`, `checkout`, `pagina-venda`, `criativos`, `copy`. As 4 últimas hoje renderizam `StandaloneSoon` em modo avulso — vou manter o placeholder mas garantir que **modo projeto** funciona e o picker de modo não fica preso.

## 3. Salvar / Recuperar Projeto

- `src/lib/project.functions.ts`: revisar `saveProject`/`getProject`/`listProjects`. Garantir `updated_at = now()` em todo update e que `meta` (jsonb) faz merge em vez de overwrite (problema comum que apaga `meta.copy` ao salvar `meta.salesPage`).
- Adicionar autosave no `/projetos/$id` (debounce 1.5s) usando `useMutation` + toast silencioso.
- Botões: **Duplicar**, **Excluir** (com `AlertDialog` de confirmação), **Exportar** (JSON do projeto) — os dois primeiros já podem existir parcialmente; vou completar.

## 4. Remover Branding Lovable da UI

- `src/routes/__root.tsx` linha 43: trocar `twitter:site` de `@Lovable` para `@EscalaFlow`.
- Remover qualquer footer/watermark Lovable se presente em layouts (varredura `rg "lovable" src/components/`).
- **Não tocar** em `src/integrations/lovable/index.ts` (auto-gerado, é o auth provider — funcional, não é branding visível).
- Garantir favicon e título do `<head>` 100% EscalaFlow (já estão).

Observação: a marca "lovable.app" no domínio e o badge de publicação são controlados pela plataforma, não por código — a remoção do badge requer plano Pro via `publish_settings` (informo o usuário se relevante, não bloqueio a fase).

## 5. Validação Final da Fase

- `bun run build` limpo (sem warnings de rota inexistente).
- Smoke test manual via `browser--navigate_to_sandbox` em: `/dashboard`, `/projetos`, `/projetos/<id>`, `/produtos/playbook`, `/produtos/playbook/novo`, `/produtos/playbook/<id>`, `/copy`, `/pagina-venda`, `/criativos`, `/checkout`, `/escala`.
- Verificar console limpo (sem erros vermelhos) e nenhum loader infinito após 10s.

## Detalhes técnicos

- **Não** mexer em: schema do banco (sem migrations nesta fase), `src/integrations/supabase/*`, `src/integrations/lovable/index.ts`, ebook avançado, criativos 40 formatos.
- **Padrão de erro IA**: todo `handler` que chama `aiChat` envolto em try/catch retornando `{ ok: false, error: string }` discriminado, e a UI mostra `toast.error(error)` em vez de quebrar.
- **Padrão de server fn**: manter `discriminatedUnion("kind")` projeto/avulso já adotado; nada novo aqui.

## Fora desta fase (próximas)

- Fase 2: Playbook completo "versão longa" e prompt-set externo.
- Fase 3: Ebook IA premium + upload PDF + análise IA do PDF.
- Fase 4: Criativos 40 formatos com tooltip e exports externos.
- Fase 5: Página de Venda 10 dobras + Checkout completo + Escala do Produto.
- Fase 6: Auth roles admin/user e hardening RLS.

Confirma para eu executar a Fase 1?
