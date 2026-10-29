# Health checks

## ScalaFlow (próprios, já publicados em 2026-10-15 — preservar)

- `GET /api/integrations/health` — pública. Passa a anunciar as 4 rotas:
  `health`, `stats`, `mining/run`, `intelligence/run`.
- `GET /api/integrations/stats` — Bearer `SCALAFLOW_ATHENA_API_KEY`
  (comparação por hash SHA-256; 503 se a env falta, 401 se errada).
  Devolve agregados só-leitura, zero PII; `subscriptions` e `ai_usage`
  são `null` + `unavailable` (tabelas inexistentes, declaradas).
- `POST /api/integrations/mining/run` — Bearer `CRIS_OS_MINING_SECRET` +
  `CRIS_OS_MINING_USER_ID`.
- `POST /api/integrations/intelligence/run` — Bearer cujo SHA-256
  corresponde a `secret_hash` em `private_api_clients` (`status='active'`).

## Por ferramenta (checklist ao vivo — NENHUM feito até agora)

| Ferramenta | Check | Critério de PASS |
|---|---|---|
| Cris OS | `GET {base}/{handoff_id}/status` com Bearer | 200 com snapshot (ou 404 p/ handoff desconhecido) |
| Tools Hub | `GET /api/v1/health` | 200 |
| Pink Logic | `GET /api/integrations/health` | 200 formato contrato v1 |
| PageForge | `GET /api/health` | 200 |
| Meta Ads | `GET /api/ads/status` com token | 200 com estado da ligação |
| MKVideos / OpenMontage / Criador de App | — | Sem check remoto (só locais) |

## Logs sanitizados (verificado por grep, Fase 5)

- Novo código (`src/lib/missions/`, `src/lib/integrations/registry.ts`,
  `availability.functions.ts`, `ferramentas.tsx`): **zero chamadas
  `console.*`** — nada é logado, logo nenhum segredo pode vazar por
  aqui.
- Adaptadores: o token só é usado para montar o header `Authorization`;
  nunca entra em mensagens de erro, URLs ou logs. Valores de teste
  (`"tok"`, `"key"`) nos testes são fixtures, não segredos.
- Observação (follow-up, sem alteração de comportamento nesta fase):
  `last_error` em `intelligence_handoffs` é guardado sem truncagem.
  As mensagens vêm de erros HTTP/rede (não contêm tokens), mas truncar
  a 300 caracteres seria uma higiene simples para uma próxima fase.
