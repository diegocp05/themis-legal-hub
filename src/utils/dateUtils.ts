// src/utils/dateUtils.ts

/**
 * Converte string YYYY-MM-DD ou ISO para Date ajustado ao meio-dia de Brasília,
 * evitando o deslocamento de -3h (UTC-3) que faz a data voltar 1 dia.
 */
export function parseSafeDate(dateInput?: string | Date | null): Date | null {
  if (!dateInput) return null;
  if (dateInput instanceof Date) {
    return Number.isNaN(dateInput.getTime()) ? null : dateInput;
  }

  const trimmed = dateInput.trim();
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(trimmed)
    ? `${trimmed}T12:00:00-03:00`
    : trimmed;

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Retorna data formatada em DD/MM/AAAA (America/Sao_Paulo)
 */
export function formatDateBR(dateInput?: string | Date | null): string {
  const date = parseSafeDate(dateInput);
  if (!date) return '';

  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

/**
 * Retorna data por extenso para certificados (ex: "16 de novembro de 2026")
 */
export function formatDateExtendedBR(dateInput?: string | Date | null): string {
  const date = parseSafeDate(dateInput ?? new Date());
  if (!date) return '';

  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}