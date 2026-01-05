/**
 * TrueTicket ZK Verification Circuit - Patent-Critical Innovation
 *
 * This circuit proves three things simultaneously WITHOUT revealing sensitive data:
 * 1. Ticket Ownership - Prover knows a ticket in the event's Merkle tree
 * 2. Biometric Match - Prover's biometric matches the bound biometric hash
 * 3. Time-Bound Nonce - Verification is fresh (not expired, not replayed)
 *
 * This creates a privacy-preserving verification system where:
 * - Venue can verify ticket without seeing the ticket ID
 * - Venue can verify biometric match without seeing the template
 * - The proof cannot be replayed (time-bound nonces)
 */
pragma circom 2.1.6;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/bitify.circom";
include "./ticketOwnership.circom";
include "./biometricMatch.circom";
include "./timeNonce.circom";

/**
 * Main TrueTicket Verification Circuit
 *
 * Estimated constraints: ~11,300
 * Proving time: 5-15 seconds on modern mobile
 */
template TrueTicketVerification(merkleDepth, biometricElements) {
    // ============ Public Inputs ============
    // These are visible to the verifier (venue/contract)
    signal input merkleRoot;              // Current event Merkle root
    signal input biometricCommitment;     // Poseidon(template, salt) from on-chain
    signal input eventId;                 // Event being verified
    signal input currentTimestamp;        // Verification timestamp
    signal input nonce;                   // Unique verification nonce
    signal input nonceExpiry;             // When this nonce expires

    // ============ Private Inputs ============
    // These are NEVER revealed
    signal input ticketData[4];           // [tokenId, eventId, tier, originalPrice]
    signal input ticketSalt;              // Random salt for ticket privacy
    signal input merklePathElements[merkleDepth];  // Merkle siblings
    signal input merklePathIndices[merkleDepth];   // Path directions (0/1)
    signal input biometricTemplate[biometricElements]; // Biometric hash elements
    signal input biometricSalt;           // Salt from enrollment

    // ============ Output ============
    signal output valid;                  // 1 if all checks pass, 0 otherwise

    // ============ 1. Verify Ticket Ownership via Merkle Proof ============
    component ticketProof = TicketOwnershipProof(merkleDepth);
    ticketProof.merkleRoot <== merkleRoot;
    ticketProof.eventId <== eventId;
    for (var i = 0; i < 4; i++) {
        ticketProof.ticketData[i] <== ticketData[i];
    }
    ticketProof.ticketSalt <== ticketSalt;
    for (var i = 0; i < merkleDepth; i++) {
        ticketProof.pathElements[i] <== merklePathElements[i];
        ticketProof.pathIndices[i] <== merklePathIndices[i];
    }

    // ============ 2. Verify Biometric Match ============
    component biometricProof = BiometricMatchProof(biometricElements);
    biometricProof.commitment <== biometricCommitment;
    for (var i = 0; i < biometricElements; i++) {
        biometricProof.template[i] <== biometricTemplate[i];
    }
    biometricProof.salt <== biometricSalt;

    // ============ 3. Verify Time-Bound Nonce ============
    component nonceProof = TimeNonceVerification();
    nonceProof.currentTimestamp <== currentTimestamp;
    nonceProof.nonce <== nonce;
    nonceProof.nonceExpiry <== nonceExpiry;

    // ============ Combine All Proofs ============
    // All three must be valid (1 * 1 * 1 = 1)
    valid <== ticketProof.valid * biometricProof.valid * nonceProof.valid;
}

// Default instantiation for TrueTicket
// - Merkle depth 20 supports up to 1,048,576 tickets per event
// - 16 biometric elements for face template hash (256 bits / 16 = 16 field elements)
component main {public [merkleRoot, biometricCommitment, eventId, currentTimestamp, nonce, nonceExpiry]} = TrueTicketVerification(20, 16);
