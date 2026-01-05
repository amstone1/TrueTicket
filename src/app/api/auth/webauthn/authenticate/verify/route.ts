/**
 * WebAuthn Authentication Verification Endpoint
 *
 * Verifies the authentication response and issues a JWT session.
 * This completes the biometric login flow.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import type { AuthenticationResponseJSON } from '@simplewebauthn/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const RP_ID = process.env.WEBAUTHN_RP_ID || 'localhost';
const ORIGIN = process.env.WEBAUTHN_ORIGIN || 'http://localhost:3000';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export async function POST(request: NextRequest) {
  try {
    // Get the stored challenge and user ID from cookies
    const expectedChallenge = request.cookies.get('webauthn_auth_challenge')?.value;
    const userId = request.cookies.get('webauthn_auth_user')?.value;

    if (!expectedChallenge || !userId) {
      return NextResponse.json(
        { error: 'Authentication session expired. Please try again.' },
        { status: 400 }
      );
    }

    // Parse the authentication response
    const body = await request.json();
    const { response: authResponse } = body as {
      response: AuthenticationResponseJSON;
    };

    if (!authResponse) {
      return NextResponse.json(
        { error: 'Missing authentication response' },
        { status: 400 }
      );
    }

    // Find the credential used
    const credentialId = authResponse.id;

    const credential = await prisma.webAuthnCredential.findUnique({
      where: { credentialId },
      include: {
        user: true,
      },
    });

    if (!credential) {
      return NextResponse.json(
        { error: 'Credential not found' },
        { status: 400 }
      );
    }

    // Verify credential belongs to the expected user
    if (credential.userId !== userId) {
      return NextResponse.json(
        { error: 'Credential does not match user' },
        { status: 400 }
      );
    }

    // Verify the authentication response
    const verification = await verifyAuthenticationResponse({
      response: authResponse,
      expectedChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      credential: {
        id: Buffer.from(credential.credentialId, 'base64url'),
        publicKey: Buffer.from(credential.publicKey, 'base64'),
        counter: Number(credential.counter),
      },
      requireUserVerification: false,
    });

    if (!verification.verified) {
      return NextResponse.json(
        { error: 'Authentication verification failed' },
        { status: 400 }
      );
    }

    // Update counter to prevent replay attacks
    await prisma.webAuthnCredential.update({
      where: { id: credential.id },
      data: {
        counter: BigInt(verification.authenticationInfo.newCounter),
        lastUsedAt: new Date(),
      },
    });

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: credential.user.id,
        email: credential.user.email,
        authMethod: 'webauthn',
        credentialId: credential.id,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Clear challenge cookies and set session
    const response = NextResponse.json({
      success: true,
      message: 'Authentication successful',
      user: {
        id: credential.user.id,
        email: credential.user.email,
        displayName: credential.user.displayName,
      },
    });

    // Clear auth challenge cookies
    response.cookies.delete('webauthn_auth_challenge');
    response.cookies.delete('webauthn_auth_user');

    // Set session token
    response.cookies.set('session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('WebAuthn authentication verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify authentication' },
      { status: 500 }
    );
  }
}
