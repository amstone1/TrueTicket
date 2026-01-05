/**
 * TrueTicket Biometric Processing for ZK Proofs
 *
 * Handles biometric template hashing and commitment generation.
 * IMPORTANT: Raw biometric data is NEVER stored or transmitted.
 */

import { buildPoseidon, type Poseidon } from 'circomlibjs';
import type { BiometricCommitment } from './types';

let poseidon: Poseidon | null = null;

/**
 * Initialize Poseidon hasher
 */
async function getPoseidon(): Promise<Poseidon> {
  if (!poseidon) {
    poseidon = await buildPoseidon();
  }
  return poseidon;
}

/**
 * Convert field element to bigint
 */
function F2BigInt(p: Poseidon, element: any): bigint {
  return p.F.toObject(element);
}

/**
 * Number of field elements for biometric template
 * 16 elements * 16 bytes = 256 bits of entropy
 */
export const BIOMETRIC_TEMPLATE_ELEMENTS = 16;

/**
 * Generate a random salt for biometric enrollment
 */
export function generateBiometricSalt(): bigint {
  const bytes = new Uint8Array(32);
  if (typeof window !== 'undefined') {
    crypto.getRandomValues(bytes);
  } else {
    const nodeCrypto = require('crypto');
    const buffer = nodeCrypto.randomBytes(32);
    bytes.set(buffer);
  }

  let result = BigInt(0);
  for (const byte of bytes) {
    result = (result << BigInt(8)) + BigInt(byte);
  }
  return result;
}

/**
 * Convert a face template (from SDK) to ZK-compatible format
 *
 * Face templates are typically 128-512 floats from the recognition SDK.
 * We hash them into field elements for ZK proving.
 */
export async function processFaceTemplate(
  rawTemplate: Float32Array | number[]
): Promise<bigint[]> {
  const p = await getPoseidon();

  // Convert floats to integers (multiply by scale factor)
  const scaleFactor = 1e6;
  const integers = Array.from(rawTemplate).map((x) =>
    BigInt(Math.round(x * scaleFactor))
  );

  // Chunk and hash to get fixed number of elements
  const chunkSize = Math.ceil(integers.length / BIOMETRIC_TEMPLATE_ELEMENTS);
  const templateHash: bigint[] = [];

  for (let i = 0; i < BIOMETRIC_TEMPLATE_ELEMENTS; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, integers.length);
    const chunk = integers.slice(start, end);

    if (chunk.length === 0) {
      templateHash.push(BigInt(0));
      continue;
    }

    // Hash this chunk
    const inputs = chunk.slice(0, 16); // Poseidon max 16 inputs
    while (inputs.length < 2) {
      inputs.push(BigInt(0)); // Pad if needed
    }

    const hash = p(inputs.map((x) => p.F.e(x)));
    templateHash.push(F2BigInt(p, hash));
  }

  return templateHash;
}

/**
 * Create a biometric commitment for ZK proofs
 *
 * commitment = Poseidon(Poseidon(template...), salt)
 *
 * This is what gets stored on-chain.
 */
export async function createBiometricCommitment(
  templateHash: bigint[],
  salt?: bigint
): Promise<BiometricCommitment> {
  const p = await getPoseidon();

  // Use provided salt or generate new one
  const enrollmentSalt = salt || generateBiometricSalt();

  // Hash all template elements
  const templateHashCombined = p(templateHash.map((x) => p.F.e(x)));

  // Combine with salt
  const commitment = p([templateHashCombined, p.F.e(enrollmentSalt)]);

  return {
    commitment: F2BigInt(p, commitment),
    templateHash,
    salt: enrollmentSalt,
    enrolledAt: Date.now(),
  };
}

/**
 * Verify that a template matches a commitment
 * (Used for debugging/testing - in production, ZK proofs handle this)
 */
export async function verifyBiometricCommitment(
  templateHash: bigint[],
  salt: bigint,
  expectedCommitment: bigint
): Promise<boolean> {
  const p = await getPoseidon();

  const templateHashCombined = p(templateHash.map((x) => p.F.e(x)));
  const commitment = p([templateHashCombined, p.F.e(salt)]);
  const computedCommitment = F2BigInt(p, commitment);

  return computedCommitment === expectedCommitment;
}

/**
 * Hash a WebAuthn credential ID for biometric binding
 */
export async function hashWebAuthnCredential(
  credentialId: string
): Promise<bigint[]> {
  const p = await getPoseidon();

  // Convert credential ID to bytes
  const bytes = Buffer.from(credentialId, 'base64url');

  // Chunk into field elements
  const templateHash: bigint[] = [];
  const chunkSize = Math.ceil(bytes.length / BIOMETRIC_TEMPLATE_ELEMENTS);

  for (let i = 0; i < BIOMETRIC_TEMPLATE_ELEMENTS; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, bytes.length);
    const chunk = bytes.slice(start, end);

    let value = BigInt(0);
    for (const byte of chunk) {
      value = (value << BigInt(8)) + BigInt(byte);
    }
    templateHash.push(value);
  }

  return templateHash;
}

/**
 * Serialize biometric commitment for storage
 */
export function serializeCommitment(commitment: BiometricCommitment): string {
  return JSON.stringify({
    commitment: commitment.commitment.toString(),
    templateHash: commitment.templateHash.map((x) => x.toString()),
    salt: commitment.salt.toString(),
    enrolledAt: commitment.enrolledAt,
  });
}

/**
 * Deserialize biometric commitment from storage
 */
export function deserializeCommitment(data: string): BiometricCommitment {
  const parsed = JSON.parse(data);
  return {
    commitment: BigInt(parsed.commitment),
    templateHash: parsed.templateHash.map((x: string) => BigInt(x)),
    salt: BigInt(parsed.salt),
    enrolledAt: parsed.enrolledAt,
  };
}

/**
 * Compare two face templates for similarity
 * Returns a score from 0 to 1 (1 = perfect match)
 *
 * Used for liveness verification, not ZK proofs.
 */
export function compareFaceTemplates(
  template1: Float32Array | number[],
  template2: Float32Array | number[]
): number {
  if (template1.length !== template2.length) {
    throw new Error('Template length mismatch');
  }

  // Cosine similarity
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < template1.length; i++) {
    dotProduct += template1[i] * template2[i];
    norm1 += template1[i] * template1[i];
    norm2 += template2[i] * template2[i];
  }

  if (norm1 === 0 || norm2 === 0) return 0;

  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

/**
 * Threshold for face match (0.7 = 70% similarity required)
 */
export const FACE_MATCH_THRESHOLD = 0.7;

/**
 * Check if two templates match
 */
export function doFaceTemplatesMatch(
  template1: Float32Array | number[],
  template2: Float32Array | number[]
): boolean {
  const similarity = compareFaceTemplates(template1, template2);
  return similarity >= FACE_MATCH_THRESHOLD;
}
