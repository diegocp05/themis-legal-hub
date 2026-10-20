import { useQuery } from "@tanstack/react-query";
import { Crown, KeyRound, Plus, Trash2, UsersRound, Wand2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime } from "@/lib/data";
import { ErrorNote, Field, Panel, inputClass } from "./form";

const errorText: Record<string, string> = {
  invalid_email: "Informe um e-mail válido.",
  weak_password: "A senha precisa ter pelo menos 8 caracteres.",
  email_exists: "Já existe uma conta com esse e-mail.",
  protected_user: "Esta conta não pode ser alterada por aqui.",
  forbidden: "Somente o responsável pela plataforma pode gerenciar contas.",
};

async function callAdminUsers(body: Record<string, string>) {
  const { error } = await supabase.functions.invoke("admin-users", { body });
  if (!error) return null;
  const context = (error as { context?: Response }).context;
  const payload = context ? await context.json().catch(() => null) : null;
  return errorText[payload?.error] ?? "Não foi possível concluir. Tente novamente.";
}

function generatePassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint32Array(12));
  return Array.from(bytes, (n) => alphabet[n % alphabet.length]).join("");
}

export function BoardAdmin({ isOwner }: { isOwner: boolean }) {
  const { data: members = [], refetch, isLoading } = useQuery({ queryKey: ["board"], queryFn: async () => { const { data, error } = await supabase.rpc("list_board"); if (error) throw error; return data; } });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
  const [resetting, setResetting] = useState<string | null>(null);

  const create = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError(""); setCreated(null);
    const failure = await callAdminUsers({ action: "create", email: email.trim(), password });
    setBusy(false);
    if (failure) return setError(failure);
    setCreated({ email: email.trim().toLowerCase(), password });
    setEmail(""); setPassword("");
    refetch();
  };
  const remove = async (userId: string, memberEmail: string) => {
    if (!window.confirm(`Remover o acesso de ${memberEmail}? A conta será apagada.`)) return;
    const failure = await callAdminUsers({ action: "delete", user_id: userId });
    if (failure) return window.alert(failure);
    refetch();
  };

  return <Panel title="Acessos ao painel" subtitle={isOwner ? "Somente você, como responsável, cadastra e remove contas do painel." : "Contas com acesso ao painel. Novos acessos são criados pelo responsável pela plataforma."}>
    {isOwner && <form onSubmit={create} className="grid gap-4 border-b border-border bg-muted/50 p-5 sm:grid-cols-[1fr_1fr_auto]">
      <Field label="E-mail do novo membro"><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" className={inputClass} /></Field>
      <Field label="Senha inicial" hint="mínimo de 8 caracteres">
        <div className="flex gap-2"><input required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputClass} font-mono`} /><Button type="button" variant="outline" size="icon" className="size-11 shrink-0" onClick={() => setPassword(generatePassword())} aria-label="Gerar senha"><Wand2 size={16} /></Button></div>
      </Field>
      <div className="flex items-end"><Button type="submit" disabled={busy} className="w-full sm:w-auto"><Plus /> {busy ? "Criando..." : "Cadastrar"}</Button></div>
      <ErrorNote text={error} />
      {created && <p className="rounded-lg bg-success-soft p-3 text-xs font-bold text-success sm:col-span-full">Conta criada. Envie ao novo membro: e-mail <span className="font-mono">{created.email}</span> · senha <span className="font-mono">{created.password}</span>. Recomende trocar a senha no primeiro acesso.</p>}
    </form>}
    <ul className="divide-y divide-border">
      {isLoading && <li className="p-6"><div className="h-10 animate-pulse rounded-lg bg-muted" /></li>}
      {members.map((m) => <li key={m.user_id} className="p-4 sm:px-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-navy-soft text-primary">{m.is_owner ? <Crown size={18} className="text-gold" /> : <UsersRound size={18} />}</span>
          <div className="min-w-0 flex-1"><p className="truncate font-bold">{m.email}</p><p className="text-xs text-muted-foreground">{m.is_owner ? "Responsável pela plataforma" : `Desde ${formatDateTime(m.since)}`}</p></div>
          {isOwner && !m.is_owner && <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setResetting(resetting === m.user_id ? null : m.user_id)}><KeyRound size={15} /> Nova senha</Button>
            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => remove(m.user_id, m.email)}><Trash2 size={15} /> Remover</Button>
          </div>}
        </div>
        {resetting === m.user_id && <ResetPassword userId={m.user_id} email={m.email} onDone={() => setResetting(null)} />}
      </li>)}
    </ul>
  </Panel>;
}

function ResetPassword({ userId, email, onDone }: { userId: string; email: string; onDone: () => void }) {
  const [password, setPassword] = useState(generatePassword);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setMsg(null);
    const failure = await callAdminUsers({ action: "set_password", user_id: userId, password });
    setBusy(false);
    setMsg(failure ? { ok: false, text: failure } : { ok: true, text: `Senha de ${email} alterada para ${password}.` });
  };
  return <form onSubmit={save} className="mt-3 grid gap-2 rounded-lg border border-border bg-muted/50 p-3 sm:grid-cols-[1fr_auto_auto]">
    <input required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputClass} font-mono`} aria-label="Nova senha" />
    <Button type="submit" disabled={busy}>{busy ? "Salvando..." : "Salvar senha"}</Button>
    <Button type="button" variant="ghost" onClick={onDone}>Fechar</Button>
    {msg && <p className={`rounded-lg p-2 text-xs font-bold sm:col-span-full ${msg.ok ? "bg-success-soft text-success" : "bg-destructive/10 text-destructive"}`}>{msg.text}</p>}
  </form>;
}
