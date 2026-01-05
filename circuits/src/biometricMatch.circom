/**
 * Biometric Match Proof Component
 *
 * Proves that the prover knows a biometric template that matches
 * the on-chain commitment, without revealing the actual template.
 *
 * Privacy guarantees:
 * - Biometric template never leaves the device
 * - Only a hash commitment is stored on-chain
 * - The proof reveals nothing about the actual biometric
 *
 * This is a patent-critical component of the ZK verification system.
 */
pragma circom 2.1.6;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/comparators.circom";

/**
 * Biometric Match Proof
 *
 * Proves that Poseidon(template[0..n], salt) == commitment
 * without revealing template or salt
 */
template BiometricMatchProof(numElements) {
    // Public input: the on-chain commitment
    signal input commitment;

    // Private inputs
    signal input templateData[numElements];  // Biometric template hash elements
    signal input salt;

    signal output valid;

    // Hash the template with the salt
    // Using multiple Poseidon calls for larger inputs (Poseidon takes max 16 inputs)
    // For 16 elements, we can do it in one call with the salt

    // First hash the template elements
    component templateHash = Poseidon(numElements);
    for (var i = 0; i < numElements; i++) {
        templateHash.inputs[i] <== templateData[i];
    }

    // Then combine with salt
    component finalHash = Poseidon(2);
    finalHash.inputs[0] <== templateHash.out;
    finalHash.inputs[1] <== salt;

    // Check if computed commitment matches expected commitment
    component isEqual = IsEqual();
    isEqual.in[0] <== finalHash.out;
    isEqual.in[1] <== commitment;

    valid <== isEqual.out;
}

/**
 * Extended Biometric Match for larger templates
 * Supports up to 64 elements by chaining Poseidon hashes
 */
template ExtendedBiometricMatchProof(numElements) {
    signal input commitment;
    signal input templateData[numElements];
    signal input salt;

    signal output valid;

    // Number of chunks (each chunk can have up to 15 elements for Poseidon-16)
    var numChunks = (numElements + 14) \ 15;  // Ceiling division

    component chunkHashers[numChunks];
    signal chunkHashes[numChunks];

    // Hash each chunk
    for (var c = 0; c < numChunks; c++) {
        var chunkSize = 15;
        if (c == numChunks - 1) {
            chunkSize = numElements - c * 15;
            if (chunkSize <= 0) chunkSize = 15;
        }

        chunkHashers[c] = Poseidon(chunkSize);
        for (var i = 0; i < chunkSize; i++) {
            var idx = c * 15 + i;
            if (idx < numElements) {
                chunkHashers[c].inputs[i] <== templateData[idx];
            }
        }
        chunkHashes[c] <== chunkHashers[c].out;
    }

    // Combine all chunk hashes
    component combiner = Poseidon(numChunks + 1);
    for (var c = 0; c < numChunks; c++) {
        combiner.inputs[c] <== chunkHashes[c];
    }
    combiner.inputs[numChunks] <== salt;

    // Check match
    component isEqual = IsEqual();
    isEqual.in[0] <== combiner.out;
    isEqual.in[1] <== commitment;

    valid <== isEqual.out;
}
