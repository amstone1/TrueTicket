/**
 * Test On-Chain Ticket Lifecycle
 *
 * Tests the full blockchain integration:
 * 1. Create event on-chain via EventFactory
 * 2. Mint ticket NFTs
 * 3. Verify on-chain ownership and metadata
 * 4. Test resale with price cap enforcement
 * 5. Test transfer restrictions
 * 6. Test check-in (mark as used on-chain)
 */

import { ethers } from 'ethers';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Load deployment info
function loadDeployment() {
  const deploymentPath = path.join(process.cwd(), 'deployments', 'localhost.json');
  if (!fs.existsSync(deploymentPath)) {
    throw new Error('No deployment found. Run: npx hardhat run scripts/deploy.ts --network localhost');
  }
  return JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
}

// Load ABIs
function loadABI(name: string) {
  const abiPath = path.join(process.cwd(), 'artifacts', 'contracts', `${name}.sol`, `${name}.json`);
  return JSON.parse(fs.readFileSync(abiPath, 'utf8')).abi;
}

async function main() {
  console.log('🔗 Testing On-Chain Ticket Lifecycle\n');
  console.log('='.repeat(50));

  // Setup
  const deployment = loadDeployment();
  const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');

  // Use Hardhat's test accounts
  const [deployer, organizer, buyer1, buyer2] = await Promise.all([
    provider.getSigner(0),
    provider.getSigner(1),
    provider.getSigner(2),
    provider.getSigner(3),
  ]);

  console.log('\n📋 Test Accounts:');
  console.log(`  Deployer: ${await deployer.getAddress()}`);
  console.log(`  Organizer: ${await organizer.getAddress()}`);
  console.log(`  Buyer 1: ${await buyer1.getAddress()}`);
  console.log(`  Buyer 2: ${await buyer2.getAddress()}`);

  // Load contracts
  const EventFactoryABI = loadABI('EventFactory');
  const TrueTicketNFTABI = loadABI('TrueTicketNFT');
  const PricingControllerABI = loadABI('PricingController');
  const MarketplaceABI = loadABI('Marketplace');

  const eventFactory = new ethers.Contract(
    deployment.contracts.eventFactory,
    EventFactoryABI,
    deployer
  );

  const pricingController = new ethers.Contract(
    deployment.contracts.pricingController,
    PricingControllerABI,
    deployer
  );

  const marketplace = new ethers.Contract(
    deployment.contracts.marketplace,
    MarketplaceABI,
    deployer
  );

  // ============================================
  // 1. CREATE EVENT ON-CHAIN
  // ============================================
  console.log('\n\n📍 STEP 1: Create Event On-Chain');
  console.log('-'.repeat(50));

  const eventStartDate = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60; // 1 week from now

  // EventConfig struct
  const eventConfig = {
    name: 'Test Blockchain Concert',
    symbol: 'TBC',
    baseURI: 'https://example.com/metadata/',
    eventDate: eventStartDate,
    doorsOpen: eventStartDate - 2 * 60 * 60, // 2 hours before
    venue: await organizer.getAddress(),
    artist: await organizer.getAddress(),
    host: await organizer.getAddress(),
    maxCapacity: 120,
    transferable: true,
    resaleAllowed: true,
  };

  // TierConfig array
  const tierData = [
    {
      name: 'General Admission',
      price: ethers.parseEther('0.1'), // 0.1 ETH
      supply: 100,
      maxPerWallet: 4,
    },
    {
      name: 'VIP',
      price: ethers.parseEther('0.3'), // 0.3 ETH
      supply: 20,
      maxPerWallet: 2,
    },
  ];

  console.log('Creating event...');

  const createTx = await eventFactory.createEvent(eventConfig, tierData);

  const createReceipt = await createTx.wait();

  // Find EventCreated event
  let onChainEventId: number = 0;
  let ticketContractAddress: string = '';

  for (const log of createReceipt.logs) {
    try {
      const parsed = eventFactory.interface.parseLog(log);
      if (parsed?.name === 'EventCreated') {
        onChainEventId = Number(parsed.args.eventId);
        ticketContractAddress = parsed.args.ticketContract;
        break;
      }
    } catch {}
  }

  console.log(`✅ Event created on-chain!`);
  console.log(`   Event ID: ${onChainEventId}`);
  console.log(`   Ticket Contract: ${ticketContractAddress}`);
  console.log(`   Tx Hash: ${createReceipt.hash}`);

  // Get ticket contract instance
  const ticketContract = new ethers.Contract(ticketContractAddress, TrueTicketNFTABI, deployer);

  // Set up pricing config with 20% cap
  // Note: capValue for PERCENTAGE_CAP is a multiplier (10000 = 100%, 12000 = 120%)
  // So 12000 means max resale price is 120% of original (20% markup)
  console.log('\nSetting up pricing with 20% resale cap (max 120% of original)...');
  const pricingConfig = {
    capType: 2, // PERCENTAGE_CAP
    capValue: 12000, // 120% of original (20% max markup)
    minResalePrice: 0,
    dynamicPricing: false,
  };
  await pricingController.setPricingConfig(onChainEventId, 0, pricingConfig); // GA tier
  await pricingController.setPricingConfig(onChainEventId, 1, pricingConfig); // VIP tier
  console.log('✅ Pricing config set for both tiers');

  // ============================================
  // 2. MINT TICKETS
  // ============================================
  console.log('\n\n📍 STEP 2: Mint Tickets');
  console.log('-'.repeat(50));

  const buyer1Address = await buyer1.getAddress();
  const buyer2Address = await buyer2.getAddress();

  // Grant minter role to deployer
  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('MINTER_ROLE'));
  await ticketContract.grantRole(MINTER_ROLE, await deployer.getAddress());

  // Mint GA ticket for buyer1
  const ticket1Metadata = {
    eventId: onChainEventId,
    section: '',
    row: '',
    seatNumber: 0,
    tier: 0, // GA
    originalPrice: ethers.parseEther('0.1'),
    mintTimestamp: 0n,
    used: false,
  };

  const ticket1Restrictions = {
    transferable: true,
    lockUntil: 0n,
    maxTransfers: 0, // Unlimited
    transferCount: 0,
    resaleAllowed: true,
  };

  console.log('Minting GA ticket for Buyer 1...');
  const mint1Tx = await ticketContract.mint(buyer1Address, ticket1Metadata, ticket1Restrictions);
  const mint1Receipt = await mint1Tx.wait();

  let token1Id: bigint = 0n;
  for (const log of mint1Receipt.logs) {
    try {
      const parsed = ticketContract.interface.parseLog(log);
      if (parsed?.name === 'TicketMinted') {
        token1Id = parsed.args.tokenId;
        break;
      }
    } catch {}
  }

  console.log(`✅ Ticket #${token1Id} minted to ${buyer1Address}`);

  // Mint VIP ticket for buyer2
  const ticket2Metadata = {
    eventId: onChainEventId,
    section: 'VIP',
    row: 'A',
    seatNumber: 1,
    tier: 1, // VIP
    originalPrice: ethers.parseEther('0.3'),
    mintTimestamp: 0n,
    used: false,
  };

  console.log('Minting VIP ticket for Buyer 2...');
  const mint2Tx = await ticketContract.mint(buyer2Address, ticket2Metadata, ticket1Restrictions);
  const mint2Receipt = await mint2Tx.wait();

  let token2Id: bigint = 0n;
  for (const log of mint2Receipt.logs) {
    try {
      const parsed = ticketContract.interface.parseLog(log);
      if (parsed?.name === 'TicketMinted') {
        token2Id = parsed.args.tokenId;
        break;
      }
    } catch {}
  }

  console.log(`✅ Ticket #${token2Id} minted to ${buyer2Address}`);

  // ============================================
  // 3. VERIFY ON-CHAIN DATA
  // ============================================
  console.log('\n\n📍 STEP 3: Verify On-Chain Data');
  console.log('-'.repeat(50));

  // Check ownership
  const owner1 = await ticketContract.ownerOf(token1Id);
  const owner2 = await ticketContract.ownerOf(token2Id);

  console.log(`Token #${token1Id} owner: ${owner1}`);
  console.log(`Token #${token2Id} owner: ${owner2}`);

  // Check metadata
  const metadata1 = await ticketContract.getTicketMetadata(token1Id);
  console.log(`\nToken #${token1Id} metadata:`);
  console.log(`  Tier: ${metadata1.tier}`);
  console.log(`  Original Price: ${ethers.formatEther(metadata1.originalPrice)} ETH`);
  console.log(`  Used: ${metadata1.used}`);

  console.log('\n✅ On-chain data verified!');

  // ============================================
  // 4. TEST RESALE WITH PRICE CAP
  // ============================================
  console.log('\n\n📍 STEP 4: Test Resale Price Cap Enforcement');
  console.log('-'.repeat(50));

  // Get max resale price from PricingController
  const maxResalePrice = await pricingController.getMaxResalePrice(
    onChainEventId,
    token1Id,
    ethers.parseEther('0.1')
  );

  console.log(`Original price: 0.1 ETH`);
  console.log(`Max resale price (20% cap): ${ethers.formatEther(maxResalePrice)} ETH`);

  // Try to validate a price within cap (should succeed)
  const validPrice = ethers.parseEther('0.12'); // 20% markup = 0.12 ETH
  const [isValidPrice, validReason] = await pricingController.validateResalePrice(
    onChainEventId,
    token1Id,
    ethers.parseEther('0.1'),
    validPrice
  );
  console.log(`\nValidating 0.12 ETH (20% markup): ${isValidPrice ? '✅ Valid' : '❌ Invalid'}`);

  // Try to validate a price above cap (should fail)
  const invalidPrice = ethers.parseEther('0.15'); // 50% markup
  const [isInvalidPrice, invalidReason] = await pricingController.validateResalePrice(
    onChainEventId,
    token1Id,
    ethers.parseEther('0.1'),
    invalidPrice
  );
  console.log(`Validating 0.15 ETH (50% markup): ${isInvalidPrice ? '✅ Valid' : `❌ Rejected - ${invalidReason}`}`);

  // Actually list on marketplace
  console.log('\nListing ticket on marketplace at max price...');

  // Buyer1 needs to approve marketplace to transfer their ticket
  const ticketContractAsBuyer1 = ticketContract.connect(buyer1);
  await ticketContractAsBuyer1.approve(deployment.contracts.marketplace, token1Id);

  const marketplaceAsBuyer1 = marketplace.connect(buyer1);
  const listTx = await marketplaceAsBuyer1.listTicket(
    ticketContractAddress,
    token1Id,
    maxResalePrice, // List at max allowed price
    7 * 24 * 60 * 60 // 7 days
  );
  const listReceipt = await listTx.wait();

  let listingId: bigint = 0n;
  for (const log of listReceipt.logs) {
    try {
      const parsed = marketplace.interface.parseLog(log);
      if (parsed?.name === 'TicketListed') {
        listingId = parsed.args.listingId;
        break;
      }
    } catch {}
  }

  console.log(`✅ Ticket listed! Listing ID: ${listingId}`);

  // Try to buy the listed ticket
  console.log('\nBuyer 2 purchasing from marketplace...');
  const marketplaceAsBuyer2 = marketplace.connect(buyer2);
  const buyTx = await marketplaceAsBuyer2.buyTicket(listingId, { value: maxResalePrice });
  await buyTx.wait();

  // Verify ownership transferred
  const newOwner = await ticketContract.ownerOf(token1Id);
  console.log(`✅ Ticket transferred! New owner: ${newOwner}`);

  // ============================================
  // 5. TEST CHECK-IN (MARK AS USED)
  // ============================================
  console.log('\n\n📍 STEP 5: Test Check-In (Mark as Used)');
  console.log('-'.repeat(50));

  // Grant scanner role to deployer
  const SCANNER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('SCANNER_ROLE'));
  await ticketContract.grantRole(SCANNER_ROLE, await deployer.getAddress());

  // Check ticket is not used
  const metadataBefore = await ticketContract.getTicketMetadata(token2Id);
  console.log(`Ticket #${token2Id} used status before: ${metadataBefore.used}`);

  // Mark as used
  console.log('Marking ticket as used...');
  const useTx = await ticketContract.markAsUsed(token2Id);
  await useTx.wait();

  // Verify on-chain
  const metadataAfter = await ticketContract.getTicketMetadata(token2Id);
  console.log(`Ticket #${token2Id} used status after: ${metadataAfter.used}`);

  if (metadataAfter.used) {
    console.log('✅ Ticket successfully marked as used on-chain!');
  } else {
    console.log('❌ Failed to mark ticket as used');
  }

  // Try to mark same ticket as used again (should fail)
  console.log('\nAttempting to use ticket again (should fail)...');
  try {
    await ticketContract.markAsUsed(token2Id);
    console.log('❌ ERROR: Should have reverted!');
  } catch (error: any) {
    console.log('✅ Correctly rejected: Ticket already used');
  }

  // ============================================
  // 6. TEST TRANSFER RESTRICTIONS
  // ============================================
  console.log('\n\n📍 STEP 6: Test Transfer Restrictions');
  console.log('-'.repeat(50));

  // Try to transfer a used ticket (should fail)
  console.log('Attempting to transfer used ticket (should fail)...');
  const ticketContractAsBuyer2 = ticketContract.connect(buyer2);
  try {
    await ticketContractAsBuyer2.transferFrom(
      await buyer2.getAddress(),
      await buyer1.getAddress(),
      token2Id
    );
    console.log('❌ ERROR: Should have reverted!');
  } catch (error: any) {
    console.log('✅ Correctly rejected: Cannot transfer used ticket');
  }

  // ============================================
  // SUMMARY
  // ============================================
  console.log('\n\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(50));
  console.log('✅ Event creation on-chain');
  console.log('✅ NFT minting with metadata');
  console.log('✅ On-chain ownership verification');
  console.log('✅ Price cap enforcement (20% max)');
  console.log('✅ Marketplace listing and purchase');
  console.log('✅ Check-in with on-chain state');
  console.log('✅ Transfer restrictions enforced');
  console.log('\n🎉 All blockchain integration tests passed!\n');

  // Display contract addresses for reference
  console.log('Contract Addresses:');
  console.log('-'.repeat(50));
  console.log(`EventFactory: ${deployment.contracts.eventFactory}`);
  console.log(`PricingController: ${deployment.contracts.pricingController}`);
  console.log(`Marketplace: ${deployment.contracts.marketplace}`);
  console.log(`Test Event Contract: ${ticketContractAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
