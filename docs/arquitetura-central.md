# Arquitetura — ScalaFlow como central (Fases 1–5)

## Papéis (não se misturam)

| Sistema | Papel | O que o ScalaFlow pode e não pode fazer com ele |
|---|---|---|
| **ScalaFlow** | Inteligência + projetos | Origem das oportunidades; regista handoffs e missões; observa estado por polling. |
| **Cris OS** | Registo / handoff / contexto / políticas | Recebe inteligência (POST handoff). É o ÚNICO caminho para a Athena. Aprovações humanas acontecem aqui (Telegram) — sem endpoint HTTP. |
| **ATHENA** | Coordenação / seleção de ferramentas / revisão | Nunca chamada diretamente pelo ScalaFlow: a ponte HTTP é só loopback (127.0.0.1:8765) na VPS. O dispatch parte do Cris OS. |
| **Tools Hub** | Catálogo + jobs + execução | Chamável por API quando deploy + worker + chaves existirem. Aprovações sempre humanas (chaves recebem 403 em `approvals:decide`). |
| **Ferramentas** | Execução especializada | Pink Logic (imagens/copy/design), MKVideos/OpenMontage (audiovisual), PageForge (páginas), Meta Ads (anúncios, só leitura primeiro), Criador de App (microapps — só CLI). |

## Fluxo mínimo (o único que existe hoje, de ponta a ponta)

```
oportunidade (mineração) → Transformar em Projeto → POST handoff Cris OS
  → 200 PERSISTED | DUPLICATE | 202 NEEDS_REVIEW ("Aguardando revisão")
  → polling GET {base}/{handoff_id}/status → BusinessPlan → aprovação
    humana (Telegram) → ExecutionPlan → Tasks → WorkOrders → output_refs
```

- **202 / NEEDS_REVIEW nunca é concluído.** É o estado "aceite, a aguardar revisão humana".
- **COMPLETED só com artefacto real.** Uma missão sem `file_refs` não renderiza como concluída (regra espelhada da Athena).
- **Sem webhooks em nenhum dos lados.** Tudo é polling autenticado.
- **Sem outro orquestrador.** O ScalaFlow não coordena execuções nem aprova nada: observa e regista.
- **NEXORA CRM está fora do primeiro fluxo** (só integração comercial posterior).

## O que o ScalaFlow NUNCA faz

- POST para a ponte Athena (inalcançável da Vercel; proibido por desenho).
- Aprovar/rejeitar trabalho em nome de um humano (não existe endpoint; e mesmo que existisse, não seria o ScalaFlow a usá-lo).
- Publicar, gastar ou alterar campanhas (o `final_action` das ordens é sempre `none`).
- Inventar endpoints, URLs de produção ou estados ("LIGADO") sem um health check real.

## Ficheiros-chave

- `src/lib/cris-os/` — handoff (client, service, contract, mission, transform.functions).
- `src/lib/missions/` — contrato interno, polling, adaptadores.
- `src/lib/integrations/registry.ts` — fonte única de verdade dos estados do painel.
- `src/routes/_authenticated/ferramentas.tsx` — o painel.
- `supabase/migrations/20261029000000_*` (Fase 1, só ficheiro) e `20261029000001_missions.sql` (Fase 5, só ficheiro).
