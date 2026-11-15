import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { type EventRow, uploadMedia, useEventPhotos } from "@/lib/data";
import { ErrorNote, Panel } from "./form";

const accepted = ["image/jpeg", "image/png", "image/webp"];

async function preparePhoto(file: File) {
  if (!accepted.includes(file.type)) throw new Error("type");
  if (file.size <= 5 * 1024 * 1024) return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("size");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  let blob: Blob | null = null;
  for (let quality = 0.85; quality >= 0.5; quality -= 0.1) {
    blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (blob && blob.size <= 5 * 1024 * 1024) break;
  }
  if (!blob || blob.size > 5 * 1024 * 1024) throw new Error("size");
  return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
}

export function EventPhotos({ event, onBack }: { event: EventRow; onBack: () => void }) {
  const queryClient = useQueryClient();
  const { data: photos = [], isLoading } = useEventPhotos(event.id);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["events", "photos", event.id] });
    queryClient.invalidateQueries({ queryKey: ["admin", "event-photos"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "activity"] });
  };

  const add = async (list: FileList | null) => {
    const files = [...(list ?? [])];
    if (!files.length) return;
    setBusy(true); setError("");
    let failed = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file) continue;
      setProgress(`Enviando ${i + 1} de ${files.length}...`);
      try {
        const image = await preparePhoto(file);
        const image_url = await uploadMedia(image, "gallery");
        const { error: insertError } = await supabase.from("event_photos").insert({ event_id: event.id, image_url });
        if (insertError) throw insertError;
      } catch { failed += 1; }
    }
    setBusy(false); setProgress("");
    if (failed) setError(failed === files.length ? "Não foi possível enviar as fotos. Use JPG, PNG ou WEBP." : `${failed} foto${failed === 1 ? "" : "s"} não ${failed === 1 ? "foi enviada" : "foram enviadas"}. As outras já estão na galeria.`);
    refresh();
  };

  const remove = async (id: string, imageUrl: string) => {
    if (!window.confirm("Remover esta foto da galeria do evento?")) return;
    const { error: deleteError } = await supabase.from("event_photos").delete().eq("id", id);
    if (deleteError) return setError("Não foi possível remover a foto.");
    const path = decodeURIComponent(imageUrl.split("/object/public/media/")[1] ?? "");
    if (path) await supabase.storage.from("media").remove([path]);
    refresh();
  };

  return <Panel title={`Fotos · ${event.title}`} subtitle={event.published ? "Os alunos veem e baixam estas fotos na página do evento." : "Este evento ainda é rascunho. As fotos só aparecem para os alunos depois que ele for publicado."} action={<Button variant="outline" onClick={onBack}><ArrowLeft /> Voltar</Button>}>
    <div className="flex flex-wrap items-center gap-3 border-b border-border p-4 sm:px-5">
      <label className={`inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-primary px-3 text-sm font-bold text-primary-foreground ${busy ? "pointer-events-none opacity-60" : ""}`}>
        {busy ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}{progress || "Enviar fotos"}
        <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" disabled={busy} onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
      </label>
      <p className="text-xs text-muted-foreground">JPG, PNG ou WEBP. Várias de uma vez. Fotos grandes são reduzidas automaticamente.</p>
    </div>
    <div className="p-4 sm:p-5">
      <ErrorNote text={error} />
      {isLoading && <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><div className="aspect-square animate-pulse rounded-xl bg-muted" /></div>}
      {!isLoading && photos.length === 0 && <p className="rounded-lg bg-muted p-6 text-center text-sm text-muted-foreground">Nenhuma foto neste evento.</p>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {photos.map((photo, index) => <div key={photo.id} className="relative overflow-hidden rounded-xl border border-border">
          <img src={photo.image_url} alt="" className="aspect-square w-full object-cover" />
          <button type="button" className="absolute right-2 top-2 grid size-8 place-items-center rounded-lg bg-card text-destructive" onClick={() => remove(photo.id, photo.image_url)} aria-label={`Remover foto ${index + 1}`}><Trash2 size={15} /></button>
        </div>)}
      </div>
    </div>
  </Panel>;
}
