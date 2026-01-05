/**
 * NFT Minting Integration
 *
 * Connects database ticket records to actual on-chain NFT minting
 * via the blockchain service.
 */

import { prisma } from '@/lib/prisma';
import { blockchainService, type MintTicketParams } from './service';
import { ethers } from 'ethers';
import { createMerkleTree, computeLeafHash } from '@/lib/zk/merkleTree';

// Types
interface MintResult {
  ticketId: string;
  tokenId?: bigint;
  txHash?: string;
  success: boolean;
  error?: string;
}

interface CreateEventResult {
  eventId: bigint;
  ticketContractAddress: string;
  txHash: string;
}

/**
 * Check if blockchain minting is enabled
 */
function isBlockchainEnabled(): boolean {
  return !!(
    process.env.PLATFORM_WALLET_PRIVATE_KEY &&
    process.env.NEXT_PUBLIC_TICKET_FACTORY_ADDRESS
  );
}

/**
 * Create an event on-chain
 */
export async function createEventOnChain(dbEventId: string): Promise<CreateEventResult | null> {
  const event = await prisma.event.findUnique({
    where: { id: dbEventId },
    include: {
      ticketTiers: true,
      organizer: true,
    },
  });

  if (!event) {
    console.error(`Event not found: ${dbEventId}`);
    return null;
  }

  if (!isBlockchainEnabled()) {
    console.log(`[Blockchain] Minting disabled - would create event: ${event.name}`);
    return {
      eventId: BigInt(0),
      ticketContractAddress: ethers.ZeroAddress,
      txHash: ethers.ZeroHash,
    };
  }

  try {
    const factory = blockchainService.getEventFactory(true);
    if (!factory) {
      throw new Error('EventFactory contract not configured');
    }

    // Create event on-chain
    const tx = await factory.createEvent(
      event.name,
      event.totalCapacity,
      event.resaleRoyaltyBps,
      event.artistWallet || ethers.ZeroAddress,
      event.venueWallet || ethers.ZeroAddress,
      event.hostWallet || ethers.ZeroAddress
    );
    const receipt = await tx.wait();

    // Extract event data from EventCreated log
    const eventLog = receipt.logs.find((log: any) => {
      try {
        const parsed = factory.interface.parseLog(log);
        return parsed?.name === 'EventCreated';
      } catch {
        return false;
      }
    });

    if (!eventLog) {
      throw new Error('EventCreated event not found');
    }

    const parsed = factory.interface.parseLog(eventLog);
    const eventIdOnChain = parsed?.args.eventId;
    const ticketContractAddress = parsed?.args.ticketContract;

    // Update database with on-chain data
    await prisma.event.update({
      where: { id: dbEventId },
      data: {
        eventIdOnChain,
        contractAddress: ticketContractAddress,
      },
    });

    console.log(`[Blockchain] Event created on-chain: ${eventIdOnChain} at ${ticketContractAddress}`);

    return {
      eventId: eventIdOnChain,
      ticketContractAddress,
      txHash: receipt.hash,
    };
  } catch (error) {
    console.error('[Blockchain] Failed to create event on-chain:', error);
    return null;
  }
}

/**
 * Mint tickets for a purchase
 */
