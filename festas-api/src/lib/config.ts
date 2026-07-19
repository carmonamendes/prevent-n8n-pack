import { prisma } from '../prisma';
import { env } from '../env';
import type { Config } from '@prisma/client';

/** Busca a configuração do negócio (linha única). Cria a partir do .env se não existir. */
export async function getConfig(): Promise<Config> {
  const existing = await prisma.config.findUnique({ where: { id: 1 } });
  if (existing) return existing;
  return prisma.config.create({
    data: {
      id: 1,
      nomeNegocio: env.NOME_NEGOCIO,
      taxaMontagem: env.TAXA_MONTAGEM,
      taxaEntregaBase: env.TAXA_ENTREGA_BASE,
      taxaEntregaKm: env.TAXA_ENTREGA_KM,
      antecedenciaMinDias: env.ANTECEDENCIA_MIN_DIAS,
    },
  });
}
