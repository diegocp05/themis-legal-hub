import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { AnnouncementRow } from "@/lib/data";
import { ErrorNote, Field, Panel, Toggle, inputClass } from "./form";

export function AnnouncementsAdmin() {
  const queryClient = useQueryClient();
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["admin", "announcements"],
    queryFn: async () => {
      const { data, error } = await supabase.from("announcements").select("*").order("sort_order").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const [form, setForm] = useState<{ mode: "new" } | { mode: "edit"; item: AnnouncementRow } | null>(null);
  const refresh = () => { queryClient.invalidateQueries({ queryKey: ["admin"] }); queryClient.invalidateQueries({ queryKey: ["announcements"] }); };
  const remove = async (a: AnnouncementRow) => {
    if (!window.confirm(`Excluir o aviso "${a.title}"?`)) return;
    await supabase.from("announcements").delete().eq("id", a.id);
    refresh();
  };

  return <Panel title="Avisos" subtitle="Recados exibidos na página inicial." action={<Button onClick={() => setForm({ mode: "new" })}><Plus /> Novo aviso</Button>}>
    {form && <AnnouncementForm key={form.mode === "edit" ? form.item.id : "new"} initial={form.mode === "edit" ? form.item : null} onDone={() => { setForm(null); refresh(); }} onCancel={() => setForm(null)} />}
    <ul className="divide-y divide-border">
      {isLoading && <li className="p-6"><div className="h-12 animate-pulse rounded-lg bg-muted" /></li>}
      {items.map((a) => <li key={a.id} className="flex items-center gap-3 p-4 sm:gap-4 sm:px-5">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-navy-soft text-primary">{a.published ? <Bell size={18} /> : <EyeOff size={18} />}</span>
        <div className="min-w-0 flex-1"><p className="truncate font-bold">{a.title}</p><p className="truncate text-xs text-muted-foreground">{a.published ? a.body || "Sem texto" : "Oculto"}</p></div>
        <Button variant="outline" size="icon" onClick={() => setForm({ mode: "edit", item: a })} aria-label={`Editar ${a.title}`}><Pencil size={16} /></Button>
        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => remove(a)} aria-label={`Excluir ${a.title}`}><Trash2 size={16} /></Button>
      </li>)}
      {!isLoading && items.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">Nenhum aviso cadastrado.</li>}
    </ul>
  </Panel>;
}

function AnnouncementForm({ initial, onDone, onCancel }: { initial: AnnouncementRow | null; onDone: () => void; onCancel: () => void }) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [published, setPublished] = useState(initial?.published ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError("");
    const payload = { title: title.trim(), body: body.trim(), published };
    const { error: dbError } = initial
      ? await supabase.from("announcements").update(payload).eq("id", initial.id)
      : await supabase.from("announcements").insert(payload);
    setBusy(false);
    if (dbError) return setError("Não foi possível salvar o aviso.");
    onDone();
  };
  return <form className="grid gap-4 border-b border-border bg-muted/50 p-5" onSubmit={save}>
    <Field label="Título"><input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Retirada de carteirinhas" className={inputClass} /></Field>
    <Field label="Texto"><textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} className={`${inputClass} h-auto py-2`} /></Field>
    <Toggle label="Exibir na página inicial" checked={published} onChange={setPublished} />
    <ErrorNote text={error} />
    <div className="flex gap-2"><Button type="submit" disabled={busy}>{busy ? "Salvando..." : "Salvar"}</Button><Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button></div>
  </form>;
}
