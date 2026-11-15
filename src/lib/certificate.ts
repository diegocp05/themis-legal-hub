import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatEventDays, slugify } from "@/lib/data";

export type CertificateSigner = {
  role: string;
  name: string;
  signature_url: string | null;
};

export type CertificateTemplateFields = {
  da_name: string | null;
  da_signature: string | null;
  coordinator_name: string | null;
  coordinator_signature: string | null;
  athletics_name: string | null;
  athletics_signature: string | null;
};

export type CertificateData = {
  name: string;
  ra: string;
  event_title: string;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  hours: number | null;
  hour_type: "complementar" | "obrigatoria";
  signers: CertificateSigner[];
};

const INK: [number, number, number] = [28, 28, 28];
const GOLD: [number, number, number] = [184, 150, 60];
const MUTED: [number, number, number] = [110, 110, 110];

const hoursText = (h: number) => `${String(h).replace(".", ",")} hora${h === 1 ? "" : "s"}`;

export const certificateRoles = [
  { role: "Presidente do DA", name: "da_name", signature: "da_signature" },
  { role: "Coordenador", name: "coordinator_name", signature: "coordinator_signature" },
  { role: "Presidente da Atlética", name: "athletics_name", signature: "athletics_signature" },
] as const;

export function templateSigners(template: CertificateTemplateFields): CertificateSigner[] {
  return certificateRoles.map((slot) => ({
    role: slot.role,
    name: template[slot.name]?.trim() ?? "",
    signature_url: template[slot.signature],
  }));
}

export function templateReady(template: CertificateTemplateFields | null | undefined) {
  if (!template) return false;
  return templateSigners(template).every((signer) => signer.name.length > 0 && !!signer.signature_url);
}

export function readSigners(value: unknown): CertificateSigner[] | null {
  if (!Array.isArray(value) || value.length !== 3) return null;
  const signers: CertificateSigner[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const row = item as Record<string, unknown>;
    const role = row["role"];
    const name = row["name"];
    const signature = row["signature_url"];
    if (typeof role !== "string" || typeof name !== "string" || typeof signature !== "string") return null;
    if (!role || !name.trim() || !signature) return null;
    signers.push({ role, name: name.trim(), signature_url: signature });
  }
  return signers;
}

/** Sample lines so the board can check the layout before a student downloads. */
export function blankCertificate(signers: CertificateSigner[]): CertificateData {
  return {
    name: "Nome do aluno",
    ra: "0000000",
    event_title: "Nome do evento",
    starts_at: "2026-11-03T15:00:00.000Z",
    ends_at: "2026-11-06T15:00:00.000Z",
    location: "Local do evento",
    hours: 10,
    hour_type: "complementar",
    signers,
  };
}

async function loadSignature(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("signature");
  const bitmap = await createImageBitmap(await response.blob());
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("signature");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  return canvas.toDataURL("image/png");
}

/** Builds the A4 landscape certificate in the browser and starts the download. */
export async function downloadCertificate(c: CertificateData) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W = 297;
  const H = 210;
  const cx = W / 2;
  const images = await Promise.all(c.signers.map((signer) => (signer.signature_url ? loadSignature(signer.signature_url) : Promise.resolve(null))));

  doc.setFillColor(...INK);
  doc.rect(0, 0, W, H, "F");
  doc.setFillColor(255, 255, 255);
  doc.rect(10, 10, W - 20, H - 20, "F");
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.8);
  doc.rect(15, 15, W - 30, H - 30);
  doc.setLineWidth(0.3);
  doc.rect(17.5, 17.5, W - 35, H - 35);

  const spaced = (text: string, y: number, charSpace: number) => {
    const width = doc.getTextWidth(text) + charSpace * (text.length - 1);
    doc.text(text, cx - width / 2, y, { charSpace });
  };
  const fit = (text: string, width: number, size: number, min: number) => {
    let next = size;
    doc.setFontSize(next);
    while (next > min && doc.getTextWidth(text) > width) {
      next -= 0.5;
      doc.setFontSize(next);
    }
  };

  doc.setTextColor(...GOLD);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  spaced("DIRETÓRIO ACADÊMICO DE DIREITO", 36, 1.5);

  doc.setTextColor(...INK);
  doc.setFont("times", "bold");
  doc.setFontSize(36);
  spaced("CERTIFICADO", 54, 2);
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.6);
  doc.line(cx - 28, 59, cx + 28, 59);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(...MUTED);
  doc.text("Certificamos que", cx, 74, { align: "center" });

  doc.setFont("times", "bold");
  doc.setTextColor(...INK);
  fit(c.name, W - 70, 26, 14);
  doc.text(c.name, cx, 88, { align: "center" });

  const when = formatEventDays(c);
  const year = format(new Date(c.starts_at), "yyyy");
  const parts = [
    `participou do evento “${c.event_title}”, realizado em ${when} de ${year}`,
    c.location ? `, em ${c.location}` : "",
    c.hours ? `, com carga horária de ${hoursText(c.hours)} ${c.hour_type === "obrigatoria" ? "obrigatórias" : "complementares"}.` : ".",
  ];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(...INK);
  doc.text(doc.splitTextToSize(parts.join(""), W - 80), cx, 102, { align: "center", lineHeightFactor: 1.35 });

  const centers = [74, cx, 223];
  c.signers.forEach((signer, index) => {
    const center = centers[index] ?? cx;
    const image = images[index];
    if (image) {
      const props = doc.getImageProperties(image);
      const ratio = props.width / Math.max(props.height, 1);
      let width = 46;
      let height = width / ratio;
      if (height > 16) {
        height = 16;
        width = height * ratio;
      }
      doc.addImage(image, "PNG", center - width / 2, 156 - height, width, height);
    }
    doc.setDrawColor(...INK);
    doc.setLineWidth(0.3);
    doc.line(center - 28, 158, center + 28, 158);
    doc.setFont("times", "bold");
    doc.setTextColor(...INK);
    const signerName = signer.name.trim() || "Nome";
    fit(signerName, 56, 11, 8);
    doc.text(signerName, center, 164, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(signer.role, center, 169, { align: "center" });
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(`Emitido em ${format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: ptBR })} · RA ${c.ra}`, cx, 186, { align: "center" });

  doc.save(`Certificado-${slugify(c.event_title)}-${slugify(c.name)}.pdf`);
}
