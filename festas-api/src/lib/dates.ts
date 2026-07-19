/** Utilidades de data trabalhando sempre com o formato ISO YYYY-MM-DD (sem fuso). */

export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Converte Date (armazenado como @db.Date) para "YYYY-MM-DD" em UTC. */
export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Cria um Date à meia-noite UTC a partir de "YYYY-MM-DD". */
export function fromISODate(s: string): Date {
  return new Date(`${s}T00:00:00.000Z`);
}

/** "YYYY-MM-DD" de hoje em UTC. */
export function hojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Diferença em dias inteiros entre duas datas ISO (b - a). */
export function diffDias(aISO: string, bISO: string): number {
  const a = fromISODate(aISO).getTime();
  const b = fromISODate(bISO).getTime();
  return Math.round((b - a) / 86_400_000);
}

export function isDataValida(s: string): boolean {
  if (!ISO_DATE.test(s)) return false;
  const d = fromISODate(s);
  return !Number.isNaN(d.getTime()) && toISODate(d) === s;
}
