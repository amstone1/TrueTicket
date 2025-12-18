/**
 * NFT Minting Service
 *
 * Handles the creation of on-chain events and minting of ticket NFTs.
 * Called after successful payment to tokenize tickets.
 */

import { ethers } from 'ethers';
import { prisma } from '@/lib/prisma';
import { blockchainService, type MintTicketParams } from './service';
import { getContractAddresses, ACTIVE_CHAIN } from './config';

interface EventOnChain {
  eventId: number;
  ticketContractAddress: string;
  txHash: string;
}

interface MintResult {
  success: boolean;
  ticketId: string;
  tokenId?: bigint;
  contractAddress?: string;
  txHash?: string;
  error?: string;
}

/**
 * Create an event on-chain via EventFactory
 * Returns the on-chain eventId and the deployed ticket contract address
 */
export async function createEventOnChain(dbEventId: string): Promise<EventOnChain> {
  await blockchainService.initialize();

  const event = await prisma.event.findUnique({
    where: { id: dbEventId },
    include: {
      organizer: true,
      tiers: true,
    },
  });

  if (!event) {
    throw new Error(`Event not found: ${dbEventId}`);
  }

  // Check if already created on-chain
  if (event.contractAddress && event.eventIdOnChain) {
    return {
      eventId: Number(event.eventIdOnChain),
      ticketContractAddress: event.contractAddress,
      txHash: '',
    };
  }

  const eventFactory = blockchainService.getEventFactory(true);
  if (!eventFactory) {
    throw new Error('EventFactory not deployed');
  }

  // Prepare tier data for on-chain
  const tierData = event.tiers.map((tier, index) => ({
    name: tier.name,
    price: ethers.parseEther((tier.priceUsd / 1000).toString()), // Convert USD to ETH equivalent (simplified)
    maxSupply: tier.quantity,
    perks: tier.perks ? JSON.parse(tier.perks) : [],
  }));

  // Set resale cap type based on event settings
  let resaleCapType = 0; // NO_CAP
  let resaleCapValue = 0n;

  if (event.maxResaleMarkupBps) {
    if (event.maxResaleMarkupBps === 0) {
      resaleCapType = 1; // FIXED_PRICE (must equal original)
    } else {
      resaleCapType = 2; // PERCENTAGE_CAP
      resaleCapValue = BigInt(event.maxResaleMarkupBps);
    }
  }

  // Create event on-chain
  const tx = await eventFactory.createEvent(
    event.name,
    event.description || '',
    Math.floor(event.startDate.getTime() / 1000),
    event.organizer.walletAddress || ethers.ZeroAddress,
    tierData,
    resaleCapType,
    resaleCapValue
  );

  const receipt = await tx.wait();

  // Extract event creation details from logs
  const eventCreatedLog = receipt.logs.find((log: any) => {
    try {
      const parsed = eventFactory.interface.parseLog(log);
      return parsed?.name === 'EventCreated';
    } catch {
      return false;
    }
  });

  if (!eventCreatedLog) {
    throw new Error('EventCreated event not found in transaction');
  }

  const parsed = eventFactory.interface.parseLog(eventCreatedLog);
  const onChainEventId = Number(parsed?.args.eventId);
  const ticketContractAddress = parsed?.args.ticketContract;

  // Update database with on-chain info
  await prisma.event.update({
    where: { id: dbEventId },
    data: {
      eventIdOnChain: BigInt(onChainEventId),
      contractAddress: ticketContractAddress,
    },
  });

  // Update tiers with on-chain tier IDs
  for (let i = 0; i < event.tiers.length; i++) {
    await prisma.ticketTier.update({
      where: { id: event.tiers[i].id },
      data: { tierIdOnChain: BigInt(i) },
    });
  }

  console.log(`Event ${dbEventId} created on-chain: eventId=${onChainEventId}, contract=${ticketContractAddress}`);

  return {
    eventId: onChainEventId,
    ticketContractAddress,
    txHash: receipt.hash,
  };
}

/**
 * Mint ticket NFTs for a completed purchase
 */
