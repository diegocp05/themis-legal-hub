// src/utils/pdfGenerator.ts
import jsPDF from 'jspdf';
import { formatDateExtendedBR } from './dateUtils';

export interface CertificatePayload {
  participantName: string;
  participantCPF?: string;
  eventTitle: string;
  eventDate: string;
  workloadHours: number | string;
  validationCode: string;
  managementName?: string;
  city?: string;
  validationBaseUrl?: string;
}

/**
 * Gera e baixa o Certificado em PDF (A4 Paisagem) com coordenadas fixas,
 * garantindo que no celular o PDF nunca saia cortado ou desconfigurado.
 */
export function generateCertificatePDF(data: CertificatePayload): void {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4', // 297mm x 210mm
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const centerX = pageWidth / 2;

  // 1. Moldura institucional externa e interna
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(1.2);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

  doc.setDrawColor(180, 145, 70);
  doc.setLineWidth(0.5);
  doc.rect(13, 13, pageWidth - 26, pageHeight - 26);

  // 2. Cabeçalho
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(71, 85, 105);
  doc.text('DIRETÓRIO ACADÊMICO DE DIREITO', centerX, 32, { align: 'center' });

  if (data.managementName) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(data.managementName.toUpperCase(), centerX, 38, { align: 'center' });
  }

  doc.setFont('times', 'bold');
  doc.setFontSize(30);
  doc.setTextColor(15, 23, 42);
  doc.text('CERTIFICADO', centerX, 58, { align: 'center' });

  // 3. Corpo do texto com quebra automática
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13);
  doc.setTextColor(51, 65, 85);
  doc.text('Certificamos que', centerX, 74, { align: 'center' });

  const cleanName = data.participantName.trim().toUpperCase();
  doc.setFont('times', 'bold');
  doc.setFontSize(cleanName.length > 38 ? 18 : 22);
  doc.setTextColor(15, 23, 42);
  const nameLines = doc.splitTextToSize(cleanName, pageWidth - 50);
  doc.text(nameLines, centerX, 86, { align: 'center' });

  const afterNameY = 86 + nameLines.length * 8;

  const formattedDate = formatDateExtendedBR(data.eventDate);
  const cpfClause = data.participantCPF ? `, inscrito(a) no CPF sob o nº ${data.participantCPF},` : '';
  const bodyText = `participou do evento "${data.eventTitle}"${cpfClause} realizado em ${formattedDate}, com carga horária total de ${data.workloadHours} hora(s).`;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13);
  doc.setTextColor(51, 65, 85);
  const wrappedBody = doc.splitTextToSize(bodyText, pageWidth - 60);
  doc.text(wrappedBody, centerX, afterNameY + 6, { align: 'center', lineHeightFactor: 1.45 });

  // 4. Local e Data de emissão
  const city = data.city || 'Ribeirão Preto - SP';
  const todayExtended = formatDateExtendedBR(new Date());
  doc.setFontSize(11);
  doc.text(`${city}, ${todayExtended}.`, centerX, 152, { align: 'center' });

  // 5. Linha de Assinatura Institucional
  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.4);
  doc.line(centerX - 45, 174, centerX + 45, 174);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Diretoria Executiva', centerX, 179, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Diretório Acadêmico de Direito', centerX, 183.5, { align: 'center' });

  // 6. Rodapé de Autenticidade
  const baseUrl = data.validationBaseUrl || window.location.origin;
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Código de Autenticidade: ${data.validationCode}  •  Verifique em: ${baseUrl}/validar`,
    centerX,
    193,
    { align: 'center' }
  );

  const safeFileName = cleanName.toLowerCase().replace(/\s+/g, '-');
  doc.save(`certificado-${safeFileName}.pdf`);
}