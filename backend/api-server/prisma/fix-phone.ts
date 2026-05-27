import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  await prisma.user.update({ where: { phone: '+639111111111' }, data: { phone: '09500000001' } });
  console.log('Done');
}
main().catch(console.error).finally(() => prisma.$disconnect());
