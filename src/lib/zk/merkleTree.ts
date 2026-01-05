/**
 * TrueTicket Merkle Tree Implementation
 *
 * Builds and manages Merkle trees for ticket ownership proofs.
 * Uses Poseidon hash for ZK-friendliness.
 */

import { buildPoseidon, type Poseidon } from 'circomlibjs';
import type { MerkleLeaf, MerkleProof, MerkleTree } from './types';

let poseidon: Poseidon | null = null;

/**
 * Initialize the Poseidon hasher
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
function F2BigInt(poseidon: Poseidon, element: any): bigint {
  return poseidon.F.toObject(element);
}

/**
 * Hash two elements using Poseidon
 */
async function poseidonHash(inputs: bigint[]): Promise<bigint> {
  const p = await getPoseidon();
  const hash = p(inputs.map((x) => p.F.e(x)));
  return F2BigInt(p, hash);
}

/**
 * Compute leaf hash from ticket data
 * Hash = Poseidon(tokenId, eventId, tier, originalPrice, salt)
 */
export async function computeLeafHash(leaf: MerkleLeaf): Promise<bigint> {
  return poseidonHash([
    leaf.tokenId,
    leaf.eventId,
    BigInt(leaf.tier),
    leaf.originalPrice,
    leaf.salt,
  ]);
}

/**
 * Build a Merkle tree from leaves
 */
export async function buildMerkleTree(
  leaves: bigint[],
  depth: number = 20
): Promise<MerkleTree> {
  const p = await getPoseidon();

  // Pad leaves to power of 2
  const targetSize = 2 ** depth;
  const paddedLeaves = [...leaves];
  while (paddedLeaves.length < targetSize) {
    paddedLeaves.push(BigInt(0));
  }

  // Build layers from bottom up
  const layers: bigint[][] = [paddedLeaves];
  let currentLayer = paddedLeaves;

  while (currentLayer.length > 1) {
    const nextLayer: bigint[] = [];
    for (let i = 0; i < currentLayer.length; i += 2) {
      const left = currentLayer[i];
      const right = currentLayer[i + 1];
      const hash = await poseidonHash([left, right]);
      nextLayer.push(hash);
    }
    layers.push(nextLayer);
    currentLayer = nextLayer;
  }

  return {
    root: currentLayer[0],
    depth,
    leaves: paddedLeaves,
    layers,
  };
}

/**
 * Generate a Merkle proof for a leaf at a given index
 */
export function getMerkleProof(tree: MerkleTree, leafIndex: number): MerkleProof {
  const pathElements: bigint[] = [];
  const pathIndices: number[] = [];

  let currentIndex = leafIndex;

  for (let i = 0; i < tree.depth; i++) {
    const layer = tree.layers[i];
    const isRight = currentIndex % 2 === 1;
    const siblingIndex = isRight ? currentIndex - 1 : currentIndex + 1;

    pathElements.push(layer[siblingIndex] || BigInt(0));
    pathIndices.push(isRight ? 1 : 0);

    currentIndex = Math.floor(currentIndex / 2);
  }

  return {
    leaf: tree.leaves[leafIndex],
    pathElements,
    pathIndices,
    root: tree.root,
  };
}

/**
 * Verify a Merkle proof
 */
export async function verifyMerkleProof(proof: MerkleProof): Promise<boolean> {
  let currentHash = proof.leaf;

  for (let i = 0; i < proof.pathElements.length; i++) {
    const sibling = proof.pathElements[i];
    const isRight = proof.pathIndices[i] === 1;

    if (isRight) {
      currentHash = await poseidonHash([sibling, currentHash]);
    } else {
      currentHash = await poseidonHash([currentHash, sibling]);
    }
  }

  return currentHash === proof.root;
}

/**
 * Add a leaf to an existing tree (returns new tree)
 */
export async function addLeaf(
  tree: MerkleTree,
  leaf: bigint
): Promise<MerkleTree> {
  // Find first empty slot
  const emptyIndex = tree.leaves.findIndex((l) => l === BigInt(0));
  if (emptyIndex === -1) {
    throw new Error('Tree is full');
  }

  const newLeaves = [...tree.leaves];
  newLeaves[emptyIndex] = leaf;

  return buildMerkleTree(newLeaves, tree.depth);
}

/**
 * Serialize tree for storage
 */
export function serializeTree(tree: MerkleTree): string {
  return JSON.stringify({
    root: tree.root.toString(),
    depth: tree.depth,
    leaves: tree.leaves.map((l) => l.toString()),
    layers: tree.layers.map((layer) => layer.map((l) => l.toString())),
  });
}

/**
 * Deserialize tree from storage
 */
export function deserializeTree(data: string): MerkleTree {
  const parsed = JSON.parse(data);
  return {
    root: BigInt(parsed.root),
    depth: parsed.depth,
    leaves: parsed.leaves.map((l: string) => BigInt(l)),
    layers: parsed.layers.map((layer: string[]) =>
      layer.map((l) => BigInt(l))
    ),
  };
}

/**
 * Build tree from ticket data
 */
export async function buildTreeFromTickets(
  tickets: Array<{
    tokenId: string | number;
    eventId: string | number;
    tier: number;
    originalPrice: string | number;
    salt: string;
  }>,
  depth: number = 20
): Promise<MerkleTree> {
  const leafHashes: bigint[] = [];

  for (const ticket of tickets) {
    const leafHash = await computeLeafHash({
      tokenId: BigInt(ticket.tokenId),
      eventId: BigInt(ticket.eventId),
      tier: ticket.tier,
      originalPrice: BigInt(ticket.originalPrice),
      salt: BigInt(ticket.salt),
    });
    leafHashes.push(leafHash);
  }

  return buildMerkleTree(leafHashes, depth);
}
