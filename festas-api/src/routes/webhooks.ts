import type { FastifyInstance } from 'fastify';
import { consultarPagamento } from '../services/mercadopago';
import { confirmarPagamento } from '../services/reservas';

export default async function webhookRoutes(app: FastifyInstance) {
  // Notificação do Mercado Pago. Responde 200 rápido e processa em seguida.
  app.post('/webhooks/mercadopago', async (request, reply) => {
    const body = (request.body ?? {}) as Record<string, any>;
    const query = (request.query ?? {}) as Record<string, any>;

    const tipo = String(body.type || body.topic || query.type || query.topic || '').toLowerCase();
    const paymentId = body?.data?.id || query['data.id'] || query.id || body.id;

    // Sempre 200 para o MP não reenviar indefinidamente.
    reply.code(200).send({ ok: true });

    if ((tipo && !tipo.includes('payment')) || !paymentId) return;

    try {
      const pago = await consultarPagamento(String(paymentId));
      if (pago.status === 'approved' && pago.external_reference) {
        await confirmarPagamento(pago.external_reference, String(paymentId));
      }
    } catch (err) {
      app.log.error({ err }, 'Falha ao processar webhook do Mercado Pago');
    }
  });
}
