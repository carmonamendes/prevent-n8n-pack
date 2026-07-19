import { z } from 'zod';
import { ISO_DATE } from './lib/dates';

export const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(1, 'Informe a senha'),
});

export const criarReservaSchema = z.object({
  kit_id: z.coerce.number().int().positive('Kit inválido'),
  data_evento: z.string().regex(ISO_DATE, 'Data do evento inválida (use AAAA-MM-DD)'),
  periodo: z.enum(['dia', 'manha', 'tarde', 'noite']).default('dia'),
  cliente_nome: z.string().trim().min(2, 'Informe seu nome'),
  cliente_whatsapp: z
    .string()
    .transform((s) => s.replace(/\D/g, ''))
    .refine((s) => s.length >= 10 && s.length <= 13, 'WhatsApp inválido (inclua o DDD)'),
  endereco: z.string().trim().max(300).optional().default(''),
  distancia_km: z.coerce.number().min(0).max(500).default(0),
  quer_montagem: z.coerce.boolean().default(false),
  metodo_pagamento: z.enum(['pix', 'mercadopago']),
});

const kitBase = {
  nome: z.string().trim().min(2, 'Nome obrigatório'),
  tema: z.string().trim().max(80).optional().default(''),
  descricao: z.string().trim().max(2000).optional().default(''),
  preco_locacao: z.coerce.number().min(0, 'Preço inválido'),
  imagem_url: z.string().trim().url('URL de imagem inválida').or(z.literal('')).optional().default(''),
  itens: z.array(z.string().trim()).default([]),
  ativo: z.coerce.boolean().default(true),
};

export const criarKitSchema = z.object(kitBase);
export const atualizarKitSchema = z.object(kitBase).partial();

export const configSchema = z.object({
  nome_negocio: z.string().trim().min(1),
  taxa_montagem: z.coerce.number().min(0),
  taxa_entrega_base: z.coerce.number().min(0),
  taxa_entrega_km: z.coerce.number().min(0),
  antecedencia_min_dias: z.coerce.number().int().min(0).max(365),
});

export const bloqueioSchema = z.object({
  data: z.string().regex(ISO_DATE, 'Data inválida'),
  motivo: z.string().trim().max(200).optional().default(''),
});

export type CriarReservaInput = z.infer<typeof criarReservaSchema>;
export type CriarKitInput = z.infer<typeof criarKitSchema>;
