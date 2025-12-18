const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  const [deployer, buyer1, buyer2] = await ethers.getSigners();

  console.log("\n🎫 TrueTicket Tokenization Demo");
  console.log("================================\n");

  // Contract addresses from deployment
  const eventFactoryAddress = "0x84eA74d481Ee0A5332c457a4d796187F6Ba67fEB";
  const pricingControllerAddress = "0xE6E340D132b5f46d1e472DebcD681B2aBc16e57E";

  // Get contract instances
  const eventFactory = await ethers.getContractAt("EventFactory", eventFactoryAddress);
  const pricingController = await ethers.getContractAt("PricingController", pricingControllerAddress);

  // ============================================
  // Step 1: Create an Event
  // ============================================
  console.log("📅 STEP 1: Creating Event...");
  console.log("----------------------------");

  // EventConfig struct
  const eventConfig = {
    name: "TrueTicket Launch Party",
    symbol: "TTLP",
    baseURI: "https://trueticket.io/api/tickets/",
    eventDate: Math.floor(Date.now() / 1000) + 86400 * 30, // 30 days from now
    doorsOpen: Math.floor(Date.now() / 1000) + 86400 * 30 - 3600, // 1 hour before
    venue: deployer.address,
    artist: deployer.address,
    host: deployer.address,
    maxCapacity: 120, // Total capacity
    transferable: true,
    resaleAllowed: true
  };

  // TierConfig structs
  const tierConfigs = [
    {
      name: "General Admission",
      price: ethers.parseEther("0.05"), // 0.05 ETH
      supply: 100,
      maxPerWallet: 4
    },
    {
      name: "VIP",
      price: ethers.parseEther("0.15"), // 0.15 ETH
      supply: 20,
      maxPerWallet: 2
    }
  ];

  // Create event transaction
  const createTx = await eventFactory.createEvent(eventConfig, tierConfigs);

  const receipt = await createTx.wait();

  // Get event address from logs
  const eventCreatedEvent = receipt.logs.find((log: any) => {
    try {
      return eventFactory.interface.parseLog(log)?.name === "EventCreated";
    } catch { return false; }
  });

  const parsedEvent = eventFactory.interface.parseLog(eventCreatedEvent);
  const eventId = parsedEvent?.args?.eventId;
  const ticketContractAddress = parsedEvent?.args?.ticketContract;

  console.log(`✅ Event Created!`);
  console.log(`   Event ID: ${eventId}`);
  console.log(`   Event Name: ${eventConfig.name}`);
  console.log(`   Ticket Contract: ${ticketContractAddress}`);
  console.log(`   Tiers: GA (0.05 ETH), VIP (0.15 ETH)\n`);

  // Get ticket contract
  const ticketContract = await ethers.getContractAt("TrueTicketNFT", ticketContractAddress);

  // ============================================
  // Step 2: Mint Tickets (Purchase)
  // ============================================
  console.log("🎟️  STEP 2: Minting Tickets (Simulating Purchase)...");
  console.log("----------------------------------------------------");

  // Transfer restrictions (allow transfers and resale)
  const restrictions = {
    transferable: true,
    resaleAllowed: true,
    lockUntil: 0,
    maxTransfers: 10,
    transferCount: 0
  };

  // Buyer 1 purchases 2 GA tickets
  console.log(`\nBuyer 1 (${buyer1.address.slice(0,10)}...) purchasing 2 GA tickets...`);

  // Mint ticket 1
  const metadata1 = {
    eventId: eventId,
    section: "Floor",
    row: "A",
    seatNumber: 1,
    tier: 0, // GA
    originalPrice: ethers.parseEther("0.05"),
    mintTimestamp: Math.floor(Date.now() / 1000),
    used: false
  };

  const mintTx1a = await ticketContract.connect(deployer).mint(buyer1.address, metadata1, restrictions);
  await mintTx1a.wait();

  // Mint ticket 2
  const metadata1b = { ...metadata1, seatNumber: 2 };
  const mintTx1b = await ticketContract.connect(deployer).mint(buyer1.address, metadata1b, restrictions);
  await mintTx1b.wait();

  const buyer1Balance = await ticketContract.balanceOf(buyer1.address);
  console.log(`✅ Minted! Buyer 1 now owns ${buyer1Balance} ticket NFT(s)`);

  // Get token IDs
  const token1 = await ticketContract.tokenOfOwnerByIndex(buyer1.address, 0);
  const token2 = await ticketContract.tokenOfOwnerByIndex(buyer1.address, 1);
  console.log(`   Token IDs: #${token1}, #${token2}`);

  // Buyer 2 purchases 1 VIP ticket
  console.log(`\nBuyer 2 (${buyer2.address.slice(0,10)}...) purchasing 1 VIP ticket...`);

  const metadata2 = {
    eventId: eventId,
    section: "VIP Lounge",
    row: "1",
    seatNumber: 1,
    tier: 1, // VIP
    originalPrice: ethers.parseEther("0.15"),
    mintTimestamp: Math.floor(Date.now() / 1000),
    used: false
  };

  const mintTx2 = await ticketContract.connect(deployer).mint(buyer2.address, metadata2, restrictions);
  await mintTx2.wait();

  const buyer2Balance = await ticketContract.balanceOf(buyer2.address);
  const token3 = await ticketContract.tokenOfOwnerByIndex(buyer2.address, 0);
  console.log(`✅ Minted! Buyer 2 now owns ${buyer2Balance} VIP ticket NFT`);
  console.log(`   Token ID: #${token3}`);

  // ============================================
  // Step 3: Check NFT Ownership
  // ============================================
  console.log("\n\n🔍 STEP 3: Verifying NFT Ownership...");
  console.log("--------------------------------------");

  const owner1 = await ticketContract.ownerOf(token1);
  const owner2 = await ticketContract.ownerOf(token2);
  const owner3 = await ticketContract.ownerOf(token3);

  console.log(`Token #${token1} owned by: ${owner1}`);
  console.log(`Token #${token2} owned by: ${owner2}`);
  console.log(`Token #${token3} owned by: ${owner3}`);

  // ============================================
  // Step 4: Check Resale Price Caps
  // ============================================
  console.log("\n\n💰 STEP 4: Checking Resale Price Caps...");
  console.log("-----------------------------------------");

  const originalGAPrice = ethers.parseEther("0.05");
  const maxResalePrice = await pricingController.getMaxResalePrice(
    eventId,
    0, // tier 0
    originalGAPrice
  );

  console.log(`Original GA Price: ${ethers.formatEther(originalGAPrice)} ETH`);
  console.log(`Max Resale Price:  ${ethers.formatEther(maxResalePrice)} ETH (110% cap)`);
  console.log(`\n✅ Scalpers can only resell at max 10% markup!`);

  // ============================================
  // Step 5: Simulate Ticket Transfer
  // ============================================
  console.log("\n\n📤 STEP 5: Simulating Ticket Transfer...");
  console.log("-----------------------------------------");

  console.log(`Buyer 1 transferring ticket #${token1} to Buyer 2...`);

  const transferTx = await ticketContract.connect(buyer1).transferFrom(
    buyer1.address,
    buyer2.address,
    token1
  );
  await transferTx.wait();

  const newOwner = await ticketContract.ownerOf(token1);
  console.log(`✅ Transfer complete! Token #${token1} now owned by: ${newOwner.slice(0,10)}...`);

  const buyer1FinalBalance = await ticketContract.balanceOf(buyer1.address);
  const buyer2FinalBalance = await ticketContract.balanceOf(buyer2.address);
  console.log(`\nFinal balances:`);
  console.log(`  Buyer 1: ${buyer1FinalBalance} tickets`);
  console.log(`  Buyer 2: ${buyer2FinalBalance} tickets`);

  // ============================================
  // Summary
  // ============================================
  console.log("\n\n========================================");
  console.log("🎉 TOKENIZATION DEMO COMPLETE!");
  console.log("========================================");
  console.log("\nWhat just happened:");
  console.log("1. Created an event with 2 ticket tiers (GA + VIP)");
  console.log("2. Minted ERC-721 NFT tickets to buyers");
  console.log("3. Verified on-chain ownership");
  console.log("4. Checked resale price caps (anti-scalping)");
  console.log("5. Transferred a ticket between wallets");
  console.log("\n✨ Each ticket is a unique NFT on the blockchain!");
  console.log("✨ Resale prices are enforced by smart contracts!");
  console.log("✨ Royalties auto-distribute on every resale!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
