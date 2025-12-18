/**
 * Test listing a ticket for resale
 * This script lists one of your tickets for resale directly via database
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const userEmail = 'ams10s@gmail.com';

  // Find user
  const user = await prisma.user.findUnique({
    where: { email: userEmail },
  });

  if (!user) {
    console.error(`User ${userEmail} not found`);
    process.exit(1);
  }

  console.log(`\n🎫 Testing resale listing for ${user.displayName || user.email}\n`);

  // Find user's tickets that aren't listed
  const tickets = await prisma.ticket.findMany({
    where: {
      ownerId: user.id,
      status: 'VALID',
      isListed: false,
    },
    include: {
      event: true,
      tier: true,
    },
  });

  if (tickets.length === 0) {
    console.log('No unlisted tickets found for this user.');
    process.exit(0);
  }

  console.log(`Found ${tickets.length} unlisted tickets:\n`);
  tickets.forEach((t, i) => {
    console.log(`  ${i + 1}. ${t.event.name} - ${t.tier.name}`);
    console.log(`     Original price: $${t.tier.priceUsd}`);
    const maxMarkup = t.event.maxResaleMarkupBps ? t.event.maxResaleMarkupBps / 100 : 'unlimited';
    console.log(`     Max markup: ${maxMarkup}%`);
    console.log('');
  });

  // List the first ticket
  const ticketToList = tickets[0];
  const originalPrice = ticketToList.tier.priceUsd;
  const maxResaleMarkup = ticketToList.event.maxResaleMarkupBps || 2000; // Default 20%
  const maxPrice = originalPrice * (1 + maxResaleMarkup / 10000);
  const listPrice = originalPrice * 1.10; // 10% markup (within limits)

  console.log(`📝 Listing ticket for "${ticketToList.event.name}":`);
  console.log(`   Original price: $${originalPrice}`);
  console.log(`   Max allowed price: $${maxPrice.toFixed(2)} (${maxResaleMarkup / 100}% max markup)`);
  console.log(`   Listing price: $${listPrice.toFixed(2)} (10% markup)`);
  console.log('');

  // Create listing
  const listing = await prisma.$transaction(async (tx) => {
    const newListing = await tx.resaleListing.create({
      data: {
        ticketId: ticketToList.id,
        eventId: ticketToList.eventId,
        sellerId: user.id,
        priceUsd: listPrice,
        status: 'ACTIVE',
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
      },
    });

    await tx.ticket.update({
      where: { id: ticketToList.id },
      data: { isListed: true },
    });

    return newListing;
  });

  console.log('✅ Listing created successfully!');
  console.log(`   Listing ID: ${listing.id}`);
  console.log(`   Status: ${listing.status}`);
  console.log(`   Expires: ${listing.expiresAt?.toISOString()}`);
  console.log('');
  console.log('You can now:');
  console.log('  - View the listing at /marketplace');
  console.log('  - See the ticket marked as "Listed" in /my-tickets');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