export async function mintTicketsForPurchase(purchaseId: string): Promise<MintResult[]> {
  await blockchainService.initialize();

  const purchase = await prisma.purchase.findUnique({
    where: { id: purchaseId },
    include: {
      event: true,
      buyer: true,
      tickets: {
        include: { tier: true },
      },
    },
  });

  if (!purchase) {
    throw new Error(`Purchase not found: ${purchaseId}`);
  }

  // Ensure event is created on-chain
  let eventOnChain: EventOnChain;
  if (!purchase.event.contractAddress || !purchase.event.eventIdOnChain) {
    eventOnChain = await createEventOnChain(purchase.eventId);
  } else {
    eventOnChain = {
      eventId: Number(purchase.event.eventIdOnChain),
      ticketContractAddress: purchase.event.contractAddress,
      txHash: '',
    };
  }

  const results: MintResult[] = [];

  // Determine recipient address
  // If user has wallet, use it. Otherwise, mint to platform wallet (custodial)
  const recipientAddress = purchase.buyer.walletAddress ||
    process.env.PLATFORM_WALLET_ADDRESS ||
    ethers.ZeroAddress;

  // Mint each ticket
  for (const ticket of purchase.tickets) {
    if (ticket.status !== 'PENDING_MINT') {
      results.push({
        success: false,
        ticketId: ticket.id,
        error: `Ticket status is ${ticket.status}, expected PENDING_MINT`,
      });
      continue;
    }

    try {
      const mintParams: MintTicketParams = {
        eventId: eventOnChain.eventId,
        recipient: recipientAddress,
        tier: Number(ticket.tier.tierIdOnChain || 0),
        originalPrice: ethers.parseEther((ticket.originalPriceUsd / 1000).toString()),
      };

      const transferRestrictions = {
        transferable: true,
        resaleAllowed: purchase.event.resaleAllowed,
        maxTransfers: purchase.event.maxTransfersPerTicket || 0,
        lockUntil: 0n, // No time lock
      };

      const mintResult = await blockchainService.mintTicket(
        eventOnChain.ticketContractAddress,
        mintParams,
        transferRestrictions
      );

      // Update ticket with on-chain data
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          tokenId: mintResult.tokenId,
          contractAddress: eventOnChain.ticketContractAddress,
          status: 'VALID',
          mintTxHash: mintResult.txHash,
        },
      });

      // Create transfer record for mint
      await prisma.ticketTransfer.create({
        data: {
          ticketId: ticket.id,
          fromAddress: ethers.ZeroAddress,
          toAddress: recipientAddress,
          toUserId: purchase.buyerId,
          type: 'MINT',
          txHash: mintResult.txHash,
        },
      });

      results.push({
        success: true,
        ticketId: ticket.id,
        tokenId: mintResult.tokenId,
        contractAddress: eventOnChain.ticketContractAddress,
        txHash: mintResult.txHash,
      });

      console.log(`Minted ticket ${ticket.id} as token #${mintResult.tokenId}`);
    } catch (error) {
      console.error(`Failed to mint ticket ${ticket.id}:`, error);
      results.push({
        success: false,
        ticketId: ticket.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return results;
}

/**
 * Batch mint tickets (more gas efficient for multiple tickets)
 */
export async function batchMintTickets(
  ticketContractAddress: string,
  tickets: Array<{
    ticketId: string;
    recipient: string;
    tier: number;
    priceUsd: number;
  }>
): Promise<MintResult[]> {
  await blockchainService.initialize();

  const addresses = getContractAddresses(ACTIVE_CHAIN);
  if (!addresses) {
    throw new Error('Contract addresses not configured');
  }

  const recipients = tickets.map(t => t.recipient);
  const paramsArray: MintTicketParams[] = tickets.map(t => ({
    eventId: 0, // Will be set from contract
    recipient: t.recipient,
    tier: t.tier,
    originalPrice: ethers.parseEther((t.priceUsd / 1000).toString()),
  }));

  try {
    const result = await blockchainService.mintTicketBatch(
      ticketContractAddress,
      recipients,
      paramsArray
    );

    // Update all tickets in database
    const results: MintResult[] = [];
    for (let i = 0; i < tickets.length; i++) {
      const tokenId = result.tokenIds[i];
      await prisma.ticket.update({
        where: { id: tickets[i].ticketId },
        data: {
          tokenId,
          contractAddress: ticketContractAddress,
          status: 'VALID',
          mintTxHash: result.txHash,
        },
      });

      results.push({
        success: true,
        ticketId: tickets[i].ticketId,
        tokenId,
        contractAddress: ticketContractAddress,
        txHash: result.txHash,
      });
    }

    return results;
  } catch (error) {
    console.error('Batch mint failed:', error);
    return tickets.map(t => ({
      success: false,
      ticketId: t.ticketId,
      error: error instanceof Error ? error.message : 'Batch mint failed',
    }));
  }
}

/**
 * Retry minting for failed tickets
 */
export async function retryFailedMints(eventId: string): Promise<MintResult[]> {
  const pendingTickets = await prisma.ticket.findMany({
    where: {
      eventId,
      status: 'PENDING_MINT',
    },
    include: {
      tier: true,
      owner: true,
      purchase: true,
    },
  });

  if (pendingTickets.length === 0) {
    return [];
  }

  // Group by purchase for efficient processing
  const purchaseIds = [...new Set(pendingTickets.map(t => t.purchaseId).filter(Boolean))];
  const results: MintResult[] = [];

  for (const purchaseId of purchaseIds) {
    if (purchaseId) {
      const purchaseResults = await mintTicketsForPurchase(purchaseId);
      results.push(...purchaseResults);
    }
  }

  return results;
}
