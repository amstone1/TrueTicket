/**
 * ZK Proof Integration Tests
 *
 * Tests the complete zero-knowledge proof system:
 * - Merkle tree construction
 * - Biometric commitment generation
 * - Proof generation (groth16)
 * - Proof verification (off-chain and on-chain)
 */

import { expect } from 'chai';
import { ethers } from 'ethers';
import * as snarkjs from 'snarkjs';
import path from 'path';
import fs from 'fs';

// For Hardhat tests - use dynamic import to avoid type issues
async function getHardhatEthers() {
  const hre = await import('hardhat');
  return (hre as any).ethers;
}

// Import ZK library functions
import { createMerkleTree, computeLeafHash, getMerkleProof } from '../../src/lib/zk/merkleTree';
import {
  processFaceTemplate,
  createBiometricCommitment,
  generateBiometricSalt,
  verifyBiometricCommitment,
} from '../../src/lib/zk/biometric';
import { formatProofForContract, generateNonce } from '../../src/lib/zk/prover';

// Circuit artifacts paths
const BUILD_DIR = path.join(__dirname, '../../circuits/build');
const WASM_PATH = path.join(BUILD_DIR, 'main_js/main.wasm');
const ZKEY_PATH = path.join(BUILD_DIR, 'main_final.zkey');
const VKEY_PATH = path.join(BUILD_DIR, 'verification_key.json');

