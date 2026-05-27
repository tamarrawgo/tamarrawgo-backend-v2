import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const password = 'Rider@1234';
  const passwordHash = await bcrypt.hash(password, 10);

  // Create test rider
  const existing = await prisma.user.findUnique({ where: { phone: '+639111111111' } });
  if (!existing) {
    await prisma.user.create({
      data: {
        phone: '+639111111111',
        email: 'rider@tamarrawgo.com',
        firstName: 'Juan',
        lastName: 'Dela Cruz',
        passwordHash,
        role: 'RIDER',
        status: 'ACTIVE',
        rider: {
          create: {
            licenseNumber: 'N01-23-999888',
            status: 'APPROVED',
            vehicle: {
              create: {
                plateNumber: 'ABC 1234',
                brand: 'Honda',
                model: 'Click 125i',
                year: 2022,
                color: 'Black',
              },
            },
          },
        },
      },
    });
    console.log('✓ Test rider created');
  } else {
    console.log('! Rider already exists, skipping');
  }

  // Also create a test passenger if not exists
  const passengerHash = await bcrypt.hash('Passenger@1234', 10);
  const existingPassenger = await prisma.user.findUnique({ where: { phone: '+639222222222' } });
  if (!existingPassenger) {
    await prisma.user.create({
      data: {
        phone: '+639222222222',
        email: 'passenger@tamarrawgo.com',
        firstName: 'Maria',
        lastName: 'Santos',
        passwordHash: passengerHash,
        role: 'PASSENGER',
        status: 'ACTIVE',
      },
    });
    console.log('✓ Test passenger created');
  } else {
    console.log('! Passenger already exists, skipping');
  }

  // List all accounts
  const users = await prisma.user.findMany({
    select: {
      phone: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      status: true,
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
    if (u.rider) {
      console.log(`  Rider   : ${u.rider.status} | License: ${u.rider.licenseNumber}`);
    }
    console.log();
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
