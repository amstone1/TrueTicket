/**
 * WebAuthn Registration Options Endpoint
 *
 * Generates registration options for device biometric authentication.
 * This is the first step in the WebAuthn registration ceremony.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import type { AuthenticatorTransportFuture } from '@simplewebauthn/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/middleware';

const RP_NAME = 'TrueTicket';
const RP_ID = process.env.WEBAUTHN_RP_ID || 'localhost';

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const userId = authResult.user.userId;

    // Fetch user and existing credentials
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        webAuthnCredentials: {
          where: { isActive: true },
          select: {
            credentialId: true,
            transports: true,
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

    // Convert existing credentials to excludeCredentials format
    const excludeCredentials = user.webAuthnCredentials.map((cred) => ({
      id: Buffer.from(cred.credentialId, 'base64url'),
      type: 'public-key' as const,
      transports: JSON.parse(cred.transports) as AuthenticatorTransportFuture[],
    }));

    // Generate registration options
    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: RP_ID,
      userID: new TextEncoder().encode(userId),
      userName: user.email || user.displayName || userId,
      userDisplayName: user.displayName || user.email || 'TrueTicket User',
      attestationType: 'none', // We don't need attestation for our use case
      excludeCredentials,
      authenticatorSelection: {
        // Prefer platform authenticators (Touch ID, Face ID, Windows Hello)
        authenticatorAttachment: 'platform',
        userVerification: 'preferred',
        residentKey: 'preferred',
      },
      timeout: 60000, // 60 seconds
    });

    // Store challenge in session/cache for verification
    // Using the user record as a temporary store (in production, use Redis)
    await prisma.user.update({
      where: { id: userId },
      data: {
        // Store challenge temporarily (you might want a separate table for this)
        // For now we'll pass it back and verify it client-side
      },
    });

    // Store challenge in a cookie for verification step
    const response = NextResponse.json({
      success: true,
      options,
    });

    // Set challenge in cookie (HttpOnly, Secure in production)
    response.cookies.set('webauthn_challenge', options.challenge, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 120, // 2 minutes
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('WebAuthn registration options error:', error);
    return NextResponse.json(
      { error: 'Failed to generate registration options' },
      { status: 500 }
    );
  }
}
