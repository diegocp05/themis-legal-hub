import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { BrandMark } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nova senha — Sistema Têmis" },
      { name: "description", content: "Defina uma nova senha para sua conta." },
      { property: "og:title", content: "Nova senha — Sistema Têmis" },
      { property: "og:description", content: "Redefinição de senha do portal." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPage,
});

function ResetPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");

    const { data, error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setBusy(false);
      setError("Não foi possível salvar. Se veio por e-mail, o link pode ter expirado: solicite outro.");
      return;
    }

    // Verifica se o usuário é admin para direcionar corretamente
    let destination: "/" | "/admin" = "/";
    if (data.user) {
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
      const isAdmin = (roles ?? []).some((r) => r.role === "admin" || r.role === "owner");
      if (isAdmin) destination = "/admin";
    }

    setBusy(false);
    navigate({ to: destination, replace: true });
  };

  return (
    <div className="app-container grid min-h-[85vh] place-items-center py-10">
      <form className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-sm" onSubmit={handleSave}>
        <BrandMark className="mx-auto size-12" icon={22} />
        <h1 className="mt-4 text-center text-2xl font-bold">Definir nova senha</h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">Escolha uma nova senha com pelo menos 8 caracteres.</p>

        <label className="mt-6 grid gap-1.5 text-sm font-bold">
          Nova senha
          <div className="relative">
            <input
              required
              minLength={8}
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 w-full rounded-lg border border-input bg-background px-3 pr-11 font-normal outline-none focus:ring-2 focus:ring-ring"
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

        {error && <p className="mt-3 rounded-lg bg-destructive/10 p-3 text-xs font-bold text-destructive">{error}</p>}

        <Button size="lg" className="mt-5 w-full" type="submit" disabled={busy}>
          {busy ? "Salvando..." : "Salvar senha"}
        </Button>
      </form>
    </div>
  );
}