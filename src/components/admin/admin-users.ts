import { supabase } from "@/integrations/supabase/client";

const errorText: Record<string, string> = {
  invalid_email: "Informe um e-mail válido.",
  weak_password: "A senha precisa ter pelo menos 8 caracteres.",
  email_exists: "Já existe uma conta com esse e-mail.",
  protected_user: "Esta conta não pode ser alterada por aqui.",
  forbidden: "Somente o responsável pela plataforma pode gerenciar contas.",
  invalid_user: "Esta conta não pode ser alterada por aqui.",
};

export function generatePassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint32Array(12));
  return Array.from(bytes, (n) => alphabet[n % alphabet.length]).join("");
}

export async function callAdminUsers(body: Record<string, string>) {
  const { data, error } = await supabase.functions.invoke("admin-users", { body });
  if (!error) return { error: null, code: null, userId: (data?.user_id as string | undefined) ?? null };
  const context = (error as { context?: Response }).context;
  const payload = context ? await context.json().catch(() => null) : null;
  const code = typeof payload?.error === "string" ? payload.error : "failed";
  return { error: errorText[code] ?? "Não foi possível concluir. Tente novamente.", code, userId: null };
}
