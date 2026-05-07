Plano para corrigir o erro "Unauthorized: No authorization header provided" no Criar Ebook:

1. Substituir o login demo por autenticação real
- O app hoje marca o usuário como logado usando `localStorage`, mas isso não cria uma sessão real.
- As server functions do Ebook exigem token real, então o header `Authorization` nunca chega.
- Atualizar `AuthProvider` para usar a autenticação do backend (`getSession`, `onAuthStateChange`, `signInWithPassword`, `signUp`, `signOut`).

2. Ajustar a tela de login/cadastro
- Fazer o formulário chamar login/cadastro reais, não mais `setTimeout`/demo.
- Exibir mensagens corretas de erro e sucesso.
- Manter o fluxo atual de navegação após login.
- O botão Google pode continuar como “em breve” se não estiver configurado agora.

3. Proteger o layout autenticado com sessão real
- Garantir que `/_authenticated` só renderize quando a sessão real estiver hidratada.
- Assim, as chamadas do Ebook só disparam depois que existe token válido.

4. Corrigir chamadas do Ebook para sempre enviar Authorization
- Manter o middleware `requireSupabaseAuth`, mas torná-lo mais robusto.
- Garantir que server functions chamadas com `useServerFn` recebam `Authorization: Bearer <access_token>`.
- Evitar chamadas silenciosas quando não houver sessão; mostrar aviso claro para fazer login novamente.

5. Adicionar logs de debug seguros no fluxo de IA
- Em `ebook.server.ts`, registrar:
  - provider/model usado;
  - se a chave existe, sem imprimir a chave;
  - se o fetch será enviado com Authorization e Content-Type;
  - status da resposta do gateway.
- Não expor segredos no console.

6. Verificar retorno serializável
- Conferir funções de briefing, estrutura, capítulos e capa.
- Garantir que nenhuma delas retorne `Response`, apenas JSON/objetos/string serializáveis.

Resultado esperado:
- “Gerar briefing com IA” deixa de cair em Unauthorized.
- O fluxo Briefing → Estrutura → Capítulos funciona com usuário autenticado de verdade.
- Os logs passam a mostrar se a key existe e qual provider/model está em uso, sem vazar segredo.