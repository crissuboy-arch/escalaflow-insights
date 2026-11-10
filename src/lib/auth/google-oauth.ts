// Login com Google via Supabase Auth (provider "google" configurado no painel
// do Supabase). Não cria nenhum fluxo de autenticação novo: usa o mesmo
// supabase-js e a mesma sessão (onAuthStateChange no AuthProvider) que o login
// por e-mail e palavra-passe.
//
// O utilizador volta para /login, que NÃO está protegida e que já reencaminha
// para /dashboard assim que a sessão existe. Assim não há corrida com o guard
// de /_authenticated enquanto o supabase-js processa o código devolvido no URL.
import type { SupabaseClient } from "@supabase/supabase-js";

export function googleRedirectUrl(origin: string): string {
  return `${origin.replace(/\/+$/, "")}/login`;
}

export async function startGoogleSignIn(
  client: Pick<SupabaseClient["auth"], "signInWithOAuth">,
  origin: string,
): Promise<{ error?: string }> {
  const { error } = await client.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: googleRedirectUrl(origin),
      // Deixa o utilizador escolher a conta Google em vez de reutilizar
      // silenciosamente a última sessão do browser.
      queryParams: { prompt: "select_account" },
    },
  });
  return { error: error?.message };
}
