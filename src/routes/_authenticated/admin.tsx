import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, CircleDollarSign, KeyRound, Lock, LogOut, Package, PackageCheck, ShoppingBag, UsersRound } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AnnouncementsAdmin } from "@/components/admin/announcements-admin";
import { BoardAdmin } from "@/components/admin/board-admin";
import { EventsAdmin } from "@/components/admin/events-admin";
import { MembersAdmin } from "@/components/admin/members-admin";
import { OrdersAdmin } from "@/components/admin/orders-admin";
import { ProductsAdmin } from "@/components/admin/products-admin";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser, useSignOut } from "@/lib/auth";
import { money } from "@/lib/catalog";
import { formatEventDays } from "@/lib/data";
import type { OrderStatus } from "@/lib/orders";

export const Route = createFileRoute("/_authenticated/admin")({ head: () => ({ meta: [
  { title: "Painel da Diretoria — Sistema Themis" }, { name: "description", content: "Visão gerencial do Diretório Acadêmico." }, { property: "og:title", content: "Painel da Diretoria — Sistema Themis" }, { property: "og:description", content: "Eventos, inscrições e produtos." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { name: "robots", content: "noindex" },
] }), component: AdminPage });

function AdminPage() {
  const { data, isLoading } = useCurrentUser();
  const signOut = useSignOut();
  if (isLoading || !data) return null;
  if (!data.isAdmin) return <NoAccess email={data.user.email ?? ""} onLogout={signOut} />;
  return <Dashboard name={data.user.email ?? "diretoria"} isOwner={data.isOwner} onLogout={signOut} />;
}

function NoAccess({ email, onLogout }: { email: string; onLogout: () => void }) {
  return <div className="app-container grid min-h-[70vh] place-items-center py-10">
    <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-center shadow-sm">
      <span className="mx-auto grid size-12 place-items-center rounded-lg bg-primary text-gold"><Lock size={22} /></span>
      <h1 className="mt-4 text-2xl font-bold">Acesso restrito à diretoria</h1>
      <p className="mt-2 text-sm text-muted-foreground">A conta <strong className="text-foreground">{email}</strong> não tem acesso ao painel. Fale com o responsável pela plataforma.</p>
      <Button variant="outline" className="mt-5 w-full" onClick={onLogout}><LogOut /> Sair</Button>
    </div>
  </div>;
}

const tabs = [
  { id: "overview", label: "Visão geral" },
  { id: "events", label: "Eventos" },
  { id: "products", label: "Produtos" },
  { id: "announcements", label: "Avisos" },
  { id: "orders", label: "Pedidos" },
  { id: "members", label: "Membros do DA" },
  { id: "board", label: "Acessos" },
] as const;

function Dashboard({ name, isOwner, onLogout }: { name: string; isOwner: boolean; onLogout: () => void }) {
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("overview");
  return <div className="app-container py-8 sm:py-12">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0"><p className="text-sm font-bold uppercase text-gold">{isOwner ? "Responsável pela plataforma" : "Acesso da diretoria"}</p><h1 className="mt-1 truncate text-3xl font-bold">Painel da Diretoria</h1><p className="mt-2 truncate text-muted-foreground">{name}</p></div>
      <div className="flex gap-2"><Button asChild variant="outline"><Link to="/reset-password"><KeyRound /> Alterar senha</Link></Button><Button variant="outline" onClick={onLogout}><LogOut /> Sair</Button></div>
    </header>
    <div className="-mx-4 mt-7 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="flex min-w-max gap-1 rounded-lg bg-muted p-1 sm:grid sm:min-w-0 sm:grid-cols-7">
        {tabs.map((t) => <button key={t.id} onClick={() => setTab(t.id)} className={`h-11 shrink-0 rounded-md px-4 text-xs font-bold sm:px-0 sm:text-sm ${tab === t.id ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}>{t.label}</button>)}
      </div>
    </div>
    {tab === "overview" && <Overview />}
    {tab === "events" && <EventsAdmin />}
    {tab === "products" && <ProductsAdmin />}
    {tab === "announcements" && <AnnouncementsAdmin />}
    {tab === "orders" && <OrdersAdmin />}
    {tab === "members" && <MembersAdmin />}
    {tab === "board" && <BoardAdmin isOwner={isOwner} />}
  </div>;
}

const paidStatuses: OrderStatus[] = ["pago", "em_producao", "aguardando_retirada", "entregue"];

function Overview() {
  const { data } = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: async () => {
      const [events, registrations, products, orders] = await Promise.all([
        supabase.from("events").select("id, title, starts_at, ends_at, capacity, published, registrations(count)").order("starts_at"),
        supabase.from("registrations").select("id", { count: "exact", head: true }),
        supabase.from("products").select("id", { count: "exact", head: true }).eq("active", true),
        supabase.from("orders").select("status, total, order_items(product_name, size, quantity)"),
      ]);
      return { events: events.data ?? [], registrations: registrations.count ?? 0, products: products.count ?? 0, orders: orders.data ?? [] };
    },
  });
  const now = Date.now();
  const upcoming = (data?.events ?? []).filter((e) => new Date(e.ends_at ?? e.starts_at).getTime() >= now);
  const paid = (data?.orders ?? []).filter((o) => paidStatuses.includes(o.status));
  const revenue = paid.reduce((sum, o) => sum + Number(o.total), 0);
  const production = new Map<string, Map<string, number>>();
  for (const o of paid) for (const it of o.order_items) {
    const sizes = production.get(it.product_name) ?? new Map<string, number>();
    sizes.set(it.size ?? "Único", (sizes.get(it.size ?? "Único") ?? 0) + it.quantity);
    production.set(it.product_name, sizes);
  }

  return <>
    <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Metric icon={CalendarDays} label="Próximos eventos" value={String(upcoming.length)} hint={`${data?.events.filter((e) => e.published).length ?? 0} publicados no total`} />
      <Metric icon={UsersRound} label="Inscritos" value={String(data?.registrations ?? 0)} hint="em todos os eventos" />
      <Metric icon={Package} label="Produtos na loja" value={String(data?.products ?? 0)} hint="visíveis no catálogo" />
      <Metric icon={CircleDollarSign} label="Total arrecadado" value={money(revenue)} hint={`${paid.length} pedido${paid.length === 1 ? "" : "s"} pago${paid.length === 1 ? "" : "s"}`} />
    </div>
    <div className="mt-7 grid gap-7 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section className="min-w-0 rounded-xl border border-border bg-card">
        <div className="border-b border-border p-5"><h2 className="text-lg font-bold">Inscrições por evento</h2><p className="text-xs text-muted-foreground">Próximos eventos</p></div>
        <div className="space-y-5 p-5">
          {upcoming.map((e) => { const count = e.registrations[0]?.count ?? 0; const pct = e.capacity ? Math.min(100, Math.round((count / e.capacity) * 100)) : null; return <div key={e.id}>
            <div className="flex justify-between gap-3 text-sm font-bold"><span className="truncate">{e.title}{!e.published && <span className="ml-2 text-xs font-semibold text-muted-foreground">(rascunho)</span>}</span><span className="shrink-0">{count}{e.capacity ? ` / ${e.capacity}` : ""}</span></div>
            <p className="mt-1 text-xs text-muted-foreground">{formatEventDays(e)}</p>
            {pct !== null && <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-gold" style={{ width: `${pct}%` }} /></div>}
          </div>; })}
          {upcoming.length === 0 && <p className="text-center text-sm text-muted-foreground">Nenhum evento programado.</p>}
        </div>
      </section>
      <aside className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-lg bg-navy-soft text-primary"><PackageCheck size={20} /></span><div><h2 className="font-bold">Resumo de produção</h2><p className="text-xs text-muted-foreground">Pedidos pagos</p></div></div>
        <div className="mt-6 space-y-5">
          {[...production].map(([product, sizes]) => <div key={product}><div className="flex justify-between text-sm font-bold"><span>{product}</span><span>{[...sizes.values()].reduce((a, b) => a + b, 0)} un.</span></div><p className="mt-1 text-xs text-muted-foreground">{[...sizes].map(([s, n]) => `${n} ${s}`).join(" · ")}</p></div>)}
          {production.size === 0 && <p className="flex items-center gap-2 text-sm text-muted-foreground"><ShoppingBag size={16} /> Sem pedidos pagos ainda.</p>}
        </div>
      </aside>
    </div>
  </>;
}

function Metric({ icon: Icon, label, value, hint }: { icon: typeof CircleDollarSign; label: string; value: string; hint: string }) {
  return <article className="rounded-xl border border-border bg-card p-4 sm:p-5"><Icon size={21} className="text-gold" /><p className="mt-4 text-xs font-bold uppercase text-muted-foreground">{label}</p><p className="mt-1 truncate text-2xl font-extrabold">{value}</p><p className="mt-1 text-xs font-semibold text-muted-foreground">{hint}</p></article>;
}
