# Contratos

Fonte de verdade no código: `src/lib/cris-os/contract.ts` (handoff),
`src/lib/missions/contract.ts` (missão interna), `src/lib/missions/adapters/`
(um ficheiro por ferramenta). Nada aqui é enviado verbatim a uma
ferramenta que não o aceite — os adaptadores traduzem.

## 1. Handoff ScalaFlow → Cris OS (o contrato existente, preservado)

- `POST {CRIS_OS_API_URL}` — URL inteira vinda de env, `Bearer <CRIS_OS_INTEGRATION_TOKEN>`.
- Corpo: `MarketIntelligenceHandoff`, `schema_version: "1.0"`, `source_system: "scalaflow"`.
- `handoff_id` determinístico: `ho_` + SHA-256 truncado (24 hex).
- Header `Idempotency-Key: <handoff_id>`.
- Respostas: `200 PERSISTED`, `200 DUPLICATE` (reenvio), **`202 NEEDS_REVIEW`
  (aceite, exige revisão humana — nunca erro, nunca concluído)**, `400 REJECTED`
  (não retentar sem corrigir), `401`, `413`, `500`, `503`.
- Status: `GET {base}/{handoff_id}/status` (mesmo token), onde `base` é
  `CRIS_OS_STATUS_URL` ou a origem de `CRIS_OS_API_URL` +
  `/api/integrations/scalaflow/intelligence`. Snapshot: projeto, business
  plan, approval, execution plan, tasks, `production.work_orders[]` com
  `output_refs`. Ver `src/lib/missions/adapters/cris-os.ts`.

## 2. Missão interna ScalaFlow (`MissionRecord`)

Campos: `missionId` (`msn_` + SHA-256 determinístico de
tool/taskType/seed), `organizationId` (env ou null — single-tenant),
`projectId`, `handoffId`, `executionId`, `tool`, `taskType` (allowlist por
ferramenta — ver `TASK_TYPES`), `briefing`, `params`, `status`,
`attempts`, `errors`, `fileRefs`, `approval` (OBSERVADA, nunca decidida
aqui), `result`, `receipt` (`idempotencyKey = missionId`, `sentAt`,
`channel`, `remoteIds`).

Estados: `NOT_SENT | SENDING | SENT | NEEDS_REVIEW | RUNNING | COMPLETED |
FAILED | CANCELLED`. `COMPLETED` só conta com `fileRefs` não vazios
(`isMissionCompleted`).

## 3. Work order Athena (só contrato — nunca HTTP a partir do ScalaFlow)

Campos fechados (fora disto → 422): `work_order_id` (regex
`^[A-Za-z0-9][A-Za-z0-9._:-]{2,80}$`), `project_id`, `global_project_id`
(reservado), `handoff_id`, `execution_plan_id`, `source_task_id`,
`asset_type` (só `LANDING_PAGE | CAROUSEL | MARKETING_MATERIAL | EBOOK`),
`executor_type` (forçado `"ATHENA"`), `title`, `objective` (obrigatório),
`requirements`, `input_refs`, `output_refs`, `status` (`READY`),
`requires_approval`, `approved` (`true + false` → recusado), `metadata`.
Forçados: `final_action: {type: "none"}`, `callback: {type: "poll"}`.
`asset_type` → missão: `LANDING_PAGE→CRIAR_LANDING_PAGE`,
`CAROUSEL/MARKETING_MATERIAL→CRIAR_CRIATIVO`, `EBOOK→CRIAR_COPY`.
Ver `src/lib/missions/adapters/athena.ts` + `ATHENA_DISPATCH_NOTE`.

## 4. Tools Hub jobs

- `POST /api/v1/jobs` `{orgId, toolId, params, idempotencyKey}` + headers
  anti-replay `X-Request-Timestamp` / `X-Nonce` → `201` criado, `200`
  replay idempotente.
- `GET /api/v1/jobs/[id]` para polling. **Sem approve**: chaves recebem
  403 em `approvals:decide`; aprovações exigem sessão humana owner/admin.

## 5. Pink Logic / PageForge / Meta Ads

- Pink Logic: `GET /api/integrations/health` (público); `POST /api/generate`
  `{module}` com allowlist `logo | sticker | qrcode | copy | story |
  carousel | mockup` + Bearer service key.
- PageForge: `GET /api/health`; `POST /api/generate` `{stage}` com
  allowlist `plan | render | assemble | section | full` (NDJSON em
  streaming); `GET /api/integrations/stats` com Bearer
  `PAGEFORGE_ATHENA_API_KEY`. Nota: nenhum controlo de auth foi
  evidenciado no handler de `/api/generate` — confirmar antes de uso em
  produção; não inventar chave.
- Meta Ads: só leituras HTTP — `GET /api/ads/status`, `/api/ads/insights`,
  `/api/ads/live` (token do utilizador passado por chamada; OAuth do
  serviço). Propostas e approve/reject vivem no servidor MCP do serviço,
  não em HTTP — este adaptador não os expõe.

## 6. Só locais (sem contrato HTTP)

- MKVideos: `mkivideos athena-receive < missao.json`,
  `mkivideos athena-status --mission <id>` (fila SQLite local).
- OpenMontage: biblioteca Python (AGPLv3) — sem endpoint; nunca copiar
  código para o ScalaFlow (MIT).
- Criador de App: `python create_app.py <nome> [--template...]` — gera
  config + prompt, não artefacto autónomo.
