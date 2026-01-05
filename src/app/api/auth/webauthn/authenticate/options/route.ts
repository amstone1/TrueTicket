/**
 * WebAuthn Authentication Options Endpoint
 *
 * Generates authentication options for device biometric login.
 * This is the first step in the WebAuthn authentication ceremony.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import type { AuthenticatorTransportFuture } from '@simplewebauthn/server';
import { prisma } from '@/lib/prisma';

const RP_ID = process.env.WEBAUTHN_RP_ID || 'localhost';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body as { email?: string };

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
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
      // Don't reveal whether the user exists
      return NextResponse.json(
        { error: 'No biometric credentials found for this account' },
        { status: 400 }
      );
    }

    if (user.webAuthnCredentials.length === 0) {
      return NextResponse.json(
        { error: 'No biometric credentials found. Please set up biometric login first.' },
        { status: 400 }
      );
    }

    // Convert credentials to allowCredentials format
    const allowCredentials = user.webAuthnCredentials.map((cred) => ({
      id: Buffer.from(cred.credentialId, 'base64url'),
      type: 'public-key' as const,
      transports: JSON.parse(cred.transports) as AuthenticatorTransportFuture[],
    }));

    // Generate authentication options
    const options = await generateAuthenticationOptions({
      rpID: RP_ID,
      allowCredentials,
      userVerification: 'preferred',
      timeout: 60000, // 60 seconds
    });

    // Store challenge and user ID in cookie for verification
    const response = NextResponse.json({
      success: true,
      options,
    });

    // Set challenge and user ID in cookies
    response.cookies.set('webauthn_auth_challenge', options.challenge, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 120, // 2 minutes
      path: '/',
    });

    response.cookies.set('webauthn_auth_user', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 120, // 2 minutes
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('WebAuthn authentication options error:', error);
    return NextResponse.json(
      { error: 'Failed to generate authentication options' },
      { status: 500 }
    );
  }
}
