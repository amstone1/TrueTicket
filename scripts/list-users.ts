import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, displayName: true, role: true },
  });
  console.log('\nUsers in database:');
  users.forEach((u, i) => {
    console.log(`  ${i + 1}. ${u.email || 'No email'} - ${u.displayName || 'No name'} (${u.role})`);
    console.log(`     ID: ${u.id}`);
  });
  console.log(`\nTotal: ${users.length} users`);
}

main()
  .finally(() => prisma.$disconnect());
