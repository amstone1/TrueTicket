// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "./TicketMerkleTree.sol";
import "./BiometricRegistry.sol";

/**
 * @title IZKVerifier
 * @notice Interface for the generated Groth16 verifier
 */
interface IZKVerifier {
    function verifyProof(
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint[6] calldata _pubSignals
    ) external view returns (bool);
}

/**
 * @title ZKTicketVerification
 * @notice Main coordinator for ZK-based ticket verification
 * @dev Combines Merkle proofs, biometric verification, and nonce tracking
 *
 * Patent-critical innovation: Privacy-preserving ticket verification system
 * that proves:
 * 1. Ticket ownership (via Merkle proof)
 * 2. Biometric match (via commitment verification)
 * 3. Freshness (via time-bound nonces)
 *
 * WITHOUT revealing the actual ticket ID or biometric data.
 */
contract ZKTicketVerification is
    Initializable,
    UUPSUpgradeable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable
{
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant NONCE_ADMIN_ROLE = keccak256("NONCE_ADMIN_ROLE");

    // External contract references
    IZKVerifier public zkVerifier;
    TicketMerkleTree public merkleTree;
    BiometricRegistry public biometricRegistry;

    // Used nonces (for replay prevention)
    mapping(uint256 => bool) public usedNonces;

    // Event ID => whether ZK verification is required
    mapping(uint256 => bool) public eventRequiresZK;

    // Nonce validity window (default 60 seconds)
    uint256 public nonceValidityWindow;

    // Verification statistics
    uint256 public totalVerifications;
    uint256 public successfulVerifications;

    struct VerificationResult {
        bool valid;
        uint256 eventId;
        uint256 timestamp;
        string reason;
    }

    event VerificationAttempted(
        uint256 indexed eventId,
        uint256 indexed nonce,
        bool success,
        string reason
    );

    event NonceUsed(
        uint256 indexed nonce,
        uint256 indexed eventId,
        uint256 timestamp
    );

    event ZKVerifierUpdated(address indexed oldVerifier, address indexed newVerifier);
    event EventZKRequirementSet(uint256 indexed eventId, bool required);

    error InvalidProof();
    error NonceAlreadyUsed();
    error NonceExpired();
    error InvalidMerkleRoot();
    error BiometricNotEnrolled();
    error ZKVerificationRequired();
    error VerifierNotSet();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address admin,
        address zkVerifier_,
        address merkleTree_,
        address biometricRegistry_
    ) external initializer {
        __UUPSUpgradeable_init();
        __AccessControl_init();
        __ReentrancyGuard_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(VERIFIER_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
        _grantRole(NONCE_ADMIN_ROLE, admin);

        zkVerifier = IZKVerifier(zkVerifier_);
        merkleTree = TicketMerkleTree(merkleTree_);
        biometricRegistry = BiometricRegistry(biometricRegistry_);

        nonceValidityWindow = 60; // 60 seconds default
    }

    /**
     * @notice Verify a ZK proof for ticket check-in
     * @dev Main verification entry point
     *
     * Public signals (in order):
     * [0] merkleRoot
     * [1] biometricCommitment
     * [2] eventId
     * [3] currentTimestamp
     * [4] nonce
     * [5] nonceExpiry
     */
    function verify(
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint[6] calldata _pubSignals
    ) external nonReentrant returns (VerificationResult memory) {
        totalVerifications++;

        // Extract public signals
        uint256 merkleRoot = _pubSignals[0];
        uint256 biometricCommitment = _pubSignals[1];
        uint256 eventId = _pubSignals[2];
        uint256 currentTimestamp = _pubSignals[3];
        uint256 nonce = _pubSignals[4];
        uint256 nonceExpiry = _pubSignals[5];

        // 1. Check nonce hasn't been used (replay prevention)
        if (usedNonces[nonce]) {
            emit VerificationAttempted(eventId, nonce, false, "Nonce already used");
            return VerificationResult(false, eventId, block.timestamp, "Nonce already used");
        }

        // 2. Check nonce hasn't expired
        if (block.timestamp > nonceExpiry) {
            emit VerificationAttempted(eventId, nonce, false, "Nonce expired");
            return VerificationResult(false, eventId, block.timestamp, "Nonce expired");
        }

        // 3. Verify Merkle root is valid for this event
        if (!merkleTree.isValidRoot(eventId, bytes32(merkleRoot))) {
            emit VerificationAttempted(eventId, nonce, false, "Invalid Merkle root");
            return VerificationResult(false, eventId, block.timestamp, "Invalid Merkle root");
        }

        // 4. Verify biometric commitment is registered
        if (!biometricRegistry.isCommitmentActive(biometricCommitment)) {
            emit VerificationAttempted(eventId, nonce, false, "Biometric not enrolled");
            return VerificationResult(false, eventId, block.timestamp, "Biometric not enrolled");
        }

        // 5. Verify the ZK proof
        if (address(zkVerifier) == address(0)) {
            revert VerifierNotSet();
        }

        bool proofValid = zkVerifier.verifyProof(_pA, _pB, _pC, _pubSignals);
        if (!proofValid) {
            emit VerificationAttempted(eventId, nonce, false, "Invalid ZK proof");
            return VerificationResult(false, eventId, block.timestamp, "Invalid ZK proof");
        }

        // 6. Mark nonce as used
        usedNonces[nonce] = true;
        emit NonceUsed(nonce, eventId, block.timestamp);

        // Success!
        successfulVerifications++;
        emit VerificationAttempted(eventId, nonce, true, "Verified");

        return VerificationResult(true, eventId, block.timestamp, "Verified");
    }

    /**
     * @notice Check if a nonce has been used
     */
    function isNonceUsed(uint256 nonce) external view returns (bool) {
        return usedNonces[nonce];
    }

    /**
     * @notice Set whether an event requires ZK verification
     */
    function setEventZKRequirement(
        uint256 eventId,
        bool required
    ) external onlyRole(VERIFIER_ROLE) {
        eventRequiresZK[eventId] = required;
        emit EventZKRequirementSet(eventId, required);
    }

    /**
     * @notice Update the ZK verifier contract
     */
    function setZKVerifier(address newVerifier) external onlyRole(DEFAULT_ADMIN_ROLE) {
        address oldVerifier = address(zkVerifier);
        zkVerifier = IZKVerifier(newVerifier);
        emit ZKVerifierUpdated(oldVerifier, newVerifier);
    }

    /**
     * @notice Update nonce validity window
     */
    function setNonceValidityWindow(uint256 windowSeconds) external onlyRole(NONCE_ADMIN_ROLE) {
        nonceValidityWindow = windowSeconds;
    }

    /**
     * @notice Get verification statistics
     */
    function getStats() external view returns (
        uint256 total,
        uint256 successful,
        uint256 successRate
    ) {
        total = totalVerifications;
        successful = successfulVerifications;
        successRate = total > 0 ? (successful * 10000) / total : 0; // Basis points
    }

    /**
     * @dev Required by UUPS
     */
    function _authorizeUpgrade(address) internal override onlyRole(UPGRADER_ROLE) {}
}
