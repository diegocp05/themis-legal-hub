// src/utils/privacy.ts

/**
 * Mascara CPF para exibição pública (LGPD): "12345678901" -> "***.456.789-**"
 */
export function maskCPF(cpf?: string | null): string {
  if (!cpf) return '***.***.***-**';
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return '***.***.***-**';

  return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`;
}

/**
 * Mascara nome completo mantendo o primeiro nome e abreviando os demais (LGPD):
 * "Eduardo Henrique Silva" -> "Eduardo H. S."
 */
export function maskFullName(fullName?: string | null): string {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/);
  const firstName = parts[0] ?? '';
  if (parts.length <= 1) return firstName;

  const prepositions = new Set(['de', 'da', 'do', 'dos', 'das', 'e']);

  const abbreviated = parts
    .slice(1)
    .map((part) => {
      if (prepositions.has(part.toLowerCase())) return null;
      const initial = part.charAt(0);
      return initial ? `${initial.toUpperCase()}.` : null;
    })
    .filter(Boolean)
    .join(' ');

  return `${firstName} ${abbreviated}`.trim();
}

/**
 * Mascara e-mail parcialmente: "eduardo@dominio.com" -> "edu***@dominio.com"
 */
export function maskEmail(email?: string | null): string {
  if (!email || !email.includes('@')) return '';
  const [user = '', domain = ''] = email.split('@');
  if (user.length <= 2) return `${user.charAt(0)}***@${domain}`;
  return `${user.slice(0, 3)}***@${domain}`;
}