import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2, UserRound, Wand2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { BoardMemberRow } from "@/lib/data";
import { callAdminUsers, generatePassword } from "./admin-users";
import { ErrorNote, Field, ImageInput, Panel, Toggle, inputClass } from "./form";

type Account = { user_id: string; email: string; is_owner: boolean };

export function MembersAdmin({ isOwner }: { isOwner: boolean }) {
  const queryClient = useQueryClient();
  const { data: members = [], isLoading } = useQuery({
    queryKey: ["admin", "board-members"],
    queryFn: async () => {
      const { data, error } = await supabase.from("board_members").select("*").order("sort_order").order("created_at");
      if (error) throw error;
      return data;
    },
  });
  const { data: accounts = [] } = useQuery({
    queryKey: ["board"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_board");
      if (error) throw error;
      return data;
    },
  });
  const [form, setForm] = useState<{ mode: "new" } | { mode: "edit"; member: BoardMemberRow } | null>(null);
  const [notice, setNotice] = useState("");
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin"] });
    queryClient.invalidateQueries({ queryKey: ["board"] });
    queryClient.invalidateQueries({ queryKey: ["board-members"] });
  };
  const emailOf = (userId: string | null) => accounts.find((account) => account.user_id === userId)?.email ?? null;

  const remove = async (m: BoardMemberRow) => {
    const email = m.user_id ? emailOf(m.user_id) : null;
    if (m.user_id && !isOwner) return window.alert("Só o responsável pode excluir um membro que tem acesso ao painel.");
    const message = email ? `Excluir ${m.name}? O acesso ${email} também será apagado.` : `Excluir ${m.name} da diretoria?`;
    if (!window.confirm(message)) return;
    if (m.user_id) {
      const failure = await callAdminUsers({ action: "delete", user_id: m.user_id });
      if (failure.error) return window.alert(failure.error);
    }
    await supabase.from("board_members").delete().eq("id", m.id);
    refresh();
  };

  const chapa = members.filter((m) => m.in_chapa);
  const others = members.filter((m) => !m.in_chapa);
  const moveWithin = async (inChapa: boolean, index: number, delta: -1 | 1) => {
    const group = inChapa ? chapa : others;
    const target = index + delta;
    if (target < 0 || target >= group.length) return;
    const next = [...group];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item!);
    const ordered = inChapa ? [...next, ...others] : [...chapa, ...next];
    await Promise.all(ordered.map((m, i) => (m.sort_order === i + 1 ? null : supabase.from("board_members").update({ sort_order: i + 1 }).eq("id", m.id))));
    refresh();
  };

  const nextOrder = members.reduce((max, m) => Math.max(max, m.sort_order), 0) + 1;
  const sectors = [...new Set(members.map((m) => m.sector))];

  return <Panel title="Membros do DA" subtitle="A chapa fica separada dos demais integrantes. Quem não faz parte da chapa pode ser ocultado ou removido sem alterar a chapa." action={<Button onClick={() => { setNotice(""); setForm({ mode: "new" }); }}><Plus /> Novo membro</Button>}>
    {notice && <p className="border-b border-border bg-success-soft p-4 text-xs font-bold text-success">{notice}</p>}
    {form && <MemberForm key={form.mode === "edit" ? form.member.id : "new"} initial={form.mode === "edit" ? form.member : null} nextOrder={nextOrder} sectors={sectors} isOwner={isOwner} linkedEmail={form.mode === "edit" ? emailOf(form.member.user_id) : null} accounts={accounts} members={members} onDone={(message) => { setForm(null); setNotice(message ?? ""); refresh(); }} onCancel={() => setForm(null)} />}
    {isLoading && <div className="p-6"><div className="h-12 animate-pulse rounded-lg bg-muted" /></div>}
    {!isLoading && members.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">Nenhum membro cadastrado.</p>}
    {!isLoading && members.length > 0 && <>
      <MemberList title="Chapa" members={chapa} empty="Nenhum membro na chapa." onMove={(index, delta) => moveWithin(true, index, delta)} onEdit={(m) => { setNotice(""); setForm({ mode: "edit", member: m }); }} onRemove={remove} emailOf={emailOf} />
      <MemberList title="Demais integrantes" members={others} empty="Nenhum integrante fora da chapa." onMove={(index, delta) => moveWithin(false, index, delta)} onEdit={(m) => { setNotice(""); setForm({ mode: "edit", member: m }); }} onRemove={remove} emailOf={emailOf} />
    </>}
  </Panel>;
}

