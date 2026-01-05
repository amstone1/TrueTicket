/**
 * Biometric Binding API
 *
 * Binds a user's biometric (face or WebAuthn) to their ticket.
 * This creates an on-chain binding that prevents ticket transfer without rebinding.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { ethers } from 'ethers';
import { createHash } from 'crypto';

const PLATFORM_SIGNER_KEY = process.env.PLATFORM_WALLET_PRIVATE_KEY || '';

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const userId = authResult.user.userId;

    // Parse request body
    const body = await request.json();
    const { ticketId, biometricType } = body as {
      ticketId: string;
      biometricType: 'FACE_TEMPLATE' | 'WEBAUTHN_CREDENTIAL';
    };

    if (!ticketId) {
      return NextResponse.json(
        { error: 'Ticket ID is required' },
        { status: 400 }
      );
    }

    // 1. Verify ticket ownership
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { owner: true },
    });

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    if (ticket.ownerId !== userId) {
      return NextResponse.json(
        { error: 'You do not own this ticket' },
        { status: 403 }
      );
    }

    // 2. Get user's biometric data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        faceTemplateHash: true,
        biometricCommitment: true,
        webAuthnCredentials: {
          where: { isActive: true },
          take: 1,
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Determine biometric hash based on type
    let biometricHash: string;

    if (biometricType === 'FACE_TEMPLATE') {
      if (!user.faceTemplateHash) {
        return NextResponse.json(
          { error: 'No face template enrolled. Please enroll first.' },
          { status: 400 }
        );
      }
      biometricHash = user.faceTemplateHash;
    } else if (biometricType === 'WEBAUTHN_CREDENTIAL') {
      if (user.webAuthnCredentials.length === 0) {
        return NextResponse.json(
          { error: 'No WebAuthn credential registered.' },
          { status: 400 }
        );
      }
      // Hash the credential ID
      biometricHash = createHash('sha256')
        .update(user.webAuthnCredentials[0].credentialId)
        .digest('hex');
    } else {
      return NextResponse.json(
        { error: 'Invalid biometric type' },
        { status: 400 }
      );
    }

    // 3. Create binding record in database
    const binding = await prisma.biometricBinding.create({
      data: {
        ticketId,
        biometricHash,
        biometricType,
        status: 'ACTIVE',
        nonce: generateNonce(),
      },
    });

    // 4. Update ticket with binding info
    await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        currentBiometricHash: biometricHash,
        biometricBoundAt: new Date(),
      },
    });

    // 5. Generate signature for on-chain binding (if ticket has tokenId)
    let signature: string | undefined;
    let biometricHashBytes32: string | undefined;

    if (ticket.tokenId && ticket.contractAddress && PLATFORM_SIGNER_KEY) {
      // Convert hash to bytes32
      biometricHashBytes32 = '0x' + biometricHash.padStart(64, '0').slice(0, 64);

      // Create message hash for signing
      const messageHash = ethers.solidityPackedKeccak256(
        ['uint256', 'bytes32', 'address', 'uint256'],
        [
          ticket.tokenId,
          biometricHashBytes32,
          user.webAuthnCredentials[0]?.credentialId
            ? ethers.getAddress('0x' + createHash('sha256')
                .update(userId)
                .digest('hex')
                .slice(0, 40))
            : ethers.ZeroAddress,
          await getChainId(),
        ]
      );

      // Sign the message
      const wallet = new ethers.Wallet(PLATFORM_SIGNER_KEY);
      signature = await wallet.signMessage(ethers.getBytes(messageHash));
    }

    return NextResponse.json({
      success: true,
      message: 'Biometric bound to ticket',
      binding: {
        id: binding.id,
        ticketId,
        biometricType,
        boundAt: binding.boundAt.toISOString(),
      },
      // Include on-chain binding data if available
      onChain: signature
        ? {
            biometricHash: biometricHashBytes32,
            signature,
            tokenId: ticket.tokenId,
            contractAddress: ticket.contractAddress,
          }
        : undefined,
    });
  } catch (error) {
    console.error('Biometric bind error:', error);
    return NextResponse.json(
      { error: 'Failed to bind biometric to ticket' },
      { status: 500 }
    );
  }
}

/**
 * Get binding status for a ticket
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const userId = authResult.user.userId;
    const ticketId = request.nextUrl.searchParams.get('ticketId');

    if (!ticketId) {
      return NextResponse.json(
        { error: 'Ticket ID is required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        biometricBindings: {
          where: { status: 'ACTIVE' },
          orderBy: { boundAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!ticket || ticket.ownerId !== userId) {
      return NextResponse.json(
        { error: 'Ticket not found or not owned by you' },
        { status: 404 }
      );
    }

    const activeBinding = ticket.biometricBindings[0];

    return NextResponse.json({
      ticketId,
      isBound: !!activeBinding,
      binding: activeBinding
        ? {
            type: activeBinding.biometricType,
            boundAt: activeBinding.boundAt.toISOString(),
            status: activeBinding.status,
          }
        : null,
      requiresRebind: ticket.biometricBindings.some(
        (b) => b.status === 'PENDING_REBIND'
      ),
    });
  } catch (error) {
    console.error('Get binding status error:', error);
    return NextResponse.json(
      { error: 'Failed to get binding status' },
      { status: 500 }
    );
  }
}

function generateNonce(): string {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    const nodeCrypto = require('crypto');
    const buffer = nodeCrypto.randomBytes(16);
    bytes.set(buffer);
  }
  return Buffer.from(bytes).toString('hex');
}

async function getChainId(): Promise<number> {
  // Return configured chain ID
  return parseInt(process.env.CHAIN_ID || '1');
}