describe('ZK Proof System', function () {
  // Increase timeout for proof generation
  this.timeout(120000);

  let verificationKey: any;

  before(async function () {
    // Check if circuit artifacts exist
    if (!fs.existsSync(WASM_PATH) || !fs.existsSync(ZKEY_PATH)) {
      console.log('Circuit artifacts not found. Skipping ZK tests.');
      console.log('Run: cd circuits/src && ../../bin/circom main.circom --r1cs --wasm --sym -l ../../node_modules -o ../build');
      this.skip();
    }

    // Load verification key
    verificationKey = JSON.parse(fs.readFileSync(VKEY_PATH, 'utf8'));
  });

  describe('Merkle Tree', function () {
    it('should create a Merkle tree from ticket leaves', async function () {
      const leaves = [
        await computeLeafHash({
          tokenId: BigInt(1),
          eventId: BigInt(100),
          tier: 0,
          originalPrice: BigInt('100000000000000000000'), // 100 ETH in wei
          salt: generateBiometricSalt(),
        }),
        await computeLeafHash({
          tokenId: BigInt(2),
          eventId: BigInt(100),
          tier: 1,
          originalPrice: BigInt('50000000000000000000'),
          salt: generateBiometricSalt(),
        }),
      ];

      const tree = await createMerkleTree(leaves);

      expect(tree.root).to.be.a('bigint');
      expect(tree.depth).to.equal(20); // Fixed depth for circuit compatibility
      // Tree pads to 2^depth for circuit compatibility
      expect(tree.leaves.length).to.equal(2 ** 20);
    });

    it('should generate valid Merkle proofs', async function () {
      const salt1 = generateBiometricSalt();
      const salt2 = generateBiometricSalt();

      const leaf1 = await computeLeafHash({
        tokenId: BigInt(1),
        eventId: BigInt(100),
        tier: 0,
        originalPrice: BigInt('100000000000000000000'),
        salt: salt1,
      });

      const leaf2 = await computeLeafHash({
        tokenId: BigInt(2),
        eventId: BigInt(100),
        tier: 1,
        originalPrice: BigInt('50000000000000000000'),
        salt: salt2,
      });

      const tree = await createMerkleTree([leaf1, leaf2]);
      const proof = await getMerkleProof(tree, 0);

      expect(proof.leaf).to.equal(leaf1);
      expect(proof.root).to.equal(tree.root);
      expect(proof.pathElements.length).to.equal(20);
      expect(proof.pathIndices.length).to.equal(20);
    });
  });

  describe('Biometric Commitment', function () {
    it('should process a face template into ZK-compatible format', async function () {
      // Mock face template (128 floats)
      const rawTemplate = new Float32Array(128);
      for (let i = 0; i < 128; i++) {
        rawTemplate[i] = Math.random() * 2 - 1;
      }

      const templateHash = await processFaceTemplate(rawTemplate);

      expect(templateHash.length).to.equal(16); // 16 field elements
      templateHash.forEach((element) => {
        expect(element).to.be.a('bigint');
      });
    });

    it('should create and verify biometric commitment', async function () {
      const rawTemplate = new Float32Array(128);
      for (let i = 0; i < 128; i++) {
        rawTemplate[i] = Math.random() * 2 - 1;
      }

      const templateHash = await processFaceTemplate(rawTemplate);
      const commitment = await createBiometricCommitment(templateHash);

      expect(commitment.commitment).to.be.a('bigint');
      expect(commitment.salt).to.be.a('bigint');
      expect(commitment.templateHash.length).to.equal(16);

      // Verify the commitment
      const isValid = await verifyBiometricCommitment(
        commitment.templateHash,
        commitment.salt,
        commitment.commitment
      );

      expect(isValid).to.be.true;
    });

    it('should fail verification with wrong salt', async function () {
      const rawTemplate = new Float32Array(128);
      for (let i = 0; i < 128; i++) {
        rawTemplate[i] = Math.random() * 2 - 1;
      }

      const templateHash = await processFaceTemplate(rawTemplate);
      const commitment = await createBiometricCommitment(templateHash);

      // Try to verify with wrong salt
      const wrongSalt = generateBiometricSalt();
      const isValid = await verifyBiometricCommitment(
        commitment.templateHash,
        wrongSalt,
        commitment.commitment
      );

      expect(isValid).to.be.false;
    });
  });

  describe('Proof Generation & Verification', function () {
    it('should generate a valid Groth16 proof', async function () {
      // 1. Create ticket data
      const ticketData = {
        tokenId: BigInt(1),
        eventId: BigInt(100),
        tier: 0,
        originalPrice: BigInt('100000000000000000000'),
      };
      const ticketSalt = generateBiometricSalt();

      // 2. Create Merkle tree with this ticket
      const leafHash = await computeLeafHash({
        ...ticketData,
        salt: ticketSalt,
      });
      const tree = await createMerkleTree([leafHash]);
      const merkleProof = await getMerkleProof(tree, 0);

      // 3. Create biometric commitment
      const rawTemplate = new Float32Array(128);
      for (let i = 0; i < 128; i++) {
        rawTemplate[i] = Math.random() * 2 - 1;
      }
      const templateHash = await processFaceTemplate(rawTemplate);
      const biometric = await createBiometricCommitment(templateHash);

      // 4. Create nonce and timestamp
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const nonce = generateNonce();
      const nonceExpiry = currentTimestamp + 300; // 5 minutes

      // 5. Prepare circuit inputs
      const circuitInputs = {
        // Public inputs
        merkleRoot: tree.root.toString(),
        biometricCommitment: biometric.commitment.toString(),
        eventId: ticketData.eventId.toString(),
        currentTimestamp: currentTimestamp.toString(),
        nonce: nonce.toString(),
        nonceExpiry: nonceExpiry.toString(),

        // Private inputs
        ticketData: [
          ticketData.tokenId.toString(),
          ticketData.eventId.toString(),
          ticketData.tier.toString(),
          ticketData.originalPrice.toString(),
        ],
        ticketSalt: ticketSalt.toString(),
        merklePathElements: merkleProof.pathElements.map((e) => e.toString()),
        merklePathIndices: merkleProof.pathIndices,
        biometricTemplate: templateHash.map((e) => e.toString()),
        biometricSalt: biometric.salt.toString(),
      };

      // 6. Generate proof
      console.log('Generating ZK proof (this may take 30-60 seconds)...');
      const startTime = Date.now();

      const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        circuitInputs,
        WASM_PATH,
        ZKEY_PATH
      );

      const proofTime = (Date.now() - startTime) / 1000;
      console.log(`Proof generated in ${proofTime.toFixed(2)} seconds`);

      expect(proof).to.have.property('pi_a');
      expect(proof).to.have.property('pi_b');
      expect(proof).to.have.property('pi_c');
      expect(publicSignals.length).to.equal(7); // 6 public inputs + 1 output

      // 7. Verify proof off-chain
      const isValid = await snarkjs.groth16.verify(verificationKey, publicSignals, proof);
      expect(isValid).to.be.true;

      console.log('Proof verified successfully off-chain');
    });

    it('should reject proof with tampered public signals', async function () {
      // Create valid proof first
      const ticketData = {
        tokenId: BigInt(1),
        eventId: BigInt(100),
        tier: 0,
        originalPrice: BigInt('100000000000000000000'),
      };
      const ticketSalt = generateBiometricSalt();

      const leafHash = await computeLeafHash({ ...ticketData, salt: ticketSalt });
      const tree = await createMerkleTree([leafHash]);
      const merkleProof = await getMerkleProof(tree, 0);

      const rawTemplate = new Float32Array(128);
      for (let i = 0; i < 128; i++) {
        rawTemplate[i] = Math.random() * 2 - 1;
      }
      const templateHash = await processFaceTemplate(rawTemplate);
      const biometric = await createBiometricCommitment(templateHash);

      const currentTimestamp = Math.floor(Date.now() / 1000);
      const nonce = generateNonce();
      const nonceExpiry = currentTimestamp + 300;

      const circuitInputs = {
        merkleRoot: tree.root.toString(),
        biometricCommitment: biometric.commitment.toString(),
        eventId: ticketData.eventId.toString(),
        currentTimestamp: currentTimestamp.toString(),
        nonce: nonce.toString(),
        nonceExpiry: nonceExpiry.toString(),
        ticketData: [
          ticketData.tokenId.toString(),
          ticketData.eventId.toString(),
          ticketData.tier.toString(),
          ticketData.originalPrice.toString(),
        ],
        ticketSalt: ticketSalt.toString(),
        merklePathElements: merkleProof.pathElements.map((e) => e.toString()),
        merklePathIndices: merkleProof.pathIndices,
        biometricTemplate: templateHash.map((e) => e.toString()),
        biometricSalt: biometric.salt.toString(),
      };

      const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        circuitInputs,
        WASM_PATH,
        ZKEY_PATH
      );

      // Tamper with eventId in public signals
      const tamperedSignals = [...publicSignals];
      tamperedSignals[2] = '999'; // Change eventId

      const isValid = await snarkjs.groth16.verify(verificationKey, tamperedSignals, proof);
      expect(isValid).to.be.false;
    });
  });

  describe('Smart Contract Verification', function () {
    it('should deploy and verify proof on-chain', async function () {
      // Deploy the verifier contract
      const hreEthers = await getHardhatEthers();
      const Verifier = await hreEthers.getContractFactory('Groth16Verifier');
      const verifier = await Verifier.deploy();
      await verifier.waitForDeployment();

      console.log('Verifier deployed at:', await verifier.getAddress());

      // Generate a proof
      const ticketData = {
        tokenId: BigInt(1),
        eventId: BigInt(100),
        tier: 0,
        originalPrice: BigInt('100000000000000000000'),
      };
      const ticketSalt = generateBiometricSalt();

      const leafHash = await computeLeafHash({ ...ticketData, salt: ticketSalt });
      const tree = await createMerkleTree([leafHash]);
      const merkleProof = await getMerkleProof(tree, 0);

      const rawTemplate = new Float32Array(128);
      for (let i = 0; i < 128; i++) {
        rawTemplate[i] = Math.random() * 2 - 1;
      }
      const templateHash = await processFaceTemplate(rawTemplate);
      const biometric = await createBiometricCommitment(templateHash);

      const currentTimestamp = Math.floor(Date.now() / 1000);
      const nonce = generateNonce();
      const nonceExpiry = currentTimestamp + 300;

      const circuitInputs = {
        merkleRoot: tree.root.toString(),
        biometricCommitment: biometric.commitment.toString(),
        eventId: ticketData.eventId.toString(),
        currentTimestamp: currentTimestamp.toString(),
        nonce: nonce.toString(),
        nonceExpiry: nonceExpiry.toString(),
        ticketData: [
          ticketData.tokenId.toString(),
          ticketData.eventId.toString(),
          ticketData.tier.toString(),
          ticketData.originalPrice.toString(),
        ],
        ticketSalt: ticketSalt.toString(),
        merklePathElements: merkleProof.pathElements.map((e) => e.toString()),
        merklePathIndices: merkleProof.pathIndices,
        biometricTemplate: templateHash.map((e) => e.toString()),
        biometricSalt: biometric.salt.toString(),
      };

      console.log('Generating proof for on-chain verification...');
      const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        circuitInputs,
        WASM_PATH,
        ZKEY_PATH
      );

      // Format proof for Solidity
      const formattedProof = formatProofForContract({ proof: proof as any, publicSignals });

      // Verify on-chain
      console.log('Verifying proof on-chain...');
      const isValid = await verifier.verifyProof(
        formattedProof.pA,
        formattedProof.pB,
        formattedProof.pC,
        formattedProof.pubSignals
      );

      expect(isValid).to.be.true;
      console.log('Proof verified successfully on-chain!');
    });
  });
});
