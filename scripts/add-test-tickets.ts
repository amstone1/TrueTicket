/**
 * Script to add test tickets to an existing user's account
 * Usage: npx tsx scripts/add-test-tickets.ts <email>
 * Example: npx tsx scripts/add-test-tickets.ts test@example.com
 */

import { PrismaClient } from '@prisma/client';
import { randomBytes, createHash } from 'crypto';

const prisma = new PrismaClient();

function generateCheckInCode(): string {
  return randomBytes(16).toString('hex').toUpperCase();
}

function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

async function main() {
  const email = process.argv[2];

  if (!email) {
    // If no email provided, get the first user in the database
    const firstUser = await prisma.user.findFirst({
      orderBy: { createdAt: 'asc' },
    });

    if (!firstUser) {
      console.error('No users found in database. Please register first.');
      process.exit(1);
    }

    console.log(`No email provided. Using first user: ${firstUser.email || firstUser.id}`);
    return addTicketsToUser(firstUser.id);
  }

  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    console.error(`User with email ${email} not found.`);
    console.log('\nAvailable users:');
    const users = await prisma.user.findMany({
      select: { email: true, displayName: true, id: true },
    });
    users.forEach((u) => console.log(`  - ${u.email || 'No email'} (${u.displayName || u.id})`));
    process.exit(1);
  }

  await addTicketsToUser(user.id);
}

