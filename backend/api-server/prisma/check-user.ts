import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
const prisma = new PrismaClient();
async function main() {
  const user = await prisma.user.findUnique({
    where: { phone: '+639466503825' },
    select: { phone: true, firstName: true, lastName: true, status: true, passwordHash: true, rider: { select: { status: true } } },
  });
  if (!user) { console.log('User NOT FOUND'); return; }
  console.log('Found:', user.firstName, user.lastName);
  console.log('Status:', user.status);
  console.log('Rider status:', user.rider?.status);
  const match = await bcrypt.compare('12345678', user.passwordHash);
  console.log('Password match:', match);
}
main().catch(console.error).finally(() => prisma.$disconnect());
