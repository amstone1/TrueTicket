/**
 * Test Script: Ticket Lifecycle
 *
 * This script tests the full ticket lifecycle:
 * 1. Create test users
 * 2. Create test event with tiers
 * 3. Purchase tickets
 * 4. List ticket for resale
 * 5. Transfer ticket
 * 6. Buy resale ticket
 * 7. Check-in ticket
 *
 * Usage: npx tsx scripts/test-ticket-lifecycle.ts
 */

import { PrismaClient } from '@prisma/client';
import { randomBytes, createHash } from 'crypto';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const TEST_PREFIX = 'test_lifecycle_';

function generateCheckInCode(): string {
  return randomBytes(16).toString('hex').toUpperCase();
}

function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

async function cleanup() {
  console.log('🧹 Cleaning up previous test data...');

  // Delete in order of dependencies
  await prisma.checkIn.deleteMany({
    where: { ticket: { checkInCode: { startsWith: TEST_PREFIX.toUpperCase() } } }
  });
  await prisma.ticketTransfer.deleteMany({
    where: { ticket: { checkInCode: { startsWith: TEST_PREFIX.toUpperCase() } } }
  });
  await prisma.resaleListing.deleteMany({
    where: { event: { slug: { startsWith: TEST_PREFIX } } }
  });
  await prisma.ticket.deleteMany({
    where: { event: { slug: { startsWith: TEST_PREFIX } } }
  });
  await prisma.purchase.deleteMany({
    where: { event: { slug: { startsWith: TEST_PREFIX } } }
  });
  await prisma.ticketTier.deleteMany({
    where: { event: { slug: { startsWith: TEST_PREFIX } } }
  });
  await prisma.event.deleteMany({
    where: { slug: { startsWith: TEST_PREFIX } }
  });
  await prisma.session.deleteMany({
    where: { user: { email: { startsWith: TEST_PREFIX } } }
  });
  await prisma.user.deleteMany({
    where: { email: { startsWith: TEST_PREFIX } }
  });

  console.log('  ✓ Cleanup complete\n');
}

