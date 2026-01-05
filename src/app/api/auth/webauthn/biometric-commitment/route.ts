/**
 * WebAuthn to ZK Biometric Commitment API
 *
 * Converts a WebAuthn credential into a ZK-compatible biometric commitment.
 * This allows hardware biometric authentication to be used with the ZK verification system.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import {
  hashWebAuthnCredential,
  createBiometricCommitment,
  serializeCommitment,
} from '@/lib/zk/biometric';

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const userId = authResult.user.userId;

    // Get user's active WebAuthn credential
    const credential = await prisma.webAuthnCredential.findFirst({
      where: {
        userId,
        isActive: true,
      },
      orderBy: {
        lastUsedAt: 'desc',
      },
    });

    if (!credential) {
      return NextResponse.json(
        { error: 'No active WebAuthn credential found. Please register a device first.' },
        { status: 400 }
      );
    }

    // Convert WebAuthn credential ID to ZK-compatible biometric template hash
    const templateHash = await hashWebAuthnCredential(credential.credentialId);

    // Create ZK biometric commitment
    const commitment = await createBiometricCommitment(templateHash);

    // Store commitment in database
    await prisma.user.update({
      where: { id: userId },
      data: {
        biometricCommitment: commitment.commitment.toString(),
        zkVerificationEnabled: true,
      },
    });

    // Return commitment for on-chain registration
    return NextResponse.json({
      success: true,
      message: 'WebAuthn credential linked to ZK biometric system',
      commitment: commitment.commitment.toString(),
      enrolledAt: new Date().toISOString(),
      credentialId: credential.id,
      deviceName: credential.deviceName,
    });
  } catch (error) {
    console.error('WebAuthn biometric commitment error:', error);
    return NextResponse.json(
      { error: 'Failed to create biometric commitment' },
      { status: 500 }
    );
  }
}

/**
 * Get current biometric commitment status
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const userId = authResult.user.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        biometricCommitment: true,
        zkVerificationEnabled: true,
        webAuthnCredentials: {
          where: { isActive: true },
          select: {
            id: true,
            deviceName: true,
            createdAt: true,
            lastUsedAt: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      hasCommitment: !!user.biometricCommitment,
      zkEnabled: user.zkVerificationEnabled,
      credentials: user.webAuthnCredentials.map(c => ({
        id: c.id,
        deviceName: c.deviceName,
        createdAt: c.createdAt.toISOString(),
        lastUsedAt: c.lastUsedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Get biometric commitment error:', error);
    return NextResponse.json(
      { error: 'Failed to get biometric commitment status' },
      { status: 500 }
    );
  }
}
