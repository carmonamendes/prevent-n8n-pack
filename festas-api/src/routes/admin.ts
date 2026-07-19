import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma';
import { getConfig } from '../lib/config';
import {
  kitAdmin,
  reservaAdmin,
  configPublica,
  bloqueioData,
  num,
} from '../lib/serialize';
import { fromISODate } from '../lib/dates';
import { badRequest, conflict, notFound, unauthorized } from '../lib/errors';
import {
  loginSchema,
  criarKitSchema,
  atualizarKitSchema,
  configSchema,
  bloqueioSchema,
} from '../schemas';
import { enviarWhatsapp } from '../services/whatsapp';

export default async function adminRoutes(app: FastifyInstance) {
  // ── Login (público) ──────────────────────────────────────────
  app.post('/auth/login', async (request) => {
    const { email, senha } = loginSchema.parse(request.body);
    const admin = await prisma.admin.findUnique({ where: { email: email.toLowerCase() } });
    if (!admin) throw unauthorized('E-mail ou senha incorretos.');
    const ok = await bcrypt.compare(senha, admin.senhaHash);
    if (!ok) throw unauthorized('E-mail ou senha incorretos.');
    const token = await app.jwt.sign({ sub: admin.id, email: admin.email, nome: admin.nome ?? '' });
    return { ok: true, token, admin: { email: admin.email, nome: admin.nome ?? '' } };
  });

  // ── Tudo abaixo exige autenticação ───────────────────────────
  app.register(async (secured) => {
    secured.addHook('preHandler', app.autenticar);

    secured.get('/admin/me', async (request) => ({ ok: true, admin: request.user }));

    // Dashboard
    secured.get('/admin/dashboard', async () => {
      const [total, aguardando, pagas, canceladas, receitaAgg, proximas] = await Promise.all([
        prisma.reserva.count(),
        prisma.reserva.count({ where: { status: 'AGUARDANDO_PAGAMENTO' } }),
        prisma.reserva.count({ where: { status: 'PAGO' } }),
        prisma.reserva.count({ where: { status: 'CANCELADO' } }),
        prisma.reserva.aggregate({ _sum: { valorTotal: true }, where: { status: { in: ['PAGO', 'CONCLUIDO'] } } }),
        prisma.reserva.findMany({
          where: { status: 'PAGO', dataEvento: { gte: fromISODate(new Date().toISOString().slice(0, 10)) } },
          orderBy: { dataEvento: 'asc' },
          take: 5,
        }),
      ]);
      return {
        ok: true,
        stats: {
          total,
          aguardando,
          pagas,
          canceladas,
          receita: num(receitaAgg._sum.valorTotal),
        },
        proximas: proximas.map(reservaAdmin),
      };
    });

    // ── Config do negócio ──────────────────────────────────────
    secured.get('/admin/config', async () => ({ ok: true, config: configPublica(await getConfig()) }));

    secured.put('/admin/config', async (request) => {
      const c = configSchema.parse(request.body);
      await getConfig(); // garante a linha
      const updated = await prisma.config.update({
        where: { id: 1 },
        data: {
          nomeNegocio: c.nome_negocio,
          taxaMontagem: c.taxa_montagem,
          taxaEntregaBase: c.taxa_entrega_base,
          taxaEntregaKm: c.taxa_entrega_km,
          antecedenciaMinDias: c.antecedencia_min_dias,
        },
      });
      return { ok: true, config: configPublica(updated) };
    });

    // ── Kits (CRUD) ────────────────────────────────────────────
    secured.get('/admin/kits', async () => {
      const kits = await prisma.kit.findMany({ orderBy: { criadoEm: 'desc' } });
      return { ok: true, kits: kits.map(kitAdmin) };
    });

    secured.post('/admin/kits', async (request, reply) => {
      const k = criarKitSchema.parse(request.body);
      const kit = await prisma.kit.create({
        data: {
          nome: k.nome,
          tema: k.tema || null,
          descricao: k.descricao || null,
          precoLocacao: k.preco_locacao,
          imagemUrl: k.imagem_url || null,
          itens: JSON.stringify(k.itens),
          ativo: k.ativo,
        },
      });
      reply.code(201);
      return { ok: true, kit: kitAdmin(kit) };
    });

    secured.patch('/admin/kits/:id', async (request) => {
      const id = Number((request.params as { id: string }).id);
      if (!Number.isInteger(id)) throw badRequest('Id inválido.');
      const exists = await prisma.kit.findUnique({ where: { id } });
      if (!exists) throw notFound('Kit não encontrado.');
      const k = atualizarKitSchema.parse(request.body);
      const kit = await prisma.kit.update({
        where: { id },
        data: {
          ...(k.nome !== undefined ? { nome: k.nome } : {}),
          ...(k.tema !== undefined ? { tema: k.tema || null } : {}),
          ...(k.descricao !== undefined ? { descricao: k.descricao || null } : {}),
          ...(k.preco_locacao !== undefined ? { precoLocacao: k.preco_locacao } : {}),
          ...(k.imagem_url !== undefined ? { imagemUrl: k.imagem_url || null } : {}),
          ...(k.itens !== undefined ? { itens: JSON.stringify(k.itens) } : {}),
          ...(k.ativo !== undefined ? { ativo: k.ativo } : {}),
        },
      });
      return { ok: true, kit: kitAdmin(kit) };
    });

    secured.delete('/admin/kits/:id', async (request) => {
      const id = Number((request.params as { id: string }).id);
      if (!Number.isInteger(id)) throw badRequest('Id inválido.');
      const usados = await prisma.reserva.count({ where: { kitId: id } });
      if (usados > 0)
        throw conflict('Este kit tem reservas e não pode ser excluído. Desative-o para tirá-lo do catálogo.');
      await prisma.kit.delete({ where: { id } });
      return { ok: true };
    });

    // ── Reservas ───────────────────────────────────────────────
    secured.get('/admin/reservas', async (request) => {
      const { status } = request.query as { status?: string };
      const where = status && status !== 'TODAS' ? { status } : {};
      const reservas = await prisma.reserva.findMany({ where, orderBy: { dataEvento: 'desc' } });
      return { ok: true, reservas: reservas.map(reservaAdmin) };
    });

    secured.post('/admin/reservas/:id/confirmar', async (request) => {
      const id = (request.params as { id: string }).id;
      const reserva = await prisma.reserva.findUnique({ where: { id } });
      if (!reserva) throw notFound('Reserva não encontrada.');
      if (reserva.status === 'CANCELADO') throw badRequest('Reserva cancelada não pode ser confirmada.');
      await prisma.reserva.update({
        where: { id },
        data: { status: 'PAGO', obs: `pagamento confirmado (admin) ${new Date().toISOString().slice(0, 16)}` },
      });
      void enviarWhatsapp(
        reserva.clienteWhatsapp,
        `✅ *Reserva confirmada!*\n\nOlá ${reserva.clienteNome}, recebemos seu pagamento. Sua reserva do *${reserva.kitNome}* para *${reserva.dataEvento
          .toISOString()
          .slice(0, 10)}* está garantida! 🎉\n\nReserva: ${reserva.id}`,
      );
      return { ok: true, status: 'PAGO' };
    });

    secured.post('/admin/reservas/:id/cancelar', async (request) => {
      const id = (request.params as { id: string }).id;
      const reserva = await prisma.reserva.findUnique({ where: { id } });
      if (!reserva) throw notFound('Reserva não encontrada.');
      await prisma.reserva.update({
        where: { id },
        data: { status: 'CANCELADO', obs: `cancelada (admin) ${new Date().toISOString().slice(0, 16)}` },
      });
      void enviarWhatsapp(
        reserva.clienteWhatsapp,
        `⚠️ *Reserva cancelada*\n\nOlá ${reserva.clienteNome}, sua reserva ${reserva.id} (${reserva.dataEvento
          .toISOString()
          .slice(0, 10)}) foi cancelada. Qualquer dúvida, fale com a gente.`,
      );
      return { ok: true, status: 'CANCELADO' };
    });

    // ── Bloqueios de data ──────────────────────────────────────
    secured.get('/admin/bloqueios', async () => {
      const bloqueios = await prisma.bloqueio.findMany({ orderBy: { data: 'asc' } });
      return { ok: true, bloqueios: bloqueios.map((b) => ({ data: bloqueioData(b), motivo: b.motivo ?? '' })) };
    });

    secured.post('/admin/bloqueios', async (request) => {
      const b = bloqueioSchema.parse(request.body);
      const data = fromISODate(b.data);
      const existe = await prisma.bloqueio.findUnique({ where: { data } });
      if (existe) throw conflict('Essa data já está bloqueada.');
      await prisma.bloqueio.create({ data: { data, motivo: b.motivo || null } });
      return { ok: true };
    });

    secured.delete('/admin/bloqueios/:data', async (request) => {
      const dataStr = (request.params as { data: string }).data;
      await prisma.bloqueio.deleteMany({ where: { data: fromISODate(dataStr) } });
      return { ok: true };
    });
  });
}
