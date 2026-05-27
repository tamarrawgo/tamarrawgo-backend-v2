import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  // Delete in order to respect foreign key constraints
  await prisma.rating.deleteMany({});
  await prisma.chatMessage.deleteMany({});
  await prisma.tripLocation.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.earning.deleteMany({});
  await prisma.walletTransaction.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.supportTicket.deleteMany({});
  await prisma.riderDocument.deleteMany({});
  await prisma.vehicle.deleteMany({});
  await prisma.riderProfile.deleteMany({});
  await prisma.user.deleteMany({ where: { role: { in: ['PASSENGER', 'RIDER'] } } });

  console.log('✓ All passengers and riders removed.');
  console.log('✓ Admin account preserved.');

  const remaining = await prisma.user.findMany({
    select: { phone: true, firstName: true, role: true, status: true },
  });
  console.log('\nRemaining accounts:');
  for (const u of remaining) console.log(` [${u.role}] ${u.firstName} | ${u.phone} | ${u.status}`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