export async function mintTicketsForPurchase(purchaseId: string): Promise<MintResult[]> {
  const purchase = await prisma.purchase.findUnique({
    where: { id: purchaseId },
    include: {
      event: {
        include: { ticketTiers: true },
      },
      user: true,
    },
  });

  if (!purchase) {
    console.error(`Purchase not found: ${purchaseId}`);
    return [];
  }

  // Get tickets for this purchase
  const tickets = await prisma.ticket.findMany({
    where: {
      purchaseId,
      status: 'PENDING_MINT',
    },
    include: {
      tier: true,
    },
  });

  if (tickets.length === 0) {
    console.log(`[Blockchain] No pending tickets for purchase: ${purchaseId}`);
    return [];
  }

  const results: MintResult[] = [];

  // If blockchain minting is disabled, just update status
  if (!isBlockchainEnabled() || !purchase.event.contractAddress) {
    console.log(`[Blockchain] Minting disabled - updating ${tickets.length} tickets to VALID`);

    for (const ticket of tickets) {
      // Generate ZK leaf hash for privacy-preserving verification
      const ticketSalt = ethers.hexlify(ethers.randomBytes(32));
      const leafHash = await computeLeafHash({
        tokenId: BigInt(tickets.indexOf(ticket) + 1),
        eventId: BigInt(purchase.event.eventIdOnChain || 0),
        tier: ticket.tier.tierIdOnChain ? Number(ticket.tier.tierIdOnChain) : 0,
        originalPrice: BigInt(Math.round(ticket.originalPriceUsd * 1e18)),
        salt: BigInt(ticketSalt),
      });

      await prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          status: 'VALID',
          mintedAt: new Date(),
          zkTicketSalt: ticketSalt,
          zkMerkleLeaf: leafHash.toString(),
        },
      });

      results.push({ ticketId: ticket.id, success: true });
    }

    return results;
  }

  // Actually mint on blockchain
  try {
    const recipientAddress = purchase.user.walletAddress;
    if (!recipientAddress) {
      throw new Error('User does not have a wallet address');
    }

    const mintParams: MintTicketParams[] = tickets.map((ticket, index) => ({
      eventId: Number(purchase.event.eventIdOnChain),
      recipient: recipientAddress,
      tier: ticket.tier.tierIdOnChain ? Number(ticket.tier.tierIdOnChain) : 0,
      originalPrice: ethers.parseEther(ticket.originalPriceUsd.toString()),
    }));

    // Batch mint all tickets
    const { tokenIds, txHash } = await blockchainService.mintTicketBatch(
      purchase.event.contractAddress,
      tickets.map(() => recipientAddress),
      mintParams
    );

    // Update each ticket with on-chain data
    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i];
      const tokenId = tokenIds[i];

      // Generate ZK leaf hash
      const ticketSalt = ethers.hexlify(ethers.randomBytes(32));
      const leafHash = await computeLeafHash({
        tokenId,
        eventId: BigInt(purchase.event.eventIdOnChain || 0),
        tier: mintParams[i].tier,
        originalPrice: BigInt(Math.round(ticket.originalPriceUsd * 1e18)),
        salt: BigInt(ticketSalt),
      });

      await prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          status: 'VALID',
          tokenId,
          contractAddress: purchase.event.contractAddress,
          mintTxHash: txHash,
          mintedAt: new Date(),
          zkTicketSalt: ticketSalt,
          zkMerkleLeaf: leafHash.toString(),
        },
      });

      // Record the transfer
      await prisma.ticketTransfer.create({
        data: {
          ticketId: ticket.id,
          fromAddress: ethers.ZeroAddress,
          toAddress: recipientAddress,
          txHash,
          transferType: 'MINT',
          priceUsd: ticket.originalPriceUsd,
        },
      });

      results.push({
        ticketId: ticket.id,
        tokenId,
        txHash,
        success: true,
      });
    }

    // Update event's ZK Merkle tree with new tickets
    await updateEventMerkleTree(purchase.event.id);

    console.log(`[Blockchain] Minted ${results.length} tickets on-chain: ${txHash}`);
  } catch (error) {
    console.error('[Blockchain] Minting failed:', error);

    for (const ticket of tickets) {
      results.push({
        ticketId: ticket.id,
        success: false,
        error: (error as Error).message,
      });
    }
  }

  return results;
}

/**
 * Update event's ZK Merkle tree with all tickets
 */
