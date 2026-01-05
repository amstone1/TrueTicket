// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

/**
 * @title TicketMerkleTree
 * @notice Manages Merkle roots for ticket ownership verification
 * @dev Each event has its own Merkle tree containing all valid tickets
 *
 * Patent-critical component: Enables ZK proof of ticket ownership
 * without revealing which specific ticket is being verified.
 */
contract TicketMerkleTree is
    Initializable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable
{
    bytes32 public constant TREE_ADMIN_ROLE = keccak256("TREE_ADMIN_ROLE");
    bytes32 public constant UPDATER_ROLE = keccak256("UPDATER_ROLE");

    // Event ID => current Merkle root
    mapping(uint256 => bytes32) public eventMerkleRoots;

    // Event ID => root update history (for verification of older proofs)
    mapping(uint256 => bytes32[]) public eventRootHistory;

    // Event ID => last update timestamp
    mapping(uint256 => uint256) public lastUpdated;

    // Event ID => total leaves (tickets) in tree
    mapping(uint256 => uint256) public leafCount;

    // Whether the event's tree is frozen (no more updates)
    mapping(uint256 => bool) public isFrozen;

    // Maximum history depth to keep
    uint256 public constant MAX_HISTORY_DEPTH = 100;

    event MerkleRootUpdated(
        uint256 indexed eventId,
        bytes32 indexed oldRoot,
        bytes32 indexed newRoot,
        uint256 leafCount,
        uint256 timestamp
    );

    event TreeFrozen(uint256 indexed eventId, bytes32 finalRoot);

    error TreeAlreadyFrozen(uint256 eventId);
    error InvalidRoot();
    error EventNotFound();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address admin) external initializer {
        __AccessControl_init();
        __ReentrancyGuard_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(TREE_ADMIN_ROLE, admin);
        _grantRole(UPDATER_ROLE, admin);
    }

    /**
     * @notice Update the Merkle root for an event
     * @dev Called by backend when tickets are minted/burned
     * @param eventId The event to update
     * @param newRoot The new Merkle root
     * @param newLeafCount Total number of tickets in the tree
     */
    function updateRoot(
        uint256 eventId,
        bytes32 newRoot,
        uint256 newLeafCount
    ) external onlyRole(UPDATER_ROLE) {
        if (isFrozen[eventId]) revert TreeAlreadyFrozen(eventId);
        if (newRoot == bytes32(0)) revert InvalidRoot();

        bytes32 oldRoot = eventMerkleRoots[eventId];

        // Store old root in history
        if (oldRoot != bytes32(0)) {
            if (eventRootHistory[eventId].length >= MAX_HISTORY_DEPTH) {
                // Shift history (remove oldest)
                for (uint256 i = 0; i < MAX_HISTORY_DEPTH - 1; i++) {
                    eventRootHistory[eventId][i] = eventRootHistory[eventId][i + 1];
                }
                eventRootHistory[eventId].pop();
            }
            eventRootHistory[eventId].push(oldRoot);
        }

        // Update to new root
        eventMerkleRoots[eventId] = newRoot;
        leafCount[eventId] = newLeafCount;
        lastUpdated[eventId] = block.timestamp;

        emit MerkleRootUpdated(eventId, oldRoot, newRoot, newLeafCount, block.timestamp);
    }

    /**
     * @notice Freeze an event's tree (no more updates allowed)
     * @dev Called after event ends to lock the final state
     */
    function freezeTree(uint256 eventId) external onlyRole(TREE_ADMIN_ROLE) {
        if (eventMerkleRoots[eventId] == bytes32(0)) revert EventNotFound();

        isFrozen[eventId] = true;
        emit TreeFrozen(eventId, eventMerkleRoots[eventId]);
    }

    /**
     * @notice Check if a root is valid for an event
     * @dev Checks current root and history
     */
    function isValidRoot(uint256 eventId, bytes32 root) external view returns (bool) {
        // Check current root
        if (eventMerkleRoots[eventId] == root) {
            return true;
        }

        // Check history
        bytes32[] storage history = eventRootHistory[eventId];
        for (uint256 i = 0; i < history.length; i++) {
            if (history[i] == root) {
                return true;
            }
        }

        return false;
    }

    /**
     * @notice Get the current Merkle root for an event
     */
    function getRoot(uint256 eventId) external view returns (bytes32) {
        return eventMerkleRoots[eventId];
    }

    /**
     * @notice Get tree statistics for an event
     */
    function getTreeStats(uint256 eventId) external view returns (
        bytes32 root,
        uint256 leaves,
        uint256 lastUpdate,
        bool frozen,
        uint256 historyDepth
    ) {
        return (
            eventMerkleRoots[eventId],
            leafCount[eventId],
            lastUpdated[eventId],
            isFrozen[eventId],
            eventRootHistory[eventId].length
        );
    }
}
