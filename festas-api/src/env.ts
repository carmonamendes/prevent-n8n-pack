import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  PORT: z.coerce.number().default(3333),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  CORS_ORIGIN: z.string().default('*'),
  PUBLIC_API_URL: z.string().default('http://localhost:3333'),

  DATABASE_URL: z.string(),

  JWT_SECRET: z.string().min(16, 'JWT_SECRET deve ter ao menos 16 caracteres'),
  JWT_EXPIRES_IN: z.string().default('12h'),

  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_SENHA: z.string().optional(),
  ADMIN_NOME: z.string().optional(),

  NOME_NEGOCIO: z.string().default('Ateliê Abelhinha'),
  TAXA_MONTAGEM: z.coerce.number().default(120),
  TAXA_ENTREGA_BASE: z.coerce.number().default(30),
  TAXA_ENTREGA_KM: z.coerce.number().default(3.5),
  ANTECEDENCIA_MIN_DIAS: z.coerce.number().default(2),

  PIX_CHAVE: z.string().default(''),
  PIX_NOME: z.string().default('RECEBEDOR'),
  PIX_CIDADE: z.string().default('BRASIL'),

  MP_ACCESS_TOKEN: z.string().default(''),
  MP_URL_SUCESSO: z.string().default(''),
  MP_URL_PENDENTE: z.string().default(''),
  MP_URL_ERRO: z.string().default(''),

  EVOLUTION_API_URL: z.string().default(''),
  EVOLUTION_INSTANCE: z.string().default('festas'),
  EVOLUTION_API_KEY: z.string().default(''),
  WA_DONO: z.string().default(''),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Variáveis de ambiente inválidas:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const corsOrigins =
  env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(',').map((s) => s.trim());
