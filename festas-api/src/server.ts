import { buildApp } from './app';
import { env } from './env';
import { prisma } from './prisma';

async function main() {
  const app = buildApp();

  const shutdown = async (signal: string) => {
    app.log.info(`Recebido ${signal}, encerrando…`);
    await app.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  try {
    await prisma.$connect();
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
  } catch (err) {
    app.log.error({ err }, 'Falha ao iniciar a API');
    process.exit(1);
  }
}

void main();
