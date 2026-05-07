## Melhorias finais — Central de Mineração

### 1. Prompt enriquecido para "Abrir no ChatGPT"

Em `src/routes/_authenticated/central-mineracao.tsx`, expandir `onOpenChatGPT` para enviar um prompt completo, com todos os campos disponíveis e os links reais resolvidos:

- **Anunciante** (`a.advertiser`)
- **Headline** (`a.headline`)
- **Copy completa** (`a.copy`)
- **CTA** (`a.cta`)
- **Descrição** (`a.description` / `raw.description`)
- **Nicho** (`a.niche`)
- **País** (`a.country`)
- **Plataforma(s)** (`a.platform` + `a.platforms`)
- **Score** (`a.score`)
- **Tipo de criativo** (`a.creativeType`)
- **Data de início** (`a.startDate`)
- **Link do anúncio** (`resolveAdUrl(a)`)
- **Link do criativo** (`a.creativeUrl`)
- **Link do perfil/anunciante** (resolvido via `resolveProfileUrl`, ver §2)
- **Ad Library ID**

Estrutura do prompt (mantém roteiro de engenharia reversa):
```
Faça engenharia reversa do anúncio abaixo e responda:
1) Big Idea  2) Avatar  3) Promessa & Mecanismo
4) Estrutura da copy  5) Gatilhos mentais  6) Como escalar

DADOS DO ANÚNCIO
Anunciante: ...
Headline: ...
Copy: ...
CTA: ...
Nicho: ... | País: ... | Plataforma: ...
Score: ... | Tipo criativo: ... | Início: ...

LINKS REAIS
Anúncio: <url ou "não disponível">
Criativo: <url ou "não disponível">
Perfil: <url ou "não disponível">
Library ID: <id ou "não disponível">
```

Manter `rememberAdForAnalysis(toPersisted(a))` antes de chamar `openChatGPTWithPrompt(prompt)`. Logar `console.log("abrindo chatgpt", a)`.

### 2. Validação + fallback nos botões externos

Criar um helper `resolveProfileUrl(a)` (semelhante ao `resolveAdUrl` já existente) que tenta:
- `a.raw?.page_url`
- `a.raw?.profile_url`
- `a.raw?.advertiser_url`
- `https://www.facebook.com/<page_id>` quando `raw.page_id` existir

Atualizar/criar handlers para garantir validação clara:

- **`onOpenAd`** (Abrir anúncio / Facebook): já resolve via `resolveAdUrl`. Se `null`, exibir `toast.error("Link do anúncio não encontrado")` em vez do toast genérico do `openExternal`. Também passar o link como Facebook quando vier de `adLibraryId`.
- **`onOpenProfile`** (novo, opcional via mesmo botão "Abrir anúncio" se não houver perfil dedicado — ver nota abaixo): usa `resolveProfileUrl`; sem link → `toast.error("Perfil do anunciante não encontrado")`.
- **`onOpenExtension`**: já valida; trocar `toast.message` por `toast.error("Extensão não disponível para este anúncio")` para clareza.
- **`onOpenChatGPT`**: se `headline` e `copy` estiverem vazios, `toast.error("Anúncio sem dados suficientes para análise")` e abortar.

Nota sobre o botão de perfil: a coluna Ações atualmente tem `ExternalLink` (anúncio), `Puzzle` (extensão), `BookmarkCheck`, `Bot` (ChatGPT), `Rocket`, `CheckCircle2`, `Trash2`. Não existe botão dedicado de "Perfil". O usuário pediu validação para o botão de perfil; o plano é **adicionar uma entrada `Perfil` apenas dentro do prompt do ChatGPT** (link real do perfil quando existir) e **não criar um novo botão** para preservar o layout atual conforme as regras impostas em prompts anteriores ("não trocar o layout"). Se preferir um botão dedicado, posso incluir em uma segunda iteração.

### 3. Centralizar mensagens de erro no `openExternal`

Em `src/lib/external.ts`, manter o comportamento atual mas permitir mensagem customizada opcional:
```ts
openExternal(url, { errorMessage: "Link do anúncio não encontrado" })
```
Os call-sites na Central passam mensagens específicas para anúncio, perfil e extensão, garantindo o toast claro pedido.

### Arquivos afetados
- `src/lib/external.ts` — assinatura opcional para mensagem de erro customizada.
- `src/routes/_authenticated/central-mineracao.tsx` — `resolveProfileUrl`, prompt enriquecido em `onOpenChatGPT`, mensagens de erro específicas em `onOpenAd` / `onOpenExtension`.

Sem mudanças no Apify, token, coleta, layout ou extensão.
