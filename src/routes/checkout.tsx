import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Copy, CreditCard, MapPin, QrCode, RefreshCcw, ShieldCheck, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { supabase } from "@/integrations/supabase/client";
import { money } from "@/lib/catalog";
import { useActiveProducts } from "@/lib/data";
import { maskCPF, maskCVV, maskCardExpiry, maskCardNumber, maskPhone } from "@/utils/masks";
import { generatePixPayload } from "@/utils/pixGenerator";

const searchSchema = z.object({ item: z.string().catch("") });
export const Route = createFileRoute("/checkout")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Finalizar pedido — Sistema Têmis" },
      { name: "description", content: "Finalize seu pedido." },
      { property: "og:title", content: "Finalizar pedido — Sistema Têmis" },
      { property: "og:description", content: "Pagamento simples e seguro." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CheckoutPage,
});

const CARD_FEE = 0.0349;

function CheckoutPage() {
  const { item } = Route.useSearch();
  const queryClient = useQueryClient();
  const { data: products, isLoading } = useActiveProducts();
  const { settings } = useSiteSettings();

  const [method, setMethod] = useState<"pix" | "card">("pix");
  const [stage, setStage] = useState<"form" | "paid" | "declined">("form");
  const [consent, setConsent] = useState(false);
  const [copied, setCopied] = useState(false);
  const [installments, setInstallments] = useState(1);
  const [size, setSize] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [orderCode, setOrderCode] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Dados do comprador
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [ra, setRa] = useState("");

  // Dados do cartão (protótipo)
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");

  const product = products?.find((x) => x.id === item && x.status === "disponivel");

  if (isLoading) return <div className="app-container py-12"><div className="h-96 animate-pulse rounded-xl bg-muted" /></div>;
  if (!product) {
    return (
      <div className="app-container grid min-h-[60vh] place-items-center py-12 text-center">
        <div>
          <h1 className="text-2xl font-bold">Produto indisponível</h1>
          <p className="mt-2 text-muted-foreground">Escolha um produto na loja para continuar.</p>
          <Button asChild className="mt-6"><Link to="/produtos">Ir para a loja</Link></Button>
        </div>
      </div>
    );
  }

  const base = Number(product.price);
  const fee = method === "card" ? base * CARD_FEE : 0;
  const total = base + fee;
  const chosenSize = size || (product.sizes.length === 1 ? product.sizes[0] : "");
  const pixKey = settings.pix_key || "00.000.000/0001-00";
  const pixBeneficiary = settings.pix_beneficiary || "Diretório Acadêmico de Direito";
  const pixPayload = generatePixPayload({
    pixKey,
    beneficiary: pixBeneficiary,
    amount: total,
  });

  const handleConfirmOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setErrorMsg("");
    setSubmitting(true);

    const code = `DA-${Math.floor(100000 + Math.random() * 900000)}`;

    // 1. Grava o pedido real na tabela orders
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .insert({
        code,
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        cpf: cpf.replace(/\D/g, ""),
        phone: phone.replace(/\D/g, ""),
        ra: ra.trim(),
        payment_method: method === "card" ? "cartao" : "pix",
        fee,
        total,
        consent_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (orderError || !orderData) {
      setSubmitting(false);
      setErrorMsg("Não foi possível registrar o pedido no momento. Verifique sua conexão e tente novamente.");
      return;
    }

    // 2. Grava o item do pedido em order_items
    await supabase.from("order_items").insert({
      order_id: orderData.id,
      product_id: product.id,
      product_name: product.name,
      size: chosenSize || null,
      quantity: 1,
      unit_price: base,
    });

    setSubmitting(false);
    setOrderCode(code);
    queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
    setStage("paid");
  };

  if (stage === "paid") {
    return (
      <div className="app-container grid min-h-[70vh] place-items-center py-12">
        <div className="max-w-lg text-center">
          <span className="mx-auto grid size-20 place-items-center rounded-full bg-success-soft text-success">
            <CheckCircle2 size={42} />
          </span>
          <h1 className="mt-5 text-3xl font-bold">Pedido registrado!</h1>
          {orderCode && (
            <p className="mt-3 inline-block rounded-lg border border-gold/40 bg-card px-4 py-2 font-mono text-lg font-extrabold text-primary">
              Protocolo: {orderCode}
            </p>
          )}
          <p className="mt-3 text-muted-foreground">
            Seu pedido já aparece no painel da diretoria como <strong>Aguardando pagamento</strong>.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Guarde o código acima para apresentar na retirada presencial na sede do DA assim que o pagamento for confirmado.
          </p>
          <Button asChild size="lg" className="mt-7 w-full"><Link to="/produtos">Voltar para a loja</Link></Button>
        </div>
      </div>
    );
  }

  if (stage === "declined") {
    return (
      <div className="app-container grid min-h-[70vh] place-items-center py-12">
        <div className="max-w-lg text-center">
          <span className="mx-auto grid size-20 place-items-center rounded-full bg-destructive/10 text-destructive">
            <TriangleAlert size={42} />
          </span>
          <h1 className="mt-5 text-3xl font-bold">Pagamento recusado</h1>
          <p className="mt-3 text-muted-foreground">
            A operadora não autorizou a transação (simulação). Verifique os dados do cartão ou escolha Pix. Nenhuma cobrança foi realizada.
          </p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <Button size="lg" variant="outline" onClick={() => setStage("form")}>Tentar novamente</Button>
            <Button size="lg" onClick={() => { setMethod("pix"); setStage("form"); }}>Pagar com Pix</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container py-8 sm:py-12">
      <h1 className="text-3xl font-bold">Finalizar pedido</h1>
      <p className="mt-2 rounded-lg border border-gold/40 bg-card p-3 text-xs font-semibold text-muted-foreground">
        As vendas online oficiais estão em fase final de homologação: os pedidos feitos aqui já são registrados no painel da diretoria para teste.
      </p>
      <form onSubmit={handleConfirmOrder} className="mt-7 grid gap-7 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          {product.sizes.length > 1 && (
            <section className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-lg font-bold">Tamanho</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {product.sizes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSize(s)}
                    className={`h-11 min-w-12 rounded-lg border px-4 text-sm font-bold ${
                      chosenSize === s ? "border-primary bg-navy-soft text-primary" : "border-border bg-background"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </section>
          )}
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-lg font-bold">Seus dados</h2>
            <p className="mt-1 text-xs text-muted-foreground">Cadastro mínimo obrigatório para emissão do pedido.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Nome completo" placeholder="Seu nome" value={fullName} onChange={setFullName} />
              <Field label="E-mail" placeholder="voce@exemplo.com" type="email" value={email} onChange={setEmail} />
              <Field label="CPF" placeholder="000.000.000-00" inputMode="numeric" value={cpf} onChange={(v) => setCpf(maskCPF(v))} />
              <Field label="Celular" placeholder="(16) 90000-0000" type="tel" inputMode="numeric" value={phone} onChange={(v) => setPhone(maskPhone(v))} />
              <Field label="RA (Registro Acadêmico)" placeholder="202600000" inputMode="numeric" value={ra} onChange={setRa} />
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
                <div className="rounded-xl bg-white p-3 shadow-sm">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=4&data=${encodeURIComponent(pixPayload)}`}
                    alt="QR Code PIX da Tesouraria"
                    width={176}
                    height={176}
                    className="size-44 rounded-md"
                  />
                </div>
                <p className="mt-3 text-sm font-bold">Escaneie o QR Code no app do seu banco</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Favorecido: <strong className="text-foreground">{pixBeneficiary}</strong> · Chave: <span className="font-mono">{pixKey}</span>
                </p>
                <div className="mt-4 flex w-full max-w-sm items-center gap-2">
                  <input
                    readOnly
                    value={pixPayload}
                    aria-label="Código Pix Copia e Cola"
                    className="h-11 min-w-0 flex-1 truncate rounded-lg border border-input bg-background px-3 font-mono text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-11 shrink-0"
                    aria-label="Copiar código Pix"
                    onClick={() => {
                      navigator.clipboard?.writeText(pixPayload).catch(() => undefined);
                      setCopied(true);
                      window.setTimeout(() => setCopied(false), 2000);
                    }}
                  >
                    {copied ? <CheckCircle2 size={18} className="text-success" /> : <Copy size={18} />}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-5 grid gap-4">
                <p className="rounded-lg border border-gold/40 bg-background p-3 text-xs text-muted-foreground">
                  <strong>Modo protótipo:</strong> a integração automática com gateway de cartão será ativada junto com a abertura oficial das vendas. Não insira dados reais de cartão agora.
                </p>
                <Field label="Número do cartão" placeholder="0000 0000 0000 0000" inputMode="numeric" value={cardNumber} onChange={(v) => setCardNumber(maskCardNumber(v))} />
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Validade" placeholder="MM/AA" inputMode="numeric" value={cardExpiry} onChange={(v) => setCardExpiry(maskCardExpiry(v))} />
                  <Field label="CVV" placeholder="000" inputMode="numeric" value={cardCvv} onChange={(v) => setCardCvv(maskCVV(v))} />
                </div>
                <label className="grid gap-1.5 text-sm font-bold">
                  Parcelas
                  <select
                    value={installments}
                    onChange={(e) => setInstallments(Number(e.target.value))}
                    className="h-12 rounded-lg border border-input bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring"
                  >
                    {[1, 2, 3].map((n) => (
                      <option key={n} value={n}>
                        {n}x de {money(total / n)}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="rounded-lg bg-muted p-3 text-xs leading-relaxed text-muted-foreground">
                  Juros e taxas da operação (3,49%) são acrescidos ao valor final pago pelo aluno. Nenhum dado do cartão fica armazenado neste site.
                </p>
              </div>
            )}
          </section>
          <section className="space-y-3">
            <Notice icon={RefreshCcw} title="Sem trocas ou devoluções" text="Produtos confeccionados sob encomenda. Confira a grade antes de finalizar: não há devolução por erro na escolha do tamanho." />
            <Notice icon={MapPin} title="Entrega presencial" text="A retirada acontece exclusivamente na sede do DA, mediante apresentação do código do pedido como comprovante." />
          </section>
        </div>
        <aside className="h-fit rounded-xl border border-border bg-card p-5 shadow-sm lg:sticky lg:top-24">
          <h2 className="text-lg font-bold">Resumo</h2>
          <div className="mt-4 space-y-2 border-b border-border pb-4 text-sm">
            <div className="flex justify-between gap-4">
              <span className="font-semibold">{product.name}{chosenSize && ` · ${chosenSize}`}</span>
              <span className="font-bold">{money(base)}</span>
            </div>
            {method === "card" && (
              <div className="flex justify-between gap-4 text-muted-foreground">
                <span>Taxas do cartão (3,49%)</span>
                <span>{money(fee)}</span>
              </div>
            )}
          </div>
          <div className="flex justify-between py-4 text-lg font-extrabold">
            <span>Total</span>
            <span>{money(total)}</span>
          </div>
          <label className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 size-4 accent-gold" />
            <span>
              Li e aceito os <strong className="text-foreground">Termos de Uso</strong> e a <strong className="text-foreground">Política de Privacidade</strong>, e autorizo o uso do meu nome, CPF e e-mail para o processamento deste pedido (LGPD).
            </span>
          </label>
          {errorMsg && <p className="mt-3 rounded-lg bg-destructive/10 p-2.5 text-xs font-bold text-destructive">{errorMsg}</p>}
          <Button size="lg" className="mt-4 w-full" type="submit" disabled={submitting || !consent || (product.sizes.length > 1 && !chosenSize)}>
            {submitting ? "Registrando pedido..." : "Confirmar pedido"}
          </Button>
          {method === "card" && (
            <button type="button" onClick={() => setStage("declined")} className="mt-2 w-full text-center text-xs font-bold text-muted-foreground underline underline-offset-2">
              Simular pagamento recusado
            </button>
          )}
          <p className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck size={15} /> Pedido registrado no Sistema Têmis
          </p>
        </aside>
      </form>
    </div>
  );
}

function Field({
  label,
  placeholder,
  type = "text",
  inputMode,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-bold">
      {label}
      <input
        required
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 rounded-lg border border-input bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring"
        placeholder={placeholder}
      />
    </label>
  );
}

function Method({ active, onClick, icon: Icon, title, subtitle }: { active: boolean; onClick: () => void; icon: typeof QrCode; title: string; subtitle: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-20 flex-col items-center justify-center gap-1 rounded-lg border font-bold ${
        active ? "border-primary bg-navy-soft text-primary" : "border-border bg-background"
      }`}
    >
      <Icon size={23} />
      {title}
      <span className="text-[10px] font-semibold uppercase text-muted-foreground">{subtitle}</span>
    </button>
  );
}

function Notice({ icon: Icon, title, text }: { icon: typeof MapPin; title: string; text: string }) {
  return (
    <div className="flex gap-3 rounded-xl border border-gold/40 bg-card p-4">
      <Icon size={20} className="mt-0.5 shrink-0 text-gold" />
      <div className="text-sm">
        <strong>{title}</strong>
        <p className="mt-0.5 leading-relaxed text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}