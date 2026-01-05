#!/bin/bash
# TrueTicket ZK Trusted Setup Script
#
# This script performs the trusted setup ceremony using Powers of Tau
# and generates the proving and verification keys.
#
# IMPORTANT: For production, use a proper multi-party computation ceremony

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CIRCUITS_DIR="$(dirname "$SCRIPT_DIR")"
BUILD_DIR="$CIRCUITS_DIR/build"

echo "=== TrueTicket ZK Trusted Setup ==="

# Check for snarkjs
if ! command -v snarkjs &> /dev/null; then
    echo "snarkjs not in PATH, using npx..."
    SNARKJS="npx snarkjs"
else
    SNARKJS="snarkjs"
fi

# Check that circuit was compiled
if [ ! -f "$BUILD_DIR/main.r1cs" ]; then
    echo "Error: Circuit not compiled. Run ./scripts/compile.sh first."
    exit 1
fi

cd "$BUILD_DIR"

echo ""
echo "Step 1: Starting Powers of Tau ceremony..."
# For production, use a much larger power (e.g., 20-28)
# Power 15 supports up to 2^15 = 32,768 constraints
$SNARKJS powersoftau new bn128 15 pot15_0000.ptau -v

echo ""
echo "Step 2: Contributing to ceremony..."
# In production, have multiple parties contribute
$SNARKJS powersoftau contribute pot15_0000.ptau pot15_0001.ptau \
    --name="TrueTicket Dev Contribution" -v -e="random entropy $(date +%s)"

echo ""
echo "Step 3: Preparing for phase 2..."
$SNARKJS powersoftau prepare phase2 pot15_0001.ptau pot15_final.ptau -v

echo ""
echo "Step 4: Generating zkey..."
$SNARKJS groth16 setup main.r1cs pot15_final.ptau circuit_0000.zkey

echo ""
echo "Step 5: Contributing to zkey..."
$SNARKJS zkey contribute circuit_0000.zkey circuit_final.zkey \
    --name="TrueTicket Dev" -v -e="random entropy $(date +%s)"

echo ""
echo "Step 6: Exporting verification key..."
$SNARKJS zkey export verificationkey circuit_final.zkey verification_key.json

echo ""
echo "=== Trusted Setup Complete ==="
echo ""
echo "Generated files:"
echo "  - circuit_final.zkey (proving key - keep secure)"
echo "  - verification_key.json (verification key - can be public)"
echo ""
echo "Next: Run ./scripts/export-verifier.sh to generate Solidity verifier"
