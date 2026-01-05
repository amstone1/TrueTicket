#!/bin/bash
# TrueTicket ZK Circuit Compilation Script
#
# This script compiles the Circom circuits and generates:
# - circuit.r1cs (constraint system)
# - circuit.wasm (WebAssembly for browser proving)
# - circuit.sym (symbols for debugging)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CIRCUITS_DIR="$(dirname "$SCRIPT_DIR")"
SRC_DIR="$CIRCUITS_DIR/src"
BUILD_DIR="$CIRCUITS_DIR/build"

echo "=== TrueTicket ZK Circuit Compilation ==="
echo "Source: $SRC_DIR"
echo "Output: $BUILD_DIR"

# Create build directory
mkdir -p "$BUILD_DIR"

# Check for circom
if ! command -v circom &> /dev/null; then
    echo "Error: circom not found. Please install circom:"
    echo "  curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh"
    echo "  git clone https://github.com/iden3/circom.git"
    echo "  cd circom && cargo build --release"
    echo "  sudo cp target/release/circom /usr/local/bin/"
    exit 1
fi

echo ""
echo "Compiling main.circom..."

# Compile the main circuit
circom "$SRC_DIR/main.circom" \
    --r1cs \
    --wasm \
    --sym \
    --output "$BUILD_DIR" \
    -l "$CIRCUITS_DIR/node_modules"

echo ""
echo "=== Compilation Complete ==="
echo ""
echo "Generated files:"
ls -la "$BUILD_DIR"
echo ""
echo "Next steps:"
echo "  1. Run ./scripts/setup.sh to generate proving/verification keys"
echo "  2. Run ./scripts/export-verifier.sh to generate Solidity verifier"
