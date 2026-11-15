import { Link, useRouterState } from "@tanstack/react-router";
import { CalendarDays, Home, Package, Scale, ShieldCheck } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { pageText, usePageContent } from "@/lib/pages";

const nav = [
  { to: "/", label: "Início", icon: Home },
  { to: "/produtos", label: "Produtos", icon: Package },
  { to: "/eventos", label: "Eventos", icon: CalendarDays },
  { to: "/admin", label: "Diretoria", icon: ShieldCheck },
] as const;

export function BrandMark({ className = "size-10", icon = 23 }: { className?: string; icon?: number }) {
  const { data: pages, isPending } = usePageContent();
  if (isPending || !pages) return <span className={`block ${className} shrink-0 rounded-lg bg-primary`} aria-hidden="true" />;
  const logo = pageText(pages, "site_logo");
  if (logo) return <img src={logo} alt="" className={`block ${className} shrink-0 rounded-lg bg-primary object-cover`} />;
  return <span className={`grid ${className} shrink-0 place-items-center rounded-lg bg-primary text-gold`}><Scale size={icon} /></span>;
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { data: pages } = usePageContent();
  const siteName = pageText(pages, "site_name");
  const logo = pageText(pages, "site_logo");
  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) return;
    link.href = logo || "/favicon.svg";
    link.type = logo ? "" : "image/svg+xml";
  }, [logo]);
  return <div className="min-h-screen bg-background pb-20 md:pb-0">
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
      <div className="app-container grid h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
        <Link to="/" className="flex min-w-0 items-center gap-3" aria-label={`${siteName} — Início`}>
          <BrandMark />
          <span className="min-w-0"><strong className="block truncate font-display text-base">{siteName}</strong><small className="block truncate text-[10px] font-bold uppercase text-muted-foreground">{pageText(pages, "site_tagline")}</small></span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Navegação principal">
          {nav.slice(0, -1).map(({ to, label }) => <Link key={to} to={to} className="rounded-md px-4 py-2 text-sm font-bold text-muted-foreground hover:bg-muted hover:text-foreground" activeProps={{ className: "bg-navy-soft text-primary" }}>{label}</Link>)}
          <Link to="/admin" className="ml-2 rounded-md border border-border px-4 py-2 text-sm font-bold" activeProps={{ className: "border-primary bg-navy-soft text-primary" }}>Diretoria</Link>
        </nav>
      </div>
    </header>
    <main>{children}</main>
    <nav className="fixed inset-x-0 bottom-0 z-50 grid h-[72px] grid-cols-4 border-t border-border bg-card px-2 pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Navegação inferior">
      {nav.map(({ to, label, icon: Icon }) => { const active = to === "/" ? pathname === "/" : pathname.startsWith(to); return <Link key={to} to={to} className={`flex flex-col items-center justify-center gap-1 text-[11px] font-bold ${active ? "text-primary" : "text-muted-foreground"}`}><Icon size={21} strokeWidth={active ? 2.5 : 2} /><span>{label}</span>{active && <span className="absolute bottom-1 h-1 w-1 rounded-full bg-gold" />}</Link>; })}
    </nav>
  </div>;
}