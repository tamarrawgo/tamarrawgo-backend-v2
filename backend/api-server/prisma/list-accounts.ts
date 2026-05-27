import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({
    select: {
      phone: true, email: true, firstName: true, lastName: true,
      role: true, status: true,
      rider: { select: { status: true, licenseNumber: true } },
    },
    orderBy: { role: 'asc' },
  });
  console.log('\n=== ALL ACCOUNTS ===\n');
  for (const u of users) {
    console.log(`[${u.role}] ${u.firstName} ${u.lastName}`);
    console.log(`  Phone   : ${u.phone}`);
    console.log(`  Email   : ${u.email ?? '-'}`);
    console.log(`  Status  : ${u.status}`);
    if (u.rider) console.log(`  Rider   : ${u.rider.status} | License: ${u.rider.licenseNumber}`);
    console.log();
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
