# Plano de deploy (seguro, por passos — cada passo precisa do go da dona)

## Pré-requisitos (antes de qualquer deploy)

1. Go explícito da dona para o push da branch `feat/scalaflow-central-integracao`
   (até aqui, tudo local, sem push).
2. Go separado para merge em main e para deploy (não são o mesmo go).
3. Nenhuma migration é aplicada sem go próprio.

## Ordem

1. **Migration `20261029000001_missions.sql` (só ficheiro, NÃO aplicada).**
   Aplicar ANTES de qualquer código que escreva na tabela `missions`.
   O código das Fases 1–4 não a escreve — por isso pode ser aplicada em
   qualquer altura, de forma independente. É aditiva (tabela nova + RLS
   sem policies); não altera tabelas existentes.
2. **Migration `20261029000000_intelligence_handoffs_mission_refs.sql`**
   (Fase 1, só ficheiro): aplicar ANTES do código da Fase 1 que escreve
   `mission_id`/`execution_id`/`remote_status`/`remote_refs`. O código
   degrada graciosamente sem ela (upsert base + upsert remoto em
   separado), mas sem ela as refs remotas não persistem.
3. **Variáveis de ambiente** (Vercel → Production, sem valores no git):
   as de `.env.example` que a dona aprovar. Começar só pelas do Cris OS
   (handoff + polling); as das ferramentas só quando cada health check
   passar.
4. **Push → merge → deploy** (passos separados, cada um com go).
5. **Verificação pós-deploy** (ver `docs/health-checks.md`): `/health`
   anuncia as 4 rotas; `/integrations/stats` com Bearer; painel
   `/ferramentas` abre; um handoff de teste (oportunidade de teste, não
   real) percorre SENT → polling.

## O que NÃO acontece neste deploy

- Sem reinício de serviços na VPS, sem tocar na ATHENA/Cris OS, sem
  campanhas, sem gastos, sem publicações, sem migração de dados de
  outros produtos (cada produto é proprietário dos seus dados).