async function addTicketsToUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  console.log(`\n🎫 Adding test tickets to ${user?.email || user?.displayName || userId}...\n`);

  const now = new Date();
  const oneWeek = 7 * 24 * 60 * 60 * 1000;
  const oneMonth = 30 * 24 * 60 * 60 * 1000;

  // Ensure we have events - create if needed
  let events = await prisma.event.findMany({
    where: { status: 'PUBLISHED', isPublished: true },
    include: { ticketTiers: true },
  });

  if (events.length === 0) {
    console.log('📅 No events found. Creating test events...');

    // First, ensure we have an organizer
    let organizer = await prisma.user.findFirst({
      where: { role: 'ORGANIZER' },
    });

    if (!organizer) {
      organizer = await prisma.user.create({
        data: {
          email: 'organizer@trueticket.io',
          displayName: 'TrueTicket Events',
          role: 'ORGANIZER',
          isVerified: true,
        },
      });
    }

    // Create Music Event
    const musicEvent = await prisma.event.create({
      data: {
        name: 'Summer Music Festival 2025',
        slug: 'summer-music-festival-2025',
        description: 'The hottest music festival of the summer! Featuring top artists from around the world.',
        shortDescription: 'Summer Music Festival - 3 Days of Amazing Music',
        category: 'MUSIC',
        tags: JSON.stringify(['music', 'festival', 'summer', 'live']),
        startDate: new Date(now.getTime() + oneMonth),
        endDate: new Date(now.getTime() + oneMonth + 3 * 24 * 60 * 60 * 1000),
        doorsOpen: new Date(now.getTime() + oneMonth - 2 * 60 * 60 * 1000),
        locationType: 'IN_PERSON',
        venueName: 'Central Park',
        venueAddress: 'Central Park',
        city: 'New York',
        state: 'NY',
        country: 'USA',
        postalCode: '10024',
        coverImageUrl: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=1200',
        thumbnailUrl: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400',
        totalCapacity: 50000,
        resaleEnabled: true,
        maxResaleMarkupBps: 2000, // 20% max markup
        resaleRoyaltyBps: 1000,
        status: 'PUBLISHED',
        isPublished: true,
        isFeatured: true,
        publishedAt: now,
        organizerId: organizer.id,
        chainId: 31337,
      },
    });

    // Create tiers for music event
    await prisma.ticketTier.createMany({
      data: [
        {
          eventId: musicEvent.id,
          name: 'General Admission',
          description: 'Access to all stages',
          priceUsd: 99,
          totalQuantity: 30000,
          soldQuantity: 10000,
          maxPerWallet: 6,
          perks: JSON.stringify(['All stage access', 'Festival wristband']),
          isActive: true,
        },
        {
          eventId: musicEvent.id,
          name: 'VIP Pass',
          description: 'Premium viewing areas and exclusive perks',
          priceUsd: 299,
          totalQuantity: 5000,
          soldQuantity: 2000,
          maxPerWallet: 4,
          perks: JSON.stringify(['VIP viewing areas', 'Exclusive merch', 'Fast lane entry', 'VIP lounge access']),
          isActive: true,
        },
      ],
    });

    // Create Sports Event
    const sportsEvent = await prisma.event.create({
      data: {
        name: 'Championship Finals 2025',
        slug: 'championship-finals-2025',
        description: 'The ultimate championship showdown. Watch history in the making!',
        shortDescription: 'Championship Finals - Game Night',
        category: 'SPORTS',
        tags: JSON.stringify(['sports', 'championship', 'finals']),
        startDate: new Date(now.getTime() + 2 * oneWeek),
        endDate: new Date(now.getTime() + 2 * oneWeek + 3 * 60 * 60 * 1000),
        doorsOpen: new Date(now.getTime() + 2 * oneWeek - 2 * 60 * 60 * 1000),
        locationType: 'IN_PERSON',
        venueName: 'Madison Square Garden',
        venueAddress: '4 Pennsylvania Plaza',
        city: 'New York',
        state: 'NY',
        country: 'USA',
        postalCode: '10001',
        coverImageUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1200',
        thumbnailUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400',
        totalCapacity: 19500,
        resaleEnabled: true,
        maxResaleMarkupBps: 1000, // 10% max markup
        resaleRoyaltyBps: 1500,
        status: 'PUBLISHED',
        isPublished: true,
        isFeatured: true,
        publishedAt: now,
        organizerId: organizer.id,
        chainId: 31337,
      },
    });

    // Create tiers for sports event
    await prisma.ticketTier.createMany({
      data: [
        {
          eventId: sportsEvent.id,
          name: 'Upper Level',
          priceUsd: 150,
          totalQuantity: 10000,
          soldQuantity: 4000,
          maxPerWallet: 6,
          isActive: true,
        },
        {
          eventId: sportsEvent.id,
          name: 'Lower Level',
          priceUsd: 450,
          totalQuantity: 5000,
          soldQuantity: 2500,
          maxPerWallet: 4,
          isActive: true,
        },
        {
          eventId: sportsEvent.id,
          name: 'Courtside',
          priceUsd: 2500,
          totalQuantity: 200,
          soldQuantity: 100,
          maxPerWallet: 2,
          isActive: true,
        },
      ],
    });

    // Create Comedy Event
    const comedyEvent = await prisma.event.create({
      data: {
        name: 'Comedy Night Live',
        slug: 'comedy-night-live',
        description: 'A night of non-stop laughter with the best comedians!',
        shortDescription: 'Stand-up Comedy Night',
        category: 'COMEDY',
        tags: JSON.stringify(['comedy', 'stand-up', 'live']),
        startDate: new Date(now.getTime() + 3 * oneWeek),
        doorsOpen: new Date(now.getTime() + 3 * oneWeek - 60 * 60 * 1000),
        locationType: 'IN_PERSON',
        venueName: 'The Comedy Cellar',
        venueAddress: '117 MacDougal St',
        city: 'New York',
        state: 'NY',
        country: 'USA',
        postalCode: '10012',
        coverImageUrl: 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=1200',
        thumbnailUrl: 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=400',
        totalCapacity: 300,
        resaleEnabled: true,
        maxResaleMarkupBps: 1500, // 15% max markup
        status: 'PUBLISHED',
        isPublished: true,
        publishedAt: now,
        organizerId: organizer.id,
        chainId: 31337,
      },
    });

    // Create tiers for comedy event
    await prisma.ticketTier.createMany({
      data: [
        {
          eventId: comedyEvent.id,
          name: 'General Admission',
          priceUsd: 35,
          totalQuantity: 200,
          soldQuantity: 50,
          maxPerWallet: 8,
          isActive: true,
        },
        {
          eventId: comedyEvent.id,
          name: 'Front Row',
          priceUsd: 75,
          totalQuantity: 30,
          soldQuantity: 10,
          maxPerWallet: 4,
          isActive: true,
        },
      ],
    });

    console.log('  ✓ Created 3 test events\n');

    // Refresh events
    events = await prisma.event.findMany({
      where: { status: 'PUBLISHED', isPublished: true },
      include: { ticketTiers: true },
    });
  }

  // Create tickets for the user
  console.log('🎟️  Creating tickets...\n');
  const createdTickets = [];

  for (const event of events.slice(0, 3)) { // Get up to 3 events
    const tier = event.ticketTiers.find((t) => t.isActive);
    if (!tier) continue;

    // Create 2 tickets per event
    for (let i = 0; i < 2; i++) {
      const checkInCode = generateCheckInCode();
      const ticket = await prisma.ticket.create({
        data: {
          eventId: event.id,
          tierId: tier.id,
          ownerId: userId,
          tokenId: BigInt(Date.now() + i),
          contractAddress: event.contractAddress || `0x${randomBytes(20).toString('hex')}`,
          chainId: 31337,
          status: 'VALID',
          checkInCode,
          checkInCodeHash: hashCode(checkInCode),
          originalPriceUsd: tier.priceUsd,
          mintedAt: now,
        },
      });
      createdTickets.push({ ticket, event, tier });
      console.log(`  ✓ Created ${tier.name} ticket for "${event.name}"`);
    }
  }

  // Create a purchase record
  if (createdTickets.length > 0) {
    const firstEvent = createdTickets[0].event;
    await prisma.purchase.create({
      data: {
        userId,
        eventId: firstEvent.id,
        paymentMethod: 'CREDIT_CARD',
        paymentProvider: 'stripe',
        subtotalUsd: createdTickets.reduce((sum, t) => sum + t.tier.priceUsd, 0),
        feesUsd: 10,
        totalUsd: createdTickets.reduce((sum, t) => sum + t.tier.priceUsd, 0) + 10,
        status: 'COMPLETED',
        ticketQuantity: createdTickets.length,
        ticketIds: JSON.stringify(createdTickets.map((t) => t.ticket.id)),
        completedAt: now,
      },
    });
  }

  console.log(`\n✅ Added ${createdTickets.length} tickets to your account!\n`);

  // Show tickets summary
  console.log('Your tickets:');
  for (const { ticket, event, tier } of createdTickets) {
    console.log(`  - ${event.name}`);
    console.log(`    Tier: ${tier.name} | Price: $${tier.priceUsd}`);
    console.log(`    Check-in Code: ${ticket.checkInCode}`);
    console.log(`    Status: ${ticket.status}`);
    console.log('');
  }

  console.log('You can now:');
  console.log('  1. View tickets at /my-tickets');
  console.log('  2. List a ticket for resale on /marketplace');
  console.log('  3. Transfer a ticket to another user');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
