import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({ select: { id: true, phone: true } });
  for (const u of users) {
    if (u.phone.startsWith('09')) {
      const normalized = '+63' + u.phone.slice(1);
      await prisma.user.update({ where: { id: u.id }, data: { phone: normalized } });
      console.log(`${u.phone} → ${normalized}`);
    }
  }
  console.log('Done.');
}
main().catch(console.error).finally(() => prisma.$disconnect());
