import { createFileRoute } from "@tanstack/react-router";
import { CircleDollarSign, Lock, LogOut, Package, PackageCheck, Pencil, Plus, ShoppingBag, Trash2, TrendingUp, UsersRound } from "lucide-react";
import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { board } from "@/lib/board";
import { money, products as catalog } from "@/lib/catalog";

export const Route = createFileRoute("/admin")({ head: () => ({ meta: [
  { title: "Painel da Diretoria — Sistema Themis" }, { name: "description", content: "Visão gerencial do Diretório Acadêmico." }, { property: "og:title", content: "Painel da Diretoria — Sistema Themis" }, { property: "og:description", content: "Pagamentos, inscrições e produção." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { name: "robots", content: "noindex" },
] }), component: AdminPage });

type OrderStatus = "Aguardando Pagamento" | "Pago" | "Cancelado" | "Aguardando Retirada" | "Entregue";
type Order = { id: string; aluno: string; item: string; valor: number; data: string; status: OrderStatus };
type Item = { id: string; name: string; price: number; sizes: string[]; image: string | null };

const statusFilters: Array<"Todos" | OrderStatus> = ["Todos", "Aguardando Pagamento", "Pago", "Aguardando Retirada", "Entregue", "Cancelado"];
const badge: Record<OrderStatus, string> = {
  "Aguardando Pagamento": "bg-muted text-muted-foreground",
  "Pago": "bg-navy-soft text-primary",
  "Aguardando Retirada": "bg-gold/20 text-gold",
  "Entregue": "bg-success-soft text-success",
  "Cancelado": "bg-destructive/10 text-destructive",
};

const initialOrders: Order[] = [
  { id: "THM-1042", aluno: "Marina Oliveira", item: "Camiseta Themis · M", valor: 69.9, data: "Hoje, 18:42", status: "Pago" },
  { id: "THM-1041", aluno: "Rafael Santos", item: "Semana Jurídica · Passaporte", valor: 35, data: "Hoje, 17:20", status: "Pago" },
  { id: "THM-1039", aluno: "Ana Carolina", item: "Copo Térmico Themis", valor: 49.9, data: "Hoje, 15:08", status: "Aguardando Retirada" },
  { id: "THM-1036", aluno: "João Pedro", item: "Tirante Institucional", valor: 24.9, data: "Ontem, 21:17", status: "Aguardando Retirada" },
  { id: "THM-1031", aluno: "Fernanda Lima", item: "Camiseta Themis · G", valor: 69.9, data: "Ontem, 19:02", status: "Entregue" },
  { id: "THM-1028", aluno: "Diego Martins", item: "Semana Jurídica · Diário", valor: 15, data: "12 set, 14:33", status: "Aguardando Pagamento" },
  { id: "THM-1025", aluno: "Larissa Campos", item: "Camiseta Themis · P", valor: 69.9, data: "11 set, 20:15", status: "Cancelado" },
];

const payments = [
  { name: "Marina Oliveira", item: "Camiseta Themis · M", value: "R$ 69,90", date: "Hoje, 18:42" },
  { name: "Rafael Santos", item: "Semana Jurídica", value: "R$ 35,00", date: "Hoje, 17:20" },
  { name: "Ana Carolina", item: "Copo Térmico", value: "R$ 49,90", date: "Hoje, 15:08" },
  { name: "João Pedro", item: "Tirante Institucional", value: "R$ 24,90", date: "Ontem, 21:17" },
];

function AdminPage() {
  const [email, setEmail] = useState<string | null | undefined>(undefined);
  useEffect(() => { setEmail(sessionStorage.getItem("themis-admin")); }, []);
  if (email === undefined) return null;
  const member = board.find((m) => m.email === email);
  if (!member) return <Login onLogin={(value) => { sessionStorage.setItem("themis-admin", value); setEmail(value); }} />;
  return <Dashboard member={member} onLogout={() => { sessionStorage.removeItem("themis-admin"); setEmail(null); }} />;
}

function Login({ onLogin }: { onLogin: (email: string) => void }) {
  const [email, setEmail] = useState(board[0].email);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  return <div className="app-container grid min-h-[70vh] place-items-center py-10">
    <form className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-sm" onSubmit={(e) => { e.preventDefault(); if (password === "themis2026") { onLogin(email); } else { setError("Senha incorreta. Verifique suas credenciais de membro da diretoria."); } }}>
      <span className="mx-auto grid size-12 place-items-center rounded-lg bg-primary text-gold"><Lock size={22} /></span>
      <h1 className="mt-4 text-center text-2xl font-bold">Acesso da Diretoria</h1>
      <p className="mt-2 text-center text-sm text-muted-foreground">Área restrita aos 6 membros da chapa diretora.</p>
      <label className="mt-6 grid gap-1.5 text-sm font-bold">Membro
        <select value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 rounded-lg border border-input bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring">
          {board.map((m) => <option key={m.email} value={m.email}>{m.name} — {m.role}</option>)}
        </select>
      </label>
      <label className="mt-4 grid gap-1.5 text-sm font-bold">Senha
        <input required type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }} placeholder="••••••••" className="h-12 rounded-lg border border-input bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring" />
      </label>
      {error && <p className="mt-3 rounded-lg bg-destructive/10 p-3 text-xs font-bold text-destructive">{error}</p>}
      <Button size="lg" className="mt-5 w-full" type="submit">Entrar no painel</Button>
      <p className="mt-3 rounded-lg bg-muted p-3 text-center text-xs text-muted-foreground">Protótipo — senha de demonstração: <strong className="text-foreground">themis2026</strong></p>
    </form>
  </div>;
}

