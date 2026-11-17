import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Crown, KeyRound, Plus, Shield, ShieldOff, Trash2, UserRound, UsersRound, Wand2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime } from "@/lib/data";
import { callAdminUsers, generatePassword } from "./admin-users";
import { ErrorNote, Field, Panel, inputClass } from "./form";

type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
};

export function BoardAdmin({ isOwner }: { isOwner: boolean }) {
  const queryClient = useQueryClient();
  const { data: members = [], refetch, isLoading } = useQuery({
    queryKey: ["board"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_board");
      if (error) throw error;
      return data;
    },
  });

  // Lista todos os usuários cadastrados (comuns e admins) via profiles + user_roles
  const { data: allUsers = [], refetch: refetchUsers } = useQuery({
    queryKey: ["admin", "all-profiles"],
    queryFn: async () => {
      const [profilesRes, rolesRes] = await Promise.all([
        (supabase as any).from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (profilesRes.error) return [];
      const rolesMap = new Map<string, string[]>();
      for (const r of rolesRes.data ?? []) {
        const cur = rolesMap.get(r.user_id) ?? [];
        cur.push(r.role);
        rolesMap.set(r.user_id, cur);
      }
      const profiles = (profilesRes.data ?? []) as ProfileRow[];
      return profiles.map((p) => {
        const roles = rolesMap.get(p.id) ?? [];
        return {
          ...p,
          isAdmin: roles.includes("admin") || roles.includes("owner"),
          isOwner: roles.includes("owner"),
        };
      });
    },
  });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [roleBusyId, setRoleBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
  const [resetting, setResetting] = useState<string | null>(null);

  const refreshAll = () => {
    refetch();
    refetchUsers();
    queryClient.invalidateQueries({ queryKey: ["current-user"] });
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setCreated(null);
    const failure = await callAdminUsers({ action: "create", email: email.trim(), password });
    setBusy(false);
    if (failure.error) return setError(failure.error);
    setCreated({ email: email.trim().toLowerCase(), password });
    setEmail("");
    setPassword("");
    refreshAll();
  };

  const toggleAdminRole = async (userId: string, makeAdmin: boolean) => {
    setRoleBusyId(userId);
    if (makeAdmin) {
      await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });
    } else {
      await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
    }
    setRoleBusyId(null);
    refreshAll();
  };

  const remove = async (userId: string, memberEmail: string) => {
    if (!window.confirm(`Remover o acesso de ${memberEmail}? A conta será apagada.`)) return;
    const failure = await callAdminUsers({ action: "delete", user_id: userId });
    if (failure.error) return window.alert(failure.error);
    refreshAll();
  };

  return (
    <div className="space-y-6">
      <Panel
        title="Acessos ao painel"
        subtitle={
          isOwner
            ? "O acesso de cada membro é criado na ficha, em Membros do DA. Aqui ficam todas as contas com permissão administrativa."
            : "Contas com acesso ao painel. Novos acessos são criados pelo responsável pela plataforma."
        }
      >
        {isOwner && (
          <form onSubmit={create} className="grid gap-4 border-b border-border bg-muted/50 p-5 sm:grid-cols-[1fr_1fr_auto]">
            <Field label="E-mail do novo membro">
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" className={inputClass} />
            </Field>
            <Field label="Senha inicial" hint="mínimo de 8 caracteres">
              <div className="flex gap-2">
                <input required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputClass} font-mono`} />
                <Button type="button" variant="outline" size="icon" className="size-11 shrink-0" onClick={() => setPassword(generatePassword())} aria-label="Gerar senha">
                  <Wand2 size={16} />
                </Button>
              </div>
            </Field>
            <div className="flex items-end">
              <Button type="submit" disabled={busy} className="w-full sm:w-auto">
                <Plus /> {busy ? "Criando..." : "Cadastrar"}
              </Button>
            </div>
            <ErrorNote text={error} />
            {created && (
              <p className="rounded-lg bg-success-soft p-3 text-xs font-bold text-success sm:col-span-full">
                Conta criada. Envie ao novo membro: e-mail <span className="font-mono">{created.email}</span> · senha{" "}
                <span className="font-mono">{created.password}</span>. Recomende trocar a senha no primeiro acesso.
              </p>
            )}
          </form>
        )}
        <ul className="divide-y divide-border">
          {isLoading && (
            <li className="p-6">
              <div className="h-10 animate-pulse rounded-lg bg-muted" />
            </li>
          )}
          {members.map((m) => (
            <li key={m.user_id} className="p-4 sm:px-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-navy-soft text-primary">
                  {m.is_owner ? <Crown size={18} className="text-gold" /> : <UsersRound size={18} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{m.email}</p>
                  <p className="text-xs text-muted-foreground">{m.is_owner ? "Responsável pela plataforma" : `Desde ${formatDateTime(m.since)}`}</p>
                </div>
                {isOwner && !m.is_owner && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setResetting(resetting === m.user_id ? null : m.user_id)}>
                      <KeyRound size={15} /> Nova senha
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => remove(m.user_id, m.email)}>
                      <Trash2 size={15} /> Remover
                    </Button>
                  </div>
                )}
              </div>
              {resetting === m.user_id && <ResetPassword userId={m.user_id} email={m.email} onDone={() => setResetting(null)} />}
            </li>
          ))}
        </ul>
      </Panel>

      {/* Gerenciamento de papéis (Usuário Comum <-> Admin) */}
      <Panel
        title="Usuários cadastrados no site"
        subtitle="Novos cadastros entram automaticamente como Usuário Comum (sem acesso ao painel). Promova a Admin apenas membros autorizados da diretoria."
      >
        <ul className="divide-y divide-border">
          {allUsers.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 p-4 sm:px-5">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
                  <UserRound size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-bold">{u.full_name || u.email}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        u.isOwner
                          ? "bg-gold/20 text-gold"
                          : u.isAdmin
                          ? "bg-navy-soft text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {u.isOwner ? "Responsável" : u.isAdmin ? "Admin" : "Usuário Comum"}
                    </span>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                </div>
              </div>

              {!u.isOwner && (
                <div>
                  {u.isAdmin ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={roleBusyId === u.id}
                      onClick={() => toggleAdminRole(u.id, false)}
                      className="text-destructive"
                    >
                      <ShieldOff size={15} /> Rebaixar para Comum
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={roleBusyId === u.id}
                      onClick={() => toggleAdminRole(u.id, true)}
                    >
                      <Shield size={15} /> Tornar Admin
                    </Button>
                  )}
                </div>
              )}
            </li>
          ))}
          {allUsers.length === 0 && (
            <li className="p-6 text-center text-sm text-muted-foreground">Nenhum usuário cadastrado ainda.</li>
          )}
        </ul>
      </Panel>
    </div>
  );
}

function ResetPassword({ userId, email, onDone }: { userId: string; email: string; onDone: () => void }) {
  const [password, setPassword] = useState(generatePassword);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const failure = await callAdminUsers({ action: "set_password", user_id: userId, password });
    setBusy(false);
    setMsg(failure.error ? { ok: false, text: failure.error } : { ok: true, text: `Senha de ${email} alterada para ${password}.` });
  };
  return (
    <form onSubmit={save} className="mt-3 grid gap-2 rounded-lg border border-border bg-muted/50 p-3 sm:grid-cols-[1fr_auto_auto]">
      <input required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputClass} font-mono`} aria-label="Nova senha" />
      <Button type="submit" disabled={busy}>
        {busy ? "Salvando..." : "Salvar senha"}
      </Button>
      <Button type="button" variant="ghost" onClick={onDone}>
        Fechar
      </Button>
      {msg && <p className={`rounded-lg p-2 text-xs font-bold sm:col-span-full ${msg.ok ? "bg-success-soft text-success" : "bg-destructive/10 text-destructive"}`}>{msg.text}</p>}
    </form>
  );
}