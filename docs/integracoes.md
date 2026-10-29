# Integrações — estados reais e próximos passos

Fonte de verdade: `src/lib/integrations/registry.ts` (o painel lê daqui).
Legenda: **CONFIGURAVEL** = funciona com env vars; **PREPARADO** =
código/contrato existe, falta deploy/worker/chave/URL live; **AGUARDANDO**
= sem caminho chamável a partir do ScalaFlow; **LOCAL** = só no próprio
host; **EXCLUIDO** = nenhuma função existe.

| Ferramenta | Estado | Evidência (repo/branch/commit) | Próximo passo |
|---|---|---|---|
| ATHENA | AGUARDANDO | Ponte só loopback 127.0.0.1:8765; sem endpoint público | Nada a ligar do ScalaFlow — o caminho é via Cris OS (handoff p/ Cláudio) |
| Cris OS | CONFIGURAVEL | POST + status auditados no repo cris-os | Confirmar base URL pública + token p/ polling |
| Tools Hub | PREPARADO | Branch não-main, worker por arrancar, openapi placeholder | Deploy + worker + chaves + health check real |
| Pink Logic | PREPARADO | Branch de fix, rotas auditadas, deploy ao vivo não verificado | Confirmar URL prod + `GET /api/integrations/health` |
| MKVideos | LOCAL | CLI + adapter Athena, sem API HTTP pública | Nada remoto; só mesmo host |
| OpenMontage | LOCAL | Biblioteca Python, sem HTTP; AGPLv3 | Wrapper + decisão de licença antes de qualquer uso em rede |
| PageForge | PREPARADO | Serviço Vercel auditado, URL live não verificada | Confirmar URL + `GET /api/health` |
| Meta Ads | PREPARADO | FastAPI + MCP auditados, instância/conta não verificadas | Deploy + OAuth; leitura primeiro |
| Criador de App | LOCAL | CLI scaffolding, sem endpoint de geração | Fora do painel como executor |
| Método Avatar | EXCLUIDO | Landing page; zero API/backend | Fora do painel como ferramenta |

**Regra:** nenhum estado muda para "ligado" sem um health check real
(documentado em `docs/health-checks.md`). A presença de variáveis de
ambiente (`getIntegrationAvailabilityFn`) significa "configurado", não
"vivo".
