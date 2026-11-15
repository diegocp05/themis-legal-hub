import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { type PageKey, pageDefaults, pageFields, usePageContent } from "@/lib/pages";
import { ErrorNote, Field, ImageInput, Panel, inputClass } from "./form";

export function PagesAdmin() {
  const queryClient = useQueryClient();
  const { data } = usePageContent();
  const [draft, setDraft] = useState<Record<PageKey, string> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const current = draft ?? data ?? pageDefaults;
  const groups = [...new Set(pageFields.map((field) => field.group))];

  const set = (key: PageKey, value: string) => {
    setSaved(false);
    setDraft({ ...current, [key]: value });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(""); setSaved(false);
    const entries = pageFields.map((field) => ({ key: field.key, value: current[field.key].trim() }));
    const { error: rpcError } = await supabase.rpc("save_page_content", { _entries: entries });
    setBusy(false);
    if (rpcError) return setError("Não foi possível salvar os textos.");
    setDraft(null);
    setSaved(true);
    queryClient.invalidateQueries({ queryKey: ["page-content"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "activity"] });
  };

  return <Panel title="Páginas" subtitle="Textos, o logo e a imagem padrão do site. Cores e disposição das páginas continuam iguais.">
    <form onSubmit={save} className="grid gap-8 p-5">
      {groups.map((group) => <fieldset key={group} className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-1 text-sm font-bold uppercase tracking-wide text-gold">{group}</legend>
        {pageFields.filter((field) => field.group === group).map((field) => "image" in field && field.image
          ? <div key={field.key} className="sm:col-span-2"><ImageInput label={field.label} folder="pages" value={current[field.key] || null} onChange={(url) => set(field.key, url ?? "")} />{"hint" in field && field.hint && <p className="mt-1 text-xs text-muted-foreground">{field.hint}</p>}</div>
          : <Field key={field.key} label={field.label} className={field.long ? "sm:col-span-2" : ""}>
            {field.long
              ? <textarea rows={3} maxLength={800} value={current[field.key]} onChange={(e) => set(field.key, e.target.value)} className={`${inputClass} h-auto py-2`} />
              : <input maxLength={120} value={current[field.key]} onChange={(e) => set(field.key, e.target.value)} className={inputClass} />}
          </Field>)}
      </fieldset>)}
      <ErrorNote text={error} />
      {saved && <p className="rounded-lg bg-success-soft p-3 text-xs font-bold text-success">Textos atualizados. A página pública já usa a versão nova.</p>}
      <div><Button type="submit" disabled={busy}>{busy ? "Salvando..." : "Salvar páginas"}</Button></div>
    </form>
  </Panel>;
}
