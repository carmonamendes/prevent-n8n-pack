import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // ── Config do negócio ──────────────────────────────────────
  await prisma.config.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      nomeNegocio: process.env.NOME_NEGOCIO || 'Kit Festas & Arcos',
      taxaMontagem: Number(process.env.TAXA_MONTAGEM || 120),
      taxaEntregaBase: Number(process.env.TAXA_ENTREGA_BASE || 30),
      taxaEntregaKm: Number(process.env.TAXA_ENTREGA_KM || 3.5),
      antecedenciaMinDias: Number(process.env.ANTECEDENCIA_MIN_DIAS || 2),
    },
  });

  // ── Admin inicial ──────────────────────────────────────────
  const email = (process.env.ADMIN_EMAIL || '').toLowerCase();
  const senha = process.env.ADMIN_SENHA || '';
  if (email && senha) {
    const senhaHash = await bcrypt.hash(senha, 10);
    await prisma.admin.upsert({
      where: { email },
      update: { senhaHash, nome: process.env.ADMIN_NOME || 'Administrador' },
      create: { email, senhaHash, nome: process.env.ADMIN_NOME || 'Administrador' },
    });
    console.log(`✔ Admin pronto: ${email}`);
  } else {
    console.log('⚠ ADMIN_EMAIL/ADMIN_SENHA não definidos — nenhum admin criado.');
  }

  // ── Kits de exemplo (só se o catálogo estiver vazio) ───────
  const total = await prisma.kit.count();
  if (total === 0) {
    await prisma.kit.createMany({
      data: [
        {
          nome: 'Kit Circo',
          tema: 'Circo',
          descricao: 'Painel redondo, mesa ripada, torre de doces e suportes. Clima de picadeiro.',
          precoLocacao: 350,
          imagemUrl: '',
          itens: JSON.stringify(['Painel redondo', 'Mesa ripada', 'Torre de doces', '2 suportes de bolo']),
          ativo: true,
        },
        {
          nome: 'Kit Safari',
          tema: 'Safari',
          descricao: 'Decoração safari com folhagens, animais e tons terrosos.',
          precoLocacao: 380,
          imagemUrl: '',
          itens: JSON.stringify(['Painel bosque', 'Mesa principal', 'Bichinhos de pelúcia', 'Folhagens']),
          ativo: true,
        },
        {
          nome: 'Kit Princesas',
          tema: 'Princesas',
          descricao: 'Painel em tons de rosa, castelo e detalhes dourados.',
          precoLocacao: 400,
          imagemUrl: '',
          itens: JSON.stringify(['Painel castelo', 'Mesa provençal', 'Torre de cupcakes', 'Trono infantil']),
          ativo: true,
        },
      ],
    });
    console.log('✔ 3 kits de exemplo criados.');
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
