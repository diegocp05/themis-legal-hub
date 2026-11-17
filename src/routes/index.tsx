import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Bell, CalendarDays, MapPin, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard, ProductCardSkeleton } from "@/components/product-card";
import { formatEventDays, groupBySector, isRegistrationOpen, pickHighlight, useActiveProducts, useAnnouncements, useBoardMembers, usePublishedEvents } from "@/lib/data";
import { pageText, usePageContent } from "@/lib/pages";
import hero from "@/assets/semana-juridica.jpg";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Sistema Têmis — Portal do Direito" },
    { name: "description", content: "Eventos, produtos e avisos do Diretório Acadêmico de Direito." },
    { property: "og:title", content: "Sistema Têmis — Portal do Direito" },
    { property: "og:description", content: "Eventos, produtos e avisos do Diretório Acadêmico de Direito." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Index,
});

function Index() {
  const { data: events = [] } = usePublishedEvents();
  const { data: products, isLoading: loadingProducts } = useActiveProducts();
  const { data: announcements = [] } = useAnnouncements();
  const { data: members = [] } = useBoardMembers();
  const { data: pages } = usePageContent();
  const highlight = pickHighlight(events);
  const banner = pageText(pages, "fallback_image") || hero;
  return <>
    <section className="relative min-h-[500px] overflow-hidden bg-primary text-primary-foreground md:min-h-[560px]">
      <img src={highlight?.image_url || banner} alt={highlight?.title ?? pageText(pages, "home_title")} width={1600} height={912} className="absolute inset-0 h-full w-full object-cover object-[62%_center] opacity-70 " />
      <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/90 to-primary/10" />
      <div className="app-container relative flex min-h-[500px] items-end pb-10 pt-24 md:min-h-[560px] md:items-center md:py-20">
        {highlight ? <div className="max-w-xl">
          <span className="inline-flex rounded-full bg-gold px-3 py-1 text-xs font-extrabold uppercase text-gold-foreground">{isRegistrationOpen(highlight) ? "Inscrições abertas" : "Próximo evento"}</span>
          <h1 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl">{highlight.title}</h1>
          {highlight.summary && <p className="mt-4 max-w-lg text-base leading-relaxed text-primary-foreground/85 sm:text-lg">{highlight.summary}</p>}
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold"><span className="flex items-center gap-2"><CalendarDays size={18} className="text-gold" /> {formatEventDays(highlight)}</span>{highlight.location && <span className="flex items-center gap-2"><MapPin size={18} className="text-gold" /> {highlight.location}</span>}</div>
          <Button asChild variant="gold" size="lg" className="mt-7 w-full sm:w-auto"><Link to="/eventos/$slug" params={{ slug: highlight.slug }}>Ver evento <ArrowRight /></Link></Button>
        </div> : <div className="max-w-xl">
          <span className="inline-flex rounded-full bg-gold px-3 py-1 text-xs font-extrabold uppercase text-gold-foreground">{pageText(pages, "home_badge")}</span>
          <h1 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl">{pageText(pages, "home_title")}</h1>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-primary-foreground/85 sm:text-lg">{pageText(pages, "home_text")}</p>
          <Button asChild variant="gold" size="lg" className="mt-7 w-full sm:w-auto"><Link to="/eventos">Ver eventos <ArrowRight /></Link></Button>
        </div>}
      </div>
    </section>
    <section className="app-container py-9"><div className="flex items-end justify-between"><div><p className="text-sm font-bold uppercase text-gold">{pageText(pages, "home_store_label")}</p><h2 className="mt-1 text-2xl font-bold">{pageText(pages, "home_store_title")}</h2></div><Link to="/produtos" className="text-sm font-bold text-primary">Ver todos</Link></div>
      <div className="-mx-4 mt-5 flex snap-x gap-4 overflow-x-auto px-4 pb-3 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0">
        {loadingProducts && [0, 1, 2].map((i) => <div key={i} className="w-[78vw] max-w-[290px] shrink-0 sm:w-auto sm:max-w-none"><ProductCardSkeleton /></div>)}
        {products?.slice(0, 6).map((product) => <div key={product.id} className="w-[78vw] max-w-[290px] shrink-0 snap-start sm:w-auto sm:max-w-none"><ProductCard product={product} /></div>)}
        {products?.length === 0 && <p className="text-sm text-muted-foreground">Nenhum produto disponível no momento.</p>}
      </div>
    </section>
    {members.length > 0 && <section className="border-y border-border bg-card">
      <div className="app-container py-9">
        <div className="text-center"><p className="text-sm font-bold uppercase text-gold">{pageText(pages, "home_members_label")}</p><h2 className="mt-1 text-2xl font-bold">{pageText(pages, "home_members_title")}</h2><p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">{pageText(pages, "home_members_text")}</p></div>
        <MemberGroup title="Chapa" members={members.filter((member) => member.in_chapa)} />
        <MemberGroup title="Demais integrantes" members={members.filter((member) => !member.in_chapa)} />
      </div>
    </section>}
    {announcements.length > 0 && <section className="app-container py-9"><div className="mx-auto max-w-2xl space-y-8 text-center">
      {announcements.map((a) => <div key={a.id}><span className="mx-auto grid size-11 place-items-center rounded-full bg-navy-soft text-primary"><Bell size={21} /></span><p className="mt-3 text-sm font-bold uppercase text-gold">{pageText(pages, "home_notice_label")}</p><h2 className="mt-1 text-xl font-bold">{a.title}</h2>{a.body && <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{a.body}</p>}</div>)}
    </div></section>}
  </>;
}

function MemberGroup({ title, members }: { title: string; members: { id: string; name: string; role: string; photo_url: string | null; sector: string; instagram: string | null }[] }) {
  if (members.length === 0) return null;
  const sectors = groupBySector(members);
  return <div className="mt-8">
    <h3 className="text-center text-sm font-bold uppercase tracking-wide text-gold">{title}</h3>
    {sectors.map(({ sector, items }) => <div key={sector} className="mt-5">
      {sectors.length > 1 && <h4 className="mb-3 text-center text-xs font-bold uppercase tracking-wide text-muted-foreground">{sector}</h4>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-6">
        {items.map((member) => <article key={member.id} className="group overflow-hidden rounded-xl border border-border bg-background transition-colors duration-300 hover:border-gold/50">
          <div className="overflow-hidden">
            {member.photo_url ? <img src={member.photo_url} alt={`Foto de ${member.name}`} loading="lazy" width={768} height={768} className="aspect-square w-full object-cover transition duration-500 ease-out motion-safe:group-hover:scale-110" /> : <span className="grid aspect-square w-full place-items-center bg-muted text-muted-foreground transition duration-500 ease-out motion-safe:group-hover:scale-110"><UserRound size={40} /></span>}
          </div>
          <div className="p-3 text-center"><h4 className="text-sm font-bold leading-snug">{member.name}</h4><p className="mt-0.5 text-[11px] font-bold uppercase leading-snug tracking-wide text-gold">{member.role}</p>
            {member.instagram && <a href={`https://instagram.com/${member.instagram}`} target="_blank" rel="noreferrer" className="mt-1 block truncate text-xs font-semibold text-muted-foreground hover:text-primary">@{member.instagram}</a>}
          </div>
        </article>)}
      </div>
    </div>)}
  </div>;
}