function Dashboard({ member, onLogout }: { member: (typeof board)[number]; onLogout: () => void }) {
  const [tab, setTab] = useState<"overview" | "orders" | "products">("overview");
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [items, setItems] = useState<Item[]>(() => catalog.map((p) => ({ id: p.id, name: p.name, price: p.price, sizes: p.sizes, image: p.image })));
  const tabs = [{ id: "overview", label: "Visão geral" }, { id: "orders", label: "Pedidos" }, { id: "products", label: "Produtos" }] as const;
  return <div className="app-container py-8 sm:py-12">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-sm font-bold uppercase text-gold">Acesso da diretoria</p><h1 className="mt-1 text-3xl font-bold">Olá, {member.name.split(" ")[0]}</h1><p className="mt-2 text-muted-foreground">{member.role} · Lote de setembro · atualização em tempo real simulada</p></div>
      <Button variant="outline" onClick={onLogout}><LogOut /> Sair</Button>
    </header>
    <div className="mt-7 grid grid-cols-3 rounded-lg bg-muted p-1">
      {tabs.map((t) => <button key={t.id} onClick={() => setTab(t.id)} className={`h-11 rounded-md text-sm font-bold ${tab === t.id ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}>{t.label}</button>)}
    </div>
    {tab === "overview" && <Overview />}
    {tab === "orders" && <OrdersAdmin orders={orders} setOrders={setOrders} />}
    {tab === "products" && <ProductsAdmin items={items} setItems={setItems} />}
  </div>;
}

function Overview() {
  return <>
    <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Metric icon={CircleDollarSign} label="Total arrecadado" value="R$ 8.492" hint="+18% no mês" />
      <Metric icon={ShoppingBag} label="Pedidos" value="128" hint="42 neste lote" />
      <Metric icon={UsersRound} label="Inscritos" value="214" hint="76% das vagas" />
      <Metric icon={TrendingUp} label="Ticket médio" value="R$ 66,34" hint="+R$ 4,20" />
    </div>
    <div className="mt-7 grid gap-7 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section className="min-w-0 rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border p-5"><h2 className="text-lg font-bold">Pagamentos aprovados</h2><span className="rounded-full bg-success-soft px-2 py-1 text-xs font-bold text-success">Automático</span></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-muted text-xs uppercase text-muted-foreground"><tr><th className="px-5 py-3">Aluno</th><th className="px-5 py-3">Item</th><th className="px-5 py-3">Valor</th><th className="px-5 py-3">Data</th></tr></thead><tbody>{payments.map((p) => <tr key={p.name} className="border-t border-border"><td className="px-5 py-4 font-bold">{p.name}</td><td className="px-5 py-4 text-muted-foreground">{p.item}</td><td className="px-5 py-4 font-bold">{p.value}</td><td className="px-5 py-4 text-muted-foreground">{p.date}</td></tr>)}</tbody></table></div>
      </section>
      <aside className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-lg bg-navy-soft text-primary"><PackageCheck size={20} /></span><div><h2 className="font-bold">Resumo de produção</h2><p className="text-xs text-muted-foreground">Pedidos confirmados</p></div></div>
        <div className="mt-6 space-y-5"><Production label="Camisetas" total="46 un." parts="15 P · 20 M · 10 G" pct="88%" /><Production label="Tirantes" total="32 un." parts="Tamanho único" pct="63%" /><Production label="Copos térmicos" total="18 un." parts="500 ml" pct="35%" /></div>
      </aside>
    </div>
  </>;
}

function OrdersAdmin({ orders, setOrders }: { orders: Order[]; setOrders: Dispatch<SetStateAction<Order[]>> }) {
  const [filter, setFilter] = useState<(typeof statusFilters)[number]>("Todos");
  const visible = orders.filter((o) => filter === "Todos" || o.status === filter);
  const setStatus = (id: string, status: OrderStatus) => setOrders((current) => current.map((o) => (o.id === id ? { ...o, status } : o)));
  return <section className="mt-6 rounded-xl border border-border bg-card">
    <div className="border-b border-border p-5">
      <h2 className="text-lg font-bold">Pedidos</h2>
      <p className="text-xs text-muted-foreground">Filtre por status e dê baixa nas retiradas presenciais.</p>
      <div className="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1">
        {statusFilters.map((s) => <button key={s} onClick={() => setFilter(s)} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold ${filter === s ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground"}`}>{s}</button>)}
      </div>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="bg-muted text-xs uppercase text-muted-foreground"><tr><th className="px-5 py-3">Pedido</th><th className="px-5 py-3">Aluno</th><th className="px-5 py-3">Item</th><th className="px-5 py-3">Valor</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Ações</th></tr></thead>
        <tbody>
          {visible.map((o) => <tr key={o.id} className="border-t border-border">
            <td className="px-5 py-4 font-bold">{o.id}</td>
            <td className="px-5 py-4 font-semibold">{o.aluno}<p className="text-xs font-normal text-muted-foreground">{o.data}</p></td>
            <td className="px-5 py-4 text-muted-foreground">{o.item}</td>
            <td className="px-5 py-4 font-bold">{money(o.valor)}</td>
            <td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${badge[o.status]}`}>{o.status}</span></td>
            <td className="px-5 py-4 text-right">
              {o.status === "Aguardando Retirada" && <Button size="sm" onClick={() => setStatus(o.id, "Entregue")}>Dar baixa</Button>}
              {o.status === "Aguardando Pagamento" && <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setStatus(o.id, "Cancelado")}>Cancelar</Button>}
            </td>
          </tr>)}
          {visible.length === 0 && <tr><td colSpan={6} className="px-5 py-8 text-center text-muted-foreground">Nenhum pedido com este status.</td></tr>}
        </tbody>
      </table>
    </div>
  </section>;
}

function ProductsAdmin({ items, setItems }: { items: Item[]; setItems: Dispatch<SetStateAction<Item[]>> }) {
  const [form, setForm] = useState<{ mode: "new" } | { mode: "edit"; item: Item } | null>(null);
  const save = (item: Item) => {
    setItems((current) => (form?.mode === "edit" ? current.map((p) => (p.id === item.id ? item : p)) : [...current, item]));
    setForm(null);
  };
  return <section className="mt-6 rounded-xl border border-border bg-card">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
      <div><h2 className="text-lg font-bold">Catálogo</h2><p className="text-xs text-muted-foreground">Crie, edite ou exclua produtos da loja.</p></div>
      <Button onClick={() => setForm({ mode: "new" })}><Plus /> Novo produto</Button>
    </div>
    {form && <ProductForm key={form.mode === "edit" ? form.item.id : "new"} initial={form.mode === "edit" ? form.item : null} onSave={save} onCancel={() => setForm(null)} />}
    <ul className="divide-y divide-border">
      {items.map((p) => <li key={p.id} className="flex items-center gap-3 p-4 sm:gap-4 sm:px-5">
        {p.image ? <img src={p.image} alt="" width={96} height={96} className="size-12 shrink-0 rounded-lg object-cover grayscale" /> : <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground"><Package size={20} /></span>}
        <div className="min-w-0 flex-1"><p className="truncate font-bold">{p.name}</p><p className="truncate text-xs text-muted-foreground">{money(p.price)} · {p.sizes.join(" · ")}</p></div>
        <Button variant="outline" size="icon" onClick={() => setForm({ mode: "edit", item: p })} aria-label={`Editar ${p.name}`}><Pencil size={16} /></Button>
        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setItems((current) => current.filter((x) => x.id !== p.id))} aria-label={`Excluir ${p.name}`}><Trash2 size={16} /></Button>
      </li>)}
      {items.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">Nenhum produto cadastrado.</li>}
    </ul>
  </section>;
}

function ProductForm({ initial, onSave, onCancel }: { initial: Item | null; onSave: (item: Item) => void; onCancel: () => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [price, setPrice] = useState(initial ? initial.price.toFixed(2).replace(".", ",") : "");
  const [sizes, setSizes] = useState(initial?.sizes.join(", ") ?? "");
  return <form className="grid gap-4 border-b border-border bg-muted/50 p-5 sm:grid-cols-[1fr_140px_1fr_auto]" onSubmit={(e) => {
    e.preventDefault();
    const parsed = Number.parseFloat(price.replace(",", "."));
    onSave({ id: initial?.id ?? `item-${Date.now()}`, name: name.trim() || "Novo produto", price: Number.isFinite(parsed) ? parsed : 0, sizes: sizes.split(",").map((s) => s.trim()).filter(Boolean), image: initial?.image ?? null });
  }}>
    <label className="grid gap-1.5 text-sm font-bold">Nome<input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do produto" className="h-11 rounded-lg border border-input bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring" /></label>
    <label className="grid gap-1.5 text-sm font-bold">Preço (R$)<input required value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0,00" className="h-11 rounded-lg border border-input bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring" /></label>
    <label className="grid gap-1.5 text-sm font-bold">Tamanhos / opções<input required value={sizes} onChange={(e) => setSizes(e.target.value)} placeholder="P, M, G, GG" className="h-11 rounded-lg border border-input bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring" /></label>
    <div className="flex items-end gap-2"><Button type="submit">Salvar</Button><Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button></div>
  </form>;
}

function Metric({ icon: Icon, label, value, hint }: { icon: typeof CircleDollarSign; label: string; value: string; hint: string }) {
  return <article className="rounded-xl border border-border bg-card p-4 sm:p-5"><Icon size={21} className="text-gold" /><p className="mt-4 text-xs font-bold uppercase text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-extrabold">{value}</p><p className="mt-1 text-xs font-semibold text-success">{hint}</p></article>;
}
function Production({ label, total, parts, pct }: { label: string; total: string; parts: string; pct: string }) {
  return <div><div className="flex justify-between text-sm font-bold"><span>{label}</span><span>{total}</span></div><p className="mt-1 text-xs text-muted-foreground">{parts}</p><div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-gold" style={{ width: pct }} /></div></div>;
}
