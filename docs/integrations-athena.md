# ScalaFlow ↔ Athena Control — Contrato da API

Integração somente-leitura que expõe indicadores agregados reais do
ScalaFlow para a Athena Control. Segue o mesmo padrão das integrações
VitrinePro e Pink Logic.

## Endpoints

### `GET /api/integrations/health` (público)

Verificação de disponibilidade, sem credenciais.

Resposta `200`:

```json
{
  "platform": "ScalaFlow",
  "status": "operational",
  "contract": "v1",
  "endpoints": ["/api/integrations/health", "/api/integrations/stats"]
}
```

### `GET /api/integrations/stats` (autenticado)

Agregados reais do banco existente. Autenticação:

```
Authorization: Bearer <SCALAFLOW_ATHENA_API_KEY>
```

A chave é **exclusiva** desta integração: segredo dedicado lido da
variável de ambiente `SCALAFLOW_ATHENA_API_KEY` (comparação timing-safe).
Nunca é o token de sessão do app, nunca o segredo do mining bridge do
Cris OS, nunca uma linha de `private_api_clients`.

Resposta `200` (exemplo):

```json
{
  "ok": true,
  "platform": "ScalaFlow",
  "contract": "v1",
  "analyses": { "total": 128, "ai_total": 96 },
  "offers": {
    "mined_total": 342,
    "by_status": { "teste": 200, "validando": 80, "escalando": 40, "quente": 22 },
    "collected_total": 1204,
    "saved_total": 57
  },
  "mining": { "runs_total": 45, "completed_total": 43 },
  "campaigns": { "total": 12 },
  "db_status": { "ok": true, "error_code": null, "failed_tables": [] },
  "subscriptions": null,
  "ai_usage": null,
  "unavailable": ["subscriptions", "ai_usage"],
  "notes": {
    "mined_offers": "Linhas de demonstração (is_demo = true) excluídas.",
    "by_status": "Distribuição por status de oportunidade em mined_offers.",
    "subscriptions": "Não existe tabela de assinaturas — marcado como indisponível.",
    "ai_usage": "Não existe tabela de uso de IA — marcado como indisponível."
  }
}
```

Regras dos dados:

- Somente contagens de tabelas que **realmente existem**
  (`analyses`, `ai_analyses`, `mined_offers`, `offers`, `saved_offers`,
  `mining_runs`, `project_campaigns`).
- Linhas de demonstração (`is_demo = true`) são **excluídas** de
  `ai_analyses` e `mined_offers`.
- Uma tabela ausente/com erro retorna `null` só naquele indicador —
  nunca quebra a resposta inteira.
- `subscriptions` e `ai_usage` são `null` + listados em `unavailable`
  (não existem tabelas correspondentes — nunca inventados).
- **Zero PII**: nenhum id de usuário, email, nome de anunciante,
  conteúdo de análise ou segredo sai neste payload.
- **`db_status`**: `{ "ok": bool, "error_code": code|null, "failed_tables": [...] }`.
  Quando `ok` é `false`, os indicadores `null` **não** são dados válidos —
  o banco falhou. Códigos seguros (sem detalhes internos):
  `missing_env`, `dns_error`, `timeout`, `connection_error`,
  `auth_failed`, `table_missing`, `permission_denied`, `unknown`.
  Cada consulta tem teto de 8s (`ATHENA_QUERY_TIMEOUT_MS`) para o endpoint
  degradar rápido em vez de travar ~40s.

Erros:

| Status | Quando |
| ------ | ------ |
| `401`  | `Authorization` ausente, com esquema errado ou chave incorreta |
| `503`  | `SCALAFLOW_ATHENA_API_KEY` não configurado na Vercel |
| `500`  | Falha inesperada ao consultar os indicadores |

## Arquivos

| Arquivo | Papel |
| ------- | ----- |
| `src/lib/integrations/athena.ts` | Lógica pura: auth timing-safe + agregados + diagnóstico seguro do banco (testável) |
| `src/lib/integrations/athena.test.ts` | 19 testes (vitest): auth, contagens, demos, falhas, PII, códigos de erro, timeout, db_status |
| `src/routes/api/integrations.health.ts` | Rota `GET /api/integrations/health` (adaptador fino) |
| `src/routes/api/integrations.stats.ts` | Rota `GET /api/integrations/stats` (adaptador fino) |
| `src/routeTree.gen.ts` | Regenerado pelo plugin TanStack (commit incluído) |

Nada aqui toca miners, collectors, agentes, automações, rotas comerciais,
páginas, design, nem as integrações existentes com Cris OS
(`/api/integrations/mining/run`, `CRIS_OS_MINING_SECRET`) e Athena.

## Configuração na Vercel

1. Gerar a chave (local, 64 hex):
   `openssl rand -hex 32`
2. Vercel → projeto `escalaflow-insights` → Settings → Environment
   Variables → adicionar:
   - Nome: `SCALAFLOW_ATHENA_API_KEY`
   - Valor: a chave gerada (colar exatamente, sem espaços/quebras)
   - Environments: **Production** (e Preview, se quiser testar)
3. Fazer redeploy (a variável só vale para novos deployments).
4. Testar:
   - `GET https://escalaflow-insights.vercel.app/api/integrations/health` → `200`
   - `GET .../api/integrations/stats` sem header → `401`
   - `GET .../api/integrations/stats` com
     `Authorization: Bearer <chave>` → `200` com os agregados

## Cadastro na Athena Control

Na Athena (seção **Plataformas** → **Connect**), criar a integração:

- Plataforma: `ScalaFlow`
- URL base: `https://escalaflow-insights.vercel.app`
- Nome: `API do ScalaFlow`
- Tipo: `API`
- URL de verificação: `https://escalaflow-insights.vercel.app/api/integrations/stats`
- Guardar a `SCALAFLOW_ATHENA_API_KEY` no cofre da Athena e clicar
  em **Verificar**.
