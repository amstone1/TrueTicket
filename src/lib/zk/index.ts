/**
 * TrueTicket ZK Verification Library
 *
 * Patent-critical zero-knowledge proof system for privacy-preserving
 * ticket verification with biometric binding.
 */

// Types
export * from './types';

// Merkle Tree
export {
  buildMerkleTree,
  getMerkleProof,
  verifyMerkleProof,
  computeLeafHash,
  addLeaf,
  serializeTree,
  deserializeTree,
  buildTreeFromTickets,
} from './merkleTree';

// Prover (browser-side)
export {
  generateProof,
  generateTicketVerificationProof,
  estimateProofTime,
  isProofGenerationSupported,
  preloadCircuit,
  formatProofForContract,
  generateNonce,
} from './prover';

// Verifier (server-side)
export {
  verifyProofOffChain,
  verifyTicketProof,
  batchVerifyProofs,
  initializeVerifier,
  getVerificationKeyForClient,
} from './verifier';

// Biometric Processing
export {
  processFaceTemplate,
  createBiometricCommitment,
  verifyBiometricCommitment,
  hashWebAuthnCredential,
  generateBiometricSalt,
  serializeCommitment,
  deserializeCommitment,
  compareFaceTemplates,
  doFaceTemplatesMatch,
  BIOMETRIC_TEMPLATE_ELEMENTS,
  FACE_MATCH_THRESHOLD,
} from './biometric';
