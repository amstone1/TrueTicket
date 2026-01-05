/**
 * TrueTicket ZK Prover
 *
 * Browser-side proof generation using snarkjs.
 * Generates Groth16 proofs for ticket verification.
 */

import * as snarkjs from 'snarkjs';
import type {
  ZKCircuitInputs,
  ZKProofPackage,
  ZKPublicInputs,
  ZKPrivateInputs,
  MerkleProof,
  BiometricCommitment,
} from './types';

// Circuit artifacts paths (loaded from public folder in browser)
const CIRCUIT_WASM_PATH = '/zk/main.wasm';
const CIRCUIT_ZKEY_PATH = '/zk/main_final.zkey';

/**
 * Check if we're in a browser environment
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Generate a ZK proof for ticket verification
 *
 * @param publicInputs - Public inputs (visible to verifier)
 * @param privateInputs - Private inputs (never revealed)
 * @returns Proof package ready for verification
 */
export async function generateProof(
  publicInputs: ZKPublicInputs,
  privateInputs: ZKPrivateInputs
): Promise<ZKProofPackage> {
  // Prepare circuit inputs
  const circuitInputs = {
    // Public inputs
    merkleRoot: publicInputs.merkleRoot.toString(),
    biometricCommitment: publicInputs.biometricCommitment.toString(),
    eventId: publicInputs.eventId.toString(),
    currentTimestamp: publicInputs.currentTimestamp.toString(),
    nonce: publicInputs.nonce.toString(),
    nonceExpiry: publicInputs.nonceExpiry.toString(),

    // Private inputs
    ticketData: privateInputs.ticketData.map((x) => x.toString()),
    ticketSalt: privateInputs.ticketSalt.toString(),
    merklePathElements: privateInputs.merklePathElements.map((x) => x.toString()),
    merklePathIndices: privateInputs.merklePathIndices,
    biometricTemplate: privateInputs.biometricTemplate.map((x) => x.toString()),
    biometricSalt: privateInputs.biometricSalt.toString(),
  };

  // Generate proof
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    circuitInputs,
    CIRCUIT_WASM_PATH,
    CIRCUIT_ZKEY_PATH
  );

  return {
    proof: proof as any,
    publicSignals,
  };
}

/**
 * Generate proof from high-level ticket data
 *
 * This is the main entry point for the frontend.
 */
export async function generateTicketVerificationProof(params: {
  ticketId: bigint;
  eventId: bigint;
  tier: number;
  originalPrice: bigint;
  ticketSalt: bigint;
  merkleProof: MerkleProof;
  biometric: BiometricCommitment;
  nonce: bigint;
  nonceExpiry: number;
}): Promise<ZKProofPackage> {
  const {
    ticketId,
    eventId,
    tier,
    originalPrice,
    ticketSalt,
    merkleProof,
    biometric,
    nonce,
    nonceExpiry,
  } = params;

  const currentTimestamp = Math.floor(Date.now() / 1000);

  const publicInputs: ZKPublicInputs = {
    merkleRoot: merkleProof.root,
    biometricCommitment: biometric.commitment,
    eventId,
    currentTimestamp: BigInt(currentTimestamp),
    nonce,
    nonceExpiry: BigInt(nonceExpiry),
  };

  const privateInputs: ZKPrivateInputs = {
    ticketData: [ticketId, eventId, BigInt(tier), originalPrice],
    ticketSalt,
    merklePathElements: merkleProof.pathElements,
    merklePathIndices: merkleProof.pathIndices,
    biometricTemplate: biometric.templateHash,
    biometricSalt: biometric.salt,
  };

  return generateProof(publicInputs, privateInputs);
}

/**
 * Estimate proof generation time
 * Returns estimated seconds based on device capability
 */
export async function estimateProofTime(): Promise<number> {
  if (!isBrowser()) {
    return 5; // Server-side is generally fast
  }

  // Check for hardware concurrency
  const cores = navigator.hardwareConcurrency || 4;

  // Rough estimates based on testing
  if (cores >= 8) return 5;
  if (cores >= 4) return 10;
  return 15;
}

/**
 * Check if the device supports efficient proof generation
 */
export function isProofGenerationSupported(): boolean {
  if (!isBrowser()) return true;

  // Check for BigInt support (required for snarkjs)
  if (typeof BigInt === 'undefined') return false;

  // Check for WebAssembly support
  if (typeof WebAssembly === 'undefined') return false;

  // Check for minimum memory (circuits need significant memory)
  // @ts-ignore - deviceMemory may not be available
  const memory = navigator.deviceMemory;
  if (memory && memory < 2) return false;

  return true;
}

/**
 * Preload circuit artifacts for faster proof generation
 */
export async function preloadCircuit(): Promise<void> {
  if (!isBrowser()) return;

  try {
    // Preload WASM
    const wasmResponse = await fetch(CIRCUIT_WASM_PATH);
    await wasmResponse.arrayBuffer();

    // Preload zkey (this is large, ~20MB)
    const zkeyResponse = await fetch(CIRCUIT_ZKEY_PATH);
    await zkeyResponse.arrayBuffer();

    console.log('Circuit artifacts preloaded');
  } catch (error) {
    console.error('Failed to preload circuit artifacts:', error);
  }
}

/**
 * Format proof for smart contract verification
 *
 * Converts snarkjs proof format to Solidity verifier format
 */
export function formatProofForContract(proof: ZKProofPackage): {
  pA: [string, string];
  pB: [[string, string], [string, string]];
  pC: [string, string];
  pubSignals: string[];
} {
  const { proof: p, publicSignals } = proof;

  return {
    pA: [p.pi_a[0], p.pi_a[1]],
    pB: [
      [p.pi_b[0][1], p.pi_b[0][0]], // Note: B is transposed for Solidity
      [p.pi_b[1][1], p.pi_b[1][0]],
    ],
    pC: [p.pi_c[0], p.pi_c[1]],
    pubSignals: publicSignals,
  };
}

/**
 * Generate a random nonce for verification
 */
export function generateNonce(): bigint {
  const bytes = new Uint8Array(32);
  if (isBrowser()) {
    crypto.getRandomValues(bytes);
  } else {
    // Node.js
    const nodeCrypto = require('crypto');
    const buffer = nodeCrypto.randomBytes(32);
    bytes.set(buffer);
  }

  // Convert to bigint
  let result = BigInt(0);
  for (const byte of bytes) {
    result = (result << BigInt(8)) + BigInt(byte);
  }
  return result;
}
