import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Scale } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { safeRedirect } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  validateSearch: z.object({ redirect: z.string().optional() }),
  head: () => ({ meta: [
    { title: "Entrar — Sistema Themis" }, { name: "description", content: "Acesse sua conta de aluno ou da diretoria." },
    { property: "og:title", content: "Entrar — Sistema Themis" }, { property: "og:description", content: "Login seguro do portal do DA de Direito." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { name: "robots", content: "noindex" },
  ] }),
  component: AuthPage,
});

const input = "h-12 rounded-lg border border-input bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring";

function AuthPage() {
  const { redirect } = Route.useSearch();
  const target = safeRedirect(redirect);
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up" | "forgot">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (data.session) navigate({ to: target, replace: true }); });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) navigate({ to: target, replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate, target]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setMsg(null);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setMsg({ ok: false, text: "E-mail ou senha incorretos, ou e-mail ainda não confirmado." });
      } else if (mode === "up") {
        const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth?redirect=${encodeURIComponent(target)}` } });
        setMsg(error ? { ok: false, text: error.message } : { ok: true, text: "Conta criada! Confira seu e-mail para confirmar o cadastro." });
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
        setMsg(error ? { ok: false, text: error.message } : { ok: true, text: "Enviamos um link para redefinir sua senha." });
      }
    } finally { setBusy(false); }
  };

  const google = async () => {
    sessionStorage.setItem("themis-after-login", target);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/auth?redirect=${encodeURIComponent(target)}` });
    if (result.error) setMsg({ ok: false, text: "Não foi possível entrar com o Google." });
  };

  return <div className="app-container grid min-h-[70vh] place-items-center py-10">
    <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-sm">
      <span className="mx-auto grid size-12 place-items-center rounded-lg bg-primary text-gold"><Scale size={22} /></span>
      <h1 className="mt-4 text-center text-2xl font-bold">{mode === "in" ? "Entrar" : mode === "up" ? "Criar conta" : "Recuperar senha"}</h1>
      <p className="mt-2 text-center text-sm text-muted-foreground">Alunos e diretoria usam a mesma conta. O acesso ao painel depende do seu perfil.</p>
      {mode !== "forgot" && <>
        <Button type="button" variant="outline" size="lg" className="mt-6 w-full" onClick={google}>Continuar com Google</Button>
        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />ou<span className="h-px flex-1 bg-border" /></div>
      </>}
      <form onSubmit={submit} className={mode === "forgot" ? "mt-6" : ""}>
        <label className="grid gap-1.5 text-sm font-bold">E-mail<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} /></label>
        {mode !== "forgot" && <label className="mt-4 grid gap-1.5 text-sm font-bold">Senha<input required minLength={6} type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={input} /></label>}
        {msg && <p className={`mt-3 rounded-lg p-3 text-xs font-bold ${msg.ok ? "bg-success-soft text-success" : "bg-destructive/10 text-destructive"}`}>{msg.text}</p>}
        <Button size="lg" className="mt-5 w-full" type="submit" disabled={busy}>{mode === "in" ? "Entrar" : mode === "up" ? "Criar conta" : "Enviar link"}</Button>
      </form>
      <div className="mt-4 flex flex-wrap justify-between gap-2 text-sm">
        {mode === "in" ? <><button className="font-bold text-primary" onClick={() => setMode("up")}>Criar conta</button><button className="text-muted-foreground" onClick={() => setMode("forgot")}>Esqueci a senha</button></>
          : <button className="font-bold text-primary" onClick={() => setMode("in")}>Já tenho conta</button>}
      </div>
    </div>
  </div>;
}
