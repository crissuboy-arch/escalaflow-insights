# Plano de rollback

## Código

Reverter o deploy para a versão anterior (Vercel: redeploy do deployment
anterior; ou reverter o merge). O código das Fases 1–4 é compatível com
a base antiga:

- O botão Transformar em Projeto mantém os rótulos antigos para os
  estados antigos; NEEDS_REVIEW é um estado novo que só aparece quando o
  recetor o devolve.
- O painel `/ferramentas` é uma rota nova — removê-la não afeta as
  rotas existentes.
- A entrada "Ferramentas" na sidebar é aditiva.

## Migrations (só ficheiros até go — se já aplicadas)

Ambas as migrations são **aditivas** e não exigem rollback de dados:

- `20261029000000` acrescenta colunas a `intelligence_handoffs` (`if not
  exists`). Sem rollback: as colunas podem ficar (o código antigo
  ignora-as). Com rollback total, seria preciso um `ALTER TABLE ...
  DROP COLUMN` por coluna — só com go e backup.
- `20261029000001` cria a tabela nova `missions`. Sem rollback: a tabela
  vazia pode ficar. Com rollback total: `DROP TABLE public.missions`
  (só se estiver vazia ou com go para apagar os registos).

## Integrações

- Desligar uma ferramenta = remover as suas variáveis de ambiente e
  redeploy. Os adaptadores devolvem `configured:false` e o painel volta
  a mostrar o estado real — nunca um erro.
- O handoff Cris OS degrada para registo local quando as variáveis
  faltam (`never throws`): nada se perde, nada se envia.
