/**
 * TrueTicket ZK Verifier
 *
 * Off-chain verification of ZK proofs.
 * Used for quick verification before on-chain submission.
 */

import * as snarkjs from 'snarkjs';
import type { ZKProofPackage, VerificationResult } from './types';
import { prisma } from '@/lib/prisma';

// Verification key (loaded from build output)
let verificationKey: any = null;

/**
 * Load verification key from file or cache
 */
async function getVerificationKey(): Promise<any> {
  if (verificationKey) return verificationKey;

  try {
    // In production, this would be loaded from a secure source
    const response = await fetch('/circuits/verification_key.json');
    verificationKey = await response.json();
    return verificationKey;
  } catch (error) {
    console.error('Failed to load verification key:', error);
    throw new Error('Verification key not available');
  }
}

/**
 * Verify a ZK proof off-chain
 *
 * This is faster than on-chain verification and can be used
 * for immediate feedback to users.
 */
export async function verifyProofOffChain(
  proof: ZKProofPackage
): Promise<boolean> {
  const vkey = await getVerificationKey();

  const result = await snarkjs.groth16.verify(
    vkey,
    proof.publicSignals,
    proof.proof
  );

  return result;
}

/**
 * Full verification flow including database checks
 */
export async function verifyTicketProof(
  proof: ZKProofPackage,
  eventId: string
): Promise<VerificationResult> {
  try {
    // 1. Extract public signals
    const [
      merkleRootStr,
      biometricCommitmentStr,
      eventIdStr,
      timestampStr,
      nonceStr,
      nonceExpiryStr,
    ] = proof.publicSignals;

    const nonce = BigInt(nonceStr);
    const nonceExpiry = parseInt(nonceExpiryStr);
    const timestamp = parseInt(timestampStr);

    // 2. Check nonce hasn't been used
    const existingNonce = await prisma.zKUsedNonce.findUnique({
      where: { nonce: nonceStr },
    });

    if (existingNonce) {
      return {
        valid: false,
        reason: 'Nonce already used (potential replay attack)',
      };
    }

    // 3. Check nonce hasn't expired
    const currentTime = Math.floor(Date.now() / 1000);
    if (currentTime > nonceExpiry) {
      return {
        valid: false,
        reason: 'Verification expired',
      };
    }

    // 4. Verify event ID matches
    if (eventIdStr !== eventId) {
      return {
        valid: false,
        reason: 'Event ID mismatch',
      };
    }

    // 5. Check Merkle root is valid for this event
    const merkleTree = await prisma.zKMerkleTree.findUnique({
      where: { eventId },
    });

    if (!merkleTree) {
      return {
        valid: false,
        reason: 'Event not found in ZK system',
      };
    }

    // Check current root or recent history
    // (In production, implement root history checking)
    if (merkleTree.merkleRoot !== merkleRootStr) {
      return {
        valid: false,
        reason: 'Invalid Merkle root (ticket may have been transferred)',
      };
    }

    // 6. Verify the ZK proof
    const proofValid = await verifyProofOffChain(proof);
    if (!proofValid) {
      return {
        valid: false,
        reason: 'Invalid ZK proof',
      };
    }

    // 7. Mark nonce as used
    await prisma.zKUsedNonce.create({
      data: {
        nonce: nonceStr,
        ticketId: 'unknown', // We don't know the ticket ID (that's the point!)
        eventId,
        proofHash: computeProofHash(proof),
      },
    });

    // 8. Log the verification
    await prisma.zKProofLog.create({
      data: {
        eventId,
        proofType: 'COMBINED',
        proofHash: computeProofHash(proof),
        circuitName: 'TrueTicketVerification',
        publicInputs: JSON.stringify(proof.publicSignals),
        verified: true,
        verifiedOnChain: false,
      },
    });

    return {
      valid: true,
      eventId: BigInt(eventIdStr),
      timestamp: currentTime,
      reason: 'Verified successfully',
    };
  } catch (error) {
    console.error('Verification error:', error);
    return {
      valid: false,
      reason: 'Verification failed: ' + (error as Error).message,
    };
  }
}

/**
 * Compute a unique hash for a proof (for deduplication)
 */
function computeProofHash(proof: ZKProofPackage): string {
  const data = JSON.stringify({
    proof: proof.proof,
    signals: proof.publicSignals,
  });

  // Simple hash for deduplication
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(16);
}

/**
 * Batch verify multiple proofs
 */
export async function batchVerifyProofs(
  proofs: Array<{ proof: ZKProofPackage; eventId: string }>
): Promise<VerificationResult[]> {
  const results: VerificationResult[] = [];

  for (const { proof, eventId } of proofs) {
    const result = await verifyTicketProof(proof, eventId);
    results.push(result);
  }

  return results;
}

/**
 * Initialize verifier with verification key
 */
export async function initializeVerifier(vkey?: any): Promise<void> {
  if (vkey) {
    verificationKey = vkey;
  } else {
    await getVerificationKey();
  }
}

/**
 * Export verification key for client-side use
 */
export function getVerificationKeyForClient(): any {
  return verificationKey;
}
