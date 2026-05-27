import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
const prisma = new PrismaClient();
async function main() {
  const hash = await bcrypt.hash('12345678', 10);
  await prisma.user.update({ where: { phone: '+639466503825' }, data: { passwordHash: hash } });
  console.log('Password reset to: 12345678');
}
main().catch(console.error).finally(() => prisma.$disconnect());
