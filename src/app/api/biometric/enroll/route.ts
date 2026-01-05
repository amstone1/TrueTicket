/**
 * Face Biometric Enrollment API
 *
 * Enrolls a user's face template for venue check-in verification.
 * The raw template is processed and only hashes are stored.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import {
  enrollFaceTemplate,
  verifyLiveness,
  checkTemplateQuality,
} from '@/lib/biometric/faceTemplate';
import { serializeCommitment } from '@/lib/zk/biometric';

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
    const { template, livenessData } = body as {
      template: number[];
      livenessData?: {
        frames?: number;
        duration?: number;
        headMovement?: boolean;
        blinkDetected?: boolean;
      };
    };

    if (!template || !Array.isArray(template)) {
      return NextResponse.json(
        { error: 'Face template is required' },
        { status: 400 }
      );
    }

    // 1. Verify liveness
    if (livenessData) {
      const livenessResult = verifyLiveness(livenessData);
      if (!livenessResult.passed) {
        return NextResponse.json(
          { error: 'Liveness check failed. Please try again.' },
          { status: 400 }
        );
      }
    }

    // 2. Check template quality
    const qualityResult = checkTemplateQuality(template);
    if (!qualityResult.acceptable) {
      return NextResponse.json(
        {
          error: 'Face template quality insufficient',
          issues: qualityResult.issues,
        },
        { status: 400 }
      );
    }

    // 3. Process and enroll template
    const enrollResult = await enrollFaceTemplate(new Float32Array(template));
    if (!enrollResult.success || !enrollResult.commitment) {
      return NextResponse.json(
        { error: enrollResult.error || 'Enrollment failed' },
        { status: 500 }
      );
    }

    // 4. Store in database
    await prisma.user.update({
      where: { id: userId },
      data: {
        faceTemplateHash: enrollResult.templateHash,
        faceTemplateVersion: 1,
        faceEnrolledAt: new Date(),
        // Store ZK commitment data
        biometricCommitment: enrollResult.commitment.commitment.toString(),
        zkVerificationEnabled: true,
      },
    });

    // 5. Return success (never return the actual template or full commitment)
    return NextResponse.json({
      success: true,
      message: 'Face enrolled successfully',
      enrolledAt: new Date().toISOString(),
      // Return only the commitment for on-chain registration
      commitment: enrollResult.commitment.commitment.toString(),
    });
  } catch (error) {
    console.error('Face enrollment error:', error);
    return NextResponse.json(
      { error: 'Failed to enroll face' },
      { status: 500 }
    );
  }
}

/**
 * Check enrollment status
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
        faceEnrolledAt: true,
        faceTemplateVersion: true,
        zkVerificationEnabled: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      enrolled: !!user.faceEnrolledAt,
      enrolledAt: user.faceEnrolledAt?.toISOString(),
      version: user.faceTemplateVersion,
      zkEnabled: user.zkVerificationEnabled,
    });
  } catch (error) {
    console.error('Enrollment status error:', error);
    return NextResponse.json(
      { error: 'Failed to check enrollment status' },
      { status: 500 }
    );
  }
}

/**
 * Delete face enrollment
 */
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const userId = authResult.user.userId;

    await prisma.user.update({
      where: { id: userId },
      data: {
        faceTemplateHash: null,
        faceTemplateVersion: null,
        faceEnrolledAt: null,
        biometricCommitment: null,
        zkVerificationEnabled: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Face enrollment deleted',
    });
  } catch (error) {
    console.error('Delete enrollment error:', error);
    return NextResponse.json(
      { error: 'Failed to delete enrollment' },
      { status: 500 }
    );
  }
}