async function updateEventMerkleTree(eventId: string): Promise<void> {
  const tickets = await prisma.ticket.findMany({
    where: {
      eventId,
      status: 'VALID',
      zkMerkleLeaf: { not: null },
    },
    select: {
      zkMerkleLeaf: true,
    },
  });

  if (tickets.length === 0) return;

  const leaves = tickets
    .filter((t) => t.zkMerkleLeaf)
    .map((t) => BigInt(t.zkMerkleLeaf!));

  const tree = await createMerkleTree(leaves);

  await prisma.zKMerkleTree.upsert({
    where: { eventId },
    create: {
      eventId,
      merkleRoot: tree.root.toString(),
      totalLeaves: leaves.length,
      treeData: JSON.stringify({
        leaves: tree.leaves.map((l) => l.toString()),
        depth: tree.depth,
      }),
    },
    update: {
      merkleRoot: tree.root.toString(),
      totalLeaves: leaves.length,
      treeData: JSON.stringify({
        leaves: tree.leaves.map((l) => l.toString()),
        depth: tree.depth,
      }),
    },
  });

  console.log(`[ZK] Updated Merkle tree for event ${eventId}: root = ${tree.root.toString().slice(0, 20)}...`);
}

/**
 * Batch mint tickets for an event
 */
export async function batchMintTickets(
  eventId: string,
  tierIndex: number,
  recipients: string[],
  quantities: number[]
): Promise<MintResult[]> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { ticketTiers: true },
  });

  if (!event) {
    console.error(`Event not found: ${eventId}`);
    return [];
  }

  const tier = event.ticketTiers[tierIndex];
  if (!tier) {
    console.error(`Tier ${tierIndex} not found for event: ${eventId}`);
    return [];
  }

  const results: MintResult[] = [];

  // If no contract address, create tickets in DB only
  if (!event.contractAddress || !isBlockchainEnabled()) {
    console.log(`[Blockchain] Creating ${recipients.length} tickets in DB only`);

    for (let i = 0; i < recipients.length; i++) {
      const quantity = quantities[i] || 1;
      for (let q = 0; q < quantity; q++) {
        const ticketSalt = ethers.hexlify(ethers.randomBytes(32));

        const ticket = await prisma.ticket.create({
          data: {
            eventId,
            tierId: tier.id,
            ownerId: recipients[i], // Assumes this is a user ID
            status: 'VALID',
            originalPriceUsd: tier.priceUsd,
            zkTicketSalt: ticketSalt,
            mintedAt: new Date(),
          },
        });

        results.push({ ticketId: ticket.id, success: true });
      }
    }

    await updateEventMerkleTree(eventId);
    return results;
  }

  // Mint on-chain
  try {
    const mintParams: MintTicketParams[] = [];
    const allRecipients: string[] = [];

    for (let i = 0; i < recipients.length; i++) {
      const quantity = quantities[i] || 1;
      for (let q = 0; q < quantity; q++) {
        allRecipients.push(recipients[i]);
        mintParams.push({
          eventId: Number(event.eventIdOnChain),
          recipient: recipients[i],
          tier: tier.tierIdOnChain ? Number(tier.tierIdOnChain) : tierIndex,
          originalPrice: ethers.parseEther(tier.priceUsd.toString()),
        });
      }
    }

    const { tokenIds, txHash } = await blockchainService.mintTicketBatch(
      event.contractAddress,
      allRecipients,
      mintParams
    );

    // Create tickets in DB
    for (let i = 0; i < tokenIds.length; i++) {
      const ticketSalt = ethers.hexlify(ethers.randomBytes(32));
      const leafHash = await computeLeafHash({
        tokenId: tokenIds[i],
        eventId: BigInt(event.eventIdOnChain || 0),
        tier: mintParams[i].tier,
        originalPrice: BigInt(Math.round(tier.priceUsd * 1e18)),
        salt: BigInt(ticketSalt),
      });

      const ticket = await prisma.ticket.create({
        data: {
          eventId,
          tierId: tier.id,
          ownerId: allRecipients[i],
          status: 'VALID',
          tokenId: tokenIds[i],
          contractAddress: event.contractAddress,
          mintTxHash: txHash,
          originalPriceUsd: tier.priceUsd,
          zkTicketSalt: ticketSalt,
          zkMerkleLeaf: leafHash.toString(),
          mintedAt: new Date(),
        },
      });

      results.push({
        ticketId: ticket.id,
        tokenId: tokenIds[i],
        txHash,
        success: true,
      });
    }

    await updateEventMerkleTree(eventId);
    console.log(`[Blockchain] Batch minted ${tokenIds.length} tickets`);
  } catch (error) {
    console.error('[Blockchain] Batch minting failed:', error);
    return [];
  }

  return results;
}

