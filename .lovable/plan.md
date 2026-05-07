Plano para corrigir definitivamente os botões da coluna **Ações** sem trocar layout, sem mexer na coleta Apify, token ou extensão:

1. **Padronizar abertura externa**
   - Ajustar `src/lib/external.ts` para validar URL e abrir sempre com `window.open(url, "_blank", "noopener,noreferrer")`.
   - Usar mensagem padrão `Link não encontrado` quando nenhuma URL válida existir.
   - Manter fallback seguro apenas se necessário, sem navegação dentro do iframe.

2. **Mapear URLs reais do anúncio**
   - Criar helper na Central para resolver o link nesta ordem:
     - `ad.adUrl`
     - `ad.libraryUrl` se existir no payload bruto/tipo flexível
     - `ad.raw?.ad_snapshot_url`
     - fallback por `ad.adLibraryId` para Facebook Ads Library.
   - Antes de abrir, registrar `console.log("abrindo anúncio", url)`.

3. **Corrigir ChatGPT**
   - Gerar prompt automático com `headline`, `copy`, `CTA`, `nicho`, `plataforma` e `score`.
   - Salvar o anúncio para análise com `rememberAdForAnalysis`.
   - Copiar o prompt para o clipboard.
   - Abrir `https://chatgpt.com` em nova aba.
   - Mostrar toast exato: `Prompt copiado para o ChatGPT`.
   - Registrar `console.log("abrindo chatgpt", ad)`.

4. **Corrigir ações persistentes**
   - **Enviar para Escala:** usar `scaleCollectedAd`, atualizar `scaledIds`, disparar contador via `subscribeChange`, toast `Oferta enviada para escala`, log `console.log("enviando para escala", ad.id)`.
   - **Favoritar:** manter toggle true/false com `favoriteCollectedAd`, atualizar estado local e contador, log `console.log("favoritando", ad.id)`.
   - **Salvar:** manter `saveCollectedAd`, persistir em localStorage, atualizar estado e contador, com toast claro.

5. **Adicionar botão Extensão funcional sem alterar layout**
   - Usar o botão de ação existente menos crítico/atual ou mapear o handler atual conforme o layout já presente.
   - Se `extensionUrl` existir no anúncio/payload bruto, abrir em nova aba.
   - Caso contrário, mostrar toast `Extensão não disponível`.

6. **Verificação final**
   - Conferir que todos os handlers da coluna **Ações** chamam funções reais.
   - Garantir que nenhum botão tente navegar dentro do iframe.
   - Garantir que links inválidos não quebram a UI e exibem toast.
   - Manter os cards/anúncios reais e o layout atual.