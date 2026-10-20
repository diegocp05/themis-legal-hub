import { ImagePlus, Loader2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { type MediaFolder, uploadMedia } from "@/lib/data";

export const inputClass = "h-11 w-full rounded-lg border border-input bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring";

export function Field({ label, hint, className = "", children }: { label: string; hint?: string; className?: string; children: ReactNode }) {
  return <label className={`grid gap-1.5 text-sm font-bold ${className}`}>{label}{hint && <span className="-mt-1 text-xs font-normal text-muted-foreground">{hint}</span>}{children}</label>;
}

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return <label className="flex items-center gap-2.5 text-sm font-bold"><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-4 accent-gold" />{label}</label>;
}

export function ImageInput({ value, onChange, folder, label = "Imagem" }: { value: string | null; onChange: (url: string | null) => void; folder: MediaFolder; label?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pick = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return setError("A imagem deve ter no máximo 5 MB.");
    setBusy(true); setError("");
    try { onChange(await uploadMedia(file, folder)); } catch { setError("Não foi possível enviar a imagem."); } finally { setBusy(false); }
  };
  return <div className="grid gap-1.5 text-sm font-bold">{label}
    <div className="flex items-center gap-3">
      {value ? <img src={value} alt="" className="size-16 shrink-0 rounded-lg object-cover" /> : <span className="grid size-16 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground"><ImagePlus size={20} /></span>}
      <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-bold hover:bg-muted">
        {busy ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}{value ? "Trocar" : "Enviar"}
        <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={busy} onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
      </label>
      {value && <button type="button" className="text-xs font-bold text-destructive" onClick={() => onChange(null)}>Remover</button>}
    </div>
    {error && <span className="text-xs text-destructive">{error}</span>}
  </div>;
}

export function Panel({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode }) {
  return <section className="mt-6 rounded-xl border border-border bg-card">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5"><div><h2 className="text-lg font-bold">{title}</h2>{subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}</div>{action}</div>
    {children}
  </section>;
}

export function ErrorNote({ text }: { text: string }) {
  return text ? <p className="rounded-lg bg-destructive/10 p-3 text-xs font-bold text-destructive sm:col-span-full">{text}</p> : null;
}
