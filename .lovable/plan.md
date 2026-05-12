Vou implementar uma correção centrada em fallback manual confiável, sem auto-redirecionamento agressivo.

1. Criar a rota interna “Link externo”
- Nova página autenticada para abrir anúncios/perfis externos com segurança.
- Receberá dados via query string: URL do anúncio, adLibraryId, URL de perfil do anunciante e rótulo.
- Mostrará:
  - botão grande “Abrir anúncio em nova aba”
  - botão “Copiar link”
  - botão “Copiar ID do anúncio” quando houver ID
  - botão “Abrir Biblioteca de Anúncios” apontando para `https://www.facebook.com/ads/library/`
  - botão “Abrir perfil do anunciante” quando houver perfil
  - instrução: “Se o Facebook bloquear, cole o ID na Biblioteca de Anúncios.”

2. Trocar a estratégia para Meta/Facebook Ads Library
- Adicionar utilitário central para detectar URLs Meta/Facebook, especialmente `facebook.com/ads/library/?id=...`.
- Para “Abrir anúncio” com ID da Ads Library, não chamar mais `/go.html` nem redirecionar automaticamente.
- Em vez disso, navegar para a página interna “Link externo” com link, ID e alternativas manuais.

3. Atualizar todos os pontos de abertura de anúncios Meta
- Aplicar nas telas encontradas:
  - Central de Mineração
  - Minerar
  - Ofertas Escaladas
  - Ofertas Salvas
  - Favoritos
  - Radar
  - Análise IA
- Onde existir `page_profile_uri`, `advertiserUrl`, `instagramUrl`, `facebookUrl` ou equivalente, enviar também o perfil para a página interna e manter abertura em nova aba quando o usuário clicar explicitamente.

4. Ajustar ChatGPT
- Alterar `openChatGPTWithPrompt` para não usar `/go.html`.
- Copiar o prompt para clipboard.
- Abrir diretamente `https://chatgpt.com` com `window.open(url, "_blank", "noopener,noreferrer")`.
- Se o popup for bloqueado, mostrar toast com ação/botão “Copiar prompt” e manter o prompt copiável.

5. Remover auto redirect agressivo
- Simplificar/remover o comportamento de auto redirect em `/go.html`, deixando-o apenas como página manual de fallback para links genéricos, sem `location.replace` automático.
- Para Facebook/Meta, o fluxo principal será a nova página interna manual, não `/go.html`.

6. Validar
- Procurar novamente por `ads/library`, `openExternal`, `window.open` e `/go.html` para garantir que não restaram caminhos automáticos problemáticos.
- Confirmar que a UX sempre oferece cópia manual de link/ID e abertura alternativa da Biblioteca de Anúncios.