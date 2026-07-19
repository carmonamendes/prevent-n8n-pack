import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { getConfig } from '../lib/config';
import { calcularTotais } from '../lib/pricing';
import { diffDias, fromISODate, hojeISO } from '../lib/dates';
import { novoReservaId } from '../lib/ids';
import { num } from '../lib/serialize';
import { AppError, badRequest, conflict, notFound } from '../lib/errors';
import { gerarPixCopiaECola, pixConfigurado } from './pix';
import { criarPreferencia, mpConfigurado } from './mercadopago';
import { notificarDono } from './whatsapp';
import type { CriarReservaInput } from '../schemas';

/** Status que ocupam a data na agenda. */
export const STATUS_OCUPADOS = ['AGUARDANDO_PAGAMENTO', 'PAGO', 'CONCLUIDO'];

const brl = (n: number) => `R$ ${n.toFixed(2).replace('.', ',')}`;

/** Datas indisponíveis (reservas ativas + bloqueios), a partir de hoje. */
export async function datasIndisponiveis(): Promise<string[]> {
  const hoje = fromISODate(hojeISO());
  const [reservas, bloqueios] = await Promise.all([
    prisma.reserva.findMany({
      where: { status: { in: STATUS_OCUPADOS }, dataEvento: { gte: hoje } },
      select: { dataEvento: true },
    }),
    prisma.bloqueio.findMany({ where: { data: { gte: hoje } }, select: { data: true } }),
  ]);
  const set = new Set<string>();
  for (const r of reservas) set.add(r.dataEvento.toISOString().slice(0, 10));
  for (const b of bloqueios) set.add(b.data.toISOString().slice(0, 10));
  return Array.from(set).sort();
}

export interface ReservaCriada {
  reserva_id: string;
  status: string;
  metodo_pagamento: string;
  valor_total: number;
  resumo: {
    kit_nome: string;
    data_evento: string;
    periodo: string;
    valor_kit: number;
    taxa_entrega: number;
    taxa_montagem: number;
  };
  pagamento:
    | { tipo: 'pix'; pix_copia_cola: string; chave: string; instrucoes: string }
    | { tipo: 'mercadopago'; preference_id: string; init_point: string; instrucoes: string };
}

/**
 * Cria uma reserva de forma transacional: valida data/antecedência,
 * recalcula o total no servidor e gera o pagamento (Pix ou Mercado Pago).
 */
