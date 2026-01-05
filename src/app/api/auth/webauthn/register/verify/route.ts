/**
 * WebAuthn Registration Verification Endpoint
 *
 * Verifies the registration response from the authenticator
 * and stores the credential for future authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import type { RegistrationResponseJSON } from '@simplewebauthn/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/middleware';

const RP_ID = process.env.WEBAUTHN_RP_ID || 'localhost';
const ORIGIN = process.env.WEBAUTHN_ORIGIN || 'http://localhost:3000';

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const userId = authResult.user.userId;

    // Get the stored challenge from cookie
    const expectedChallenge = request.cookies.get('webauthn_challenge')?.value;
    if (!expectedChallenge) {
      return NextResponse.json(
        { error: 'Registration session expired. Please try again.' },
        { status: 400 }
      );
    }

    // Parse the registration response
    const body = await request.json();
    const { response: registrationResponse, deviceName } = body as {
      response: RegistrationResponseJSON;
      deviceName?: string;
    };

    if (!registrationResponse) {
      return NextResponse.json(
        { error: 'Missing registration response' },
        { status: 400 }
      );
    }

    // Verify the registration response
    const verification = await verifyRegistrationResponse({
      response: registrationResponse,
      expectedChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      requireUserVerification: false, // Platform authenticators may not always require this
    });

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json(
        { error: 'Registration verification failed' },
        { status: 400 }
      );
    }

    const { registrationInfo } = verification;

    // Convert credential data to storable format
    const credentialId = Buffer.from(registrationInfo.credential.id).toString('base64url');
    const publicKey = Buffer.from(registrationInfo.credential.publicKey).toString('base64');
    const counter = registrationInfo.credential.counter;

    // Extract transports if available
    const transports = registrationResponse.response.transports || [];

    // Get device info from user agent
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Check if credential already exists
    const existingCredential = await prisma.webAuthnCredential.findUnique({
      where: { credentialId },
    });

    if (existingCredential) {
      return NextResponse.json(
        { error: 'This authenticator is already registered' },
        { status: 409 }
      );
    }

    // Store the credential
    const credential = await prisma.webAuthnCredential.create({
      data: {
        userId,
        credentialId,
        publicKey,
        counter: BigInt(counter),
        deviceType: registrationInfo.credentialDeviceType,
        transports: JSON.stringify(transports),
        aaguid: registrationInfo.aaguid,
        deviceName: deviceName || detectDeviceName(userAgent),
        userAgent,
        isActive: true,
      },
    });

    // Clear the challenge cookie
    const response = NextResponse.json({
      success: true,
      message: 'Biometric authentication registered successfully',
      credential: {
        id: credential.id,
        deviceName: credential.deviceName,
        createdAt: credential.createdAt,
      },
    });

    response.cookies.delete('webauthn_challenge');

    return response;
  } catch (error) {
    console.error('WebAuthn registration verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify registration' },
      { status: 500 }
    );
  }
}

/**
 * Detect device name from user agent
 */
function detectDeviceName(userAgent: string): string {
  const ua = userAgent.toLowerCase();

  if (ua.includes('iphone')) return 'iPhone';
  if (ua.includes('ipad')) return 'iPad';
  if (ua.includes('mac')) return 'Mac';
  if (ua.includes('windows')) return 'Windows PC';
  if (ua.includes('android')) return 'Android Device';
  if (ua.includes('linux')) return 'Linux Device';

  return 'Unknown Device';
}
