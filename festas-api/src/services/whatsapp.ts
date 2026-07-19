import { env } from '../env';

export const whatsappConfigurado = () => !!env.EVOLUTION_API_URL.trim();

/**
 * Envia uma mensagem de texto via Evolution API.
 * Nunca lança: falha de notificação não deve quebrar o fluxo de reserva.
 */
export async function enviarWhatsapp(numero: string, texto: string): Promise<boolean> {
  if (!whatsappConfigurado() || !numero) return false;
  try {
    const url = `${env.EVOLUTION_API_URL.replace(/\/$/, '')}/message/sendText/${env.EVOLUTION_INSTANCE}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: env.EVOLUTION_API_KEY },
      body: JSON.stringify({ number: numero, text: texto }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Notifica o dono do negócio (se WA_DONO configurado). */
export const notificarDono = (texto: string) => enviarWhatsapp(env.WA_DONO, texto);
