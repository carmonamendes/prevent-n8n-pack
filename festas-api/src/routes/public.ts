import type { FastifyInstance } from 'fastify';
import { prisma } from '../prisma';
import { getConfig } from '../lib/config';
import { num, kitPublico } from '../lib/serialize';
import { criarReservaSchema } from '../schemas';
import { criarReserva, datasIndisponiveis } from '../services/reservas';
import { pixConfigurado } from '../services/pix';
import { mpConfigurado } from '../services/mercadopago';

export default async function publicRoutes(app: FastifyInstance) {
  // Catálogo + disponibilidade + taxas (consumido pela home do app)
  app.get('/catalogo', async () => {
    const [kits, indisponiveis, config] = await Promise.all([
      prisma.kit.findMany({ where: { ativo: true }, orderBy: { nome: 'asc' } }),
      datasIndisponiveis(),
      getConfig(),
    ]);

    const metodos: string[] = [];
    if (pixConfigurado()) metodos.push('pix');
    if (mpConfigurado()) metodos.push('mercadopago');

    return {
      ok: true,
      nome_negocio: config.nomeNegocio,
      kits: kits.map(kitPublico),
      datas_indisponiveis: indisponiveis,
      taxas: {
        montagem: num(config.taxaMontagem),
        entrega_base: num(config.taxaEntregaBase),
        entrega_km: num(config.taxaEntregaKm),
      },
      antecedencia_min_dias: config.antecedenciaMinDias,
      metodos_pagamento: metodos,
    };
  });

  // Criar reserva + gerar pagamento
  app.post('/reservas', async (request) => {
    const input = criarReservaSchema.parse(request.body);
    const result = await criarReserva(input);
    return { ok: true, ...result };
  });
}
