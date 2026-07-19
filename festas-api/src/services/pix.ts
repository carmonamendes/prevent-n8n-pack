import { env } from '../env';

/** Normaliza texto para o padrão do BR Code (sem acento, A-Z0-9 e espaço). */
function norm(value: string, max: number): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 ]/g, '')
    .toUpperCase()
    .trim()
    .slice(0, max);
}

/** Campo EMV no formato TLV (id + comprimento com 2 dígitos + valor). */
function tlv(id: string, value: string): string {
  const len = String(value.length).padStart(2, '0');
  return `${id}${len}${value}`;
}

/** CRC16/CCITT-FALSE, polinômio 0x1021, valor inicial 0xFFFF. */
function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Gera o Pix "Copia e Cola" (BR Code estático) para um valor e identificador.
 * @param valor  valor em reais
 * @param txid   identificador da transação (ex: id da reserva)
 */
export function gerarPixCopiaECola(valor: number, txid: string): string {
  const chave = env.PIX_CHAVE.trim();
  if (!chave) throw new Error('PIX_CHAVE não configurada');

  const nome = norm(env.PIX_NOME, 25) || 'RECEBEDOR';
  const cidade = norm(env.PIX_CIDADE, 15) || 'BRASIL';
  const valorFmt = valor.toFixed(2);
  const txidFmt = norm(txid, 25).replace(/ /g, '') || '***';

  const merchantAccountInfo = tlv('00', 'br.gov.bcb.pix') + tlv('01', chave);

  let payload =
    tlv('00', '01') + // Payload Format Indicator
    tlv('26', merchantAccountInfo) + // Merchant Account Information (Pix)
    tlv('52', '0000') + // Merchant Category Code
    tlv('53', '986') + // Moeda: BRL
    tlv('54', valorFmt) + // Valor
    tlv('58', 'BR') + // País
    tlv('59', nome) + // Nome do recebedor
    tlv('60', cidade) + // Cidade
    tlv('62', tlv('05', txidFmt)); // Additional Data (txid)

  payload += '6304'; // campo CRC + comprimento, antes do cálculo
  return payload + crc16(payload);
}

export const pixConfigurado = () => !!env.PIX_CHAVE.trim();