function MemberList({ title, members, empty, onMove, onEdit, onRemove, emailOf }: { title: string; members: BoardMemberRow[]; empty: string; onMove: (index: number, delta: -1 | 1) => void; onEdit: (member: BoardMemberRow) => void; onRemove: (member: BoardMemberRow) => void; emailOf: (userId: string | null) => string | null }) {
  return <section className="border-t border-border">
    <h3 className="px-5 pt-4 text-sm font-bold uppercase tracking-wide text-gold">{title}</h3>
    {members.length === 0 ? <p className="px-5 py-4 text-sm text-muted-foreground">{empty}</p> : <ul className="divide-y divide-border">
      {members.map((m, i) => <li key={m.id} className="flex items-center gap-3 p-4 sm:gap-4 sm:px-5">
        {m.photo_url ? <img src={m.photo_url} alt="" className="size-12 shrink-0 rounded-lg object-cover" /> : <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground"><UserRound size={20} /></span>}
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{m.name}</p>
          <p className="truncate text-xs font-bold uppercase tracking-wide text-gold">{m.role}</p>
          <p className="truncate text-xs text-muted-foreground">{m.sector}{m.instagram && ` · @${m.instagram}`} · {emailOf(m.user_id) ?? "Sem acesso ao painel"}</p>
          {!m.active && <span className="mt-1 inline-flex rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">Oculto</span>}
        </div>
        <div className="flex shrink-0 gap-1">
          <Button variant="ghost" size="icon" disabled={i === 0} onClick={() => onMove(i, -1)} aria-label={`Subir ${m.name}`}><ArrowUp size={16} /></Button>
          <Button variant="ghost" size="icon" disabled={i === members.length - 1} onClick={() => onMove(i, 1)} aria-label={`Descer ${m.name}`}><ArrowDown size={16} /></Button>
          <Button variant="outline" size="icon" onClick={() => onEdit(m)} aria-label={`Editar ${m.name}`}><Pencil size={16} /></Button>
          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => onRemove(m)} aria-label={`Excluir ${m.name}`}><Trash2 size={16} /></Button>
        </div>
      </li>)}
    </ul>}
  </section>;
}

const cleanInstagram = (value: string) => value.trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/^@/, "").replace(/\/.*$/, "");

