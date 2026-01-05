#!/bin/bash
# TrueTicket ZK Verifier Export Script
#
# Exports the Groth16 verifier as a Solidity contract

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CIRCUITS_DIR="$(dirname "$SCRIPT_DIR")"
BUILD_DIR="$CIRCUITS_DIR/build"
CONTRACTS_DIR="$(dirname "$CIRCUITS_DIR")/contracts/zk"

echo "=== Exporting Solidity Verifier ==="

# Check for snarkjs
if ! command -v snarkjs &> /dev/null; then
    SNARKJS="npx snarkjs"
else
    SNARKJS="snarkjs"
fi

# Check that setup was completed
if [ ! -f "$BUILD_DIR/circuit_final.zkey" ]; then
    echo "Error: Trusted setup not complete. Run ./scripts/setup.sh first."
    exit 1
fi

# Create contracts directory
mkdir -p "$CONTRACTS_DIR"

cd "$BUILD_DIR"

echo "Generating Solidity verifier..."
$SNARKJS zkey export solidityverifier circuit_final.zkey "$CONTRACTS_DIR/ZKVerifier.sol"

# Update the contract to use our naming convention
sed -i.bak 's/contract Groth16Verifier/contract ZKVerifier/' "$CONTRACTS_DIR/ZKVerifier.sol"
sed -i.bak 's/pragma solidity ^0.6.11;/pragma solidity ^0.8.24;/' "$CONTRACTS_DIR/ZKVerifier.sol"
rm -f "$CONTRACTS_DIR/ZKVerifier.sol.bak"

echo ""
echo "=== Export Complete ==="
echo ""
echo "Generated: $CONTRACTS_DIR/ZKVerifier.sol"
echo ""
echo "The verifier contract can now be deployed and used to verify ZK proofs on-chain."
