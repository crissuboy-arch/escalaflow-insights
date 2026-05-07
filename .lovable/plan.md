## Objetivo
Permitir que `cristianefsopt24@gmail.com` entre imediatamente com a senha `123456`.

## Diagnóstico
- A conta já existe no backend (signup retorna `user_already_exists`).
- O login com `123456` retorna `Invalid login credentials` → a senha atual cadastrada é diferente.
- Não há fluxo de "esqueci minha senha" implementado, e configurar e-mail de recuperação levaria mais tempo.

## Ação
1. Resetar a senha da conta `cristianefsopt24@gmail.com` para `123456` diretamente no backend, usando uma migration SQL que chama a função admin do auth (atualiza `auth.users.encrypted_password` via `crypt()` + confirma o e-mail caso ainda não esteja).
2. Confirmar que o usuário está com `email_confirmed_at` preenchido para garantir que o login funcione.
3. Pedir para você entrar em `/login` com:
   - E-mail: `cristianefsopt24@gmail.com`
   - Senha: `123456`

## Observação de segurança
`123456` é uma senha fraca e foi exposta neste chat. Recomendo trocar por uma senha forte logo após o primeiro login (posso adicionar uma tela "Alterar senha" depois, se quiser).

## Próximo passo opcional
Se quiser, no mesmo passo eu já adiciono o fluxo "Esqueci minha senha" + página `/reset-password` para evitar depender de reset manual no futuro.
