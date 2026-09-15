import { Link, useRouterState } from "@tanstack/react-router";
import { CalendarDays, Home, Package, Scale, UserRound } from "lucide-react";
import type { ReactNode } from "react";

const nav = [
  { to: "/", label: "Início", icon: Home },
  { to: "/produtos", label: "Produtos", icon: Package },
  { to: "/eventos", label: "Eventos", icon: CalendarDays },
  { to: "/perfil", label: "Perfil", icon: UserRound },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return <div className="min-h-screen bg-background pb-20 md:pb-0">
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
      <div className="app-container grid h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
        <Link to="/" className="flex min-w-0 items-center gap-3" aria-label="Sistema Themis — Início">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary text-gold"><Scale size={23} /></span>
          <span className="min-w-0"><strong className="block truncate font-display text-base">Sistema Themis</strong><small className="block truncate text-[10px] font-bold uppercase text-muted-foreground">Diretório Acadêmico de Direito</small></span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Navegação principal">
          {nav.map(({ to, label }) => <Link key={to} to={to} className="rounded-md px-4 py-2 text-sm font-bold text-muted-foreground hover:bg-muted hover:text-foreground" activeProps={{ className: "bg-navy-soft text-primary" }}>{label}</Link>)}
          <Link to="/admin" className="ml-2 rounded-md border border-border px-4 py-2 text-sm font-bold">Diretoria</Link>
        </nav>
      </div>
    </header>
    <main>{children}</main>
    <nav className="fixed inset-x-0 bottom-0 z-50 grid h-[72px] grid-cols-4 border-t border-border bg-card px-2 pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Navegação inferior">
      {nav.map(({ to, label, icon: Icon }) => { const active = to === "/" ? pathname === "/" : pathname.startsWith(to); return <Link key={to} to={to} className={`flex flex-col items-center justify-center gap-1 text-[11px] font-bold ${active ? "text-primary" : "text-muted-foreground"}`}><Icon size={21} strokeWidth={active ? 2.5 : 2} /><span>{label}</span>{active && <span className="absolute bottom-1 h-1 w-1 rounded-full bg-gold" />}</Link>; })}
    </nav>
  </div>;
}