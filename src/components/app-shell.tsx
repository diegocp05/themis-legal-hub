import { Link, useRouterState } from "@tanstack/react-router";
import { CalendarDays, Check, Copy, Download, Home, LogIn, LogOut, Package, QrCode, Scale, ShieldCheck, X } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useCurrentUser, useSignOut } from "@/lib/auth";
import { pageText, usePageContent } from "@/lib/pages";

const SITE_URL = "https://themis-legal-hub.vercel.app";

const publicNav = [
  { to: "/", label: "Início", icon: Home },
  { to: "/produtos", label: "Produtos", icon: Package },
  { to: "/eventos", label: "Eventos", icon: CalendarDays },
] as const;

export function BrandMark({ className = "size-10", icon = 23 }: { className?: string; icon?: number }) {
  const { data: pages, isPending } = usePageContent();
  if (isPending || !pages) return <span className={`block ${className} shrink-0 rounded-lg bg-primary`} aria-hidden="true" />;
  const logo = pageText(pages, "site_logo");
  if (logo) return <img src={logo} alt="" className={`block ${className} shrink-0 rounded-lg bg-primary object-cover`} />;
  return (
    <span className={`grid ${className} shrink-0 place-items-center rounded-lg bg-primary text-gold`}>
      <Scale size={icon} />
    </span>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { data: pages } = usePageContent();
  const { data: userData } = useCurrentUser();
  const signOut = useSignOut();
  const [qrOpen, setQrOpen] = useState(false);

  const isAuthPage = pathname.startsWith("/auth") || pathname.startsWith("/reset-password");
  const isAdmin = !!userData?.isAdmin;
  const isLoggedIn = !!userData?.user;

  const navItems = isAdmin
    ? [...publicNav, { to: "/admin" as const, label: "Diretoria", icon: ShieldCheck }]
    : publicNav;

  const siteName = pageText(pages, "site_name");
  const logo = pageText(pages, "site_logo");

  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) return;
    link.href = logo || "/favicon.svg";
    link.type = logo ? "" : "image/svg+xml";
  }, [logo]);

  return (
    <div className={`min-h-screen bg-background ${isAuthPage ? "" : "pb-20 md:pb-0"}`}>
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
        <div className="app-container grid h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
          <Link to="/" className="flex min-w-0 items-center gap-3" aria-label={`${siteName} — Início`}>
            <BrandMark />
            <span className="min-w-0">
              <strong className="block truncate font-display text-base">{siteName}</strong>
              <small className="block truncate text-[10px] font-bold uppercase text-muted-foreground">{pageText(pages, "site_tagline")}</small>
            </span>
          </Link>

          {/* Navegação Desktop */}
          <nav className="hidden items-center gap-1 md:flex" aria-label="Navegação principal">
            {publicNav.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className="rounded-md px-4 py-2 text-sm font-bold text-muted-foreground hover:bg-muted hover:text-foreground"
                activeProps={{ className: "bg-navy-soft text-primary" }}
              >
                {label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                to="/admin"
                className="ml-2 rounded-md border border-border px-4 py-2 text-sm font-bold"
                activeProps={{ className: "border-primary bg-navy-soft text-primary" }}
              >
                Diretoria
              </Link>
            )}
            <button
              type="button"
              onClick={() => setQrOpen(true)}
              aria-label="Abrir QR Code do site"
              className="ml-2 inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-bold text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <QrCode size={16} className="text-gold" /> QR Code
            </button>
            {!isLoggedIn && !isAuthPage && (
              <Link
                to="/auth"
                className="ml-2 inline-flex items-center gap-1.5 rounded-md border border-border px-3.5 py-2 text-sm font-bold text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <LogIn size={15} /> Entrar
              </Link>
            )}
            {isLoggedIn && !isAdmin && (
              <button
                type="button"
                onClick={signOut}
                className="ml-2 inline-flex items-center gap-1.5 rounded-md border border-border px-3.5 py-2 text-sm font-bold text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <LogOut size={15} /> Sair
              </button>
            )}
          </nav>

          {/* Ações rápidas no topo Mobile */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              type="button"
              onClick={() => setQrOpen(true)}
              aria-label="Abrir QR Code do site"
              className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-background text-gold hover:bg-muted"
            >
              <QrCode size={17} />
            </button>
            {!isAuthPage && !isAdmin && (
              !isLoggedIn ? (
                <Link
                  to="/auth"
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-bold text-muted-foreground hover:text-foreground"
                >
                  <LogIn size={14} /> Entrar
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={signOut}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-bold text-muted-foreground hover:text-foreground"
                >
                  <LogOut size={14} /> Sair
                </button>
              )
            )}
          </div>
        </div>
      </header>

      <main>{children}</main>

      {/* Navegação inferior Mobile */}
      {!isAuthPage && (
        <nav
          className={`fixed inset-x-0 bottom-0 z-50 grid h-[72px] ${
            isAdmin ? "grid-cols-4" : "grid-cols-3"
          } border-t border-border bg-card px-2 pb-[env(safe-area-inset-bottom)] md:hidden`}
          aria-label="Navegação inferior"
        >
          {navItems.map(({ to, label, icon: Icon }) => {
            const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`relative flex flex-col items-center justify-center gap-1 text-[11px] font-bold ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon size={21} strokeWidth={active ? 2.5 : 2} />
                <span>{label}</span>
                {active && <span className="absolute bottom-1 h-1 w-1 rounded-full bg-gold" />}
              </Link>
            );
          })}
        </nav>
      )}

      {qrOpen && <SiteQrModal siteName={siteName} onClose={() => setQrOpen(false)} />}
    </div>
  );
}

function SiteQrModal({ siteName, onClose }: { siteName: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const canvasWrapRef = useRef<HTMLDivElement>(null);

  const downloadPng = () => {
    const canvas = canvasWrapRef.current?.querySelector("canvas");
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = "qrcode-sistema-temis.png";
    a.click();
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(SITE_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-xs"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="QR Code de acesso ao site"
    >
      <div
        className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute right-3 top-3 grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X size={18} />
        </button>

        <p className="text-xs font-bold uppercase tracking-wider text-gold">{siteName}</p>
        <h2 className="mt-1 text-xl font-bold">Acesse pelo QR Code</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Aponte a câmera do celular para abrir o portal oficial do Diretório Acadêmico.
        </p>

        <div ref={canvasWrapRef} className="mx-auto mt-5 inline-block rounded-2xl border-4 border-gold/40 bg-white p-4 shadow-sm">
          <QRCodeCanvas
            value={SITE_URL}
            size={210}
            bgColor="#ffffff"
            fgColor="#0f172a"
            level="H"
            marginSize={1}
          />
        </div>

        <p className="mt-3 truncate font-mono text-xs text-muted-foreground">{SITE_URL}</p>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" onClick={copyLink}>
            {copied ? <Check size={16} className="text-success" /> : <Copy size={16} />}
            {copied ? "Copiado" : "Copiar link"}
          </Button>
          <Button type="button" onClick={downloadPng}>
            <Download size={16} /> Baixar PNG
          </Button>
        </div>
      </div>
    </div>
  );
}