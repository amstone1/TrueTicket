const hre = require("hardhat");
const { ethers, upgrades } = hre;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // ============================================
  // Phase 1: Deploy TrueTicketNFT Implementation
  // ============================================
  console.log("\n--- Phase 1: Deploying TrueTicketNFT Implementation ---");

  const TrueTicketNFT = await ethers.getContractFactory("TrueTicketNFT");
  const ticketImplementation = await TrueTicketNFT.deploy();
  await ticketImplementation.waitForDeployment();
  const ticketImplAddress = await ticketImplementation.getAddress();
  console.log("TrueTicketNFT Implementation deployed to:", ticketImplAddress);

  // ============================================
  // Phase 2: Deploy PricingController (UUPS Proxy)
  // ============================================
  console.log("\n--- Phase 2: Deploying PricingController ---");

  const PricingController = await ethers.getContractFactory("PricingController");
  const pricingController = await upgrades.deployProxy(
    PricingController,
    [ethers.ZeroAddress, deployer.address], // eventFactory will be set later
    { kind: "uups" }
  );
  await pricingController.waitForDeployment();
  const pricingControllerAddress = await pricingController.getAddress();
  console.log("PricingController deployed to:", pricingControllerAddress);

  // ============================================
  // Phase 3: Deploy RoyaltyDistributor (UUPS Proxy)
  // ============================================
  console.log("\n--- Phase 3: Deploying RoyaltyDistributor ---");

  const platformWallet = deployer.address; // Use deployer as platform wallet for now
  const platformFeeBps = 500; // 5% platform fee

  const RoyaltyDistributor = await ethers.getContractFactory("RoyaltyDistributor");
  const royaltyDistributor = await upgrades.deployProxy(
    RoyaltyDistributor,
    [ethers.ZeroAddress, platformWallet, platformFeeBps, deployer.address],
    { kind: "uups" }
  );
  await royaltyDistributor.waitForDeployment();
  const royaltyDistributorAddress = await royaltyDistributor.getAddress();
  console.log("RoyaltyDistributor deployed to:", royaltyDistributorAddress);

  // ============================================
  // Phase 4: Deploy EventFactory (UUPS Proxy)
  // ============================================
  console.log("\n--- Phase 4: Deploying EventFactory ---");

  const EventFactory = await ethers.getContractFactory("EventFactory");
  const eventFactory = await upgrades.deployProxy(
    EventFactory,
    [ticketImplAddress, pricingControllerAddress, royaltyDistributorAddress, deployer.address],
    { kind: "uups" }
  );
  await eventFactory.waitForDeployment();
  const eventFactoryAddress = await eventFactory.getAddress();
  console.log("EventFactory deployed to:", eventFactoryAddress);

  // ============================================
  // Phase 5: Deploy Marketplace (UUPS Proxy)
  // ============================================
  console.log("\n--- Phase 5: Deploying Marketplace ---");

  const Marketplace = await ethers.getContractFactory("Marketplace");
  const marketplace = await upgrades.deployProxy(
    Marketplace,
    [eventFactoryAddress, pricingControllerAddress, royaltyDistributorAddress, deployer.address],
    { kind: "uups" }
  );
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  console.log("Marketplace deployed to:", marketplaceAddress);

  // ============================================
  // Phase 6: Link Contracts
  // ============================================
  console.log("\n--- Phase 6: Linking Contracts ---");

  // Update PricingController with EventFactory address
  const pricingControllerContract = await ethers.getContractAt("PricingController", pricingControllerAddress);
  await pricingControllerContract.setEventFactory(eventFactoryAddress);
  console.log("PricingController linked to EventFactory");

  // Update RoyaltyDistributor with EventFactory address
  const royaltyDistributorContract = await ethers.getContractAt("RoyaltyDistributor", royaltyDistributorAddress);
  await royaltyDistributorContract.setEventFactory(eventFactoryAddress);
  console.log("RoyaltyDistributor linked to EventFactory");

  // Grant DISTRIBUTOR_ROLE to Marketplace on RoyaltyDistributor
  const DISTRIBUTOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("DISTRIBUTOR_ROLE"));
  await royaltyDistributorContract.grantRole(DISTRIBUTOR_ROLE, marketplaceAddress);
  console.log("Marketplace granted DISTRIBUTOR_ROLE on RoyaltyDistributor");

  // Update EventFactory with Marketplace address
  const eventFactoryContract = await ethers.getContractAt("EventFactory", eventFactoryAddress);
  await eventFactoryContract.setMarketplace(marketplaceAddress);
  console.log("EventFactory linked to Marketplace");

  // ============================================
  // Summary
  // ============================================
  console.log("\n========================================");
  console.log("DEPLOYMENT COMPLETE");
  console.log("========================================");
  console.log("\nContract Addresses:");
  console.log("-------------------");
  console.log("TrueTicketNFT Implementation:", ticketImplAddress);
  console.log("PricingController:", pricingControllerAddress);
  console.log("RoyaltyDistributor:", royaltyDistributorAddress);
  console.log("EventFactory:", eventFactoryAddress);
  console.log("Marketplace:", marketplaceAddress);

  console.log("\n\nAdd these to your .env file:");
  console.log("-------------------");
  console.log(`NEXT_PUBLIC_TICKET_FACTORY_ADDRESS=${eventFactoryAddress}`);
  console.log(`NEXT_PUBLIC_MARKETPLACE_ADDRESS=${marketplaceAddress}`);
  console.log(`NEXT_PUBLIC_PRICING_CONTROLLER_ADDRESS=${pricingControllerAddress}`);
  console.log(`NEXT_PUBLIC_ROYALTY_DISTRIBUTOR_ADDRESS=${royaltyDistributorAddress}`);

  // Write deployment addresses to JSON file for app consumption
  const fs = require("fs");
  const deploymentInfo = {
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      ticketImplementation: ticketImplAddress,
      eventFactory: eventFactoryAddress,
      pricingController: pricingControllerAddress,
      royaltyDistributor: royaltyDistributorAddress,
      marketplace: marketplaceAddress,
    },
  };

  const deploymentPath = "./deployments";
  if (!fs.existsSync(deploymentPath)) {
    fs.mkdirSync(deploymentPath);
  }

  const networkName = hre.network.name;
  fs.writeFileSync(
    `${deploymentPath}/${networkName}.json`,
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log(`\nDeployment info saved to ${deploymentPath}/${networkName}.json`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
