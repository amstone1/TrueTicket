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
  console.log('🌱 Seeding database...\n');

  // Clean existing data
  await prisma.checkIn.deleteMany();
  await prisma.ticketTransfer.deleteMany();
  await prisma.resaleListing.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.ticketTier.deleteMany();
  await prisma.eventFavorite.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.payout.deleteMany();
  await prisma.event.deleteMany();
  await prisma.user.deleteMany();

  // ============================================
  // Create Users
  // ============================================
  console.log('👤 Creating users...');

  const admin = await prisma.user.create({
    data: {
      email: 'admin@trueticket.io',
      walletAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      displayName: 'TrueTicket Admin',
      isAdmin: true,
      isVerified: true,
    },
  });

  const venue = await prisma.user.create({
    data: {
      email: 'venue@madisonsg.com',
      walletAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      displayName: 'Madison Square Garden',
      isVenue: true,
      isVerified: true,
      bio: 'The World\'s Most Famous Arena',
    },
  });

  const artist = await prisma.user.create({
    data: {
      email: 'taylor@swift.com',
      walletAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
      displayName: 'Taylor Swift',
      isArtist: true,
      isVerified: true,
      bio: 'Singer-songwriter',
    },
  });

  const buyer1 = await prisma.user.create({
    data: {
      email: 'alice@example.com',
      walletAddress: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
      displayName: 'Alice Fan',
    },
  });

  const buyer2 = await prisma.user.create({
    data: {
      email: 'bob@example.com',
      walletAddress: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
      displayName: 'Bob Concert-Goer',
    },
  });

  console.log(`  ✓ Created ${5} users`);

  // ============================================
  // Create Events
  // ============================================
  console.log('📅 Creating events...');

  const now = new Date();
  const oneWeek = 7 * 24 * 60 * 60 * 1000;
  const oneMonth = 30 * 24 * 60 * 60 * 1000;

  const event1 = await prisma.event.create({
    data: {
      name: 'Taylor Swift - Eras Tour NYC',
      slug: 'taylor-swift-eras-tour-nyc',
      description: 'Experience the magic of Taylor Swift\'s record-breaking Eras Tour at Madison Square Garden. A journey through all musical eras featuring stunning visuals, incredible performances, and unforgettable moments.',
      shortDescription: 'Taylor Swift live at MSG - The Eras Tour',
      category: 'MUSIC',
      tags: JSON.stringify(['pop', 'concert', 'taylor swift', 'eras tour']),
      startDate: new Date(now.getTime() + oneMonth),
      endDate: new Date(now.getTime() + oneMonth + 4 * 60 * 60 * 1000),
      doorsOpen: new Date(now.getTime() + oneMonth - 2 * 60 * 60 * 1000),
      locationType: 'IN_PERSON',
      venueName: 'Madison Square Garden',
      venueAddress: '4 Pennsylvania Plaza',
      city: 'New York',
      state: 'NY',
      country: 'USA',
      postalCode: '10001',
      coverImageUrl: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=1200',
      thumbnailUrl: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=400',
      totalCapacity: 20000,
      resaleEnabled: true,
      maxResaleMarkupBps: 1000, // 10% max markup
      resaleRoyaltyBps: 1000,
      artistWallet: artist.walletAddress,
      venueWallet: venue.walletAddress,
      hostWallet: admin.walletAddress,
      status: 'PUBLISHED',
      isPublished: true,
      isFeatured: true,
      publishedAt: now,
      organizerId: venue.id,
      contractAddress: '0xDa1A2E33BD9E8ae3641A61ab72f137e61A7edf6e',
      chainId: 31337,
      eventIdOnChain: BigInt(1),
    },
  });

  const event2 = await prisma.event.create({
    data: {
      name: 'NBA Finals Game 7',
      slug: 'nba-finals-game-7',
      description: 'The ultimate showdown! Watch history being made as two titans clash in the decisive Game 7 of the NBA Finals.',
      shortDescription: 'NBA Finals Game 7 - Championship Night',
      category: 'SPORTS',
      tags: JSON.stringify(['basketball', 'nba', 'finals', 'sports']),
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
      maxResaleMarkupBps: 500, // 5% max markup (stricter for sports)
      resaleRoyaltyBps: 1500,
      venueWallet: venue.walletAddress,
      hostWallet: admin.walletAddress,
      status: 'PUBLISHED',
      isPublished: true,
      isFeatured: true,
      publishedAt: now,
      organizerId: venue.id,
      chainId: 31337,
    },
  });

  const event3 = await prisma.event.create({
    data: {
      name: 'Comedy Night with Kevin Hart',
      slug: 'kevin-hart-comedy-night',
      description: 'Get ready to laugh until it hurts! Kevin Hart brings his legendary comedy to NYC for one unforgettable night.',
      shortDescription: 'Kevin Hart Live - Stand-up Comedy',
      category: 'COMEDY',
      tags: JSON.stringify(['comedy', 'stand-up', 'kevin hart']),
      startDate: new Date(now.getTime() + 3 * oneWeek),
      doorsOpen: new Date(now.getTime() + 3 * oneWeek - 60 * 60 * 1000),
      locationType: 'IN_PERSON',
      venueName: 'Radio City Music Hall',
      venueAddress: '1260 6th Avenue',
      city: 'New York',
      state: 'NY',
      country: 'USA',
      coverImageUrl: 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=1200',
      thumbnailUrl: 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=400',
      totalCapacity: 6000,
      resaleEnabled: true,
      maxResaleMarkupBps: 2000, // 20% max markup
      status: 'PUBLISHED',
      isPublished: true,
      publishedAt: now,
      organizerId: admin.id,
      chainId: 31337,
    },
  });

  const event4 = await prisma.event.create({
    data: {
      name: 'Web3 Developer Conference 2025',
      slug: 'web3-dev-conf-2025',
      description: 'The premier conference for blockchain developers. Learn about the latest in DeFi, NFTs, and decentralized applications.',
      shortDescription: 'Web3 Developer Conference',
      category: 'CONFERENCE',
      tags: JSON.stringify(['web3', 'blockchain', 'developer', 'conference']),
      startDate: new Date(now.getTime() + oneMonth + oneWeek),
      endDate: new Date(now.getTime() + oneMonth + oneWeek + 2 * 24 * 60 * 60 * 1000),
      doorsOpen: new Date(now.getTime() + oneMonth + oneWeek - 60 * 60 * 1000),
      locationType: 'HYBRID',
      venueName: 'Javits Center',
      venueAddress: '429 11th Ave',
      city: 'New York',
      state: 'NY',
      country: 'USA',
      virtualUrl: 'https://web3devconf.io/virtual',
      coverImageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200',
      thumbnailUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400',
      totalCapacity: 5000,
      resaleEnabled: false, // No resale for conferences
      status: 'PUBLISHED',
      isPublished: true,
      publishedAt: now,
      organizerId: admin.id,
      chainId: 31337,
    },
  });

  console.log(`  ✓ Created ${4} events`);

  // ============================================
  // Create Ticket Tiers
  // ============================================
  console.log('🎫 Creating ticket tiers...');

  // Taylor Swift tiers
  const swiftGA = await prisma.ticketTier.create({
    data: {
      eventId: event1.id,
      name: 'General Admission',
      description: 'Standing room on the floor',
      priceUsd: 150,
      priceMatic: 75,
      totalQuantity: 5000,
      soldQuantity: 2500,
      maxPerWallet: 4,
      perks: JSON.stringify(['Floor access', 'Commemorative wristband']),
      isActive: true,
      tierIdOnChain: BigInt(0),
    },
  });

  const swiftVIP = await prisma.ticketTier.create({
    data: {
      eventId: event1.id,
      name: 'VIP Package',
      description: 'Premium reserved seating with exclusive perks',
      priceUsd: 500,
      priceMatic: 250,
      totalQuantity: 1000,
      soldQuantity: 800,
      maxPerWallet: 2,
      perks: JSON.stringify(['Premium seating', 'Meet & greet lottery', 'Exclusive merch', 'Early entry']),
      isActive: true,
      tierIdOnChain: BigInt(1),
    },
  });

  const swiftPlatinum = await prisma.ticketTier.create({
    data: {
      eventId: event1.id,
      name: 'Platinum Experience',
      description: 'The ultimate fan experience',
      priceUsd: 1500,
      priceMatic: 750,
      totalQuantity: 100,
      soldQuantity: 100,
      maxPerWallet: 1,
      perks: JSON.stringify(['Front row seating', 'Guaranteed meet & greet', 'Signed merch', 'Backstage tour']),
      isActive: false, // Sold out
      tierIdOnChain: BigInt(2),
    },
  });

  // NBA Finals tiers
  const nbaGA = await prisma.ticketTier.create({
    data: {
      eventId: event2.id,
      name: 'Upper Level',
      priceUsd: 200,
      totalQuantity: 10000,
      soldQuantity: 5000,
      maxPerWallet: 6,
      isActive: true,
    },
  });

  const nbaLower = await prisma.ticketTier.create({
    data: {
      eventId: event2.id,
      name: 'Lower Level',
      priceUsd: 800,
      totalQuantity: 5000,
      soldQuantity: 3000,
      maxPerWallet: 4,
      isActive: true,
    },
  });

  const nbaCourtside = await prisma.ticketTier.create({
    data: {
      eventId: event2.id,
      name: 'Courtside',
      priceUsd: 5000,
      totalQuantity: 200,
      soldQuantity: 200,
      maxPerWallet: 2,
      isActive: false, // Sold out
    },
  });

  // Comedy tiers
  const comedyGA = await prisma.ticketTier.create({
    data: {
      eventId: event3.id,
      name: 'General Admission',
      priceUsd: 75,
      totalQuantity: 4000,
      soldQuantity: 1000,
      maxPerWallet: 8,
      isActive: true,
    },
  });

  const comedyPremium = await prisma.ticketTier.create({
    data: {
      eventId: event3.id,
      name: 'Premium Seating',
      priceUsd: 150,
      totalQuantity: 2000,
      soldQuantity: 500,
      maxPerWallet: 4,
      isActive: true,
    },
  });

  // Conference tiers
  const confGeneral = await prisma.ticketTier.create({
    data: {
      eventId: event4.id,
      name: 'General Pass',
      description: 'Access to all talks and workshops',
      priceUsd: 299,
      totalQuantity: 3000,
      soldQuantity: 1500,
      maxPerWallet: 5,
      perks: JSON.stringify(['All sessions', 'Lunch included', 'Swag bag']),
      isActive: true,
    },
  });

  const confVIP = await prisma.ticketTier.create({
    data: {
      eventId: event4.id,
      name: 'VIP Pass',
      description: 'Premium experience with speaker access',
      priceUsd: 799,
      totalQuantity: 500,
      soldQuantity: 200,
      maxPerWallet: 2,
      perks: JSON.stringify(['All sessions', 'VIP lounge', 'Speaker dinner', 'Premium swag']),
      isActive: true,
    },
  });

  console.log(`  ✓ Created ${10} ticket tiers`);

  // ============================================
  // Create Tickets for buyers
  // ============================================
  console.log('🎟️  Creating tickets...');

  // Alice's tickets
  const aliceTicket1Code = generateCheckInCode();
  const aliceTicket1 = await prisma.ticket.create({
    data: {
      eventId: event1.id,
      tierId: swiftVIP.id,
      ownerId: buyer1.id,
      tokenId: BigInt(1),
      contractAddress: event1.contractAddress,
      chainId: 31337,
      status: 'VALID',
      checkInCode: aliceTicket1Code,
      checkInCodeHash: hashCode(aliceTicket1Code),
      originalPriceUsd: 500,
      mintedAt: now,
    },
  });

  const aliceTicket2Code = generateCheckInCode();
  const aliceTicket2 = await prisma.ticket.create({
    data: {
      eventId: event1.id,
      tierId: swiftVIP.id,
      ownerId: buyer1.id,
      tokenId: BigInt(2),
      contractAddress: event1.contractAddress,
      chainId: 31337,
      status: 'VALID',
      checkInCode: aliceTicket2Code,
      checkInCodeHash: hashCode(aliceTicket2Code),
      originalPriceUsd: 500,
      mintedAt: now,
    },
  });

  const aliceTicket3Code = generateCheckInCode();
  const aliceTicket3 = await prisma.ticket.create({
    data: {
      eventId: event3.id,
      tierId: comedyPremium.id,
      ownerId: buyer1.id,
      status: 'VALID',
      checkInCode: aliceTicket3Code,
      checkInCodeHash: hashCode(aliceTicket3Code),
      originalPriceUsd: 150,
      mintedAt: now,
    },
  });

  // Bob's tickets
  const bobTicket1Code = generateCheckInCode();
  const bobTicket1 = await prisma.ticket.create({
    data: {
      eventId: event1.id,
      tierId: swiftGA.id,
      ownerId: buyer2.id,
      tokenId: BigInt(3),
      contractAddress: event1.contractAddress,
      chainId: 31337,
      status: 'VALID',
      isListed: true, // Listed for resale
      checkInCode: bobTicket1Code,
      checkInCodeHash: hashCode(bobTicket1Code),
      originalPriceUsd: 150,
      mintedAt: now,
    },
  });

  const bobTicket2Code = generateCheckInCode();
  const bobTicket2 = await prisma.ticket.create({
    data: {
      eventId: event2.id,
      tierId: nbaLower.id,
      ownerId: buyer2.id,
      status: 'VALID',
      checkInCode: bobTicket2Code,
      checkInCodeHash: hashCode(bobTicket2Code),
      originalPriceUsd: 800,
      mintedAt: now,
    },
  });

  console.log(`  ✓ Created ${5} tickets`);

  // ============================================
  // Create Resale Listings
  // ============================================
  console.log('💰 Creating resale listings...');

  await prisma.resaleListing.create({
    data: {
      ticketId: bobTicket1.id,
      eventId: event1.id,
      sellerId: buyer2.id,
      priceUsd: 165, // 10% markup (max allowed)
      priceMatic: 82.5,
      status: 'ACTIVE',
      expiresAt: new Date(now.getTime() + oneWeek),
    },
  });

  console.log(`  ✓ Created ${1} resale listing`);

  // ============================================
  // Create Purchases
  // ============================================
  console.log('🛒 Creating purchase records...');

  await prisma.purchase.create({
    data: {
      userId: buyer1.id,
      eventId: event1.id,
      paymentMethod: 'CREDIT_CARD',
      paymentProvider: 'stripe',
      subtotalUsd: 1000,
      feesUsd: 50,
      totalUsd: 1050,
      status: 'COMPLETED',
      ticketQuantity: 2,
      ticketIds: JSON.stringify([aliceTicket1.id, aliceTicket2.id]),
      completedAt: now,
    },
  });

  await prisma.purchase.create({
    data: {
      userId: buyer2.id,
      eventId: event1.id,
      paymentMethod: 'CRYPTO_MATIC',
      subtotalUsd: 150,
      feesUsd: 0,
      totalUsd: 150,
      sponsoredGas: true,
      status: 'COMPLETED',
      ticketQuantity: 1,
      ticketIds: JSON.stringify([bobTicket1.id]),
      completedAt: now,
    },
  });

  console.log(`  ✓ Created ${2} purchases`);

  // ============================================
  // Summary
  // ============================================
  console.log('\n✅ Seeding complete!\n');
  console.log('Demo accounts:');
  console.log('  Admin:  0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
  console.log('  Venue:  0x70997970C51812dc3A010C7d01b50e0d17dc79C8');
  console.log('  Artist: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC');
  console.log('  Alice:  0x90F79bf6EB2c4f870365E785982E1f101E93b906 (has VIP tickets)');
  console.log('  Bob:    0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65 (has GA ticket listed for resale)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
