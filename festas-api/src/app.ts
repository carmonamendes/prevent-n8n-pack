import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { ZodError } from 'zod';
import { env, corsOrigins } from './env';
import { AppError } from './lib/errors';
import authPlugin from './plugins/auth';
import publicRoutes from './routes/public';
import adminRoutes from './routes/admin';
import webhookRoutes from './routes/webhooks';

export function buildApp() {
  const app = Fastify({
    logger:
      env.NODE_ENV === 'development'
        ? { transport: { target: 'pino-pretty' }, level: 'info' }
        : { level: 'info' },
    trustProxy: true,
  });

  app.register(cors, {
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  });
  app.register(rateLimit, { max: 120, timeWindow: '1 minute' });
  app.register(authPlugin);

  app.get('/health', async () => ({ ok: true, service: 'festas-api', time: new Date().toISOString() }));

  app.register(publicRoutes);
  app.register(adminRoutes);
  app.register(webhookRoutes);

  // Tratamento central de erros → JSON consistente { ok:false, erro }
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      const msg = error.issues[0]?.message || 'Dados inválidos.';
      return reply.code(400).send({ ok: false, erro: msg, detalhes: error.flatten().fieldErrors });
    }
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send({ ok: false, erro: error.message });
    }
    if ((error as { statusCode?: number }).statusCode === 429) {
      return reply.code(429).send({ ok: false, erro: 'Muitas requisições. Tente novamente em instantes.' });
    }
    request.log.error({ err: error }, 'Erro não tratado');
    return reply.code(500).send({ ok: false, erro: 'Erro interno. Tente novamente.' });
  });

  app.setNotFoundHandler((_request, reply) => {
    reply.code(404).send({ ok: false, erro: 'Rota não encontrada.' });
  });

  return app;
}