/**
 * Retry failed mints
 */
export async function retryFailedMints(eventId: string): Promise<MintResult[]> {
  const tickets = await prisma.ticket.findMany({
    where: {
      eventId,
      status: 'PENDING_MINT',
    },
    include: {
      tier: true,
      owner: true,
    },
  });

  if (tickets.length === 0) {
    console.log(`[Blockchain] No pending mints for event: ${eventId}`);
    return [];
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    return [];
  }

  const results: MintResult[] = [];

  // If blockchain disabled, just mark as valid
  if (!event.contractAddress || !isBlockchainEnabled()) {
    for (const ticket of tickets) {
      const ticketSalt = ethers.hexlify(ethers.randomBytes(32));
      const leafHash = await computeLeafHash({
        tokenId: BigInt(tickets.indexOf(ticket) + 1),
        eventId: BigInt(event.eventIdOnChain || 0),
        tier: ticket.tier.tierIdOnChain ? Number(ticket.tier.tierIdOnChain) : 0,
        originalPrice: BigInt(Math.round(ticket.originalPriceUsd * 1e18)),
        salt: BigInt(ticketSalt),
      });

      await prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          status: 'VALID',
          mintedAt: new Date(),
          zkTicketSalt: ticketSalt,
          zkMerkleLeaf: leafHash.toString(),
        },
      });

      results.push({ ticketId: ticket.id, success: true });
    }

    await updateEventMerkleTree(eventId);
    return results;
  }

  // Retry on-chain minting
  try {
    const mintParams: MintTicketParams[] = tickets.map((ticket) => ({
      eventId: Number(event.eventIdOnChain),
      recipient: ticket.owner.walletAddress || ethers.ZeroAddress,
      tier: ticket.tier.tierIdOnChain ? Number(ticket.tier.tierIdOnChain) : 0,
      originalPrice: ethers.parseEther(ticket.originalPriceUsd.toString()),
    }));

    const recipients = tickets.map((t) => t.owner.walletAddress || ethers.ZeroAddress);

    const { tokenIds, txHash } = await blockchainService.mintTicketBatch(
      event.contractAddress,
      recipients,
      mintParams
    );

    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i];
      const ticketSalt = ethers.hexlify(ethers.randomBytes(32));
      const leafHash = await computeLeafHash({
        tokenId: tokenIds[i],
        eventId: BigInt(event.eventIdOnChain || 0),
        tier: mintParams[i].tier,
        originalPrice: BigInt(Math.round(ticket.originalPriceUsd * 1e18)),
        salt: BigInt(ticketSalt),
      });

      await prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          status: 'VALID',
          tokenId: tokenIds[i],
          contractAddress: event.contractAddress,
          mintTxHash: txHash,
          mintedAt: new Date(),
          zkTicketSalt: ticketSalt,
          zkMerkleLeaf: leafHash.toString(),
        },
      });

      results.push({
        ticketId: ticket.id,
        tokenId: tokenIds[i],
        txHash,
        success: true,
      });
    }

    await updateEventMerkleTree(eventId);
    console.log(`[Blockchain] Retried ${results.length} mints successfully`);
  } catch (error) {
    console.error('[Blockchain] Retry minting failed:', error);
    for (const ticket of tickets) {
      results.push({
        ticketId: ticket.id,
        success: false,
        error: (error as Error).message,
      });
    }
  }

  return results;
}
