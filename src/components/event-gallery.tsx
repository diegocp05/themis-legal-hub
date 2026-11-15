import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { slugify, useEventPhotos } from "@/lib/data";

function fileName(title: string, url: string, index: number) {
  const ext = url.split(".").pop()?.split("?")[0]?.toLowerCase() ?? "jpg";
  const safe = ext === "jpeg" || ext === "jpg" || ext === "png" || ext === "webp" ? (ext === "jpeg" ? "jpg" : ext) : "jpg";
  return `${slugify(title) || "evento"}-${String(index + 1).padStart(2, "0")}.${safe}`;
}

async function downloadPhoto(url: string, name: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("download");
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement("a"), { href: objectUrl, download: name });
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

export function EventGallery({ eventId, title }: { eventId: string; title: string }) {
  const { data: photos = [], isLoading } = useEventPhotos(eventId);
  const [open, setOpen] = useState<number | null>(null);
  const [error, setError] = useState("");
  const current = open != null ? photos[open] : undefined;

  useEffect(() => {
    if (open == null) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const save = async (index: number) => {
    const photo = photos[index];
    if (!photo) return;
    setError("");
    try { await downloadPhoto(photo.image_url, fileName(title, photo.image_url, index)); }
    catch { setError("Não foi possível baixar esta foto. Tente de novo."); }
  };

  if (isLoading) return <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="aspect-square animate-pulse rounded-xl bg-muted" />)}</div>;
  if (photos.length === 0) return <p className="mt-7 rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">As fotos deste evento ainda não foram publicadas.</p>;

  return <div className="mt-7">
    <p className="text-sm text-muted-foreground">{photos.length} {photos.length === 1 ? "foto" : "fotos"}. Clique para ampliar e baixar.</p>
    {error && <p className="mt-3 rounded-lg bg-destructive/10 p-3 text-xs font-bold text-destructive">{error}</p>}
    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {photos.map((photo, index) => <div key={photo.id} className="group relative overflow-hidden rounded-xl border border-border bg-card">
        <button type="button" className="block w-full" onClick={() => setOpen(index)} aria-label={`Ampliar foto ${index + 1}`}>
          <img src={photo.image_url} alt="" loading="lazy" className="aspect-square w-full object-cover" />
        </button>
        <button type="button" className="absolute bottom-2 right-2 grid size-9 place-items-center rounded-lg bg-primary/90 text-gold" onClick={() => save(index)} aria-label={`Baixar foto ${index + 1}`}><Download size={16} /></button>
      </div>)}
    </div>
    {current && open != null && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setOpen(null)}>
      <div className="flex max-h-full max-w-5xl flex-col items-center gap-4" onClick={(event) => event.stopPropagation()}>
        <img src={current.image_url} alt="" className="max-h-[75vh] max-w-full rounded-lg object-contain" />
        <div className="flex gap-2">
          <Button onClick={() => save(open)}><Download /> Baixar</Button>
          <Button variant="outline" className="bg-card" onClick={() => setOpen(null)}><X /> Fechar</Button>
        </div>
      </div>
    </div>}
  </div>;
}
