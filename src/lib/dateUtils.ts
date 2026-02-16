import { formatInTimeZone } from 'date-fns-tz';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const BRAZIL_TZ = 'America/Sao_Paulo';

/**
 * Format a date string or Date in America/Sao_Paulo timezone using date-fns format tokens.
 */
export function formatBR(date: string | Date, formatStr: string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return formatInTimeZone(d, BRAZIL_TZ, formatStr, { locale: ptBR });
}

/**
 * Get current ISO timestamp in Brazil timezone (for webhook payloads, etc.)
 */
export function nowBRISO(): string {
  return formatInTimeZone(new Date(), BRAZIL_TZ, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");
}

/**
 * Relative time (e.g. "há 5 min") — timezone-agnostic but kept here for consistency.
 */
export function timeAgoBR(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: false, locale: ptBR });
}

export { BRAZIL_TZ };
