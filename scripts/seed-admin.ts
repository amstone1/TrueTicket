/**
 * Admin Account Seeding Script
 *
 * Creates an admin account with full platform access.
 * Run with: npx tsx scripts/seed-admin.ts
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const ADMIN_EMAIL = 'admin@trueticket.me';
const ADMIN_PASSWORD = 'TrueTicket2024!';

async function main() {
  console.log('🔐 Creating admin account...\n');

  // Check if admin already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
  });

  if (existingAdmin) {
    // Update to admin role if not already
    if (existingAdmin.role !== 'ADMIN') {
      await prisma.user.update({
        where: { id: existingAdmin.id },
        data: { role: 'ADMIN' },
      });
      console.log('✅ Updated existing user to ADMIN role');
    } else {
      console.log('ℹ️  Admin account already exists');
    }

    console.log('\n📧 Admin Login Credentials:');
    console.log(`   Email:    ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log('\n🌐 Login at: https://trueticket.me/login');

    return;
  }

  // Hash password
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  // Create admin user
  const admin = await prisma.user.create({
    data: {
      email: ADMIN_EMAIL,
      passwordHash,
      role: 'ADMIN',
      emailVerified: true,
      displayName: 'TrueTicket Admin',
      firstName: 'Admin',
      lastName: 'User',
    },
  });

  console.log('✅ Admin account created successfully!\n');
  console.log('📧 Admin Login Credentials:');
  console.log(`   Email:    ${ADMIN_EMAIL}`);
  console.log(`   Password: ${ADMIN_PASSWORD}`);
  console.log(`   Role:     ADMIN`);
  console.log(`   User ID:  ${admin.id}`);
  console.log('\n🌐 Login at: https://trueticket.me/login');
  console.log('\n⚠️  IMPORTANT: Change this password after first login!');

  // Also create a sample venue for testing
  const existingVenue = await prisma.venue.findFirst({
    where: { name: 'Demo Arena' },
  });

  if (!existingVenue) {
    const venue = await prisma.venue.create({
      data: {
        name: 'Demo Arena',
        address: '123 Main Street',
        city: 'New York',
        state: 'NY',
        country: 'USA',
        zipCode: '10001',
        capacity: 5000,
        timezone: 'America/New_York',
      },
    });
    console.log('\n🏟️  Sample venue created:', venue.name);
  }

  console.log('\n✨ Setup complete! Admin can now:');
  console.log('   - Access all dashboard features');
  console.log('   - Create and manage events');
  console.log('   - Scan tickets at venues');
  console.log('   - View all analytics and royalties');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
