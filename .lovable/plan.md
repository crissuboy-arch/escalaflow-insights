
# Escala do Produto → Gestor de Tráfego IA

Escopo restrito: somente o módulo Escala. Sem alterar menu, rotas vizinhas, mineração, ebook, playbook, copy, criativos, página, checkout.

## O que vamos entregar

Dentro do módulo Escala (rota `/escala` e aba "escala" do projeto), três modos em abas:

1. **Plano de Campanha** — gera estrutura inicial Meta / Google / Instagram Ads a partir dos inputs do usuário.
2. **Analisar Métricas** — usuário sobe prints/dados depois de ~3 dias, IA diagnostica.
3. **Próximos Testes / Plano de Escala** — IA gera o próximo ciclo de 3 dias (pausar, duplicar, escalar, trocar criativo, ajustar público).

Tudo funciona em **modo Projeto** (persistido em `projects.meta.scale`) e em **modo Avulso** (sem projeto, só roda a IA e mostra resultado, com opção "Salvar no Projeto" que abre a lista de projetos).

## Inputs aceitos

Campos do formulário (todos opcionais, mas pelo menos um obrigatório):

- Nome do produto / oferta
- Link da página de vendas
- Preço e moeda
- País-alvo (multi)
- Plataformas desejadas (Meta, Google, Instagram — multi-select)
- Orçamento diário disponível (R$ / US$)
- Texto livre da oferta / promessa
- Uploads (até 6 imagens, 5MB cada, convertidas para data URL):
  - print do produto
  - print da página
  - print do anúncio
  - criativos

## Saídas da IA — Plano de Campanha

JSON estruturado (Zod-validado), renderizado em cards:

1. Nome da campanha
2. Objetivo (conversões / tráfego / vendas no catálogo / etc)
3. Estrutura Meta Ads (campanhas × conjuntos × anúncios)
4. Estrutura Google Ads (Search / PMax / Demand Gen)
5. Estrutura Instagram Ads
6. Quantidade de campanhas / conjuntos / anúncios
7. Públicos recomendados (lista com nome + segmentação)
8. Orçamento diário sugerido por campanha
9. Criativos recomendados (formatos + ângulos)
10. Ângulos de copy
11. Hooks (3–5)
12. CTA
13. KPIs esperados (CTR, CPC, CPM, CPA, ROAS faixa)
14. Plano dia 1 / dia 2 / dia 3

## Saídas da IA — Analisar Métricas

Usuário sobe prints do gerenciador + preenche campos (CTR, CPC, CPM, CPA, ROAS, conversões, frequência, gasto, dias rodando). IA devolve:

- Diagnóstico geral
- Criativo vencedor / público vencedor
- Gargalos, fadiga, orçamento mal distribuído
- Ações: pausar / duplicar / escalar / testar / trocar criativo / ajustar público
- Próximo plano de 3 dias

## Botões no UI

- **Criar Plano de Campanha** (modo plano)
- **Analisar Métricas** (modo análise)
- **Gerar Próximos Testes** (a partir da última análise)
- **Gerar Plano de Escala** (a partir da última análise — instruções concretas de escala 2x/duplicação/CBO)
- **Salvar no Projeto** (modo avulso → escolhe projeto e persiste em `meta.scale`)

## Arquivos tocados (somente Escala)

Backend / IA:
- `src/lib/scale.server.ts` — expandir Zod schemas:
  - `CampaignPlanSchema` (saída do Plano)
  - `ScaleAnalysisSchema` (já existe — manter)
  - `NextTestsSchema` e `ScaleActionSchema` (novos)
  - Novos `aiCreateCampaignPlan`, `aiNextTests`, `aiScalePlan` chamando Lovable AI Gateway (`google/gemini-2.5-pro`) com prompts dedicados em PT-BR, JSON-only.
- `src/lib/scale.functions.ts` — novos `createCampaignPlan`, `generateNextTests`, `generateScalePlan` (createServerFn + requireSupabaseAuth). Persistem em `projects.meta.scale.{plan,lastAnalysis,nextTests,scalePlan,history[]}` quando há `projectId`. Sempre gravam em `ai_history` com `module: "escala"`.

Frontend:
- `src/components/pipeline/ScaleAnalyzer.tsx` — refatorar para componente com **tabs internas**: Plano | Métricas | Próximos passos. Manter API atual (`projectId`, `initial`, `onSaved`) para não quebrar `EscalaTab` e `StandaloneEscala`.
- `src/components/pipeline/scale/CampaignPlanForm.tsx` (novo) — formulário de inputs do plano + uploads múltiplos.
- `src/components/pipeline/scale/CampaignPlanResult.tsx` (novo) — render das 16 saídas.
- `src/components/pipeline/scale/MetricsAnalyzer.tsx` (novo) — extrai o form de métricas atual.
- `src/components/pipeline/scale/NextStepsPanel.tsx` (novo) — botões "Próximos Testes" + "Plano de Escala" + render.
- `src/components/pipeline/scale/SaveToProjectDialog.tsx` (novo, modo avulso).

Sem mudanças em:
- Sidebar / rotas (mantém `_authenticated/escala.tsx` e aba `escala` em `projetos.$id`)
- Qualquer outro módulo
- Schema do banco (usamos `projects.meta` JSONB que já existe + `ai_history`)

## Detalhes técnicos

- Modelo: `google/gemini-2.5-pro` (multimodal — aceita as imagens em `image_url`).
- Limites: máximo 6 imagens por request, downsizing no client se >5MB (recusar e avisar).
- Schemas Zod com `.default([])` para tolerar campos faltantes da IA.
- Persistência avulsa: estado local + `localStorage` `escalaflow.scale.standalone.v1` para sobreviver reload.
- Histórico: cada geração salva snapshot em `meta.scale.history[]` (cap 20) — permite voltar planos anteriores.
- Tratamento 429/402 do gateway já existe em `scale.server.ts` — reaproveitar.
- I18n: textos em PT-BR (consistente com o resto do app).

## Fora de escopo (explicitamente)

- Não vamos integrar com APIs reais do Meta/Google Ads.
- Não criar novas tabelas nem migrations.
- Não tocar em mineração, radar, dashboard, ebook, playbook, copy, criativos, página, checkout, layout geral.
