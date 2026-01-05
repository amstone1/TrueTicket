/**
 * Face Template Processing
 *
 * Handles face recognition template generation and processing.
 * Templates are hashed before storage - raw biometric data is NEVER stored.
 *
 * This module can work with various face recognition SDKs:
 * - FaceTec (recommended for production - 3D liveness)
 * - face-api.js (open source, client-side)
 * - AWS Rekognition (cloud-based)
 */

import { createHash } from 'crypto';
import {
  processFaceTemplate,
  createBiometricCommitment,
  generateBiometricSalt,
  BIOMETRIC_TEMPLATE_ELEMENTS,
} from '@/lib/zk/biometric';
import type { BiometricCommitment } from '@/lib/zk/types';

export interface FaceEnrollmentResult {
  success: boolean;
  templateHash?: string;          // SHA-256 of template (for DB storage)
  commitment?: BiometricCommitment; // ZK commitment (for on-chain)
  error?: string;
}

export interface FaceVerificationResult {
  success: boolean;
  matchScore?: number;
  livenessScore?: number;
  error?: string;
}

/**
 * Process a face template from the recognition SDK
 * Returns hashed template suitable for storage and ZK proofs
 */
export async function processAndHashTemplate(
  rawTemplate: Float32Array | number[]
): Promise<{
  templateHash: string;
  zkTemplateHash: bigint[];
}> {
  // 1. Create SHA-256 hash of raw template (for database storage)
  const templateBuffer = Buffer.from(new Float32Array(rawTemplate).buffer);
  const templateHash = createHash('sha256').update(templateBuffer).digest('hex');

  // 2. Process for ZK proofs (field elements)
  const zkTemplateHash = await processFaceTemplate(rawTemplate);

  return {
    templateHash,
    zkTemplateHash,
  };
}

/**
 * Enroll a new face template
 *
 * This is called after successful face capture and liveness check.
 * Returns the commitment to be stored on-chain.
 */
export async function enrollFaceTemplate(
  rawTemplate: Float32Array | number[]
): Promise<FaceEnrollmentResult> {
  try {
    // 1. Process the template
    const { templateHash, zkTemplateHash } = await processAndHashTemplate(rawTemplate);

    // 2. Generate enrollment salt
    const salt = generateBiometricSalt();

    // 3. Create ZK commitment
    const commitment = await createBiometricCommitment(zkTemplateHash, salt);

    return {
      success: true,
      templateHash,
      commitment,
    };
  } catch (error) {
    console.error('Face enrollment error:', error);
    return {
      success: false,
      error: 'Failed to process face template',
    };
  }
}

/**
 * Verify liveness from face capture metadata
 *
 * This is a placeholder for actual liveness detection.
 * In production, use FaceTec or similar 3D liveness SDK.
 */
export function verifyLiveness(captureMetadata: {
  frames?: number;
  duration?: number;
  headMovement?: boolean;
  blinkDetected?: boolean;
}): { passed: boolean; score: number; reason?: string } {
  // Basic liveness checks (in production, use SDK)
  let score = 0;

  // Check for multiple frames (anti-photo)
  if (captureMetadata.frames && captureMetadata.frames >= 10) {
    score += 0.25;
  }

  // Check capture duration (anti-video injection)
  if (captureMetadata.duration && captureMetadata.duration >= 2000) {
    score += 0.25;
  }

  // Check for head movement (anti-static image)
  if (captureMetadata.headMovement) {
    score += 0.25;
  }

  // Check for blink detection
  if (captureMetadata.blinkDetected) {
    score += 0.25;
  }

  return {
    passed: score >= 0.5,
    score,
    reason: score < 0.5 ? 'Liveness check failed' : undefined,
  };
}

/**
 * Template quality check
 */
export function checkTemplateQuality(template: Float32Array | number[]): {
  acceptable: boolean;
  score: number;
  issues: string[];
} {
  const issues: string[] = [];

  // Check template has expected length (typical: 128-512 values)
  if (template.length < 64) {
    issues.push('Template too short');
  }
  if (template.length > 1024) {
    issues.push('Template too long');
  }

  // Check for zero/NaN values
  let zeroCount = 0;
  let nanCount = 0;
  for (const value of template) {
    if (value === 0) zeroCount++;
    if (isNaN(value)) nanCount++;
  }

  if (zeroCount > template.length * 0.5) {
    issues.push('Too many zero values');
  }
  if (nanCount > 0) {
    issues.push('Template contains NaN values');
  }

  // Check value distribution (should have variance)
  const values = Array.from(template);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;

  if (variance < 0.001) {
    issues.push('Template has low variance');
  }

  const score = Math.max(0, 1 - issues.length * 0.25);

  return {
    acceptable: issues.length === 0,
    score,
    issues,
  };
}

/**
 * Compare enrollment template with verification template
 * For server-side matching (not ZK)
 */
export function compareTemplates(
  enrollmentHash: string,
  verificationTemplate: Float32Array | number[]
): { match: boolean; score: number } {
  // Hash the verification template
  const templateBuffer = Buffer.from(new Float32Array(verificationTemplate).buffer);
  const verificationHash = createHash('sha256').update(templateBuffer).digest('hex');

  // For hash comparison, it's either match or no match
  // In production with actual templates, you'd use cosine similarity
  const match = enrollmentHash === verificationHash;

  return {
    match,
    score: match ? 1.0 : 0.0,
  };
}

/**
 * Generate a mock template for testing
 * DO NOT use in production
 */
export function generateMockTemplate(seed: number = Date.now()): Float32Array {
  const template = new Float32Array(128);
  let s = seed;

  for (let i = 0; i < template.length; i++) {
    // Simple PRNG for reproducible mock templates
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    template[i] = (s / 0x7fffffff) * 2 - 1; // -1 to 1 range
  }

  return template;
}
