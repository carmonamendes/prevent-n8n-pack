import { env } from '../env';

const MP_API = 'https://api.mercadopago.com';

export const mpConfigurado = () => !!env.MP_ACCESS_TOKEN.trim();

interface PreferenceInput {
  reservaId: string;
  titulo: string;
  valor: number;
  clienteNome: string;
}

interface PreferenceResult {
  id: string;
  init_point: string;
}

/** Cria uma preferência de checkout do Mercado Pago e devolve o link de pagamento. */
export async function criarPreferencia(input: PreferenceInput): Promise<PreferenceResult> {
  if (!mpConfigurado()) throw new Error('MP_ACCESS_TOKEN não configurado');

  const body = {
    items: [
      {
        title: input.titulo,
        quantity: 1,
        currency_id: 'BRL',
        unit_price: Number(input.valor.toFixed(2)),
      },
    ],
    external_reference: input.reservaId,
    payer: { name: input.clienteNome },
    back_urls: {
      success: env.MP_URL_SUCESSO || undefined,
      pending: env.MP_URL_PENDENTE || undefined,
      failure: env.MP_URL_ERRO || undefined,
    },
    auto_return: env.MP_URL_SUCESSO ? 'approved' : undefined,
    notification_url: `${env.PUBLIC_API_URL.replace(/\/$/, '')}/webhooks/mercadopago`,
    statement_descriptor: norm(env.NOME_NEGOCIO),
  };

  const res = await fetch(`${MP_API}/checkout/preferences`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.MP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Mercado Pago (preferência) falhou: ${res.status} ${txt}`);
  }
  const data = (await res.json()) as { id: string; init_point?: string; sandbox_init_point?: string };
  return { id: data.id, init_point: data.init_point || data.sandbox_init_point || '' };
}

interface PaymentInfo {
  status: string;
  external_reference: string;
  amount: number;
}

/** Consulta um pagamento no Mercado Pago (usado pelo webhook). */
export async function consultarPagamento(paymentId: string): Promise<PaymentInfo> {
  const res = await fetch(`${MP_API}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${env.MP_ACCESS_TOKEN}` },
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Mercado Pago (consulta) falhou: ${res.status} ${txt}`);
  }
  const p = (await res.json()) as {
    status: string;
    external_reference: string;
    transaction_amount: number;
  };
  return {
    status: p.status,
    external_reference: p.external_reference,
    amount: p.transaction_amount,
  };
}

function norm(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 ]/g, '')
    .slice(0, 22);
}