function MemberForm({ initial, nextOrder, sectors, isOwner, linkedEmail, accounts, members, onDone, onCancel }: { initial: BoardMemberRow | null; nextOrder: number; sectors: string[]; isOwner: boolean; linkedEmail: string | null; accounts: Account[]; members: BoardMemberRow[]; onDone: (notice?: string) => void; onCancel: () => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [role, setRole] = useState(initial?.role ?? "");
  const [sector, setSector] = useState(initial?.sector ?? sectors[0] ?? "Diretoria");
  const [instagram, setInstagram] = useState(initial?.instagram ?? "");
  const [photo, setPhoto] = useState<string | null>(initial?.photo_url ?? null);
  const [active, setActive] = useState(initial?.active ?? true);
  const [inChapa, setInChapa] = useState(initial?.in_chapa ?? true);
  const [accessEmail, setAccessEmail] = useState(linkedEmail ?? "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const creatingLogin = isOwner && !initial;

  const linkExisting = async (email: string, memberId: string, nextPassword: string) => {
    const match = accounts.find((account) => account.email.toLowerCase() === email);
    if (!match) return "Já existe uma conta com esse e-mail.";
    if (match.is_owner) return "Esta conta é do responsável pela plataforma.";
    const taken = members.find((member) => member.user_id === match.user_id && member.id !== memberId);
    if (taken) return `Este e-mail já é o acesso de ${taken.name}.`;
    const { error: linkError } = await supabase.from("board_members").update({ user_id: match.user_id }).eq("id", memberId);
    if (linkError) return "Não foi possível vincular o acesso.";
    if (nextPassword) {
      const updated = await callAdminUsers({ action: "set_password", user_id: match.user_id, password: nextPassword });
      if (updated.error) return updated.error;
    }
    return null;
  };

  const ensureAccess = async (memberId: string, userId: string | null) => {
    if (!isOwner) return { error: null, notice: null as string | null };
    const email = accessEmail.trim().toLowerCase();
    const nextPassword = password.trim();
    if (!userId && !email && !nextPassword) return initial ? { error: null, notice: null } : { error: "Informe o e-mail e a senha do acesso deste membro.", notice: null };
    if (!userId && (!email || nextPassword.length < 8)) return { error: "Informe o e-mail e uma senha de pelo menos 8 caracteres.", notice: null };
    if (userId && !email) return { error: "Informe o e-mail de acesso.", notice: null };

    if (!userId) {
      const created = await callAdminUsers({ action: "create", email, password: nextPassword });
      if (created.code === "email_exists") {
        const linked = await linkExisting(email, memberId, nextPassword);
        return linked ? { error: linked, notice: null } : { error: null, notice: `Acesso de ${email} vinculado a ${name.trim()}.` };
      }
      if (created.error || !created.userId) return { error: created.error ?? "Não foi possível criar o acesso.", notice: null };
      const { error: linkError } = await supabase.from("board_members").update({ user_id: created.userId }).eq("id", memberId);
      if (linkError) {
        await callAdminUsers({ action: "delete", user_id: created.userId });
        return { error: "Não foi possível vincular o acesso ao membro.", notice: null };
      }
      return { error: null, notice: `Acesso criado para ${name.trim()}. E-mail ${email} · senha ${nextPassword}. Peça para trocar a senha no primeiro acesso.` };
    }

    const emailChanged = email !== (linkedEmail ?? "").toLowerCase();
    if (emailChanged) {
      const updated = await callAdminUsers({ action: "set_email", user_id: userId, email });
      if (updated.error) return { error: updated.error, notice: null };
    }
    if (nextPassword) {
      if (nextPassword.length < 8) return { error: "A senha precisa ter pelo menos 8 caracteres.", notice: null };
      const updated = await callAdminUsers({ action: "set_password", user_id: userId, password: nextPassword });
      if (updated.error) return { error: updated.error, notice: null };
      return { error: null, notice: `Senha de ${name.trim()} alterada para ${nextPassword}.` };
    }
    return { error: null, notice: emailChanged ? `E-mail de acesso de ${name.trim()} alterado para ${email}.` : null };
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const handle = cleanInstagram(instagram);
    if (handle && !/^[A-Za-z0-9._]{1,30}$/.test(handle)) return setError("Instagram inválido. Use só o usuário, ex.: da_direito.");
    setBusy(true); setError("");
    const payload = { name: name.trim(), role: role.trim(), sector: sector.trim(), instagram: handle || null, photo_url: photo, active, in_chapa: inChapa };
    if (!initial) {
      const inserted = await supabase.from("board_members").insert({ ...payload, sort_order: nextOrder }).select("id").single();
      if (inserted.error || !inserted.data) { setBusy(false); return setError("Não foi possível salvar o membro."); }
      const access = await ensureAccess(inserted.data.id, null);
      if (access.error) {
        await supabase.from("board_members").delete().eq("id", inserted.data.id);
        setBusy(false);
        return setError(access.error);
      }
      setBusy(false);
      return onDone(access.notice ?? undefined);
    }
    const { error: dbError } = await supabase.from("board_members").update(payload).eq("id", initial.id);
    if (dbError) { setBusy(false); return setError("Não foi possível salvar o membro."); }
    const access = await ensureAccess(initial.id, initial.user_id);
    setBusy(false);
    if (access.error) return setError(access.error);
    onDone(access.notice ?? undefined);
  };

  const removeAccess = async () => {
    if (!initial?.user_id) return;
    if (!window.confirm(`Remover o acesso de ${linkedEmail ?? name}? A pessoa deixa de entrar no painel. O cadastro do membro continua.`)) return;
    setBusy(true); setError("");
    const failure = await callAdminUsers({ action: "delete", user_id: initial.user_id });
    setBusy(false);
    if (failure.error) return setError(failure.error);
    onDone(`Acesso de ${name.trim()} removido. O cadastro continua na página.`);
  };

  return <form className="grid gap-4 border-b border-border bg-muted/50 p-5 sm:grid-cols-2" onSubmit={save}>
    <Field label="Nome"><input required minLength={2} maxLength={120} value={name} onChange={(e) => setName(e.target.value)} placeholder="Helena Duarte" className={inputClass} /></Field>
    <Field label="Cargo"><input required minLength={2} maxLength={80} value={role} onChange={(e) => setRole(e.target.value)} placeholder="Presidente" className={inputClass} /></Field>
    <Field label="Setor" hint="membros do mesmo setor aparecem juntos no site">
      <input required minLength={2} maxLength={60} list="member-sectors" value={sector} onChange={(e) => setSector(e.target.value)} placeholder="Diretoria" className={inputClass} />
      <datalist id="member-sectors">{sectors.map((s) => <option key={s} value={s} />)}</datalist>
    </Field>
    <Field label="Instagram" hint="opcional"><input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@usuario" className={inputClass} /></Field>
    <ImageInput label="Foto" value={photo} onChange={setPhoto} folder="board" />
    <div className="grid content-start gap-2.5 pt-1">
      <Toggle label="Faz parte da chapa" checked={inChapa} onChange={setInChapa} />
      <Toggle label="Exibir no site" checked={active} onChange={setActive} />
      <p className="text-xs font-normal text-muted-foreground">Quem não faz parte da chapa pode ser ocultado ou removido sem alterar os demais.</p>
    </div>
    {isOwner ? <>
      <Field label="E-mail de acesso" hint="login próprio deste membro no painel"><input required={creatingLogin} type="email" value={accessEmail} onChange={(e) => setAccessEmail(e.target.value)} placeholder="email@exemplo.com" className={inputClass} /></Field>
      <Field label={initial?.user_id ? "Nova senha" : "Senha inicial"} hint={initial?.user_id ? "em branco, mantém a senha atual" : "mínimo de 8 caracteres"}>
        <div className="flex gap-2"><input required={creatingLogin} minLength={creatingLogin ? 8 : undefined} value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputClass} font-mono`} autoComplete="new-password" /><Button type="button" variant="outline" size="icon" className="size-11 shrink-0" onClick={() => setPassword(generatePassword())} aria-label="Gerar senha"><Wand2 size={16} /></Button></div>
      </Field>
    </> : <p className="text-xs text-muted-foreground sm:col-span-2">{initial?.user_id ? `Acesso ao painel: ${linkedEmail ?? "conta vinculada"}` : "Sem acesso ao painel. Só o responsável cria o login."}</p>}
    <ErrorNote text={error} />
    <div className="flex flex-wrap gap-2 sm:col-span-2">
      <Button type="submit" disabled={busy}>{busy ? "Salvando..." : "Salvar"}</Button>
      {isOwner && initial?.user_id && <Button type="button" variant="ghost" className="text-destructive" disabled={busy} onClick={removeAccess}>Remover acesso</Button>}
      <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
    </div>
  </form>;
}
