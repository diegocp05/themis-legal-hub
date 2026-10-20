import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2, UserRound } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { BoardMemberRow } from "@/lib/data";
import { ErrorNote, Field, ImageInput, Panel, Toggle, inputClass } from "./form";

export function MembersAdmin() {
  const queryClient = useQueryClient();
  const { data: members = [], isLoading } = useQuery({
    queryKey: ["admin", "board-members"],
    queryFn: async () => {
      const { data, error } = await supabase.from("board_members").select("*").order("sort_order").order("created_at");
      if (error) throw error;
      return data;
    },
  });
  const [form, setForm] = useState<{ mode: "new" } | { mode: "edit"; member: BoardMemberRow } | null>(null);
  const refresh = () => { queryClient.invalidateQueries({ queryKey: ["admin"] }); queryClient.invalidateQueries({ queryKey: ["board-members"] }); };

  const remove = async (m: BoardMemberRow) => {
    if (!window.confirm(`Excluir ${m.name} da diretoria?`)) return;
    await supabase.from("board_members").delete().eq("id", m.id);
    refresh();
  };

  const move = async (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= members.length) return;
    const reordered = members.filter((_, i) => i !== index);
    reordered.splice(target, 0, members[index]!);
    await Promise.all(reordered.map((m, i) => (m.sort_order === i + 1 ? null : supabase.from("board_members").update({ sort_order: i + 1 }).eq("id", m.id))));
    refresh();
  };

  const nextOrder = members.reduce((max, m) => Math.max(max, m.sort_order), 0) + 1;
  const sectors = [...new Set(members.map((m) => m.sector))];

  return <Panel title="Membros do DA" subtitle="Chapa exibida na página inicial, na seção “Quem faz o DA acontecer”." action={<Button onClick={() => setForm({ mode: "new" })}><Plus /> Novo membro</Button>}>
    {form && <MemberForm key={form.mode === "edit" ? form.member.id : "new"} initial={form.mode === "edit" ? form.member : null} nextOrder={nextOrder} sectors={sectors} onDone={() => { setForm(null); refresh(); }} onCancel={() => setForm(null)} />}
    <ul className="divide-y divide-border">
      {isLoading && <li className="p-6"><div className="h-12 animate-pulse rounded-lg bg-muted" /></li>}
      {members.map((m, i) => <li key={m.id} className="flex items-center gap-3 p-4 sm:gap-4 sm:px-5">
        {m.photo_url ? <img src={m.photo_url} alt="" className="size-12 shrink-0 rounded-lg object-cover grayscale" /> : <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground"><UserRound size={20} /></span>}
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{m.name}</p>
          <p className="truncate text-xs font-bold uppercase tracking-wide text-gold">{m.role}</p>
          <p className="truncate text-xs text-muted-foreground">{m.sector}{m.instagram && ` · @${m.instagram}`}</p>
          {!m.active && <span className="mt-1 inline-flex rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">Oculto</span>}
        </div>
        <div className="flex shrink-0 gap-1">
          <Button variant="ghost" size="icon" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Subir ${m.name}`}><ArrowUp size={16} /></Button>
          <Button variant="ghost" size="icon" disabled={i === members.length - 1} onClick={() => move(i, 1)} aria-label={`Descer ${m.name}`}><ArrowDown size={16} /></Button>
          <Button variant="outline" size="icon" onClick={() => setForm({ mode: "edit", member: m })} aria-label={`Editar ${m.name}`}><Pencil size={16} /></Button>
          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => remove(m)} aria-label={`Excluir ${m.name}`}><Trash2 size={16} /></Button>
        </div>
      </li>)}
      {!isLoading && members.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">Nenhum membro cadastrado.</li>}
    </ul>
  </Panel>;
}

const cleanInstagram = (value: string) => value.trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/^@/, "").replace(/\/.*$/, "");

function MemberForm({ initial, nextOrder, sectors, onDone, onCancel }: { initial: BoardMemberRow | null; nextOrder: number; sectors: string[]; onDone: () => void; onCancel: () => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [role, setRole] = useState(initial?.role ?? "");
  const [sector, setSector] = useState(initial?.sector ?? sectors[0] ?? "Diretoria");
  const [instagram, setInstagram] = useState(initial?.instagram ?? "");
  const [photo, setPhoto] = useState<string | null>(initial?.photo_url ?? null);
  const [active, setActive] = useState(initial?.active ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const handle = cleanInstagram(instagram);
    if (handle && !/^[A-Za-z0-9._]{1,30}$/.test(handle)) return setError("Instagram inválido. Use só o usuário, ex.: da_direito.");
    setBusy(true); setError("");
    const payload = { name: name.trim(), role: role.trim(), sector: sector.trim(), instagram: handle || null, photo_url: photo, active };
    const { error: dbError } = initial
      ? await supabase.from("board_members").update(payload).eq("id", initial.id)
      : await supabase.from("board_members").insert({ ...payload, sort_order: nextOrder });
    setBusy(false);
    if (dbError) return setError("Não foi possível salvar o membro.");
    onDone();
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
    <div className="grid content-start pt-1"><Toggle label="Exibir no site" checked={active} onChange={setActive} /></div>
    <ErrorNote text={error} />
    <div className="flex gap-2 sm:col-span-2"><Button type="submit" disabled={busy}>{busy ? "Salvando..." : "Salvar"}</Button><Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button></div>
  </form>;
}
