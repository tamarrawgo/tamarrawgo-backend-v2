import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
const prisma = new PrismaClient();
async function main() {
  const hash = await bcrypt.hash('Admin@1234', 10);
  await prisma.user.update({
    where: { phone: '+639171234567' },
    data: { passwordHash: hash },
  });
  console.log('Admin password reset to Admin@1234');
}
main().catch(console.error).finally(() => prisma.$disconnect());
