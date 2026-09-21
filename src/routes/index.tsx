import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Bell, CalendarDays, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/product-card";
import { products } from "@/lib/catalog";
import hero from "@/assets/semana-juridica.jpg";

// No head() here: the home route inherits title/description/og/twitter from
// __root.tsx, and ships no og:image so serve-time hosting can inject the
// project's social preview (explicit og:image or latest screenshot).
export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Sistema Themis — Portal do Direito" },
    { name: "description", content: "Eventos, produtos e avisos do Diretório Acadêmico de Direito." },
    { property: "og:title", content: "Sistema Themis — Portal do Direito" },
    { property: "og:description", content: "Eventos, produtos e avisos do Diretório Acadêmico de Direito." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Index,
});

// IMPORTANT: Replace this placeholder. See ./README.md for routing conventions.
function Index() {
  return <>
    <section className="relative min-h-[500px] overflow-hidden bg-primary text-primary-foreground md:min-h-[560px]">
      <img src={hero} alt="Estudantes chegando à Semana Jurídica" width={1600} height={912} className="absolute inset-0 h-full w-full object-cover object-[62%_center] opacity-70 grayscale" />
      <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/90 to-primary/10" />
      <div className="app-container relative flex min-h-[500px] items-end pb-10 pt-24 md:min-h-[560px] md:items-center md:py-20">
        <div className="max-w-xl"><span className="inline-flex rounded-full bg-gold px-3 py-1 text-xs font-extrabold uppercase text-gold-foreground">Inscrições abertas</span>
          <h1 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl">Semana Jurídica 2026</h1>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-primary-foreground/85 sm:text-lg">Três dias de debates, carreira e conexões com grandes nomes do Direito.</p>
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold"><span className="flex items-center gap-2"><CalendarDays size={18} className="text-gold" /> 22–24 de setembro</span><span className="flex items-center gap-2"><MapPin size={18} className="text-gold" /> Auditório Central</span></div>
          <Button asChild variant="gold" size="lg" className="mt-7 w-full sm:w-auto"><Link to="/eventos">Ver evento <ArrowRight /></Link></Button>
        </div>
      </div>
    </section>
    <section className="app-container py-9"><div className="flex items-end justify-between"><div><p className="text-sm font-bold uppercase text-gold">Loja do DA</p><h2 className="mt-1 text-2xl font-bold">Destaques institucionais</h2></div><Link to="/produtos" className="text-sm font-bold text-primary">Ver todos</Link></div>
      <div className="-mx-4 mt-5 flex snap-x gap-4 overflow-x-auto px-4 pb-3 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0">{products.map((product) => <div key={product.id} className="w-[78vw] max-w-[290px] shrink-0 snap-start sm:w-auto sm:max-w-none"><ProductCard product={product} /></div>)}</div>
    </section>
    <section className="border-y border-border bg-card"><div className="app-container py-9"><div className="mx-auto max-w-2xl text-center"><span className="mx-auto grid size-11 place-items-center rounded-full bg-navy-soft text-primary"><Bell size={21} /></span><p className="mt-3 text-sm font-bold uppercase text-gold">Aviso importante</p><h2 className="mt-1 text-xl font-bold">Retirada de carteirinhas estudantis</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Disponível na sala do DA, de segunda a sexta, das 18h às 20h30.</p></div></div></section>
  </>;
}
