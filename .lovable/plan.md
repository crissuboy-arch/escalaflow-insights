
## Diagnóstico

Mapeei o app, sidebar, `PipelineHub`, `DualModeHub`, `projetos.$id.tsx` e as rotas de Playbook/Ebook. As rotas existem e estão registradas corretamente, mas há **fluxos mortos** (botões que abrem placeholders), **estados vazios sem ação real** e **guardas de auth inconsistentes**. O erro de runtime atual (`virtual:tanstack-start-client-entry`) é uma reotimização do Vite após mudanças no lockfile e some no próximo refresh — não é bug de código.

## Problemas que vou corrigir

1. **Tabs `Copy / Criativos / Página / Checkout / Escala` dentro de `/projetos/$id` mostram "Em construção Fase 2"** — clicar nesses cards no Hub leva o usuário a uma tela morta. Vou plugar os componentes que já existem (`StandaloneBriefingForm` + `CopyResult`, `CreativeWizard`, `SalesPageResult`) nesses tabs, lendo `briefing` do projeto e persistindo em `meta.copy / meta.creatives / meta.salesPage` via `updateProject`. `checkout` ganha um form simples (preço, âncora, bônus, order bump, garantia, link Kiwify/Hotmart/Stripe) salvando em `meta.checkout`. `escala` vira um checklist real lendo `ebook_id / playbook_id / meta.*` com botões que navegam para a etapa pendente.

2. **Hubs `criativos / pagina-venda / checkout / escala` só listam projetos** — se o usuário não tem projeto, a tela termina em um aviso. Vou padronizar todos no `DualModeHub` (igual ao `copy`), reaproveitando os mesmos wizards standalone do item 1, com fallback "Criar projeto" no modo projeto. Nada de módulo novo — só reaproveitamento.

3. **PipelineHub: estado vazio sem ação** — botão único "Ir para Projetos". Vou trocar por "Criar novo projeto" que abre `/projetos?new=1`, e ajustar `projetos.tsx` para abrir o diálogo de criação automaticamente quando esse search param estiver presente.

4. **Guard de auth inconsistente** — `produtos.playbook.tsx`, `produtos.playbook.novo.tsx`, `produtos.playbook.$id.tsx` e `produtos.playbook.$id.editar.tsx` não têm `beforeLoad` (dependem só de `_authenticated`). Em refresh direto, os `useServerFn` disparam antes da hidratação e mostram loading infinito ou erro 401. Adiciono `beforeLoad` com `supabase.auth.getUser()` igual aos demais.

5. **Loading infinito no PipelineHub** quando `listProjects` falha silenciosamente — o `.catch(() => setRows([]))` esconde o erro real. Vou logar e mostrar toast + estado de erro recuperável com botão "Tentar de novo".

6. **`projetos.$id.tsx`: tab inicial não respeita `?tab=`** quando `defaultValue` é setado mas `value` não — uso controlado de `Tabs` para que navegação `Hub → Projeto?tab=copy` realmente abra a aba certa.

7. **Salvar e continuar rascunho de projetos**: `updateProject` já faz deep-merge em `meta` (corrigido na fase anterior). Vou garantir que cada novo tab (copy/criativos/página/checkout) salve via `updateProject({ id, patch: { meta: { copy: ... } } })` ao concluir, e que ao reabrir o projeto o estado seja hidratado a partir de `meta.*` — fluxo "rascunho que continua".

## Validação final

- `bun run build` precisa passar (typecheck strict).
- Caminhar manualmente cada item do checklist do usuário (Playbook, Ebook, Copy, Criativos, Página, Checkout, Escala, Projetos) abrindo do sidebar e a partir do hub do projeto.
- Conferir que cada botão visível leva a um fluxo (gerar, abrir editor, exportar, ou criar projeto) — nenhum onClick vazio.

## Fora de escopo (mantido para depois, conforme pedido)

- Criar novos módulos / nova IA / novos formatos de criativos.
- Refatorar visual; só ajustes mínimos onde estado vazio era confuso.
- Deletar funcionalidades existentes.

## Entregável final

Resposta com **duas listas**: (a) o que foi corrigido, (b) o que ainda falta — sem narração extra.
