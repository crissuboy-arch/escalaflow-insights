Plano focado em estabilidade, persistência real e os 3 modos do Ebook Engine. Sem novas features fora desse escopo.

## 1. Estabilidade da geração com IA (`src/lib/ebook.server.ts`)

- Trocar a chamada manual ao gateway pelo padrão recomendado: header `Lovable-API-Key` + `X-Lovable-AIG-SDK` em vez de `Authorization: Bearer`.
- Adicionar retry com backoff em 429 (3 tentativas, 1s/2s/4s) e mensagens claras para 402 (créditos) e demais 5xx.
- Endurecer o parsing de `tool_calls.arguments`:
  - try/catch ao redor do `JSON.parse`
  - fallback: extrair JSON do `message.content` quando o modelo não chama a função
  - validar com Zod e, em falha, repetir uma vez com prompt corretivo
- Garantir saída não-vazia para capítulo (já checa); adicionar limite duro de tamanho e retry único quando vier vazio.
- Padronizar tipo de retorno das funções (sem `as any` solto).

## 2. Persistência real e autosave sem perda

- Rota dinâmica nova: `src/routes/_authenticated/produtos.ebook.$id.tsx` (carrega o ebook pelo id da URL).
- Em `produtos.ebook.tsx` (novo rascunho): após o primeiro `saveDraft`, navegar para `/produtos/ebook/<id>` para que F5 retome do mesmo ponto.
- Autosave com debounce (1.5s) sempre que `briefing`, `outline`, `chapters`, `layout`, `coverUrl`, `chapterCount`, `mode` ou `step` mudarem.
- Save defensivo no `beforeunload` e ao trocar de aba (Visibility API).
- Backup local em `localStorage` por `ebookId` (ou `tempId` enquanto não há id), restaurado se a sessão cair antes do primeiro save remoto.
- Centralizar o estado num hook `useEbookDraft` para não espalhar `useState` soltos.

## 3. Correção de erros de auth/header

- Adicionar `beforeLoad` em ambas as rotas (`produtos.ebook.tsx` e `produtos.ebook.$id.tsx`) que aguarda `supabase.auth.getUser()` antes de chamar funções `requireSupabaseAuth`. Isso elimina o 401 no primeiro paint.
- Em `saveDraft`/`loadEbookDraft`/`deleteEbookDraft`, capturar 401 e mostrar toast com botão "Entrar novamente" em vez de falhar silenciosamente.

## 4. Estrutura de 3 modos do Ebook Engine

Reaproveitar a coluna `mode` já existente em `ebooks` (`kdp` default). Permitir três valores: `kdp`, `premium`, `playbook`.

Fluxo unificado: anúncio → briefing → estrutura → modo (com campos específicos) → geração → exportação.

### 4.1 Ebook Amazon/KDP (`mode = 'kdp'`)
- Layout limpo profissional, sumário automático.
- Exportadores:
  - PDF (já existe — manter)
  - DOCX (novo, via biblioteca client-side ou função server)
  - EPUB (novo)
- Sumário automático gerado a partir dos títulos de capítulos.

### 4.2 Ebook Premium Visual (`mode = 'premium'`)
- Geração de uma imagem por capítulo via Lovable AI Gateway:
  - principal: `google/gemini-3.1-flash-image-preview`
  - fallback automático: `google/gemini-3-pro-image-preview`
  - se ambos falharem, manter capítulo sem imagem com aviso
- Layouts modernos estilo Canva/Gamma (3 templates) e mockup 3D na capa.
- Exportador PDF visual (renderiza imagens + tipografia destacada).
- Observação sobre DALL·E: OpenAI não está configurado nos secrets atuais. Mantemos a interface de "fallback automático" no servidor pronta para receber `OPENAI_API_KEY` no futuro, mas o fallback inicial é entre dois modelos Gemini. Avisarei o usuário caso queira adicionar a chave depois.

### 4.3 Playbook Interativo (`mode = 'playbook'`)
- Já existe `playbooks` separado. Aqui adicionamos no Ebook Engine apenas o seletor de gênero: `storytelling`, `romance`, `infantil`, `dark romance`, `gangster`, `quadrinhos`, `narrativa visual`.
- Gera cenas (não capítulos) com narrativa visual; uma imagem por cena.
- Exportador PDF formato narrativa.
- Aproveita a tabela `playbooks` já existente quando o usuário escolhe esse modo (cria playbook em vez de ebook), mantendo a tela única.

## 5. Arquitetura MINERAR → GERAR → EXPORTAR → VENDER

- Confirmar links a partir de Salvas/Favoritos/Escaladas para "Criar Ebook" (já existe parcialmente) e marcar `source_ad_key` no rascunho.
- Tela final de exportação com todas as opções do modo escolhido e botão "Pronto para vender" que muda `status = 'ready'` (já existe; só formalizar UX).
- Sem implementar gateway de venda agora.

## 6. Validação final

- Testar fluxo end-to-end em cada modo com um anúncio real.
- Reload da página em cada step para confirmar que o rascunho retoma exatamente onde parou.
- Forçar 429 simulado para validar retry/backoff e mensagens.
- Verificar exports abrindo PDF/DOCX/EPUB em visualizadores.

## Detalhes técnicos resumidos

- Novos arquivos: `src/lib/ebook/exporters/docx.ts`, `src/lib/ebook/exporters/epub.ts`, `src/lib/ebook/exporters/visual-pdf.ts`, `src/lib/ebook/use-ebook-draft.ts`, `src/routes/_authenticated/produtos.ebook.$id.tsx`.
- Nova função server `generateEbookChapterImage` para imagens por capítulo (com fallback de modelo).
- Nenhuma migração necessária — a coluna `mode` já existe em `ebooks`.
- Sem novos secrets necessários nesta etapa.