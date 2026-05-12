Plano para resolver definitivamente o erro “www.facebook.com está bloqueado” no preview:

1. Ajustar o utilitário central de links externos
- Simplificar `openExternal` para usar `window.open(url, "_blank", "noopener,noreferrer")` diretamente dentro do clique do usuário.
- Manter fallback de cópia da URL para a área de transferência se o navegador bloquear popup.
- Manter `openChatGPTWithPrompt` copiando o prompt e abrindo `https://chatgpt.com` em nova aba real.

2. Reforçar resolução de URLs do Facebook/anúncios
- Garantir prioridade de fallback: `adUrl`, `snapshot.page_profile_uri`, `advertiserUrl`, `facebookUrl`, `instagramUrl`, `ad_library_id`.
- Aplicar a mesma resolução nos botões de Favoritos, Ofertas Salvas, Minerador, Radar, Análise IA e Ofertas Escaladas.

3. Remover caminhos que ainda possam navegar dentro do iframe
- Substituir qualquer `<a href>`/navegação direta externa restante por chamadas ao utilitário central.
- Evitar abrir Facebook/ChatGPT no frame atual em qualquer rota autenticada.

4. Validar
- Procurar novamente por navegações externas diretas no código.
- Confirmar que todos os botões externos passam por `openExternal`/`openChatGPTWithPrompt`.