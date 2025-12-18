/**
 * Ticket Verification API
 *
 * GET /api/tickets/[id]/verify - Generate a rotating verification code
 * POST /api/tickets/[id]/verify - Verify a code (for scanners)
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/verify';
import {
  generateVerificationCode,
  verifyCheckInCode,
  processCheckIn,
} from '@/lib/blockchain/verification';

// GET - Generate rotating verification code for ticket owner
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: ticketId } = await params;

    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    // Generate rotating verification code
    const verification = await generateVerificationCode(ticketId, authResult.userId);

    return NextResponse.json({
      code: verification.code,
      expiresAt: verification.expiresAt,
      expiresIn: verification.expiresAt - Math.floor(Date.now() / 1000),
      ticketId: verification.ticketId,
      // Include signature for QR code data
      signature: verification.signature,
    });
  } catch (error) {
    console.error('Verification code generation error:', error);

    if (error instanceof Error) {
      if (
        error.message.includes('not found') ||
        error.message.includes('do not own')
      ) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error.message.includes('not valid') || error.message.includes('USED')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    return NextResponse.json(
      { error: 'Failed to generate verification code' },
      { status: 500 }
    );
  }
}

// POST - Verify check-in code (for scanners)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: ticketId } = await params;

    // Verify authentication (scanner must be authenticated)
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const body = await request.json();
    const { code, signature, checkIn } = body;

    if (!code || !signature) {
      return NextResponse.json(
        { error: 'Missing code or signature' },
        { status: 400 }
      );
    }

    // Verify the code
    const verificationResult = await verifyCheckInCode(
      ticketId,
      code,
      signature,
      authResult.userId
    );

    if (!verificationResult.valid) {
      return NextResponse.json(
        {
          valid: false,
          reason: verificationResult.reason,
        },
        { status: 400 }
      );
    }

    // If checkIn flag is set, process the check-in
    if (checkIn) {
      const checkInResult = await processCheckIn(
        ticketId,
        authResult.userId,
        body.deviceInfo
      );

      return NextResponse.json({
        valid: true,
        checkedIn: true,
        ticket: verificationResult.ticket,
        txHash: checkInResult.txHash,
      });
    }

    // Just validation, no check-in
    return NextResponse.json({
      valid: true,
      checkedIn: false,
      ticket: verificationResult.ticket,
    });
  } catch (error) {
    console.error('Check-in verification error:', error);
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    );
  }
}
