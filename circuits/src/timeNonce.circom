/**
 * Time-Bound Nonce Verification Component
 *
 * Ensures that:
 * 1. The verification is happening within the nonce's validity window
 * 2. The nonce hasn't been used before (tracked off-chain/on-chain)
 *
 * This prevents:
 * - Screenshot attacks (old proofs are expired)
 * - Replay attacks (each nonce can only be used once)
 *
 * This is a patent-critical component of the ZK verification system.
 */
pragma circom 2.1.6;

include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/poseidon.circom";

/**
 * Time-Bound Nonce Verification
 *
 * Verifies that currentTimestamp < nonceExpiry
 * The nonce itself is included in public inputs for on-chain replay tracking
 */
template TimeNonceVerification() {
    // Public inputs
    signal input currentTimestamp;  // Current verification time
    signal input nonce;             // Unique nonce (for replay prevention)
    signal input nonceExpiry;       // When this nonce expires

    signal output valid;

    // Check that current time is before expiry
    // currentTimestamp < nonceExpiry
    component lessThan = LessThan(64);  // 64 bits for timestamps (good until year 584 billion)
    lessThan.in[0] <== currentTimestamp;
    lessThan.in[1] <== nonceExpiry;

    valid <== lessThan.out;
}

/**
 * Enhanced Time-Bound Nonce with Ticket Binding
 *
 * The nonce is cryptographically bound to the ticket, preventing
 * nonce reuse across different tickets
 */
template BoundTimeNonceVerification() {
    // Public inputs
    signal input currentTimestamp;
    signal input nonce;
    signal input nonceExpiry;
    signal input ticketId;          // Ticket this nonce is bound to
    signal input expectedNonceHash; // Hash(nonce, ticketId) - for binding verification

    // Private input
    signal input nonceSecret;       // Secret component of the nonce

    signal output valid;

    // 1. Verify time is before expiry
    component lessThan = LessThan(64);
    lessThan.in[0] <== currentTimestamp;
    lessThan.in[1] <== nonceExpiry;

    // 2. Verify nonce is correctly bound to ticket
    component nonceHash = Poseidon(3);
    nonceHash.inputs[0] <== nonce;
    nonceHash.inputs[1] <== ticketId;
    nonceHash.inputs[2] <== nonceSecret;

    component hashCheck = IsEqual();
    hashCheck.in[0] <== nonceHash.out;
    hashCheck.in[1] <== expectedNonceHash;

    // Valid if both time check and binding check pass
    valid <== lessThan.out * hashCheck.out;
}

/**
 * Nonce Generator (helper for off-chain usage)
 *
 * Generates a deterministic nonce from inputs.
 * This isn't used in the circuit itself but documents
 * how nonces should be created off-chain.
 */
template NonceGenerator() {
    signal input ticketId;
    signal input timestamp;
    signal input randomSeed;

    signal output nonce;

    component hasher = Poseidon(3);
    hasher.inputs[0] <== ticketId;
    hasher.inputs[1] <== timestamp;
    hasher.inputs[2] <== randomSeed;

    nonce <== hasher.out;
}
