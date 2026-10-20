import { useQuery, useQueryClient } from "@tanstack/react-query";
import { EyeOff, Package, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { money } from "@/lib/catalog";
import { type ProductRow, type ProductStatus, productStatusLabel } from "@/lib/data";
import { ErrorNote, Field, ImageInput, Panel, Toggle, inputClass } from "./form";

export function ProductsAdmin() {
  const queryClient = useQueryClient();
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["admin", "products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("sort_order").order("created_at");
      if (error) throw error;
      return data;
    },
  });
  const [form, setForm] = useState<{ mode: "new" } | { mode: "edit"; item: ProductRow } | null>(null);
  const refresh = () => { queryClient.invalidateQueries({ queryKey: ["admin"] }); queryClient.invalidateQueries({ queryKey: ["products"] }); };
  const remove = async (p: ProductRow) => {
    if (!window.confirm(`Excluir "${p.name}"?`)) return;
    await supabase.from("products").delete().eq("id", p.id);
    refresh();
  };

  return <Panel title="Catálogo" subtitle="Crie, edite, oculte ou exclua produtos da loja." action={<Button onClick={() => setForm({ mode: "new" })}><Plus /> Novo produto</Button>}>
    {form && <ProductForm key={form.mode === "edit" ? form.item.id : "new"} initial={form.mode === "edit" ? form.item : null} nextOrder={items.length + 1} onDone={() => { setForm(null); refresh(); }} onCancel={() => setForm(null)} />}
    <ul className="divide-y divide-border">
      {isLoading && <li className="p-6"><div className="h-12 animate-pulse rounded-lg bg-muted" /></li>}
      {items.map((p) => <li key={p.id} className="flex items-center gap-3 p-4 sm:gap-4 sm:px-5">
        {p.image_url ? <img src={p.image_url} alt="" width={96} height={96} className={`size-12 shrink-0 rounded-lg object-cover grayscale ${p.active ? "" : "opacity-50"}`} /> : <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground"><Package size={20} /></span>}
        <div className="min-w-0 flex-1"><p className="flex items-center gap-1.5 truncate font-bold">{!p.active && <EyeOff size={14} className="shrink-0 text-muted-foreground" />}{p.name}</p><p className="truncate text-xs text-muted-foreground">{money(Number(p.price))}{p.sizes.length ? ` · ${p.sizes.join(" · ")}` : ""}{p.status !== "disponivel" && ` · ${productStatusLabel[p.status]}`}{!p.active && " · Oculto"}</p></div>
        <Button variant="outline" size="icon" onClick={() => setForm({ mode: "edit", item: p })} aria-label={`Editar ${p.name}`}><Pencil size={16} /></Button>
        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => remove(p)} aria-label={`Excluir ${p.name}`}><Trash2 size={16} /></Button>
      </li>)}
      {!isLoading && items.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">Nenhum produto cadastrado.</li>}
    </ul>
  </Panel>;
}

function ProductForm({ initial, nextOrder, onDone, onCancel }: { initial: ProductRow | null; nextOrder: number; onDone: () => void; onCancel: () => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [price, setPrice] = useState(initial ? Number(initial.price).toFixed(2).replace(".", ",") : "");
  const [sizes, setSizes] = useState(initial?.sizes.join(", ") ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [image, setImage] = useState<string | null>(initial?.image_url ?? null);
  const [active, setActive] = useState(initial?.active ?? true);
  const [status, setStatus] = useState<ProductStatus>(initial?.status ?? "disponivel");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number.parseFloat(price.replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(parsed) || parsed < 0) return setError("Informe um preço válido, ex.: 69,90.");
    setBusy(true); setError("");
    const payload = { name: name.trim(), price: parsed, sizes: sizes.split(",").map((s) => s.trim()).filter(Boolean), description: description.trim() || null, image_url: image, active, status };
    const { error: dbError } = initial
      ? await supabase.from("products").update(payload).eq("id", initial.id)
      : await supabase.from("products").insert({ ...payload, sort_order: nextOrder });
    setBusy(false);
    if (dbError) return setError("Não foi possível salvar o produto.");
    onDone();
  };

  return <form className="grid gap-4 border-b border-border bg-muted/50 p-5 sm:grid-cols-[1fr_160px_1fr]" onSubmit={save}>
    <Field label="Nome"><input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do produto" className={inputClass} /></Field>
    <Field label="Preço (R$)"><input required inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0,00" className={inputClass} /></Field>
    <Field label="Tamanhos / opções" hint="separe por vírgula"><input value={sizes} onChange={(e) => setSizes(e.target.value)} placeholder="P, M, G, GG" className={inputClass} /></Field>
    <Field label="Descrição" hint="opcional" className="sm:col-span-3"><textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className={`${inputClass} h-auto py-2`} /></Field>
    <ImageInput value={image} onChange={setImage} folder="products" />
    <Field label="Situação na loja"><select value={status} onChange={(e) => setStatus(e.target.value as ProductStatus)} className={inputClass}>{Object.entries(productStatusLabel).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></Field>
    <div className="flex items-end pb-2"><Toggle label="Visível na loja" checked={active} onChange={setActive} /></div>
    <ErrorNote text={error} />
    <div className="flex items-end gap-2 sm:col-span-3"><Button type="submit" disabled={busy}>{busy ? "Salvando..." : "Salvar"}</Button><Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button></div>
  </form>;
}
