import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatEventDays, slugify } from "@/lib/data";

export type CertificateData = {
  name: string;
  ra: string;
  event_title: string;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  hours: number | null;
};

const INK: [number, number, number] = [28, 28, 28];
const GOLD: [number, number, number] = [184, 150, 60];
const MUTED: [number, number, number] = [110, 110, 110];

const hoursText = (h: number) => `${String(h).replace(".", ",")} hora${h === 1 ? "" : "s"}`;

/** Builds the A4 landscape certificate in the browser and starts the download. */
export async function downloadCertificate(c: CertificateData) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W = 297;
  const H = 210;
  const cx = W / 2;

  doc.setFillColor(...INK);
  doc.rect(0, 0, W, H, "F");
  doc.setFillColor(255, 255, 255);
  doc.rect(10, 10, W - 20, H - 20, "F");
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.8);
  doc.rect(15, 15, W - 30, H - 30);
  doc.setLineWidth(0.3);
  doc.rect(17.5, 17.5, W - 35, H - 35);

  // jsPDF's center alignment ignores charSpace, so spaced titles are centered by hand.
  const spaced = (text: string, y: number, charSpace: number) => {
    const width = doc.getTextWidth(text) + charSpace * (text.length - 1);
    doc.text(text, cx - width / 2, y, { charSpace });
  };

  doc.setTextColor(...GOLD);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  spaced("DIRETÓRIO ACADÊMICO DE DIREITO", 38, 1.5);

  doc.setTextColor(...INK);
  doc.setFont("times", "bold");
  doc.setFontSize(40);
  spaced("CERTIFICADO", 58, 2);
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.6);
  doc.line(cx - 30, 64, cx + 30, 64);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.setTextColor(...MUTED);
  doc.text("Certificamos que", cx, 80, { align: "center" });

  doc.setFont("times", "bold");
  doc.setFontSize(30);
  doc.setTextColor(...INK);
  doc.text(c.name, cx, 96, { align: "center", maxWidth: W - 60 });

  const when = formatEventDays(c);
  const year = format(new Date(c.starts_at), "yyyy");
  const parts = [
    `participou do evento “${c.event_title}”, realizado em ${when} de ${year}`,
    c.location ? `, em ${c.location}` : "",
    c.hours ? `, com carga horária de ${hoursText(c.hours)}.` : ".",
  ];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.setTextColor(...INK);
  doc.text(doc.splitTextToSize(parts.join(""), W - 80), cx, 112, { align: "center", lineHeightFactor: 1.5 });

  doc.setDrawColor(...INK);
  doc.setLineWidth(0.3);
  doc.line(cx - 45, 163, cx + 45, 163);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Diretório Acadêmico de Direito", cx, 169, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  doc.text(`Emitido em ${format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: ptBR })} · RA ${c.ra}`, cx, 182, { align: "center" });

  doc.save(`Certificado-${slugify(c.event_title)}-${slugify(c.name)}.pdf`);
}