export async function criarReserva(input: CriarReservaInput): Promise<ReservaCriada> {
  const config = await getConfig();

  if (input.metodo_pagamento === 'pix' && !pixConfigurado())
    throw badRequest('Pagamento via Pix indisponível no momento.');
  if (input.metodo_pagamento === 'mercadopago' && !mpConfigurado())
    throw badRequest('Pagamento via cartão indisponível no momento.');

  // Antecedência mínima
  const dias = diffDias(hojeISO(), input.data_evento);
  if (dias < config.antecedenciaMinDias)
    throw badRequest(`Reserve com pelo menos ${config.antecedenciaMinDias} dia(s) de antecedência.`);

  const kit = await prisma.kit.findUnique({ where: { id: input.kit_id } });
  if (!kit || !kit.ativo) throw notFound('Kit indisponível.');

  const totais = calcularTotais(
    {
      taxaMontagem: num(config.taxaMontagem),
      taxaEntregaBase: num(config.taxaEntregaBase),
      taxaEntregaKm: num(config.taxaEntregaKm),
    },
    { precoKit: num(kit.precoLocacao), distanciaKm: input.distancia_km, querMontagem: input.quer_montagem },
  );

  if (input.distancia_km > 0 && !input.endereco)
    throw badRequest('Informe o endereço para entrega.');

  const dataEvento = fromISODate(input.data_evento);

  // Cria a reserva garantindo que a data ainda esteja livre (transação).
  const reserva = await prisma.$transaction(async (tx) => {
    const ocupada = await tx.reserva.findFirst({
      where: { dataEvento, status: { in: STATUS_OCUPADOS } },
      select: { id: true },
    });
    if (ocupada) throw conflict('Essa data acabou de ser reservada. Escolha outra.');

    const bloqueada = await tx.bloqueio.findUnique({ where: { data: dataEvento }, select: { id: true } });
    if (bloqueada) throw conflict('Essa data não está disponível.');

    // Gera id único (retenta em caso improvável de colisão)
    for (let attempt = 0; attempt < 5; attempt++) {
      const id = novoReservaId();
      const existe = await tx.reserva.findUnique({ where: { id }, select: { id: true } });
      if (existe) continue;
      return tx.reserva.create({
        data: {
          id,
          kitId: kit.id,
          kitNome: kit.nome,
          dataEvento,
          periodo: input.periodo,
          clienteNome: input.cliente_nome,
          clienteWhatsapp: input.cliente_whatsapp,
          endereco: input.endereco || null,
          distanciaKm: new Prisma.Decimal(input.distancia_km),
          taxaEntrega: new Prisma.Decimal(totais.taxaEntrega),
          taxaMontagem: new Prisma.Decimal(totais.taxaMontagem),
          valorKit: new Prisma.Decimal(totais.valorKit),
          valorTotal: new Prisma.Decimal(totais.valorTotal),
          metodoPagamento: input.metodo_pagamento,
          status: 'AGUARDANDO_PAGAMENTO',
        },
      });
    }
    throw new AppError('Não foi possível gerar a reserva. Tente novamente.', 500);
  });

  const resumo = {
    kit_nome: kit.nome,
    data_evento: input.data_evento,
    periodo: input.periodo,
    valor_kit: totais.valorKit,
    taxa_entrega: totais.taxaEntrega,
    taxa_montagem: totais.taxaMontagem,
  };

  // Gera o pagamento
  let pagamento: ReservaCriada['pagamento'];
  if (input.metodo_pagamento === 'pix') {
    pagamento = {
      tipo: 'pix',
      pix_copia_cola: gerarPixCopiaECola(totais.valorTotal, reserva.id),
      chave: '',
      instrucoes:
        'Copie o código Pix e pague no app do seu banco. A reserva é confirmada assim que o pagamento for identificado.',
    };
  } else {
    const pref = await criarPreferencia({
      reservaId: reserva.id,
      titulo: `${kit.nome} — locação ${input.data_evento}`,
      valor: totais.valorTotal,
      clienteNome: input.cliente_nome,
    });
    await prisma.reserva.update({ where: { id: reserva.id }, data: { pagamentoId: pref.id } });
    pagamento = {
      tipo: 'mercadopago',
      preference_id: pref.id,
      init_point: pref.init_point,
      instrucoes: 'Você será direcionado ao checkout do Mercado Pago para concluir o pagamento.',
    };
  }

  // Notifica o dono (não bloqueia a resposta)
  void notificarDono(
    `🎈 *NOVA RESERVA* (aguardando pagamento)\n\n` +
      `*Reserva:* ${reserva.id}\n*Kit:* ${kit.nome}\n*Data:* ${input.data_evento} (${input.periodo})\n` +
      `*Cliente:* ${input.cliente_nome} — ${input.cliente_whatsapp}\n` +
      `*Endereço:* ${input.endereco || '—'}\n\n` +
      `*Kit:* ${brl(totais.valorKit)}\n*Entrega:* ${brl(totais.taxaEntrega)}\n*Montagem:* ${brl(totais.taxaMontagem)}\n` +
      `*TOTAL:* ${brl(totais.valorTotal)}\n*Pagamento:* ${input.metodo_pagamento}`,
  );

  return {
    reserva_id: reserva.id,
    status: reserva.status,
    metodo_pagamento: input.metodo_pagamento,
    valor_total: totais.valorTotal,
    resumo,
    pagamento,
  };
}

/** Marca uma reserva como PAGA (idempotente) e notifica. Devolve true se mudou. */
export async function confirmarPagamento(reservaId: string, pagamentoId?: string): Promise<boolean> {
  const reserva = await prisma.reserva.findUnique({ where: { id: reservaId } });
  if (!reserva) return false;
  if (reserva.status === 'PAGO' || reserva.status === 'CONCLUIDO') return false;

  await prisma.reserva.update({
    where: { id: reservaId },
    data: { status: 'PAGO', pagamentoId: pagamentoId ?? reserva.pagamentoId },
  });

  const valor = num(reserva.valorTotal);
  void import('./whatsapp').then(({ enviarWhatsapp }) =>
    enviarWhatsapp(
      reserva.clienteWhatsapp,
      `✅ *Pagamento confirmado!*\n\nOlá ${reserva.clienteNome}, sua reserva do *${reserva.kitNome}* para *${reserva.dataEvento
        .toISOString()
        .slice(0, 10)}* está garantida! 🎉\n\nReserva: ${reserva.id}\nTotal: ${brl(valor)}`,
    ),
  );
  void notificarDono(
    `💰 *RESERVA PAGA*\n\n*Reserva:* ${reserva.id}\n*Kit:* ${reserva.kitNome}\n*Data:* ${reserva.dataEvento
      .toISOString()
      .slice(0, 10)}\n*Cliente:* ${reserva.clienteNome} — ${reserva.clienteWhatsapp}\n*Total:* ${brl(valor)}`,
  );
  return true;
}
