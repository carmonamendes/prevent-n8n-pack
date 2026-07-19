import type { Kit, Reserva, Config, Bloqueio } from '@prisma/client';
import { toISODate } from './dates';

/** Converte Decimal/number/string do Prisma para number. */
export const num = (v: unknown): number => Number(v ?? 0);

export function parseItens(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return arr.map(String).filter(Boolean);
  } catch {
    /* fallback abaixo */
  }
  return String(raw)
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function kitPublico(k: Kit) {
  return {
    id: k.id,
    nome: k.nome,
    tema: k.tema ?? '',
    descricao: k.descricao ?? '',
    preco_locacao: num(k.precoLocacao),
    imagem_url: k.imagemUrl ?? '',
    itens: parseItens(k.itens),
  };
}

export function kitAdmin(k: Kit) {
  return {
    ...kitPublico(k),
    ativo: k.ativo,
    criado_em: k.criadoEm,
    atualizado_em: k.atualizadoEm,
  };
}

export function reservaPublica(r: Reserva) {
  return {
    id: r.id,
    kit_id: r.kitId,
    kit_nome: r.kitNome,
    data_evento: toISODate(r.dataEvento),
    periodo: r.periodo,
    valor_total: num(r.valorTotal),
    metodo_pagamento: r.metodoPagamento,
    status: r.status,
  };
}

export function reservaAdmin(r: Reserva) {
  return {
    ...reservaPublica(r),
    cliente_nome: r.clienteNome,
    cliente_whatsapp: r.clienteWhatsapp,
    endereco: r.endereco ?? '',
    distancia_km: num(r.distanciaKm),
    taxa_entrega: num(r.taxaEntrega),
    taxa_montagem: num(r.taxaMontagem),
    valor_kit: num(r.valorKit),
    pagamento_id: r.pagamentoId ?? '',
    obs: r.obs ?? '',
    criado_em: r.criadoEm,
    atualizado_em: r.atualizadoEm,
  };
}

export function configPublica(c: Config) {
  return {
    nome_negocio: c.nomeNegocio,
    taxa_montagem: num(c.taxaMontagem),
    taxa_entrega_base: num(c.taxaEntregaBase),
    taxa_entrega_km: num(c.taxaEntregaKm),
    antecedencia_min_dias: c.antecedenciaMinDias,
  };
}

export const bloqueioData = (b: Bloqueio) => toISODate(b.data);
