import { ImagePlus, Loader2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { type MediaFolder, uploadMedia } from "@/lib/data";
import { optimizeImageToWebP } from "@/utils/imageOptimizer";

export const inputClass = "h-11 w-full rounded-lg border border-input bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring";

export function Field({ label, hint, className = "", children }: { label: string; hint?: string; className?: string; children: ReactNode }) {
  return (
    <label className={`grid gap-1.5 text-sm font-bold ${className}`}>
      {label}
      {hint && <span className="-mt-1 text-xs font-normal text-muted-foreground">{hint}</span>}
      {children}
    </label>
  );
}

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2.5 text-sm font-bold">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-4 accent-gold" />
      {label}
    </label>
  );
}

export function ImageInput({
  value,
  onChange,
  folder,
  label = "Imagem",
  fit = "cover",
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  folder: MediaFolder;
  label?: string;
  fit?: "cover" | "contain";
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const pick = async (file: File | undefined) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      return setError("Formato inválido. Use JPG, PNG ou WEBP.");
    }
    if (file.size > 15 * 1024 * 1024) {
      return setError("A imagem original deve ter no máximo 15 MB.");
    }

    setBusy(true);
    setError("");
    try {
      // Assinaturas PNG transparentes leves são mantidas; demais imagens são otimizadas em WebP (< 2MB)
      const processed =
        folder === "signatures" && file.type === "image/png" && file.size <= 1024 * 1024
          ? file
          : await optimizeImageToWebP(file, {
              maxWidth: folder === "signatures" ? 800 : 1400,
              maxHeight: folder === "signatures" ? 800 : 1400,
              quality: 0.82,
            });

      if (processed.size > 2 * 1024 * 1024) {
        setError("Imagem muito grande mesmo após compressão (limite de 2 MB).");
        return;
      }

      onChange(await uploadMedia(processed, folder));
    } catch {
      setError("Não foi possível enviar a imagem. Use JPG, PNG ou WEBP.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-1.5 text-sm font-bold">
      {label}
      <div className="flex items-center gap-3">
        {value ? (
          <img
            src={value}
            alt=""
            className={
              fit === "contain"
                ? "h-16 w-28 shrink-0 rounded-lg border border-border bg-white object-contain"
                : "size-16 shrink-0 rounded-lg object-cover"
            }
          />
        ) : (
          <span
            className={`grid shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground ${
              fit === "contain" ? "h-16 w-28" : "size-16"
            }`}
          >
            <ImagePlus size={20} />
          </span>
        )}
        <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-bold hover:bg-muted">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
          {value ? "Trocar" : "Enviar"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={busy}
            onChange={(e) => {
              pick(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
        {value && (
          <button type="button" className="text-xs font-bold text-destructive" onClick={() => onChange(null)}>
            Remover
          </button>
        )}
      </div>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}

export function Panel({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-6 rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
        <div>
          <h2 className="text-lg font-bold">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function ErrorNote({ text }: { text: string }) {
  return text ? <p className="rounded-lg bg-destructive/10 p-3 text-xs font-bold text-destructive sm:col-span-full">{text}</p> : null;
}