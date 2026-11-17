import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import { BrandMark } from "@/components/app-shell";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const searchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Entrar — Sistema Têmis" },
      { name: "description", content: "Acesso ao Sistema Têmis do Diretório Acadêmico de Direito." },
      { property: "og:title", content: "Entrar — Sistema Têmis" },
      { property: "og:description", content: "Login e cadastro no Sistema Têmis." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

const input = "h-12 w-full rounded-lg border border-input bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring";

function safeTarget(value: unknown): string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

function getSiteOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin && window.location.origin !== "null") {
    return window.location.origin;
  }
  return "https://themis-legal-hub.vercel.app";
}

function AuthPage() {
  const { redirect } = Route.useSearch();
  const target = safeTarget(redirect);
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up" | "forgot">("in");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: target, replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) navigate({ to: target, replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate, target]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const origin = getSiteOrigin();

    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) setMsg({ ok: false, text: "E-mail ou senha incorretos." });
      } else if (mode === "up") {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${origin}/auth`,
            data: { full_name: fullName.trim() },
          },
        });
        if (error) {
          setMsg({ ok: false, text: error.message || "Não foi possível criar sua conta agora." });
        } else {
          setMsg({
            ok: true,
            text: "Conta criada com sucesso! Verifique seu e-mail para confirmar o cadastro ou faça login.",
          });
          setMode("in");
          setShowPassword(false);
        }
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${origin}/reset-password`,
        });
        setMsg(
          error
            ? { ok: false, text: "Não foi possível enviar o link agora. Tente novamente em alguns minutos." }
            : { ok: true, text: "Se o e-mail estiver cadastrado, você vai receber um link para redefinir a senha." }
        );
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="app-container grid min-h-[85vh] place-items-center py-10">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-sm">
        <BrandMark className="mx-auto size-12" icon={22} />
        <h1 className="mt-4 text-center text-2xl font-bold">
          {mode === "in" ? "Entrar no Sistema Têmis" : mode === "up" ? "Criar conta" : "Recuperar senha"}
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          {mode === "up"
            ? "Preencha seus dados abaixo para criar seu acesso."
            : "Entre na sua conta ou explore o portal livremente sem cadastro."}
        </p>

        {mode !== "forgot" && (
          <div className="mt-5 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
            <button
              type="button"
              onClick={() => { setMode("in"); setMsg(null); setShowPassword(false); }}
              className={`h-9 rounded-md text-xs font-bold transition ${mode === "in" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              Já tenho conta
            </button>
            <button
              type="button"
              onClick={() => { setMode("up"); setMsg(null); setShowPassword(false); }}
              className={`h-9 rounded-md text-xs font-bold transition ${mode === "up" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              Criar conta
            </button>
          </div>
        )}

        <form onSubmit={submit} className="mt-5 space-y-4">
          {mode === "up" && (
            <label className="grid gap-1.5 text-sm font-bold">
              Nome completo
              <input required minLength={2} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Seu nome" className={input} />
            </label>
          )}
          <label className="grid gap-1.5 text-sm font-bold">
            E-mail
            <input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
          </label>
          {mode !== "forgot" && (
            <label className="grid gap-1.5 text-sm font-bold">
              Senha
              <div className="relative">
                <input
                  required
                  minLength={8}
                  type={showPassword ? "text" : "password"}
                  autoComplete={mode === "in" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${input} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
          )}
          {msg && (
            <p className={`rounded-lg p-3 text-xs font-bold ${msg.ok ? "bg-success-soft text-success" : "bg-destructive/10 text-destructive"}`}>
              {msg.text}
            </p>
          )}
          <Button size="lg" className="w-full" type="submit" disabled={busy}>
            {mode === "in" ? "Entrar" : mode === "up" ? "Criar minha conta" : "Enviar link"}
          </Button>
        </form>

        <div className="mt-4 flex flex-col items-center gap-2 text-center text-sm">
          {mode === "in" ? (
            <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => { setMode("forgot"); setMsg(null); }}>
              Esqueci a senha
            </button>
          ) : (
            <button type="button" className="font-bold text-primary" onClick={() => { setMode("in"); setMsg(null); setShowPassword(false); }}>
              Voltar para o login
            </button>
          )}
          <Button asChild variant="ghost" size="sm" className="mt-2 w-full text-muted-foreground">
            <Link to="/">Continuar sem cadastro</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}