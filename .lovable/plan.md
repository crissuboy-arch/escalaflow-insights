# Uploader robusto — Escala do Produto

Hoje há dois uploaders no módulo, ambos com limite duro de 5MB e descarte silencioso de qualquer print maior. Vou corrigir os dois pontos com um componente compartilhado.

## Arquivos envolvidos

- `src/components/pipeline/scale/CampaignPlanForm.tsx` — upload de até 6 imagens (página, checkout, anúncio, criativo).
- `src/components/pipeline/ScaleAnalyzer.tsx` (`MetricsAnalyzerInner`) — upload de 1 screenshot de métricas.
- `src/lib/scale.server.ts` — prompts da IA (texto enviado ao Gemini junto com as imagens).

## O que vou implementar

### 1. Novo componente `src/components/pipeline/scale/ImageUploader.tsx`
- Aceita PNG, JPG, JPEG, WEBP (`accept="image/png,image/jpeg,image/webp"`).
- Drag & drop + clique + colar (Ctrl+V) + botão "Selecionar".
- Limite de entrada: **25MB por arquivo**. Acima disso, toast amigável: "Sua imagem está muito pesada. Compactamos automaticamente para continuar." e segue tentando comprimir; só rejeita se mesmo após compressão ficar > ~8MB final.
- Múltiplas imagens com `maxFiles` configurável (1 nas métricas, 6 no plano).
- Preview em grid: miniatura, nome, tamanho original → tamanho final, status (comprimindo / pronto / erro), botão remover (X).

### 2. Compressão automática `src/lib/scale/compressImage.ts`
- Usa `createImageBitmap` + `OffscreenCanvas` (fallback `<canvas>`) — zero dependência nova.
- Pipeline:
  1. Lê dimensões originais (suporta prints verticais longos: 4000px+ de altura).
  2. Redimensiona mantendo proporção para **lado maior ≤ 2000px** (mantém legibilidade de headline/CTA/preço para OCR).
  3. Para screenshots muito verticais (ratio > 3:1), preserva largura ≥ 1080px e permite altura grande (até ~6000px) — não corta scroll screenshots.
  4. Tenta WebP qualidade 0.82 → 0.7 → 0.6 até ficar ≤ 2MB; se navegador não suporta WebP, cai para JPEG 0.8 → 0.65.
  5. Retorna `{ dataUrl, originalSize, finalSize, mime, width, height }`.
- Erros (decode falhou, formato inválido) viram toast claro, não silêncio.

### 3. Integração

**`CampaignPlanForm.tsx`**
- Substituir o bloco atual de file input + map de previews pelo `<ImageUploader maxFiles={6} value={images} onChange={setImages} />`.
- Remover `fileToDataUrl` local e o check `> 5 MB`.
- Label vira "Imagens da página, checkout, anúncio, criativos e métricas (até 6)".

**`ScaleAnalyzer.tsx` → `MetricsAnalyzerInner`**
- Substituir `onPickFile` + thumb manual por `<ImageUploader maxFiles={1} value={imageDataUrl ? [imageDataUrl] : []} onChange={(arr) => setImageDataUrl(arr[0] ?? null)} />`.
- Remover `fileToDataUrl` e check de 5MB.

### 4. IA / OCR

A IA já recebe as imagens via `image_url` (Gemini 2.5 Flash, multimodal — já lê headline, CTA, copy, preço, layout). Vou reforçar isso no prompt em `src/lib/scale.server.ts`:

- No `buildPlanMessages` (já injeta `imageDataUrls`): adicionar instrução explícita no texto do usuário pedindo à IA para **extrair textualmente** headline, CTA principal, preço visível, blocos da página, elementos do criativo e estrutura visual antes de gerar o plano, e usar isso para nicho/ângulos/copy.
- Mesma instrução compacta no `buildMetricsMessages` para o print do Gerenciador (KPIs visíveis, nome do criativo, etc.).
- Aumentar `slice(0, 6)` continua igual (6 imagens), e o limite `z.array(...).max(6)` no `scale.functions.ts` permanece.

Nenhuma mudança em banco, auth ou outros módulos.

## Fora de escopo
- Não mexer em outros uploaders do app (ebook/playbook).
- Não trocar provider de IA nem adicionar pacote npm novo.
- Não criar bucket de Storage — as imagens continuam sendo enviadas inline (base64) para o Vision, como hoje.

## Mensagens ao usuário (PT-BR)
- Arquivo > 25MB cru: "Imagem muito grande (>25MB). Tente um print menor."
- Formato inválido: "Formato não suportado. Use PNG, JPG ou WEBP."
- Comprimida: toast info "Imagem otimizada: 14.2MB → 1.8MB".
- Falha de decode: "Não consegui ler essa imagem. Tente outra."
