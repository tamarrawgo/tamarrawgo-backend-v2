import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Admin@1234', 10);

  await prisma.user.upsert({
    where: { phone: '+639000000000' },
    update: {},
    create: {
      phone: '+639000000000',
      email: 'admin@tamarrawgo.com',
      firstName: 'Super',
      lastName: 'Admin',
      passwordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  await prisma.fareConfiguration.upsert({
    where: { id: 'default-fare' },
    update: {},
    create: {
      id: 'default-fare',
      name: 'Standard',
      baseFare: 40,
      ratePerKm: 15,
      ratePerMinute: 2,
      minimumFare: 50,
      peakSurge: 1.5,
      nightSurge: 1.2,
      isActive: true,
    },
  });

  console.log('Seed completed.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
