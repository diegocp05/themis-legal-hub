import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Award, CalendarDays, CheckCircle2, Clock3, MapPin, ShieldCheck, UsersRound } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { type EventRow, categoryLabel, formatDateTime, formatEventDays, formatEventHours, hasEnded, isRegistrationOpen, useEvent, useSpotsTaken } from "@/lib/data";
import hero from "@/assets/semana-juridica.jpg";

export const Route = createFileRoute("/eventos/$slug")({ head: () => ({ meta: [
  { title: "Evento — Sistema Themis" }, { name: "description", content: "Inscrição gratuita em evento do DA de Direito." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
] }), component: EventPage });

function EventPage() {
  const { slug } = Route.useParams();
  const { data, isLoading } = useEvent(slug);
  const { data: taken } = useSpotsTaken(data?.event.id);

  if (isLoading) return <div className="app-container py-10"><div className="aspect-[16/9] w-full animate-pulse rounded-xl bg-muted" /></div>;
  if (!data) return <div className="app-container grid min-h-[60vh] place-items-center py-10 text-center"><div><h1 className="text-2xl font-bold">Evento não encontrado</h1><p className="mt-2 text-muted-foreground">Ele pode ter sido removido ou ainda não foi publicado.</p><Button asChild className="mt-6"><Link to="/eventos">Ver todos os eventos</Link></Button></div></div>;

  const { event, schedule } = data;
  const remaining = event.capacity != null && taken != null ? Math.max(event.capacity - taken, 0) : null;
  return <div className="app-container py-5 sm:py-10">
    <img src={event.image_url ?? hero} alt={event.title} width={1600} height={912} className="aspect-[16/9] w-full rounded-xl object-cover grayscale" />
    <div className="mt-7 grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">
      <div>
        <span className="text-sm font-bold uppercase text-gold">{categoryLabel(event.category)} · Gratuito</span>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{event.title}</h1>
        <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3"><Info icon={CalendarDays} text={formatEventDays(event)} /><Info icon={Clock3} text={formatEventHours(event)} />{event.location && <Info icon={MapPin} text={event.location} />}</div>
        {(event.description || event.summary) && <><hr className="my-7 border-border" /><h2 className="text-xl font-bold">Sobre o evento</h2><p className="mt-3 whitespace-pre-line leading-7 text-muted-foreground">{event.description || event.summary}</p></>}
        {schedule.length > 0 && <><h2 className="mt-7 text-xl font-bold">Programação</h2><div className="mt-3 space-y-3">{schedule.map((s) => <div key={s.id} className="rounded-lg border border-border bg-card p-4 font-semibold">{s.label}</div>)}</div></>}
      </div>
      <aside className="h-fit rounded-xl border border-border bg-card p-5 shadow-sm lg:sticky lg:top-24">
        <RegistrationPanel event={event} remaining={remaining} />
      </aside>
    </div>
  </div>;
}

type Result = { status: "ok" | "duplicate" | "full" | "closed" | "not_found" | "invalid" };

const errorText: Record<Exclude<Result["status"], "ok">, string> = {
  duplicate: "Já existe uma inscrição neste evento com esse e-mail ou RA.",
  full: "As vagas deste evento acabaram.",
  closed: "As inscrições para este evento estão encerradas.",
  not_found: "Evento não encontrado.",
  invalid: "Confira os dados: nome completo, e-mail válido e RA.",
};

const input = "h-12 rounded-lg border border-input bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring";

function RegistrationPanel({ event, remaining }: { event: EventRow; remaining: number | null }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: "", email: "", ra: "", website: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));

  if (done) return <div className="text-center">
    <span className="mx-auto grid size-16 place-items-center rounded-full bg-success-soft text-success"><CheckCircle2 size={34} /></span>
    <h2 className="mt-4 text-xl font-bold">Inscrição confirmada!</h2>
    <p className="mt-2 text-sm text-muted-foreground"><strong className="text-foreground">{form.name}</strong>, sua inscrição foi registrada. A presença será marcada pela organização no dia do evento.</p>
    {emailSent && <p className="mt-3 text-xs text-muted-foreground">Enviamos a confirmação para <strong className="text-foreground">{form.email}</strong> e mandaremos um lembrete na véspera.</p>}
  </div>;

  if (hasEnded(event)) return <div className="text-center">
    <h2 className="text-lg font-bold">Evento encerrado</h2>
    {event.certificate_enabled
      ? <><p className="mt-2 text-sm text-muted-foreground">Esteve presente? Baixe seu certificado com o e-mail e o RA da inscrição.</p><Button asChild className="mt-4 w-full"><Link to="/certificados" search={{ evento: event.slug }}><Award /> Emitir certificado</Link></Button></>
      : <p className="mt-2 text-sm text-muted-foreground">Obrigado a todos que participaram!</p>}
  </div>;
  if (!isRegistrationOpen(event)) return <div className="text-center"><h2 className="text-lg font-bold">Inscrições encerradas</h2><p className="mt-2 text-sm text-muted-foreground">Este evento não está recebendo novas inscrições.</p></div>;
  if (remaining === 0) return <div className="text-center"><h2 className="text-lg font-bold">Vagas esgotadas</h2><p className="mt-2 text-sm text-muted-foreground">Todas as vagas deste evento já foram preenchidas.</p></div>;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError("");
    const { data, error: rpcError } = await supabase.rpc("register_for_event", {
      _event_id: event.id, _full_name: form.name, _email: form.email, _ra: form.ra, _website: form.website,
    });
    setBusy(false);
    const result = data as Result | null;
    if (rpcError || !result) return setError("Não foi possível concluir a inscrição. Tente novamente.");
    if (result.status === "ok") {
      setDone(true);
      queryClient.invalidateQueries({ queryKey: ["events", "spots", event.id] });
      supabase.functions.invoke("event-emails", { body: { type: "confirmation", event_id: event.id, email: form.email } })
        .then(({ data: res }) => setEmailSent(Boolean(res?.sent)))
        .catch(() => undefined);
      return;
    }
    setError(errorText[result.status]);
  };

  return <form onSubmit={submit}>
    <h2 className="text-lg font-bold">Faça sua inscrição</h2>
    <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground"><UsersRound size={14} />{remaining != null ? `${remaining} vaga${remaining === 1 ? "" : "s"} restante${remaining === 1 ? "" : "s"}` : "Inscrição gratuita"}</p>
    {event.registration_closes_at && <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground"><Clock3 size={14} />Inscrições até {formatDateTime(event.registration_closes_at).replace(" ", " às ")}</p>}
    <div className="mt-4 grid gap-3">
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>Deixe este campo em branco<input tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} name="website" /></label>
      </div>
      <label className="grid gap-1.5 text-sm font-bold">Nome completo<input required minLength={3} maxLength={120} value={form.name} onChange={set("name")} placeholder="Seu nome" autoComplete="name" className={input} /></label>
      <label className="grid gap-1.5 text-sm font-bold">E-mail<input required type="email" maxLength={160} value={form.email} onChange={set("email")} placeholder="voce@exemplo.com" autoComplete="email" className={input} /></label>
      <label className="grid gap-1.5 text-sm font-bold">Número do RA<input required maxLength={30} value={form.ra} onChange={set("ra")} placeholder="202600000" className={input} /></label>
    </div>
    {error && <p className="mt-3 rounded-lg bg-destructive/10 p-3 text-xs font-bold text-destructive">{error}</p>}
    <Button size="lg" className="mt-4 w-full" type="submit" disabled={busy}>{busy ? "Enviando..." : "Realizar Inscrição"}</Button>
    <p className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground"><ShieldCheck size={15} /> Gratuita e com confirmação imediata</p>
  </form>;
}

function Info({ icon: Icon, text }: { icon: typeof CalendarDays; text: string }) { return <span className="flex items-center gap-2 font-semibold"><Icon size={19} className="text-gold" />{text}</span>; }
