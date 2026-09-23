import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ChevronRight, LogOut, MapPin, PackageCheck, Settings, UserRound } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FakeQrCode } from "@/components/qr-code";

export const Route = createFileRoute("/perfil")({ head: () => ({ meta: [
  { title: "Área do Aluno — Sistema Themis" }, { name: "description", content: "Acompanhe pedidos e ingressos." }, { property: "og:title", content: "Área do Aluno — Sistema Themis" }, { property: "og:description", content: "Pedidos, produção e ingressos em um só lugar." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
] }), component: ProfilePage });

const steps = [
  { t: "Pagamento aprovado", d: "12 set · status: Pago", done: true },
  { t: "Em produção", d: "Fila do lote · previsão 02 out", done: true },
  { t: "Aguardando retirada no DA", d: "Aguardando liberação do lote", done: false },
  { t: "Entregue", d: "Baixa feita pela diretoria", done: false },
];

function ProfilePage() {
  const [tab, setTab] = useState<"orders" | "tickets">("orders");
  return <div className="app-container py-7 sm:py-11">
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
      <div className="flex min-w-0 items-center gap-3"><span className="grid size-12 shrink-0 place-items-center rounded-full bg-navy-soft text-primary"><UserRound /></span><div className="min-w-0"><p className="truncate text-sm text-muted-foreground">Olá, estudante</p><h1 className="truncate text-2xl font-bold">Marina Oliveira</h1></div></div>
      <button className="grid size-10 place-items-center rounded-lg border border-border bg-card" aria-label="Configurações"><Settings size={19} /></button>
    </header>
    <div className="mt-7 grid grid-cols-2 rounded-lg bg-muted p-1">
      <button onClick={() => setTab("orders")} className={`h-11 rounded-md text-sm font-bold ${tab === "orders" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}>Meus pedidos</button>
      <button onClick={() => setTab("tickets")} className={`h-11 rounded-md text-sm font-bold ${tab === "tickets" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}>Meus ingressos</button>
    </div>
    {tab === "orders" ? <>
      <div className="mt-6 rounded-xl border border-border bg-card p-5 sm:p-7">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4">
          <div><p className="text-xs font-bold uppercase text-muted-foreground">Pedido #THM-1042</p><h2 className="mt-1 text-xl font-bold">Camiseta Themis · M</h2><p className="mt-1 text-sm text-muted-foreground">Realizado em 12 de setembro</p></div>
          <PackageCheck className="text-success" />
        </div>
        <div className="mt-8 space-y-0">
          {steps.map((step, i) => <div key={step.t} className="grid grid-cols-[32px_1fr] gap-3">
            <div className="flex flex-col items-center">
              <span className={`grid size-8 place-items-center rounded-full ${step.done ? "bg-success text-primary-foreground" : "border-2 border-border bg-card text-muted-foreground"}`}>{step.done ? <Check size={17} /> : i + 1}</span>
              {i < steps.length - 1 && <span className={`h-12 w-0.5 ${step.done ? "bg-success" : "bg-border"}`} />}
            </div>
            <div className="pt-1"><p className={`font-bold ${!step.done ? "text-muted-foreground" : ""}`}>{step.t}</p><p className="text-xs text-muted-foreground">{step.d}</p></div>
          </div>)}
        </div>
      </div>
      <p className="mt-4 flex items-start gap-2.5 rounded-lg border border-gold/40 bg-card p-4 text-sm text-muted-foreground"><MapPin size={18} className="mt-0.5 shrink-0 text-gold" /><span><strong className="text-foreground">Retirada presencial:</strong> a entrega acontece exclusivamente na sede do DA. Apresente este status e um documento com foto no momento da retirada.</span></p>
    </> : <div className="mt-6 rounded-xl border border-border bg-card p-5">
      <div className="flex flex-col items-center text-center sm:grid sm:grid-cols-[1fr_auto] sm:text-left">
        <div><span className="inline-flex rounded-full bg-success-soft px-3 py-1 text-xs font-bold text-success">Inscrição confirmada</span><h2 className="mt-3 text-xl font-bold">Semana Jurídica 2026</h2><p className="mt-2 text-sm text-muted-foreground">Passaporte completo · 22–24 de setembro</p><p className="mt-1 text-sm text-muted-foreground">Auditório Central</p><Button asChild variant="outline" className="mt-5"><Link to="/eventos">Ver detalhes <ChevronRight /></Link></Button></div>
        <div className="mt-6 sm:mt-0"><FakeQrCode size="sm" /><p className="mt-2 text-center text-xs font-bold">THM-EV-0284</p></div>
      </div>
    </div>}
    <Button asChild variant="ghost" className="mt-7 text-muted-foreground"><Link to="/"><LogOut /> Sair da área do aluno</Link></Button>
  </div>;
}
