import { createFileRoute } from "@tanstack/react-router";
import { Award, Download } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { supabase } from "@/integrations/supabase/client";
import { type CertificateData, downloadCertificate, readSigners } from "@/lib/certificate";
import { formatEventDays, useCertificateEvents } from "@/lib/data";
import { pageText, usePageContent } from "@/lib/pages";
import { maskEmail } from "@/utils/privacy";

const searchSchema = z.object({ evento: z.string().optional().catch(undefined) });

export const Route = createFileRoute("/certificados")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Certificados — Sistema Têmis" },
      { name: "description", content: "Emita o certificado dos eventos do DA de Direito em que você esteve presente." },
      { property: "og:title", content: "Certificados — Sistema Têmis" },
      { property: "og:description", content: "Baixe seu certificado de participação." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CertificatesPage,
});

type HourType = "complementar" | "obrigatoria";
type Result =
  | ({ status: "ok" } & CertificateData)
  | {
      status:
        | "unavailable"
        | "not_found"
        | "no_attendance"
        | "year_restricted"
        | "hours_missing"
        | "signatures_missing"
        | "invalid";
    };

const errorText: Record<Exclude<Result["status"], "ok">, string> = {
  unavailable: "O certificado deste evento ainda não foi liberado.",
  not_found: "Não encontramos uma inscrição com esse e-mail e RA neste evento. Confira os dados usados na inscrição.",
  no_attendance:
    "Encontramos sua inscrição, mas a presença não foi confirmada neste evento. Fale com a diretoria do DA se isso estiver errado.",
  year_restricted: "Do 1º ao 3º ano o certificado sai apenas com horas complementares.",
  hours_missing: "A diretoria ainda não definiu essa quantidade de horas para o evento.",
  signatures_missing: "A diretoria ainda não concluiu as assinaturas deste certificado.",
  invalid: "Confira o ano e o tipo de horas.",
};

const years = [1, 2, 3, 4, 5] as const;

const input =
  "h-12 w-full rounded-lg border border-input bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring";

function CertificatesPage() {
  const { evento } = Route.useSearch();
  const { data: events = [], isLoading } = useCertificateEvents();
  const { data: pages } = usePageContent();
  const { settings } = useSiteSettings();
  const [picked, setPicked] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [ra, setRa] = useState("");
  const [year, setYear] = useState<(typeof years)[number]>(1);
  const [hourType, setHourType] = useState<HourType>("complementar");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const eventId = picked ?? events.find((e) => e.slug === evento)?.id ?? events[0]?.id ?? "";
  const selected = events.find((ev) => ev.id === eventId);
  const canChoose = year >= 4 && selected?.certificate_mandatory_hours != null;
  const chosenType: HourType = canChoose ? hourType : "complementar";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanRa = ra.trim();

    const { data, error } = await supabase.rpc("issue_certificate", {
      _event_id: eventId,
      _email: cleanEmail,
      _ra: cleanRa,
      _year: year,
      _hour_type: chosenType,
    });

    const result = data as Result | null;
    if (error || !result) {
      setBusy(false);
      return setMessage({ text: "Não foi possível gerar agora. Tente novamente.", ok: false });
    }
    if (result.status !== "ok") {
      setBusy(false);
      return setMessage({ text: errorText[result.status], ok: false });
    }
    const signers = readSigners(result.signers);
    if (!signers) {
      setBusy(false);
      return setMessage({ text: "Não foi possível montar o PDF. Tente novamente.", ok: false });
    }
    try {
      await downloadCertificate({
        ...result,
        hours: Number(result.hours),
        hour_type: result.hour_type === "obrigatoria" ? "obrigatoria" : "complementar",
        signers,
      });
      setMessage({
        text: `Pronto! O download do certificado para ${maskEmail(cleanEmail)} começou.`,
        ok: true,
      });
    } catch {
      setMessage({ text: "Não foi possível montar o PDF. Tente novamente.", ok: false });
    }
    setBusy(false);
  };

  return (
    <div className="app-container grid min-h-[70vh] place-items-center py-10">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="grid size-12 place-items-center rounded-lg bg-primary text-gold">
            <Award size={22} />
          </span>
          {settings.current_management && (
            <span className="rounded-md bg-muted px-2.5 py-1 text-[11px] font-bold uppercase text-muted-foreground">
              {settings.current_management}
            </span>
          )}
        </div>

        <h1 className="mt-4 text-2xl font-bold">{pageText(pages, "certificates_title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{pageText(pages, "certificates_text")}</p>

        {isLoading ? (
          <div className="mt-6 h-40 animate-pulse rounded-lg bg-muted" />
        ) : events.length === 0 ? (
          <p className="mt-6 rounded-lg bg-muted p-4 text-center text-sm text-muted-foreground">
            {pageText(pages, "certificates_empty")}
          </p>
        ) : (
          <form onSubmit={submit} className="mt-6 grid gap-3">
            <label className="grid gap-1.5 text-sm font-bold">
              Evento
              <select required value={eventId} onChange={(e) => setPicked(e.target.value)} className={input}>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title} · {formatEventDays(ev)}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-bold">
              E-mail da inscrição
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@exemplo.com"
                autoComplete="email"
                className={input}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-bold">
              Número do RA
              <input
                required
                maxLength={30}
                value={ra}
                onChange={(e) => setRa(e.target.value)}
                placeholder="202600000"
                className={input}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-bold">
              Ano do curso
              <select
                required
                value={year}
                onChange={(e) => setYear(Number(e.target.value) as (typeof years)[number])}
                className={input}
              >
                {years.map((item) => (
                  <option key={item} value={item}>
                    {item}º ano
                  </option>
                ))}
              </select>
            </label>
            {year <= 3 && (
              <p className="text-xs text-muted-foreground">
                Do 1º ao 3º ano o certificado sai com horas complementares
                {selected?.certificate_complementary_hours != null
                  ? ` (${String(selected.certificate_complementary_hours).replace(".", ",")}h)`
                  : ""}
                .
              </p>
            )}
            {year >= 4 && canChoose && (
              <fieldset className="grid gap-2">
                <legend className="text-sm font-bold">Tipo de horas</legend>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="hour-type"
                    checked={hourType === "complementar"}
                    onChange={() => setHourType("complementar")}
                    className="size-4 accent-gold"
                  />
                  Complementares · {String(selected?.certificate_complementary_hours ?? "").replace(".", ",")}h
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="hour-type"
                    checked={hourType === "obrigatoria"}
                    onChange={() => setHourType("obrigatoria")}
                    className="size-4 accent-gold"
                  />
                  Obrigatórias · {String(selected?.certificate_mandatory_hours ?? "").replace(".", ",")}h
                </label>
              </fieldset>
            )}
            {year >= 4 && !canChoose && (
              <p className="text-xs text-muted-foreground">
                As horas obrigatórias ainda não foram definidas para este evento. O certificado sai com as horas complementares.
              </p>
            )}
            {message && (
              <p
                className={`rounded-lg p-3 text-xs font-bold ${
                  message.ok ? "bg-success-soft text-success" : "bg-destructive/10 text-destructive"
                }`}
              >
                {message.text}
              </p>
            )}
            <Button size="lg" type="submit" disabled={busy || !eventId} className="mt-1 w-full">
              <Download /> {busy ? "Gerando..." : "Baixar certificado"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}