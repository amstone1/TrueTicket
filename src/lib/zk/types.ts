/**
 * TrueTicket ZK Verification Types
 *
 * Type definitions for the zero-knowledge proof system.
 */

/**
 * Public inputs for the ZK circuit
 * These values are visible to the verifier
 */
export interface ZKPublicInputs {
  merkleRoot: bigint;           // Current event Merkle root
  biometricCommitment: bigint;  // Poseidon(template, salt)
  eventId: bigint;              // Event being verified
  currentTimestamp: bigint;     // Verification timestamp
  nonce: bigint;                // Unique verification nonce
  nonceExpiry: bigint;          // When this nonce expires
}

/**
 * Private inputs for the ZK circuit
 * These values are NEVER revealed
 */
export interface ZKPrivateInputs {
  ticketData: [bigint, bigint, bigint, bigint];  // [tokenId, eventId, tier, originalPrice]
  ticketSalt: bigint;                             // Random salt for ticket privacy
  merklePathElements: bigint[];                   // Merkle siblings
  merklePathIndices: number[];                    // Path directions (0/1)
  biometricTemplate: bigint[];                    // Biometric hash elements
  biometricSalt: bigint;                          // Salt from enrollment
}

/**
 * Complete circuit inputs
 */
export interface ZKCircuitInputs {
  public: ZKPublicInputs;
  private: ZKPrivateInputs;
}

/**
 * Groth16 proof components
 */
export interface ZKProof {
  pi_a: [string, string, string];
  pi_b: [[string, string], [string, string], [string, string]];
  pi_c: [string, string, string];
  protocol: 'groth16';
  curve: 'bn128';
}

/**
 * Complete proof package for verification
 */
export interface ZKProofPackage {
  proof: ZKProof;
  publicSignals: string[];
}

/**
 * Merkle tree leaf data
 */
export interface MerkleLeaf {
  tokenId: bigint;
  eventId: bigint;
  tier: number;
  originalPrice: bigint;
  salt: bigint;
}

/**
 * Merkle proof for a specific leaf
 */
export interface MerkleProof {
  leaf: bigint;
  pathElements: bigint[];
  pathIndices: number[];
  root: bigint;
}

/**
 * Merkle tree structure
 */
export interface MerkleTree {
  root: bigint;
  depth: number;
  leaves: bigint[];
  layers: bigint[][];
}

/**
 * Biometric commitment data
 */
export interface BiometricCommitment {
  commitment: bigint;        // Poseidon(templateHash, salt)
  templateHash: bigint[];    // Hashed template elements
  salt: bigint;              // Enrollment salt
  enrolledAt: number;        // Enrollment timestamp
}

/**
 * Verification result
 */
export interface VerificationResult {
  valid: boolean;
  eventId?: bigint;
  timestamp?: number;
  reason?: string;
  txHash?: string;
}

/**
 * Nonce data for verification
 */
export interface VerificationNonce {
  nonce: bigint;
  expiry: number;
  ticketId: string;
  eventId: string;
}

/**
 * ZK verification request (for API)
 */
export interface ZKVerificationRequest {
  eventId: string;
  ticketId: string;
  proof: ZKProofPackage;
  biometricTemplateHash?: string;
}

/**
 * Circuit artifacts (loaded from build)
 */
export interface CircuitArtifacts {
  wasmPath: string;
  zkeyPath: string;
  verificationKey: any;
}
