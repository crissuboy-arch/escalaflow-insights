# Tabela de APIs / credenciais (Fase 5 — última fase)

Regras: nenhum segredo no frontend, git, logs ou chat. Prefere-se o
serviço autenticado já existente a novas chaves. NENHUMA ferramenta é
"operacional" sem teste real (ver `docs/health-checks.md` — nenhum
check ao vivo foi feito até agora).

| Ferramenta | API / credencial realmente necessária | Integração segura reutilizável? | Onde configurar | Permissões mínimas | Teste de ligação necessário | Estado atual |
|---|---|---|---|---|---|---|
| Cris OS (handoff) | `CRIS_OS_API_URL` + `CRIS_OS_INTEGRATION_TOKEN` | Sim — contrato existente (POST handoff) | Vercel (Production), servidor | Token estático partilhado (único; sem scopes) | POST de teste + `GET {base}/{id}/status` | CONFIGURAVEL — falta base URL pública + token |
| Cris OS (polling) | `CRIS_OS_STATUS_URL` (opcional; senão deriva de `CRIS_OS_API_URL`) | Sim — mesmo token | Vercel (Production), servidor | Mesmo token | `GET {base}/{handoff_id}/status` | CONFIGURAVEL |
| ATHENA | `ATHENA_BRIDGE_TOKEN` — **NÃO é do ScalaFlow** (é Cris OS↔Athena, loopback) | Não aplicável | VPS do Cris OS, nunca Vercel | Token único (mín. 32 chars) | N/A p/ ScalaFlow | AGUARDANDO — sem caminho do ScalaFlow |
| Tools Hub | `TOOLS_HUB_BASE_URL` + `TOOLS_HUB_API_KEY` | A criar (contrato documentado) | Vercel (Production), servidor | `tools:read`, `jobs:read`, `jobs:write` — **nunca** `approvals:decide` | `GET /api/v1/health` + job de teste | PREPARADO |
| Pink Logic | `PINK_LOGIC_BASE_URL` + `PINK_LOGIC_SERVICE_KEY` | A criar | Vercel (Production), servidor | Service key servidor-a-servidor | `GET /api/integrations/health` | PREPARADO |
| MKVideos | Nenhuma (CLI local) | Não — só local | Host do MKVideos | N/A | N/A | LOCAL |
| OpenMontage | Nenhuma (biblioteca local; AGPLv3) | Não — wrapper + decisão de licença primeiro | N/A | N/A | N/A | LOCAL |
| PageForge | `PAGEFORGE_BASE_URL` (+ `PAGEFORGE_ATHENA_API_KEY` p/ stats) | A criar | Vercel (Production), servidor | Stats: Bearer próprio; generate: confirmar auth do serviço | `GET /api/health` | PREPARADO |
| Meta Ads | `META_ADS_BASE_URL` + OAuth do serviço (token do utilizador, ~60 dias, Supabase do serviço) | OAuth existente do serviço | Serviço Meta Ads (não ScalaFlow) | `ads_read` primeiro; escrita só via propose→approve humano | `GET /api/ads/status` | PREPARADO |
| Criador de App | Nenhuma (CLI local) | Não | Host local | N/A | N/A | LOCAL |
| Método Avatar | Nenhuma — não é uma ferramenta | Não | — | — | — | EXCLUIDO |

**Não pedir tokens repetidos:** cada chave acima é pedida uma vez, por
canal seguro, quando o health check correspondente for feito — e só
então o estado muda no painel.
