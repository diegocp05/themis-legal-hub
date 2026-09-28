import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [
    { title: "Nova senha — Sistema Themis" }, { name: "description", content: "Defina uma nova senha para sua conta." },
    { property: "og:title", content: "Nova senha — Sistema Themis" }, { property: "og:description", content: "Redefinição de senha do portal." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { name: "robots", content: "noindex" },
  ] }),
  component: ResetPage,
});

function ResetPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  return <div className="app-container grid min-h-[70vh] place-items-center py-10">
    <form className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-sm" onSubmit={async (e) => {
      e.preventDefault();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) setError("Link inválido ou expirado. Solicite outro."); else navigate({ to: "/perfil" });
    }}>
      <h1 className="text-2xl font-bold">Definir nova senha</h1>
      <label className="mt-6 grid gap-1.5 text-sm font-bold">Nova senha<input required minLength={6} type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 rounded-lg border border-input bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring" /></label>
      {error && <p className="mt-3 rounded-lg bg-destructive/10 p-3 text-xs font-bold text-destructive">{error}</p>}
      <Button size="lg" className="mt-5 w-full" type="submit">Salvar senha</Button>
    </form>
  </div>;
}
