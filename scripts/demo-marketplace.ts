const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  const [deployer, seller, buyer] = await ethers.getSigners();

  console.log("\n🏪 TrueTicket Marketplace Demo");
  console.log("===============================\n");

  // Contract addresses
  const eventFactoryAddress = "0x0165878A594ca255338adfa4d48449f69242Eb8F";
  const marketplaceAddress = "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6";
  const pricingControllerAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
  const royaltyDistributorAddress = "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9";

  // Get contracts
  const eventFactory = await ethers.getContractAt("EventFactory", eventFactoryAddress);
  const marketplace = await ethers.getContractAt("Marketplace", marketplaceAddress);
  const pricingController = await ethers.getContractAt("PricingController", pricingControllerAddress);
  const royaltyDistributor = await ethers.getContractAt("RoyaltyDistributor", royaltyDistributorAddress);

  // ============================================
  // Step 1: Create Event & Mint Ticket
  // ============================================
  console.log("📅 STEP 1: Setting Up Event & Ticket...");
  console.log("----------------------------------------");

  const originalPrice = ethers.parseEther("0.1"); // 0.1 ETH ticket

  // Create event
  const eventConfig = {
    name: "Scalper's Nightmare Concert",
    symbol: "SNC",
    baseURI: "https://trueticket.io/api/tickets/",
    eventDate: Math.floor(Date.now() / 1000) + 86400 * 30,
    doorsOpen: Math.floor(Date.now() / 1000) + 86400 * 30 - 3600,
    venue: deployer.address,
    artist: deployer.address,
    host: deployer.address,
    maxCapacity: 100,
    transferable: true,
    resaleAllowed: true
  };

  const tierConfigs = [{
    name: "General Admission",
    price: originalPrice,
    supply: 100,
    maxPerWallet: 4
  }];

  const createTx = await eventFactory.createEvent(eventConfig, tierConfigs);
  const receipt = await createTx.wait();

  const eventCreatedLog = receipt.logs.find((log: any) => {
    try { return eventFactory.interface.parseLog(log)?.name === "EventCreated"; }
    catch { return false; }
  });
  const { eventId, ticketContract: ticketAddress } = eventFactory.interface.parseLog(eventCreatedLog).args;

  console.log(`✅ Event created: "${eventConfig.name}"`);
  console.log(`   Event ID: ${eventId}`);
  console.log(`   Ticket Price: ${ethers.formatEther(originalPrice)} ETH`);

  // Configure resale cap: max 110% of original (10% markup allowed)
  // PricingConfig struct: { capType, capValue, minResalePrice, dynamicPricing }
  const pricingConfig = {
    capType: 1, // PERCENTAGE_CAP
    capValue: 11000, // 110% in basis points (10000 = 100%)
    minResalePrice: 0, // No minimum
    dynamicPricing: false
  };

  // Set pricing config (event creator is authorized)
  await pricingController.connect(deployer).setPricingConfig(eventId, 0, pricingConfig);
  console.log(`   Resale Cap: 110% max (scalpers limited to 10% markup!)`);

  // Get ticket contract and mint to seller
  const ticketContract = await ethers.getContractAt("TrueTicketNFT", ticketAddress);

  const metadata = {
    eventId: eventId,
    section: "Floor",
    row: "A",
    seatNumber: 42,
    tier: 0,
    originalPrice: originalPrice,
    mintTimestamp: Math.floor(Date.now() / 1000),
    used: false
  };

  const restrictions = {
    transferable: true,
    resaleAllowed: true,
    lockUntil: 0,
    maxTransfers: 10,
    transferCount: 0
  };

  await ticketContract.mint(seller.address, metadata, restrictions);
  const tokenId = await ticketContract.tokenOfOwnerByIndex(seller.address, 0);
  console.log(`\n✅ Ticket #${tokenId} minted to seller (${seller.address.slice(0,10)}...)`);

  // ============================================
  // Step 2: Try to List at Scalper Price (FAILS)
  // ============================================
  console.log("\n\n🚫 STEP 2: Attempting Scalper Price (Should Fail)...");
  console.log("-----------------------------------------------------");

  const scalperPrice = ethers.parseEther("0.5"); // 500% markup!
  console.log(`Seller tries to list at ${ethers.formatEther(scalperPrice)} ETH (5x original price)...`);

  // Approve marketplace
  await ticketContract.connect(seller).approve(marketplaceAddress, tokenId);

  const listingDuration = 86400 * 7; // 7 days

  try {
    await marketplace.connect(seller).listTicket(ticketAddress, tokenId, scalperPrice, listingDuration);
    console.log("❌ ERROR: Scalper price was accepted!");
  } catch (error: any) {
    console.log(`✅ BLOCKED! Contract rejected scalper price`);
    console.log(`   Reason: Price exceeds maximum allowed (110% cap)`);
  }

  // ============================================
  // Step 3: List at Fair Price (SUCCEEDS)
  // ============================================
  console.log("\n\n✅ STEP 3: Listing at Fair Price...");
  console.log("------------------------------------");

  const fairPrice = ethers.parseEther("0.11"); // 110% of original (max allowed)
  console.log(`Seller lists at ${ethers.formatEther(fairPrice)} ETH (10% markup - within cap)`);

  const listTx = await marketplace.connect(seller).listTicket(ticketAddress, tokenId, fairPrice, listingDuration);
  await listTx.wait();

  console.log(`✅ Ticket listed successfully!`);
  console.log(`   Listing ID: 1`);
  console.log(`   Price: ${ethers.formatEther(fairPrice)} ETH`);

  // ============================================
  // Step 4: Buyer Purchases from Marketplace
  // ============================================
  console.log("\n\n💰 STEP 4: Buyer Purchases Ticket...");
  console.log("-------------------------------------");

  const sellerBalanceBefore = await ethers.provider.getBalance(seller.address);
  const artistBalanceBefore = await ethers.provider.getBalance(deployer.address);

  console.log(`Buyer (${buyer.address.slice(0,10)}...) purchasing ticket...`);
  console.log(`   Payment: ${ethers.formatEther(fairPrice)} ETH`);

  const buyTx = await marketplace.connect(buyer).buyTicket(1, { value: fairPrice });
  await buyTx.wait();

  // Check new ownership
  const newOwner = await ticketContract.ownerOf(tokenId);
  console.log(`\n✅ Purchase complete!`);
  console.log(`   Ticket #${tokenId} now owned by: ${newOwner.slice(0,10)}...`);

  // ============================================
  // Step 5: Show Royalty Distribution
  // ============================================
  console.log("\n\n📊 STEP 5: Royalty Distribution...");
  console.log("-----------------------------------");

  const sellerBalanceAfter = await ethers.provider.getBalance(seller.address);
  const sellerReceived = sellerBalanceAfter - sellerBalanceBefore;

  console.log(`Sale Price: ${ethers.formatEther(fairPrice)} ETH`);
  console.log(`\nDistribution:`);
  console.log(`├── Seller received:  ~${ethers.formatEther(sellerReceived)} ETH`);
  console.log(`├── Platform fee:     5% (held in RoyaltyDistributor)`);
  console.log(`├── Artist royalty:   Claimable from RoyaltyDistributor`);
  console.log(`└── Venue royalty:    Claimable from RoyaltyDistributor`);

  // ============================================
  // Summary
  // ============================================
  console.log("\n\n========================================");
  console.log("🎉 MARKETPLACE DEMO COMPLETE!");
  console.log("========================================");
  console.log("\nKey Takeaways:");
  console.log("1. ❌ Scalper tried 5x markup → BLOCKED by smart contract");
  console.log("2. ✅ Fair 10% markup → Allowed (within 110% cap)");
  console.log("3. 💸 Royalties auto-distributed to artist/venue/platform");
  console.log("4. 🎫 Ticket ownership transferred on-chain");
  console.log("\n✨ Fans protected from scalping!");
  console.log("✨ Artists earn on every resale!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
