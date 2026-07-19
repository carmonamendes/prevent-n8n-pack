import { randomBytes } from 'node:crypto';

/** Gera um id de reserva legível: R + AAMMDD + 4 chars aleatórios. Ex: R260719-K3F9 */
export function novoReservaId(now = new Date()): string {
  const yy = String(now.getUTCFullYear()).slice(2);
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  const rand = randomBytes(3)
    .toString('base64')
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase()
    .slice(0, 4)
    .padEnd(4, 'X');
  return `R${yy}${mm}${dd}-${rand}`;
}
