import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function hasRole(userId: string, role: "owner" | "admin") {
  const { data } = await admin.from("user_roles").select("id").eq("user_id", userId).eq("role", role).maybeSingle();
  return !!data;
}

const validEmail = (v: unknown): v is string => typeof v === "string" && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) && v.length <= 160;
const validPassword = (v: unknown): v is string => typeof v === "string" && v.length >= 8 && v.length <= 72;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "unauthorized" }, 401);
  const { data: caller, error: callerError } = await admin.auth.getUser(token);
  if (callerError || !caller.user) return json({ error: "unauthorized" }, 401);
  if (!(await hasRole(caller.user.id, "owner"))) return json({ error: "forbidden" }, 403);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "invalid_body" }, 400); }

  if (body.action === "create") {
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!validEmail(email)) return json({ error: "invalid_email" }, 400);
    if (!validPassword(body.password)) return json({ error: "weak_password" }, 400);
    const { data, error } = await admin.auth.admin.createUser({ email, password: body.password, email_confirm: true });
    if (error || !data.user) return json({ error: error?.code === "email_exists" ? "email_exists" : "create_failed" }, 400);
    const { error: roleError } = await admin.from("user_roles").insert({ user_id: data.user.id, role: "admin" });
    if (roleError) {
      await admin.auth.admin.deleteUser(data.user.id);
      return json({ error: "create_failed" }, 500);
    }
    return json({ ok: true, user_id: data.user.id });
  }

  if (body.action === "delete" || body.action === "set_password") {
    const target = typeof body.user_id === "string" ? body.user_id : "";
    if (!target) return json({ error: "invalid_user" }, 400);
    if (target === caller.user.id || (await hasRole(target, "owner"))) return json({ error: "protected_user" }, 400);
    if (!(await hasRole(target, "admin"))) return json({ error: "invalid_user" }, 400);

    if (body.action === "delete") {
      const { error } = await admin.auth.admin.deleteUser(target);
      return error ? json({ error: "delete_failed" }, 500) : json({ ok: true });
    }
    if (!validPassword(body.password)) return json({ error: "weak_password" }, 400);
    const { error } = await admin.auth.admin.updateUserById(target, { password: body.password });
    return error ? json({ error: "update_failed" }, 500) : json({ ok: true });
  }

  return json({ error: "unknown_action" }, 400);
});
