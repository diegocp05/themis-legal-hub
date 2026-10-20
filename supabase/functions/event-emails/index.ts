import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// Public on purpose: both actions only e-mail registrants once (tracked by *_sent_at),
// so calling them again cannot spam anyone.

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const EMAIL_FROM = Deno.env.get("EMAIL_FROM") ?? "DA de Direito <onboarding@resend.dev>";
const SITE_URL = (Deno.env.get("SITE_URL") ?? "http://localhost:8080").replace(/\/$/, "");
const TZ = "America/Sao_Paulo";

type EventInfo = { id: string; slug: string; title: string; location: string | null; starts_at: string; ends_at: string | null };
type Registration = { id: string; full_name: string; email: string; events: EventInfo };

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const day = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, day: "numeric", month: "long" }).format(new Date(iso));
const hour = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

function when(ev: EventInfo) {
  const start = `${day(ev.starts_at)}, às ${hour(ev.starts_at)}`;
  return ev.ends_at && day(ev.ends_at) !== day(ev.starts_at) ? `${start} até ${day(ev.ends_at)}` : start;
}

function layout(title: string, intro: string, ev: EventInfo) {
  const url = `${SITE_URL}/eventos/${ev.slug}`;
  return `<!doctype html><html><body style="margin:0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;color:#1c1c1c">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden">
<tr><td style="background:#1c1c1c;padding:20px 28px;color:#b8963c;font-weight:bold;letter-spacing:1px;font-size:13px">DIRETÓRIO ACADÊMICO DE DIREITO</td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 12px;font-size:22px">${escape(title)}</h1>
<p style="margin:0 0 20px;line-height:1.6;color:#444">${intro}</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #e5e5e5;border-radius:8px"><tr><td style="padding:16px">
<p style="margin:0;font-weight:bold;font-size:16px">${escape(ev.title)}</p>
<p style="margin:6px 0 0;color:#444">${escape(when(ev))}</p>
${ev.location ? `<p style="margin:4px 0 0;color:#444">${escape(ev.location)}</p>` : ""}
</td></tr></table>
<p style="margin:24px 0 0"><a href="${url}" style="display:inline-block;background:#1c1c1c;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:8px">Ver evento</a></p>
<p style="margin:24px 0 0;font-size:12px;color:#888">A presença é marcada pela organização na entrada. Quem tiver presença confirmada pode emitir o certificado no site, quando liberado.</p>
</td></tr></table></td></tr></table></body></html>`;
}

async function send(to: string, subject: string, html: string) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: EMAIL_FROM, to: [to], subject, html }),
  });
  if (!r.ok) console.error("resend", r.status, await r.text());
  return r.ok;
}

const firstName = (name: string) => escape(name.trim().split(/\s+/)[0] ?? name);

async function sendConfirmation(eventId: string, email: string) {
  const { data } = await db.from("registrations")
    .select("id, full_name, email, events!inner(id, slug, title, location, starts_at, ends_at)")
    .eq("event_id", eventId).eq("email", email.trim().toLowerCase()).is("confirmation_sent_at", null).maybeSingle();
  const reg = data as Registration | null;
  if (!reg) return json({ sent: false, reason: "not_found" });
  const ok = await send(reg.email, `Inscrição confirmada: ${reg.events.title}`,
    layout("Inscrição confirmada!", `Olá, ${firstName(reg.full_name)}! Sua inscrição está garantida. Na véspera, mandamos um lembrete.`, reg.events));
  if (ok) await db.from("registrations").update({ confirmation_sent_at: new Date().toISOString() }).eq("id", reg.id);
  return json({ sent: ok });
}

async function sendReminders() {
  const now = new Date();
  const until = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const { data, error } = await db.from("registrations")
    .select("id, full_name, email, events!inner(id, slug, title, location, starts_at, ends_at, published)")
    .is("reminder_sent_at", null)
    .eq("events.published", true)
    .gte("events.starts_at", now.toISOString())
    .lte("events.starts_at", until.toISOString())
    .limit(200);
  if (error) return json({ error: "query_failed" }, 500);
  let sent = 0;
  for (const reg of (data ?? []) as Registration[]) {
    const ok = await send(reg.email, `Lembrete: ${reg.events.title} é amanhã`,
      layout("Seu evento está chegando", `Olá, ${firstName(reg.full_name)}! Passando para lembrar do evento em que você se inscreveu.`, reg.events));
    if (ok) {
      sent++;
      await db.from("registrations").update({ reminder_sent_at: new Date().toISOString() }).eq("id", reg.id);
    }
  }
  return json({ sent, pending: (data?.length ?? 0) - sent });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!RESEND_API_KEY) return json({ sent: false, reason: "not_configured" });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "invalid_body" }, 400); }

  if (body.type === "confirmation" && typeof body.event_id === "string" && typeof body.email === "string") {
    return sendConfirmation(body.event_id, body.email);
  }
  if (body.type === "reminders") return sendReminders();
  return json({ error: "unknown_type" }, 400);
});
