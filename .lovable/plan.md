Plano cirúrgico para resolver sem tocar no Apify/coleta:

1. Corrigir abertura externa de verdade
- Centralizar todos os botões externos em um único helper.
- Usar somente `window.open(url, "_blank", "noopener,noreferrer")` para Facebook, anúncio, perfil, link original e ChatGPT.
- ChatGPT abrirá apenas `https://chatgpt.com/` em nova aba; o prompt será copiado para clipboard antes/na mesma interação do clique.
- Se não houver link real, mostrar exatamente: `Link original não encontrado.`
- Remover qualquer caminho que tente navegar Facebook/ChatGPT dentro do preview/iframe.

2. Parar de depender do estado temporário da Central
- Unificar favoritos, salvos e escalados em um storage persistente único baseado no anúncio real.
- A chave do anúncio será estável: `ad_library_id -> ad_url -> id`, para não perder o item após refresh.
- Ao favoritar/salvar/escalar, persistir o payload completo do anúncio real: anunciante, headline, copy, mídia, país, plataforma, score e links.

3. Corrigir Favoritos
- Ao clicar na estrela na Central, salvar o anúncio completo como favorito persistente.
- Ao abrir `/favoritos`, carregar do storage persistente, não do estado da Central.
- Após refresh, os cards continuam aparecendo.
- Logar apenas no console: `saving favorite` e `loaded favorites`.

4. Corrigir Ofertas Salvas
- Ao clicar salvar, persistir o anúncio completo.
- `/ofertas-salvas` carregará a lista persistida no mount e em eventos de mudança.
- Após refresh, os cards continuam aparecendo.
- Logar apenas no console: `saving offer` e `loaded saved offers`.

5. Corrigir Ofertas Escaladas
- Ao clicar `Enviar para escala`, marcar `scaled=true` no anúncio real e persistir.
- `/ofertas-escaladas` não usará mock: mostrará anúncios reais persistidos como escalados e também anúncios reais da tabela que tenham `score >= 80`, repetição ou mais de uma plataforma.
- Após refresh, anúncios enviados para escala continuam aparecendo.
- Logar apenas no console: `saving scaled` e `loaded scaled offers`.

6. Sidebar e renderização
- Atualizar os contadores da sidebar com base no storage persistente, não em estado temporário.
- Na Central e nas abas, exibir sempre o país real do item (`country`) salvo/coletado.
- Não mostrar JSON/debug visual na interface.

7. Remover pontos que causam confusão de mock
- Revisar botões `manual/extensão`, `Teste de Importação` e fluxos demo da Central para não poluir Favoritos/Salvos/Escalados com dados falsos.
- Manter os cards reais e não alterar a coleta Apify, token ou extensão.

Validação após implementar:
- Clicar em salvar, favoritar e enviar para escala em um anúncio real.
- Atualizar a página.
- Confirmar que `/favoritos`, `/ofertas-salvas` e `/ofertas-escaladas` ainda mostram os cards.
- Confirmar no console os logs exigidos.
- Confirmar que ChatGPT/Facebook abrem em nova aba, não dentro do preview.