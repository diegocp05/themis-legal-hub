import { createFileRoute, Link } from "@tanstack/react-router";
import { Award, CalendarDays, ChevronRight, Images, MapPin } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { type EventCategory, type EventRow, categoryLabel, eventCategories, formatEventDays, hasEnded, isRegistrationOpen, usePublishedEvents } from "@/lib/data";
import { pageText, usePageContent } from "@/lib/pages";
import hero from "@/assets/semana-juridica.jpg";

export const Route = createFileRoute("/eventos/")({ head: () => ({ meta: [
  { title: "Eventos — Sistema Themis" }, { name: "description", content: "Eventos do Diretório Acadêmico de Direito com inscrição gratuita." }, { property: "og:title", content: "Eventos — Sistema Themis" }, { property: "og:description", content: "Palestras, debates e encontros do DA de Direito." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
] }), component: EventsPage });

function EventsPage() {
  const { data: events, isLoading } = usePublishedEvents();
  const { data: pages } = usePageContent();
  const [category, setCategory] = useState<EventCategory | "all">("all");
  const upcoming = events?.filter((e) => !hasEnded(e)) ?? [];
  const past = events?.filter(hasEnded).reverse() ?? [];
  const usedCategories = eventCategories.filter((c) => upcoming.some((e) => e.category === c.id));
  const visible = category === "all" ? upcoming : upcoming.filter((e) => e.category === category);

  return <div className="app-container py-8 sm:py-12">
    <p className="text-sm font-bold uppercase text-gold">{pageText(pages, "events_label")}</p><h1 className="mt-1 text-3xl font-bold">{pageText(pages, "events_title")}</h1>
    <p className="mt-3 max-w-2xl text-muted-foreground">{pageText(pages, "events_text")}</p>
    {usedCategories.length > 1 && <div className="-mx-4 mt-6 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="tablist" aria-label="Categorias">
      {[{ id: "all" as const, label: "Todos" }, ...usedCategories].map((c) => <button key={c.id} role="tab" aria-selected={category === c.id} onClick={() => setCategory(c.id)} className={`h-10 shrink-0 rounded-full border px-4 text-sm font-bold ${category === c.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground"}`}>{c.label}</button>)}
    </div>}
    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {isLoading && [0, 1, 2].map((i) => <div key={i} className="h-72 animate-pulse rounded-xl bg-muted" />)}
      {visible.map((e) => <EventCard key={e.id} event={e} />)}
    </div>
    {!isLoading && visible.length === 0 && <p className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">{pageText(pages, "events_empty")}</p>}

    <section className="mt-10 flex flex-wrap items-center gap-4 rounded-xl border border-gold/40 bg-card p-5">
      <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-primary text-gold"><Award size={22} /></span>
      <div className="min-w-0 flex-1"><h2 className="font-bold">{pageText(pages, "events_certificate_title")}</h2><p className="text-sm text-muted-foreground">{pageText(pages, "events_certificate_text")}</p></div>
      <Button asChild variant="outline"><Link to="/certificados">Emitir certificado</Link></Button>
    </section>

    {past.length > 0 && <>
      <h2 className="mt-12 text-xl font-bold">{pageText(pages, "events_past_title")}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{past.map((e) => <PastEventCard key={e.id} event={e} />)}</div>
    </>}
  </div>;
}

function EventCard({ event }: { event: EventRow }) {
  const open = isRegistrationOpen(event);
  const { data: pages } = usePageContent();
  const image = event.image_url || pageText(pages, "fallback_image") || hero;
  return <Link to="/eventos/$slug" params={{ slug: event.slug }} className="group overflow-hidden rounded-xl border border-border bg-card shadow-sm transition hover:border-primary">
    <img src={image} alt="" loading="lazy" width={800} height={450} className="aspect-[16/9] w-full object-cover grayscale" />
    <div className="p-4">
      <div className="flex flex-wrap gap-1.5">
        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${open ? "bg-success-soft text-success" : "bg-muted text-muted-foreground"}`}>{open ? "Inscrições abertas" : "Inscrições encerradas"}</span>
        <span className="inline-flex rounded-full bg-navy-soft px-2.5 py-1 text-[11px] font-bold uppercase text-primary">{categoryLabel(event.category)}</span>
      </div>
      <h3 className="mt-2 text-lg font-bold leading-snug">{event.title}</h3>
      <div className="mt-3 space-y-1.5 text-sm text-muted-foreground"><p className="flex items-center gap-2"><CalendarDays size={16} className="text-gold" />{formatEventDays(event)}</p>{event.location && <p className="flex items-center gap-2"><MapPin size={16} className="text-gold" />{event.location}</p>}</div>
      <p className="mt-4 flex items-center gap-1 text-sm font-bold text-primary">Ver detalhes <ChevronRight size={16} className="transition group-hover:translate-x-0.5" /></p>
    </div>
  </Link>;
}

function PastEventCard({ event }: { event: EventRow }) {
  const { data: pages } = usePageContent();
  return <article className="flex items-center gap-4 rounded-xl border border-border bg-card p-3">
    <img src={event.image_url || pageText(pages, "fallback_image") || hero} alt="" loading="lazy" width={160} height={160} className="size-16 shrink-0 rounded-lg object-cover opacity-80 grayscale" />
    <div className="min-w-0 flex-1">
      <h3 className="truncate font-bold">{event.title}</h3>
      <p className="text-xs text-muted-foreground">{formatEventDays(event)} · {categoryLabel(event.category)}</p>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
        <Link to="/eventos/$slug" params={{ slug: event.slug }} search={{ aba: "fotos" }} className="inline-flex items-center gap-1 text-xs font-bold text-primary"><Images size={13} /> Ver fotos</Link>
        {event.certificate_enabled && <Link to="/certificados" search={{ evento: event.slug }} className="inline-flex items-center gap-1 text-xs font-bold text-primary"><Award size={13} /> Emitir certificado</Link>}
      </div>
    </div>
  </article>;
}
