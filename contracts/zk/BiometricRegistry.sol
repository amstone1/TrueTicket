// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

/**
 * @title BiometricRegistry
 * @notice Stores biometric commitments for ZK verification
 * @dev Stores Poseidon(biometricTemplateHash, salt) - NEVER raw biometric data
 *
 * Patent-critical component: Enables privacy-preserving biometric verification
 * through ZK proofs. The commitment reveals nothing about the actual biometric.
 */
contract BiometricRegistry is
    Initializable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable
{
    bytes32 public constant REGISTRY_ADMIN_ROLE = keccak256("REGISTRY_ADMIN_ROLE");
    bytes32 public constant ENROLLER_ROLE = keccak256("ENROLLER_ROLE");

    struct BiometricCommitment {
        uint256 commitment;       // Poseidon(templateHash, salt)
        uint256 enrolledAt;       // Enrollment timestamp
        uint8 version;            // Commitment version
        bool isActive;            // Whether commitment is active
    }

    // User address => biometric commitment
    mapping(address => BiometricCommitment) public userCommitments;

    // Commitment => user (for reverse lookup and uniqueness)
    mapping(uint256 => address) public commitmentToUser;

    // Total enrolled users
    uint256 public totalEnrolled;

    // Current commitment version
    uint8 public constant COMMITMENT_VERSION = 1;

    event BiometricEnrolled(
        address indexed user,
        uint256 indexed commitment,
        uint256 timestamp
    );

    event BiometricUpdated(
        address indexed user,
        uint256 indexed oldCommitment,
        uint256 indexed newCommitment,
        uint256 timestamp
    );

    event BiometricRevoked(
        address indexed user,
        uint256 indexed commitment,
        string reason,
        uint256 timestamp
    );

    error AlreadyEnrolled();
    error NotEnrolled();
    error CommitmentExists();
    error InvalidCommitment();
    error Unauthorized();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address admin) external initializer {
        __AccessControl_init();
        __ReentrancyGuard_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(REGISTRY_ADMIN_ROLE, admin);
        _grantRole(ENROLLER_ROLE, admin);
    }

    /**
     * @notice Enroll a new biometric commitment
     * @dev Called after user completes face enrollment on frontend
     * @param user The user address to enroll
     * @param commitment The Poseidon commitment (hash of template + salt)
     */
    function enroll(
        address user,
        uint256 commitment
    ) external onlyRole(ENROLLER_ROLE) {
        if (userCommitments[user].isActive) revert AlreadyEnrolled();
        if (commitment == 0) revert InvalidCommitment();
        if (commitmentToUser[commitment] != address(0)) revert CommitmentExists();

        userCommitments[user] = BiometricCommitment({
            commitment: commitment,
            enrolledAt: block.timestamp,
            version: COMMITMENT_VERSION,
            isActive: true
        });

        commitmentToUser[commitment] = user;
        totalEnrolled++;

        emit BiometricEnrolled(user, commitment, block.timestamp);
    }

    /**
     * @notice Update a user's biometric commitment
     * @dev Called when user re-enrolls their biometric
     * @param user The user address
     * @param newCommitment The new Poseidon commitment
     */
    function updateCommitment(
        address user,
        uint256 newCommitment
    ) external onlyRole(ENROLLER_ROLE) {
        if (!userCommitments[user].isActive) revert NotEnrolled();
        if (newCommitment == 0) revert InvalidCommitment();
        if (commitmentToUser[newCommitment] != address(0)) revert CommitmentExists();

        uint256 oldCommitment = userCommitments[user].commitment;

        // Clear old commitment mapping
        delete commitmentToUser[oldCommitment];

        // Set new commitment
        userCommitments[user].commitment = newCommitment;
        userCommitments[user].enrolledAt = block.timestamp;
        commitmentToUser[newCommitment] = user;

        emit BiometricUpdated(user, oldCommitment, newCommitment, block.timestamp);
    }

    /**
     * @notice Revoke a user's biometric enrollment
     * @param user The user address
     * @param reason Reason for revocation (audit trail)
     */
    function revoke(
        address user,
        string calldata reason
    ) external onlyRole(REGISTRY_ADMIN_ROLE) {
        if (!userCommitments[user].isActive) revert NotEnrolled();

        uint256 commitment = userCommitments[user].commitment;
        userCommitments[user].isActive = false;

        delete commitmentToUser[commitment];
        totalEnrolled--;

        emit BiometricRevoked(user, commitment, reason, block.timestamp);
    }

    /**
     * @notice Get a user's biometric commitment
     * @param user The user address
     * @return commitment The Poseidon commitment
     * @return isActive Whether the enrollment is active
     */
    function getCommitment(address user) external view returns (
        uint256 commitment,
        bool isActive
    ) {
        BiometricCommitment storage bc = userCommitments[user];
        return (bc.commitment, bc.isActive);
    }

    /**
     * @notice Check if a commitment is registered
     * @param commitment The commitment to check
     * @return Whether the commitment exists and is active
     */
    function isCommitmentActive(uint256 commitment) external view returns (bool) {
        address user = commitmentToUser[commitment];
        if (user == address(0)) return false;
        return userCommitments[user].isActive;
    }

    /**
     * @notice Verify that a commitment matches a user
     * @dev Used by ZK verification to confirm commitment ownership
     */
    function verifyCommitmentOwner(
        address user,
        uint256 commitment
    ) external view returns (bool) {
        BiometricCommitment storage bc = userCommitments[user];
        return bc.isActive && bc.commitment == commitment;
    }
}
