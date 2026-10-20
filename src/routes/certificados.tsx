import { createFileRoute } from "@tanstack/react-router";
import { Award, Download } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { type CertificateData, downloadCertificate } from "@/lib/certificate";
import { formatEventDays, useCertificateEvents } from "@/lib/data";

const searchSchema = z.object({ evento: z.string().optional().catch(undefined) });

export const Route = createFileRoute("/certificados")({
  validateSearch: searchSchema,
  head: () => ({ meta: [
    { title: "Certificados — Sistema Themis" }, { name: "description", content: "Emita o certificado dos eventos do DA de Direito em que você esteve presente." },
    { property: "og:title", content: "Certificados — Sistema Themis" }, { property: "og:description", content: "Baixe seu certificado de participação." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: CertificatesPage,
});

type Result = ({ status: "ok" } & CertificateData) | { status: "unavailable" | "not_found" | "no_attendance" };

const errorText: Record<Exclude<Result["status"], "ok">, string> = {
  unavailable: "O certificado deste evento ainda não foi liberado.",
  not_found: "Não encontramos uma inscrição com esse e-mail e RA neste evento. Confira os dados usados na inscrição.",
  no_attendance: "Encontramos sua inscrição, mas a presença não foi confirmada neste evento. Fale com a diretoria do DA se isso estiver errado.",
};

const input = "h-12 w-full rounded-lg border border-input bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring";

function CertificatesPage() {
  const { evento } = Route.useSearch();
  const { data: events = [], isLoading } = useCertificateEvents();
  const [picked, setPicked] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [ra, setRa] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const eventId = picked ?? events.find((e) => e.slug === evento)?.id ?? events[0]?.id ?? "";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setMessage(null);
    const { data, error } = await supabase.rpc("issue_certificate", { _event_id: eventId, _email: email, _ra: ra });
    const result = data as Result | null;
    if (error || !result) { setBusy(false); return setMessage({ text: "Não foi possível gerar agora. Tente novamente.", ok: false }); }
    if (result.status !== "ok") { setBusy(false); return setMessage({ text: errorText[result.status], ok: false }); }
    try {
      await downloadCertificate(result);
      setMessage({ text: "Pronto! O download do seu certificado começou.", ok: true });
    } catch {
      setMessage({ text: "Não foi possível montar o PDF. Tente novamente.", ok: false });
    }
    setBusy(false);
  };

  return <div className="app-container grid min-h-[70vh] place-items-center py-10">
    <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-sm">
      <span className="grid size-12 place-items-center rounded-lg bg-primary text-gold"><Award size={22} /></span>
      <h1 className="mt-4 text-2xl font-bold">Emita seu certificado</h1>
      <p className="mt-2 text-sm text-muted-foreground">Disponível para quem teve a presença confirmada no evento. Use o mesmo e-mail e RA da inscrição.</p>
      {isLoading ? <div className="mt-6 h-40 animate-pulse rounded-lg bg-muted" /> : events.length === 0
        ? <p className="mt-6 rounded-lg bg-muted p-4 text-center text-sm text-muted-foreground">Nenhum certificado disponível no momento.</p>
        : <form onSubmit={submit} className="mt-6 grid gap-3">
          <label className="grid gap-1.5 text-sm font-bold">Evento
            <select required value={eventId} onChange={(e) => setPicked(e.target.value)} className={input}>
              {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.title} · {formatEventDays(ev)}</option>)}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-bold">E-mail da inscrição<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@exemplo.com" autoComplete="email" className={input} /></label>
          <label className="grid gap-1.5 text-sm font-bold">Número do RA<input required maxLength={30} value={ra} onChange={(e) => setRa(e.target.value)} placeholder="202600000" className={input} /></label>
          {message && <p className={`rounded-lg p-3 text-xs font-bold ${message.ok ? "bg-success-soft text-success" : "bg-destructive/10 text-destructive"}`}>{message.text}</p>}
          <Button size="lg" type="submit" disabled={busy || !eventId} className="mt-1 w-full"><Download /> {busy ? "Gerando..." : "Baixar certificado"}</Button>
        </form>}
    </div>
  </div>;
}