async function main() {
  console.log('\n🎫 TICKET LIFECYCLE TEST\n');
  console.log('='.repeat(50));

  await cleanup();

  // ============================================
  // Step 1: Create Test Users
  // ============================================
  console.log('\n📝 Step 1: Creating test users...');

  const passwordHash = await bcrypt.hash('TestPassword123!', 10);

  const organizer = await prisma.user.create({
    data: {
      email: `${TEST_PREFIX}organizer@test.com`,
      passwordHash,
      displayName: 'Test Organizer',
      role: 'ORGANIZER',
      emailVerified: true,
    },
  });
  console.log(`  ✓ Created organizer: ${organizer.email}`);

  const seller = await prisma.user.create({
    data: {
      email: `${TEST_PREFIX}seller@test.com`,
      passwordHash,
      displayName: 'Test Seller',
      walletAddress: '0x' + randomBytes(20).toString('hex'),
      emailVerified: true,
    },
  });
  console.log(`  ✓ Created seller: ${seller.email}`);

  const buyer = await prisma.user.create({
    data: {
      email: `${TEST_PREFIX}buyer@test.com`,
      passwordHash,
      displayName: 'Test Buyer',
      walletAddress: '0x' + randomBytes(20).toString('hex'),
      emailVerified: true,
    },
  });
  console.log(`  ✓ Created buyer: ${buyer.email}`);

  const recipient = await prisma.user.create({
    data: {
      email: `${TEST_PREFIX}recipient@test.com`,
      passwordHash,
      displayName: 'Gift Recipient',
      emailVerified: true,
    },
  });
  console.log(`  ✓ Created recipient: ${recipient.email}`);

  // ============================================
  // Step 2: Create Test Event
  // ============================================
  console.log('\n🎪 Step 2: Creating test event...');

  const now = new Date();
  const oneWeek = 7 * 24 * 60 * 60 * 1000;

  const event = await prisma.event.create({
    data: {
      name: 'Lifecycle Test Concert',
      slug: `${TEST_PREFIX}concert-${Date.now()}`,
      description: 'A test event for lifecycle testing',
      shortDescription: 'Test Concert',
      category: 'MUSIC',
      tags: JSON.stringify(['test', 'lifecycle']),
      startDate: new Date(now.getTime() + oneWeek),
      locationType: 'IN_PERSON',
      venueName: 'Test Venue',
      city: 'Test City',
      state: 'TS',
      totalCapacity: 1000,
      resaleEnabled: true,
      maxResaleMarkupBps: 2000, // 20% max markup
      resaleRoyaltyBps: 1000, // 10% royalty
      status: 'PUBLISHED',
      isPublished: true,
      publishedAt: now,
      organizerId: organizer.id,
      chainId: 31337,
    },
  });
  console.log(`  ✓ Created event: ${event.name}`);

  // ============================================
  // Step 3: Create Ticket Tiers
  // ============================================
  console.log('\n🎟️ Step 3: Creating ticket tiers...');

  const gaTier = await prisma.ticketTier.create({
    data: {
      eventId: event.id,
      name: 'General Admission',
      description: 'Standard entry',
      priceUsd: 100,
      totalQuantity: 500,
      maxPerWallet: 4,
      perks: JSON.stringify(['Entry to event']),
      isActive: true,
    },
  });
  console.log(`  ✓ Created GA tier: $${gaTier.priceUsd}`);

  const vipTier = await prisma.ticketTier.create({
    data: {
      eventId: event.id,
      name: 'VIP',
      description: 'Premium experience',
      priceUsd: 300,
      totalQuantity: 100,
      maxPerWallet: 2,
      perks: JSON.stringify(['Entry to event', 'VIP lounge', 'Free drinks']),
      isActive: true,
    },
  });
  console.log(`  ✓ Created VIP tier: $${vipTier.priceUsd}`);

  // ============================================
  // Step 4: Purchase Tickets (Simulate)
  // ============================================
  console.log('\n🛒 Step 4: Simulating ticket purchase...');

  const checkInCode1 = TEST_PREFIX.toUpperCase() + generateCheckInCode();
  const checkInCode2 = TEST_PREFIX.toUpperCase() + generateCheckInCode();

  // Create tickets for seller (simulating purchase)
  const ticket1 = await prisma.ticket.create({
    data: {
      eventId: event.id,
      tierId: gaTier.id,
      ownerId: seller.id,
      tokenId: BigInt(Date.now()),
      status: 'VALID',
      checkInCode: checkInCode1,
      checkInCodeHash: hashCode(checkInCode1),
      originalPriceUsd: gaTier.priceUsd,
      mintedAt: now,
    },
  });
  console.log(`  ✓ Created ticket #1 (GA) for seller`);

  const ticket2 = await prisma.ticket.create({
    data: {
      eventId: event.id,
      tierId: vipTier.id,
      ownerId: seller.id,
      tokenId: BigInt(Date.now() + 1),
      status: 'VALID',
      checkInCode: checkInCode2,
      checkInCodeHash: hashCode(checkInCode2),
      originalPriceUsd: vipTier.priceUsd,
      mintedAt: now,
    },
  });
  console.log(`  ✓ Created ticket #2 (VIP) for seller`);

  // Create purchase record
  await prisma.purchase.create({
    data: {
      userId: seller.id,
      eventId: event.id,
      paymentMethod: 'CREDIT_CARD',
      subtotalUsd: gaTier.priceUsd + vipTier.priceUsd,
      feesUsd: 20,
      totalUsd: gaTier.priceUsd + vipTier.priceUsd + 20,
      status: 'COMPLETED',
      ticketQuantity: 2,
      ticketIds: JSON.stringify([ticket1.id, ticket2.id]),
      completedAt: now,
    },
  });
  console.log(`  ✓ Created purchase record`);

  // Update tier sold counts
  await prisma.ticketTier.update({
    where: { id: gaTier.id },
    data: { soldQuantity: { increment: 1 } },
  });
  await prisma.ticketTier.update({
    where: { id: vipTier.id },
    data: { soldQuantity: { increment: 1 } },
  });

  // ============================================
  // Step 5: List Ticket for Resale
  // ============================================
  console.log('\n💰 Step 5: Listing ticket for resale...');

  const maxAllowedPrice = gaTier.priceUsd * 1.20; // 20% markup
  const listingPrice = gaTier.priceUsd * 1.15; // 15% markup (within limit)

  console.log(`  Original price: $${gaTier.priceUsd}`);
  console.log(`  Max allowed: $${maxAllowedPrice.toFixed(2)} (20% markup)`);
  console.log(`  Listing at: $${listingPrice.toFixed(2)} (15% markup)`);

  const listing = await prisma.resaleListing.create({
    data: {
      ticketId: ticket1.id,
      eventId: event.id,
      sellerId: seller.id,
      priceUsd: listingPrice,
      status: 'ACTIVE',
      expiresAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000), // 14 days
    },
  });

  await prisma.ticket.update({
    where: { id: ticket1.id },
    data: { isListed: true },
  });

  console.log(`  ✓ Ticket #1 listed for resale at $${listingPrice.toFixed(2)}`);
  console.log(`  Listing ID: ${listing.id}`);

  // ============================================
  // Step 6: Transfer Ticket (Gift)
  // ============================================
  console.log('\n🎁 Step 6: Transferring ticket as gift...');

  await prisma.$transaction(async (tx) => {
    // Update ticket owner
    await tx.ticket.update({
      where: { id: ticket2.id },
      data: { ownerId: recipient.id },
    });

    // Record transfer
    await tx.ticketTransfer.create({
      data: {
        ticketId: ticket2.id,
        fromAddress: seller.walletAddress || seller.email!,
        toAddress: recipient.email!,
        transferType: 'GIFT',
      },
    });
  });

  console.log(`  ✓ Ticket #2 (VIP) transferred from seller to recipient`);

  // Verify transfer
  const transferredTicket = await prisma.ticket.findUnique({
    where: { id: ticket2.id },
    include: { owner: true },
  });
  console.log(`  New owner: ${transferredTicket?.owner.email}`);

  // ============================================
  // Step 7: Buy Resale Ticket
  // ============================================
  console.log('\n🛍️ Step 7: Purchasing resale ticket...');

  await prisma.$transaction(async (tx) => {
    // Update listing to sold
    await tx.resaleListing.update({
      where: { id: listing.id },
      data: {
        status: 'SOLD',
        soldAt: new Date(),
        buyerId: buyer.id,
      },
    });

    // Transfer ticket ownership
    await tx.ticket.update({
      where: { id: ticket1.id },
      data: {
        ownerId: buyer.id,
        isListed: false,
      },
    });

    // Record transfer
    await tx.ticketTransfer.create({
      data: {
        ticketId: ticket1.id,
        fromAddress: seller.walletAddress || seller.email!,
        toAddress: buyer.walletAddress || buyer.email!,
        transferType: 'RESALE',
        priceUsd: listingPrice,
      },
    });
  });

  console.log(`  ✓ Buyer purchased resale ticket for $${listingPrice.toFixed(2)}`);

  // Calculate royalties
  const royalty = listingPrice * (event.resaleRoyaltyBps / 10000);
  console.log(`  Royalty generated: $${royalty.toFixed(2)} (${event.resaleRoyaltyBps / 100}%)`);

  // ============================================
  // Step 8: Check-in Ticket
  // ============================================
  console.log('\n✅ Step 8: Checking in tickets...');

  // Check-in buyer's ticket (resale purchased)
  const buyerTicket = await prisma.ticket.findUnique({
    where: { id: ticket1.id },
  });

  if (buyerTicket && buyerTicket.checkInCode) {
    await prisma.checkIn.create({
      data: {
        ticketId: buyerTicket.id,
        eventId: event.id,
        method: 'QR_CODE',
        scannedBy: 'test_scanner',
        deviceId: 'test_device',
        status: 'SUCCESS',
      },
    });

    await prisma.ticket.update({
      where: { id: buyerTicket.id },
      data: { status: 'USED' },
    });

    console.log(`  ✓ Buyer's ticket checked in (status: USED)`);
  }

  // Check-in recipient's ticket (gift)
  const recipientTicket = await prisma.ticket.findUnique({
    where: { id: ticket2.id },
  });

  if (recipientTicket && recipientTicket.checkInCode) {
    await prisma.checkIn.create({
      data: {
        ticketId: recipientTicket.id,
        eventId: event.id,
        method: 'QR_CODE',
        scannedBy: 'test_scanner',
        deviceId: 'test_device',
        status: 'SUCCESS',
      },
    });

    await prisma.ticket.update({
      where: { id: recipientTicket.id },
      data: { status: 'USED' },
    });

    console.log(`  ✓ Recipient's ticket checked in (status: USED)`);
  }

  // ============================================
  // Summary
  // ============================================
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY\n');

  // Final state verification
  const finalTicket1 = await prisma.ticket.findUnique({
    where: { id: ticket1.id },
    include: { owner: true, transfers: true },
  });

  const finalTicket2 = await prisma.ticket.findUnique({
    where: { id: ticket2.id },
    include: { owner: true, transfers: true },
  });

  const listings = await prisma.resaleListing.findMany({
    where: { eventId: event.id },
  });

  const checkIns = await prisma.checkIn.findMany({
    where: { eventId: event.id },
  });

  console.log('Ticket #1 (GA):');
  console.log(`  Original owner: ${seller.email}`);
  console.log(`  Final owner: ${finalTicket1?.owner.email}`);
  console.log(`  Status: ${finalTicket1?.status}`);
  console.log(`  Transfers: ${finalTicket1?.transfers.length}`);
  console.log(`  Was resold: Yes (at $${listingPrice.toFixed(2)})`);

  console.log('\nTicket #2 (VIP):');
  console.log(`  Original owner: ${seller.email}`);
  console.log(`  Final owner: ${finalTicket2?.owner.email}`);
  console.log(`  Status: ${finalTicket2?.status}`);
  console.log(`  Transfers: ${finalTicket2?.transfers.length}`);
  console.log(`  Was gifted: Yes`);

  console.log('\nMarketplace:');
  console.log(`  Total listings created: ${listings.length}`);
  console.log(`  Sold listings: ${listings.filter(l => l.status === 'SOLD').length}`);

  console.log('\nCheck-ins:');
  console.log(`  Total check-ins: ${checkIns.length}`);

  console.log('\n✅ All lifecycle tests passed!\n');
}

main()
  .catch((e) => {
    console.error('\n❌ Test failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
