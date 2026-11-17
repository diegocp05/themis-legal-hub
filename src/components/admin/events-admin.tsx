import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, Award, CalendarDays, Download, Eye, EyeOff, Images, Pencil, Plus, Search, Star, Trash2, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { templateReady } from "@/lib/certificate";
import { type EventCategory, type EventRow, eventCategories, formatDateTime, formatEventDays, slugify } from "@/lib/data";
import { CertificateModel, useCertificateTemplate } from "./certificate-model";
import { EventPhotos } from "./event-photos";
import { ErrorNote, Field, ImageInput, Panel, Toggle, inputClass } from "./form";

type AdminEvent = EventRow & { registrations: { count: number }[] };

function useAdminEvents() {
  return useQuery({
    queryKey: ["admin", "events"],
    queryFn: async () => {
      const { data, error } = await supabase.from("events").select("*, registrations(count)").order("starts_at", { ascending: false });
      if (error) throw error;
      return data as AdminEvent[];
    },
  });
}

export function EventsAdmin() {
  const { data: events = [], isLoading } = useAdminEvents();
  const [form, setForm] = useState<{ mode: "new" } | { mode: "edit"; event: EventRow } | null>(null);
  const [attendees, setAttendees] = useState<EventRow | null>(null);
  const [gallery, setGallery] = useState<EventRow | null>(null);
  const [model, setModel] = useState(false);
  const { data: photoRows = [] } = useQuery({
    queryKey: ["admin", "event-photos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("event_photos").select("event_id");
      if (error) throw error;
      return data;
    },
  });
  const queryClient = useQueryClient();

  if (attendees) return <Attendees event={attendees} onBack={() => setAttendees(null)} />;
  if (gallery) return <EventPhotos event={gallery} onBack={() => setGallery(null)} />;
  if (model) return <CertificateModel onBack={() => setModel(false)} />;

  const remove = async (e: EventRow) => {
    if (!window.confirm(`Excluir "${e.title}"? As inscrições e as fotos deste evento também serão apagadas.`)) return;
    await supabase.from("events").delete().eq("id", e.id);
    queryClient.invalidateQueries({ queryKey: ["admin"] });
    queryClient.invalidateQueries({ queryKey: ["events"] });
  };

  return (
    <Panel
      title="Eventos"
      subtitle="Divulgue eventos e acompanhe os inscritos."
      action={
        <div className="flex flex-wrap gap-2">
          {!form && (
            <Button variant="outline" onClick={() => setModel(true)}>
              <Award /> Modelo do certificado
            </Button>
          )}
          <Button onClick={() => setForm({ mode: "new" })}>
            <Plus /> Novo evento
          </Button>
        </div>
      }
    >
      {form && <EventForm key={form.mode === "edit" ? form.event.id : "new"} initial={form.mode === "edit" ? form.event : null} onDone={() => setForm(null)} />}
      <ul className="divide-y divide-border">
        {isLoading && (
          <li className="p-6">
            <div className="h-12 animate-pulse rounded-lg bg-muted" />
          </li>
        )}
        {events.map((e) => {
          const count = e.registrations[0]?.count ?? 0;
          const photoCount = photoRows.filter((photo) => photo.event_id === e.id).length;
          return (
            <li key={e.id} className="flex flex-wrap items-center gap-3 p-4 sm:flex-nowrap sm:gap-4 sm:px-5">
              {e.image_url ? (
                <img src={e.image_url} alt="" className="size-12 shrink-0 rounded-lg object-cover" />
              ) : (
                <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                  <CalendarDays size={20} />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate font-bold">
                  {e.featured && <Star size={14} className="shrink-0 fill-gold text-gold" />}
                  {e.title}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {formatEventDays(e)} · {count}
                  {e.capacity ? `/${e.capacity}` : ""} inscritos
                </p>
                <div className="mt-1 flex gap-1.5">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      e.published ? "bg-success-soft text-success" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {e.published ? <Eye size={11} /> : <EyeOff size={11} />}
                    {e.published ? "Publicado" : "Rascunho"}
                  </span>
                  {!e.registration_open && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">Inscrições fechadas</span>
                  )}
                  {e.certificate_enabled && (
                    <span className="rounded-full bg-navy-soft px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                      Certificado · {formatHours(e.certificate_complementary_hours ?? e.certificate_hours)}h compl.
                      {e.certificate_mandatory_hours != null ? ` · ${formatHours(e.certificate_mandatory_hours)}h obrig.` : ""}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex w-full gap-2 sm:w-auto">
                <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={() => setGallery(e)}>
                  <Images size={16} /> Fotos{photoCount ? ` · ${photoCount}` : ""}
                </Button>
                <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={() => setAttendees(e)}>
                  <UsersRound size={16} /> Inscritos
                </Button>
                <Button variant="outline" size="icon" onClick={() => setForm({ mode: "edit", event: e })} aria-label={`Editar ${e.title}`}>
                  <Pencil size={16} />
                </Button>
                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => remove(e)} aria-label={`Excluir ${e.title}`}>
                  <Trash2 size={16} />
                </Button>
              </div>
            </li>
          );
        })}
        {!isLoading && events.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">Nenhum evento cadastrado.</li>}
      </ul>
    </Panel>
  );
}

const formatHours = (value: number | null) => (value == null ? "" : String(value).replace(".", ","));
const parseHours = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return Number.parseFloat(trimmed.replace(",", "."));
};
const toLocalInput = (iso: string | null) => (iso ? format(new Date(iso), "yyyy-MM-dd'T'HH:mm") : "");
const fromLocalInput = (value: string) => (value ? new Date(value).toISOString() : null);

function EventForm({ initial, onDone }: { initial: EventRow | null; onDone: () => void }) {
  const queryClient = useQueryClient();
  const { data: schedule } = useQuery({
    queryKey: ["admin", "schedule", initial?.id],
    enabled: !!initial,
    queryFn: async () => {
      const { data } = await supabase.from("event_schedule").select("*").eq("event_id", initial!.id).order("sort_order");
      return data ?? [];
    },
  });
  const [v, setV] = useState({
    title: initial?.title ?? "",
    slug: initial?.slug ?? "",
    summary: initial?.summary ?? "",
    description: initial?.description ?? "",
    location: initial?.location ?? "",
    starts_at: toLocalInput(initial?.starts_at ?? null),
    ends_at: toLocalInput(initial?.ends_at ?? null),
    capacity: initial?.capacity?.toString() ?? "",
    image_url: initial?.image_url ?? null,
    published: initial?.published ?? false,
    featured: initial?.featured ?? false,
    registration_open: initial?.registration_open ?? true,
    category: initial?.category ?? ("faculdade" as EventCategory),
    registration_closes_at: toLocalInput(initial?.registration_closes_at ?? null),
    certificate_enabled: initial?.certificate_enabled ?? false,
    certificate_complementary_hours: formatHours(initial?.certificate_complementary_hours ?? initial?.certificate_hours ?? null),
    certificate_mandatory_hours: formatHours(initial?.certificate_mandatory_hours ?? null),
  });
  const [scheduleText, setScheduleText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const templateQuery = useCertificateTemplate();
  const scheduleValue = scheduleText ?? (schedule ?? []).map((s) => s.label).join("\n");
  const set = <K extends keyof typeof v>(key: K, value: (typeof v)[K]) => setV((cur) => ({ ...cur, [key]: value }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const complementary = parseHours(v.certificate_complementary_hours);
    const mandatory = parseHours(v.certificate_mandatory_hours);
    if ((complementary != null && (!Number.isFinite(complementary) || complementary <= 0)) || (mandatory != null && (!Number.isFinite(mandatory) || mandatory <= 0)))
      return setError("Informe as horas com um número maior que zero, ex.: 3 ou 1,5.");
    if (v.certificate_enabled && complementary == null)
      return setError("Informe pelo menos as horas complementares antes de liberar o certificado.");
    if (v.certificate_enabled && !initial?.certificate_enabled) {
      if (templateQuery.isLoading) return setError("Aguarde o modelo do certificado carregar.");
      if (!templateReady(templateQuery.data))
        return setError("Salve o modelo do certificado com o nome e a assinatura do presidente do DA, do coordenador e do presidente da Atlética.");
    }
    setBusy(true);
    setError("");
    const payload = {
      category: v.category,
      registration_closes_at: fromLocalInput(v.registration_closes_at),
      certificate_enabled: v.certificate_enabled,
      certificate_complementary_hours: complementary,
      certificate_mandatory_hours: mandatory,
      certificate_hours: complementary,
      title: v.title.trim(),
      slug: slugify(v.slug || v.title),
      summary: v.summary.trim() || null,
      description: v.description.trim() || null,
      location: v.location.trim() || null,
      starts_at: fromLocalInput(v.starts_at)!,
      ends_at: fromLocalInput(v.ends_at),
      capacity: v.capacity ? Number.parseInt(v.capacity, 10) : null,
      image_url: v.image_url,
      published: v.published,
      featured: v.featured,
      registration_open: v.registration_open,
    };
    const res = initial
      ? await supabase.from("events").update(payload).eq("id", initial.id).select("id").single()
      : await supabase.from("events").insert(payload).select("id").single();
    if (res.error) {
      setBusy(false);
      const constraint = res.error.code === "23514" ? res.error.message : "";
      return setError(
        constraint.includes("certificate_signers_missing")
          ? "Salve o modelo do certificado com as três assinaturas antes de liberar."
          : constraint.includes("certificate_not_ready")
          ? "Informe as horas e conclua as assinaturas antes de liberar o certificado."
          : res.error.code === "23505"
          ? "Já existe um evento com esse endereço (slug)."
          : res.error.code === "23514"
          ? "Confira as datas: o término deve ser depois do início."
          : "Não foi possível salvar o evento."
      );
    }
    if (scheduleText !== null) {
      const eventId = res.data.id;
      await supabase.from("event_schedule").delete().eq("event_id", eventId);
      const rows = scheduleText
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .map((label, i) => ({ event_id: eventId, label, sort_order: i + 1 }));
      if (rows.length) await supabase.from("event_schedule").insert(rows);
    }
    setBusy(false);
    queryClient.invalidateQueries({ queryKey: ["admin"] });
    queryClient.invalidateQueries({ queryKey: ["events"] });
    onDone();
  };

  return (
    <form onSubmit={save} className="grid gap-4 border-b border-border bg-muted/50 p-5 sm:grid-cols-2">
      <Field label="Título">
        <input required value={v.title} onChange={(e) => set("title", e.target.value)} onBlur={() => !v.slug && set("slug", slugify(v.title))} placeholder="Semana Jurídica 2026" className={inputClass} />
      </Field>
      <Field label="Endereço da página" hint={`/eventos/${slugify(v.slug || v.title) || "..."}`}>
        <input value={v.slug} onChange={(e) => set("slug", e.target.value)} placeholder="semana-juridica-2026" className={inputClass} />
      </Field>
      <Field label="Início">
        <input required type="datetime-local" value={v.starts_at} onChange={(e) => set("starts_at", e.target.value)} className={inputClass} />
      </Field>
      <Field label="Término" hint="opcional">
        <input type="datetime-local" value={v.ends_at} onChange={(e) => set("ends_at", e.target.value)} className={inputClass} />
      </Field>
      <Field label="Categoria">
        <select value={v.category} onChange={(e) => set("category", e.target.value as EventCategory)} className={inputClass}>
          {eventCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Inscrições até" hint="opcional; depois disso o formulário fecha sozinho">
        <input type="datetime-local" value={v.registration_closes_at} onChange={(e) => set("registration_closes_at", e.target.value)} className={inputClass} />
      </Field>
      <Field label="Local">
        <input value={v.location} onChange={(e) => set("location", e.target.value)} placeholder="Auditório Central" className={inputClass} />
      </Field>
      <Field label="Vagas" hint="deixe vazio para ilimitado">
        <input type="number" min={1} value={v.capacity} onChange={(e) => set("capacity", e.target.value)} className={inputClass} />
      </Field>
      <Field label="Resumo" hint="aparece no destaque da Home" className="sm:col-span-2">
        <input maxLength={200} value={v.summary} onChange={(e) => set("summary", e.target.value)} className={inputClass} />
      </Field>
      <Field label="Descrição" className="sm:col-span-2">
        <textarea rows={4} value={v.description} onChange={(e) => set("description", e.target.value)} className={`${inputClass} h-auto py-2`} />
      </Field>
      <Field label="Programação" hint="um item por linha, ex.: 23 nov · Abertura" className="sm:col-span-2">
        <textarea rows={3} value={scheduleValue} onChange={(e) => setScheduleText(e.target.value)} className={`${inputClass} h-auto py-2`} />
      </Field>
      <ImageInput value={v.image_url} onChange={(url) => set("image_url", url)} folder="events" />
      <div className="grid content-start gap-2.5 pt-1">
        <Toggle label="Publicado no site" checked={v.published} onChange={(x) => set("published", x)} />
        <Toggle label="Inscrições abertas" checked={v.registration_open} onChange={(x) => set("registration_open", x)} />
        <Toggle label="Destaque na Home" checked={v.featured} onChange={(x) => set("featured", x)} />
        <Toggle
          label="Emitir certificado para presentes"
          checked={v.certificate_enabled}
          onChange={(x) => {
            if (x && !templateReady(templateQuery.data)) {
              setError("Salve o modelo do certificado com as três assinaturas antes de liberar.");
              return;
            }
            setError("");
            set("certificate_enabled", x);
          }}
        />
        <p className="text-xs font-normal text-muted-foreground">
          A liberação copia o modelo assinado pelo presidente do DA, pelo coordenador e pelo presidente da Atlética. Sem essas assinaturas o certificado não vale.
        </p>
      </div>
      <Field label="Horas complementares" hint="Do 1º ao 3º ano o certificado usa só este valor. A liberação vale depois do término do evento.">
        <input inputMode="decimal" value={v.certificate_complementary_hours} onChange={(e) => set("certificate_complementary_hours", e.target.value)} placeholder="10" className={inputClass} />
      </Field>
      <Field label="Horas obrigatórias" hint="Opcional · Opção do 4º e do 5º ano. Pode ser diferente das complementares.">
        <input inputMode="decimal" value={v.certificate_mandatory_hours} onChange={(e) => set("certificate_mandatory_hours", e.target.value)} placeholder="8" className={inputClass} />
      </Field>
      <ErrorNote text={error} />
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" disabled={busy}>
          {busy ? "Salvando..." : "Salvar evento"}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

function Attendees({ event, onBack }: { event: EventRow; onBack: () => void }) {
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin", "registrations", event.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("registrations").select("*").eq("event_id", event.id).order("created_at");
      if (error) throw error;
      return data;
    },
  });
  const visible = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) => r.full_name.toLowerCase().includes(term) || r.email.includes(term) || r.ra.toLowerCase().includes(term));
  }, [rows, q]);
  const checkedIn = rows.filter((r) => r.checked_in_at).length;
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin"] });
  };

  const toggleCheckIn = async (id: string, value: boolean) => {
    await supabase.from("registrations").update({ checked_in_at: value ? new Date().toISOString() : null }).eq("id", id);
    refresh();
  };
  const remove = async (id: string, name: string) => {
    if (!window.confirm(`Remover a inscrição de ${name}?`)) return;
    await supabase.from("registrations").delete().eq("id", id);
    refresh();
  };
  const exportCsv = () => {
    const header = ["Nome", "E-mail", "RA", "Inscrito em", "Presença"];
    const lines = rows.map((r) => [r.full_name, r.email, r.ra, formatDateTime(r.created_at), r.checked_in_at ? "Presente" : "Ausente"]);
    const csv = [header, ...lines].map((cols) => cols.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `inscritos-${event.slug}.csv` });
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Panel
      title={`Inscritos · ${event.title}`}
      subtitle={`${rows.length}${event.capacity ? ` de ${event.capacity} vagas` : " inscritos"} · ${checkedIn} presença${checkedIn === 1 ? "" : "s"} confirmada${checkedIn === 1 ? "" : "s"}`}
      action={
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft /> Voltar
          </Button>
          <Button onClick={exportCsv} disabled={!rows.length}>
            <Download /> Exportar CSV
          </Button>
        </div>
      }
    >
      <div className="border-b border-border p-4 sm:px-5">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome, e-mail ou RA" className={`${inputClass} pl-9`} />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-muted text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-5 py-3">Nome</th>
              <th className="px-5 py-3">E-mail</th>
              <th className="px-5 py-3">RA</th>
              <th className="px-5 py-3">Presença</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-5 py-8">
                  <div className="h-8 animate-pulse rounded bg-muted" />
                </td>
              </tr>
            )}
            {visible.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-5 py-4 font-bold">
                  {r.full_name}
                  <p className="text-xs font-normal text-muted-foreground">{formatDateTime(r.created_at)}</p>
                </td>
                <td className="px-5 py-4 text-muted-foreground">{r.email}</td>
                <td className="px-5 py-4 font-mono text-xs font-bold">{r.ra}</td>
                <td className="px-5 py-4">
                  <Toggle label={r.checked_in_at ? "Presente" : "Ausente"} checked={!!r.checked_in_at} onChange={(x) => toggleCheckIn(r.id, x)} />
                </td>
                <td className="px-5 py-4 text-right">
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => remove(r.id, r.full_name)} aria-label={`Remover ${r.full_name}`}>
                    <Trash2 size={16} />
                  </Button>
                </td>
              </tr>
            ))}
            {!isLoading && visible.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">
                  {rows.length ? "Nenhum inscrito encontrado." : "Ainda não há inscritos neste evento."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}