import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Copy, CreditCard, MapPin, QrCode, RefreshCcw, ShieldCheck, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { FakeQrCode } from "@/components/qr-code";
import { money, products } from "@/lib/catalog";

const searchSchema = z.object({ item: z.string().catch("camiseta") });
export const Route = createFileRoute("/checkout")({ validateSearch: (search) => searchSchema.parse(search), head: () => ({ meta: [
  { title: "Finalizar pedido — Sistema Themis" }, { name: "description", content: "Finalize seu pedido ou inscrição." }, { property: "og:title", content: "Finalizar pedido — Sistema Themis" }, { property: "og:description", content: "Pagamento simples e seguro." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
] }), component: CheckoutPage });

const CARD_FEE = 0.0349;
const PIX_CODE = "00020126580014BR.GOV.BCB.PIX0136themis-da-direito-20265204000053039865802BR5913DA DIREITO6009RIBEIRAO62070503***6304A1F2";

function CheckoutPage() {
  const { item } = Route.useSearch();
  const [method, setMethod] = useState<"pix" | "card">("pix");
  const [stage, setStage] = useState<"form" | "paid" | "declined">("form");
  const [consent, setConsent] = useState(false);
  const [copied, setCopied] = useState(false);
  const [installments, setInstallments] = useState(1);
  const isEvent = item.startsWith("evento");
  const product = products.find((x) => x.id === item);
  const title = isEvent ? "Semana Jurídica 2026" : (product?.name ?? "Camiseta Themis");
  const base = isEvent ? (item === "evento-dia" ? 15 : 35) : (product?.price ?? 69.9);
  const fee = method === "card" ? base * CARD_FEE : 0;
  const total = base + fee;

  if (stage === "paid") return <div className="app-container grid min-h-[70vh] place-items-center py-12"><div className="max-w-lg text-center"><span className="mx-auto grid size-20 place-items-center rounded-full bg-success-soft text-success"><CheckCircle2 size={42} /></span><h1 className="mt-5 text-3xl font-bold">Pagamento aprovado!</h1><p className="mt-3 text-muted-foreground">Seu {isEvent ? "ingresso" : "pedido"} já está com status <strong className="text-foreground">Pago</strong> e disponível na Área do Aluno.</p>{!isEvent && <p className="mt-2 text-sm text-muted-foreground">Você recebe um aviso quando o lote estiver liberado para retirada presencial na sede do DA.</p>}<Button asChild size="lg" className="mt-7 w-full"><Link to="/perfil">Acompanhar agora</Link></Button></div></div>;

  if (stage === "declined") return <div className="app-container grid min-h-[70vh] place-items-center py-12"><div className="max-w-lg text-center"><span className="mx-auto grid size-20 place-items-center rounded-full bg-destructive/10 text-destructive"><TriangleAlert size={42} /></span><h1 className="mt-5 text-3xl font-bold">Pagamento recusado</h1><p className="mt-3 text-muted-foreground">A operadora não autorizou a transação. Verifique os dados do cartão ou escolha outra forma de pagamento. Nenhuma cobrança foi realizada.</p><div className="mt-7 grid gap-3 sm:grid-cols-2"><Button size="lg" variant="outline" onClick={() => setStage("form")}>Tentar novamente</Button><Button size="lg" onClick={() => { setMethod("pix"); setStage("form"); }}>Pagar com Pix</Button></div></div></div>;

  return <div className="app-container py-8 sm:py-12">
    <h1 className="text-3xl font-bold">Finalizar {isEvent ? "inscrição" : "pedido"}</h1>
    <form onSubmit={(e) => { e.preventDefault(); setStage("paid"); }} className="mt-7 grid gap-7 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-6">
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg font-bold">Seus dados</h2>
          <p className="mt-1 text-xs text-muted-foreground">Cadastro mínimo obrigatório para emissão do pedido.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Nome completo" placeholder="Seu nome" />
            <Field label="E-mail" placeholder="voce@exemplo.com" type="email" />
            <Field label="CPF" placeholder="000.000.000-00" />
            <Field label="Celular" placeholder="(16) 90000-0000" type="tel" />
            <Field label="RA (Registro Acadêmico)" placeholder="202600000" />
          </div>
        </section>
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg font-bold">Forma de pagamento</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Method active={method === "pix"} onClick={() => setMethod("pix")} icon={QrCode} title="Pix" subtitle="Aprovação imediata" />
            <Method active={method === "card"} onClick={() => setMethod("card")} icon={CreditCard} title="Cartão" subtitle="+ taxas da operadora" />
          </div>
          {method === "pix" ? (
            <div className="mt-5 flex flex-col items-center rounded-lg bg-muted p-5 text-center">
              <FakeQrCode />
              <p className="mt-3 text-sm font-bold">Escaneie para pagar</p>
              <p className="mt-1 text-xs text-muted-foreground">QR Code demonstrativo · válido por 15 minutos</p>
              <div className="mt-4 flex w-full max-w-sm items-center gap-2">
                <input readOnly value={PIX_CODE} aria-label="Código Pix copia e cola" className="h-11 min-w-0 flex-1 truncate rounded-lg border border-input bg-background px-3 text-xs" />
                <Button type="button" variant="outline" size="icon" className="size-11 shrink-0" aria-label="Copiar código Pix" onClick={() => { navigator.clipboard?.writeText(PIX_CODE).catch(() => undefined); setCopied(true); window.setTimeout(() => setCopied(false), 2000); }}>{copied ? <CheckCircle2 size={18} className="text-success" /> : <Copy size={18} />}</Button>
              </div>
            </div>
          ) : (
            <div className="mt-5 grid gap-4">
              <Field label="Número do cartão" placeholder="0000 0000 0000 0000" />
              <div className="grid grid-cols-2 gap-4"><Field label="Validade" placeholder="MM/AA" /><Field label="CVV" placeholder="000" /></div>
              <label className="grid gap-1.5 text-sm font-bold">Parcelas
                <select value={installments} onChange={(e) => setInstallments(Number(e.target.value))} className="h-12 rounded-lg border border-input bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring">
                  {[1, 2, 3].map((n) => <option key={n} value={n}>{n}x de {money(total / n)}</option>)}
                </select>
              </label>
              <p className="rounded-lg bg-muted p-3 text-xs leading-relaxed text-muted-foreground">Juros e taxas da operação (3,49%) são acrescidos ao valor final pago pelo aluno. Você também recebe um link de pagamento por e-mail. Nenhum dado do cartão fica armazenado neste site.</p>
            </div>
          )}
        </section>
        {!isEvent && <section className="space-y-3">
          <Notice icon={RefreshCcw} title="Sem trocas ou devoluções" text="Produtos confeccionados sob encomenda (tamanhos PP ao GG). Confira a grade antes de finalizar: não há devolução por erro na escolha do tamanho." />
          <Notice icon={MapPin} title="Entrega presencial" text="A retirada acontece exclusivamente na sede do DA, mediante apresentação do status do pedido e de um documento com foto." />
        </section>}
      </div>
      <aside className="h-fit rounded-xl border border-border bg-card p-5 shadow-sm lg:sticky lg:top-24">
        <h2 className="text-lg font-bold">Resumo</h2>
        <div className="mt-4 space-y-2 border-b border-border pb-4 text-sm">
          <div className="flex justify-between gap-4"><span className="font-semibold">{title}</span><span className="font-bold">{money(base)}</span></div>
          {method === "card" && <div className="flex justify-between gap-4 text-muted-foreground"><span>Taxas do cartão (3,49%)</span><span>{money(fee)}</span></div>}
        </div>
        <div className="flex justify-between py-4 text-lg font-extrabold"><span>Total</span><span>{money(total)}</span></div>
        <label className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 size-4 accent-gold" />
          <span>Li e aceito os <strong className="text-foreground">Termos de Uso</strong> e a <strong className="text-foreground">Política de Privacidade</strong>, e autorizo o uso do meu nome, CPF e e-mail para o processamento deste pedido (LGPD).</span>
        </label>
        <Button size="lg" className="mt-4 w-full" type="submit" disabled={!consent}>Confirmar pagamento</Button>
        {method === "card" && <button type="button" onClick={() => setStage("declined")} className="mt-2 w-full text-center text-xs font-bold text-muted-foreground underline underline-offset-2">Simular pagamento recusado</button>}
        <p className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground"><ShieldCheck size={15} /> Ambiente de pagamento simulado</p>
      </aside>
    </form>
  </div>;
}

function Field({ label, placeholder, type = "text" }: { label: string; placeholder: string; type?: string }) {
  return <label className="grid gap-1.5 text-sm font-bold">{label}<input required type={type} className="h-12 rounded-lg border border-input bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring" placeholder={placeholder} /></label>;
}
function Method({ active, onClick, icon: Icon, title, subtitle }: { active: boolean; onClick: () => void; icon: typeof QrCode; title: string; subtitle: string }) {
  return <button type="button" onClick={onClick} className={`flex h-20 flex-col items-center justify-center gap-1 rounded-lg border font-bold ${active ? "border-primary bg-navy-soft text-primary" : "border-border bg-background"}`}><Icon size={23} />{title}<span className="text-[10px] font-semibold uppercase text-muted-foreground">{subtitle}</span></button>;
}
function Notice({ icon: Icon, title, text }: { icon: typeof MapPin; title: string; text: string }) {
  return <div className="flex gap-3 rounded-xl border border-gold/40 bg-card p-4"><Icon size={20} className="mt-0.5 shrink-0 text-gold" /><div className="text-sm"><strong>{title}</strong><p className="mt-0.5 leading-relaxed text-muted-foreground">{text}</p></div></div>;
}
