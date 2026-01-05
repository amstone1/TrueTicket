/**
 * Ticket Ownership Proof Component
 *
 * Proves that the prover knows a valid ticket that exists in the event's
 * Merkle tree, without revealing which ticket it is.
 *
 * This is a patent-critical component of the ZK verification system.
 */
pragma circom 2.1.6;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/mux1.circom";

/**
 * Merkle Proof Verifier
 * Verifies that a leaf exists in a Merkle tree with the given root
 */
template MerkleProof(depth) {
    signal input leaf;
    signal input pathElements[depth];
    signal input pathIndices[depth];
    signal input root;

    signal output valid;

    component hashers[depth];
    component mux[depth];

    signal hashes[depth + 1];
    hashes[0] <== leaf;

    for (var i = 0; i < depth; i++) {
        // pathIndices[i] determines if we're the left (0) or right (1) child
        hashers[i] = Poseidon(2);
        mux[i] = MultiMux1(2);

        mux[i].c[0][0] <== hashes[i];
        mux[i].c[0][1] <== pathElements[i];
        mux[i].c[1][0] <== pathElements[i];
        mux[i].c[1][1] <== hashes[i];
        mux[i].s <== pathIndices[i];

        hashers[i].inputs[0] <== mux[i].out[0];
        hashers[i].inputs[1] <== mux[i].out[1];

        hashes[i + 1] <== hashers[i].out;
    }

    // Check if computed root matches expected root
    component isEqual = IsEqual();
    isEqual.in[0] <== hashes[depth];
    isEqual.in[1] <== root;
    valid <== isEqual.out;
}

/**
 * Ticket Ownership Proof
 * Proves ownership of a ticket in the event's Merkle tree
 */
template TicketOwnershipProof(depth) {
    // Public inputs
    signal input merkleRoot;
    signal input eventId;

    // Private inputs
    signal input ticketData[4];  // [tokenId, eventId, tier, originalPrice]
    signal input ticketSalt;
    signal input pathElements[depth];
    signal input pathIndices[depth];

    signal output valid;

    // 1. Verify the ticket belongs to the correct event
    component eventCheck = IsEqual();
    eventCheck.in[0] <== ticketData[1];  // eventId in ticketData
    eventCheck.in[1] <== eventId;

    // 2. Compute leaf hash: Poseidon(tokenId, eventId, tier, price, salt)
    component leafHash = Poseidon(5);
    leafHash.inputs[0] <== ticketData[0];  // tokenId
    leafHash.inputs[1] <== ticketData[1];  // eventId
    leafHash.inputs[2] <== ticketData[2];  // tier
    leafHash.inputs[3] <== ticketData[3];  // originalPrice
    leafHash.inputs[4] <== ticketSalt;

    // 3. Verify Merkle proof
    component merkleProof = MerkleProof(depth);
    merkleProof.leaf <== leafHash.out;
    merkleProof.root <== merkleRoot;
    for (var i = 0; i < depth; i++) {
        merkleProof.pathElements[i] <== pathElements[i];
        merkleProof.pathIndices[i] <== pathIndices[i];
    }

    // Valid if event matches AND Merkle proof is valid
    valid <== eventCheck.out * merkleProof.valid;
}
