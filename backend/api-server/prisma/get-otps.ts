import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({
    where: { otpCode: { not: null } },
    select: { phone: true, firstName: true, lastName: true, otpCode: true, otpExpiresAt: true },
  });
  if (users.length === 0) { console.log('No pending OTPs found.'); return; }
  console.log('\n=== PENDING OTPs ===\n');
  for (const u of users) {
    const expired = u.otpExpiresAt && new Date() > u.otpExpiresAt;
    console.log(`${u.firstName} ${u.lastName} | ${u.phone}`);
    console.log(`  OTP     : ${u.otpCode}${expired ? ' (EXPIRED)' : ' ✓ valid'}`);
    console.log(`  Expires : ${u.otpExpiresAt?.toLocaleString()}`);
    console.log();
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
