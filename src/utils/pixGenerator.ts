// src/utils/pixGenerator.ts

function crc16CCITT(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function formatEMV(id: string, value: string): string {
  const len = String(value.length).padStart(2, "0");
  return `${id}${len}${value}`;
}

function normalizeText(text: string, maxLen: number): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .trim()
    .slice(0, maxLen)
    .toUpperCase();
}

/**
 * Gera um payload PIX Copia e Cola válido (padrão EMV BACEN)
 * com chave PIX, beneficiário, cidade e valor exato.
 */
export function generatePixPayload({
  pixKey,
  beneficiary,
  city = "RIBEIRAO PRETO",
  amount,
  txid = "THEMISDA",
}: {
  pixKey: string;
  beneficiary: string;
  city?: string;
  amount: number;
  txid?: string;
}): string {
  const cleanKey = pixKey.trim();
  const cleanName = normalizeText(beneficiary || "DIRETORIO ACADEMICO", 25) || "DIRETORIO ACADEMICO";
  const cleanCity = normalizeText(city, 15) || "RIBEIRAO PRETO";
  const cleanTxid = normalizeText(txid, 25).replace(/\s+/g, "") || "***";

  const merchantAccount =
    formatEMV("00", "br.gov.bcb.pix") + formatEMV("01", cleanKey);

  const payloadWithoutCRC =
    formatEMV("00", "01") +
    formatEMV("26", merchantAccount) +
    formatEMV("52", "0000") +
    formatEMV("53", "986") +
    (amount > 0 ? formatEMV("54", amount.toFixed(2)) : "") +
    formatEMV("58", "BR") +
    formatEMV("59", cleanName) +
    formatEMV("60", cleanCity) +
    formatEMV("62", formatEMV("05", cleanTxid)) +
    "6304";

  return `${payloadWithoutCRC}${crc16CCITT(payloadWithoutCRC)}`;
}