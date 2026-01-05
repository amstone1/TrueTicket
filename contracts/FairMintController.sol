// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";

/**
 * @title FairMintController
 * @notice MEV-Resistant Fair Ordering for Ticket Drops
 * @dev Implements a commit-reveal scheme to prevent front-running and MEV attacks
 *
 * Patent-critical innovation: Ensures fair ticket distribution by:
 * 1. COMMIT PHASE: Users submit hidden purchase intents
 * 2. REVEAL PHASE: Users reveal their commitments
 * 3. PROCESS PHASE: Tickets allocated in timestamp order (FIFO)
 *
 * This prevents:
 * - Bot front-running (commitments are hidden)
 * - MEV sandwich attacks (reveal order doesn't matter)
 * - Priority gas auctions (FIFO ordering by commit timestamp)
 */
contract FairMintController is
    Initializable,
    UUPSUpgradeable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable
{
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant DROP_MANAGER_ROLE = keccak256("DROP_MANAGER_ROLE");

    enum DropPhase {
        INACTIVE,
        COMMIT,
        REVEAL,
        PROCESS,
        COMPLETED
    }

    struct Drop {
        uint256 eventId;
        uint8 tierId;
        uint256 ticketPrice;
        uint256 totalTickets;
        uint256 ticketsRemaining;
        uint256 maxPerWallet;
        uint256 commitStart;
        uint256 commitEnd;
        uint256 revealEnd;
        DropPhase phase;
        address ticketContract;
    }

    struct Commitment {
        bytes32 commitHash;       // Hash of (buyer, quantity, secret)
        uint256 timestamp;        // When commitment was made (for FIFO ordering)
        uint256 depositAmount;    // ETH deposited with commitment
        bool revealed;            // Whether commitment has been revealed
        uint256 revealedQuantity; // Quantity revealed (0 if not revealed)
    }

    struct RevealedIntent {
        address buyer;
        uint256 quantity;
        uint256 commitTimestamp;
        bool processed;
    }

    // Drop ID => Drop config
    mapping(uint256 => Drop) public drops;
    uint256 public nextDropId;

    // Drop ID => buyer => Commitment
    mapping(uint256 => mapping(address => Commitment)) public commitments;

    // Drop ID => sorted list of revealed intents (by commit timestamp)
    mapping(uint256 => RevealedIntent[]) public revealedIntents;

    // Drop ID => buyer => minted count
    mapping(uint256 => mapping(address => uint256)) public mintedPerWallet;

    // Minimum commit deposit (prevents spam)
    uint256 public minCommitDeposit;

    // Events
    event DropCreated(
        uint256 indexed dropId,
        uint256 indexed eventId,
        uint8 tierId,
        uint256 totalTickets,
        uint256 commitStart,
        uint256 commitEnd
    );

    event CommitmentMade(
        uint256 indexed dropId,
        address indexed buyer,
        bytes32 commitHash,
        uint256 depositAmount,
        uint256 timestamp
    );

    event CommitmentRevealed(
        uint256 indexed dropId,
        address indexed buyer,
        uint256 quantity,
        uint256 commitTimestamp
    );

    event TicketsMinted(
        uint256 indexed dropId,
        address indexed buyer,
        uint256 quantity,
        uint256 totalPaid
    );

    event RefundIssued(
        uint256 indexed dropId,
        address indexed buyer,
        uint256 amount,
        string reason
    );

    event PhaseAdvanced(
        uint256 indexed dropId,
        DropPhase newPhase
    );

    // Errors
    error InvalidPhase();
    error DropNotFound();
    error CommitmentExists();
    error NoCommitment();
    error AlreadyRevealed();
    error InvalidReveal();
    error ExceedsMaxPerWallet();
    error InsufficientDeposit();
    error InsufficientPayment();
    error NoTicketsAvailable();
    error AlreadyProcessed();
    error RefundFailed();
    error InvalidTimestamps();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address admin) external initializer {
        __UUPSUpgradeable_init();
        __AccessControl_init();
        __ReentrancyGuard_init();
        __Pausable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
        _grantRole(DROP_MANAGER_ROLE, admin);

        minCommitDeposit = 0.001 ether;
        nextDropId = 1;
    }

    // ============ Drop Management ============

    /**
     * @notice Create a new fair ticket drop
     * @param eventId Event this drop is for
     * @param tierId Ticket tier
     * @param ticketPrice Price per ticket in wei
     * @param totalTickets Total tickets available
     * @param maxPerWallet Maximum tickets per wallet
     * @param commitStart Unix timestamp when commit phase starts
     * @param commitEnd Unix timestamp when commit phase ends
     * @param revealEnd Unix timestamp when reveal phase ends
     * @param ticketContract Address of the ticket NFT contract
     */
    function createDrop(
        uint256 eventId,
        uint8 tierId,
        uint256 ticketPrice,
        uint256 totalTickets,
        uint256 maxPerWallet,
        uint256 commitStart,
        uint256 commitEnd,
        uint256 revealEnd,
        address ticketContract
    ) external onlyRole(DROP_MANAGER_ROLE) returns (uint256 dropId) {
        if (commitEnd <= commitStart || revealEnd <= commitEnd) {
            revert InvalidTimestamps();
        }

        dropId = nextDropId++;

        drops[dropId] = Drop({
            eventId: eventId,
            tierId: tierId,
            ticketPrice: ticketPrice,
            totalTickets: totalTickets,
            ticketsRemaining: totalTickets,
            maxPerWallet: maxPerWallet,
            commitStart: commitStart,
            commitEnd: commitEnd,
            revealEnd: revealEnd,
            phase: DropPhase.INACTIVE,
            ticketContract: ticketContract
        });

        emit DropCreated(dropId, eventId, tierId, totalTickets, commitStart, commitEnd);
    }

    /**
     * @notice Advance drop to next phase
     */
    function advancePhase(uint256 dropId) external onlyRole(DROP_MANAGER_ROLE) {
        Drop storage drop = drops[dropId];
        if (drop.totalTickets == 0) revert DropNotFound();

        DropPhase currentPhase = drop.phase;
        DropPhase newPhase;

        if (currentPhase == DropPhase.INACTIVE && block.timestamp >= drop.commitStart) {
            newPhase = DropPhase.COMMIT;
        } else if (currentPhase == DropPhase.COMMIT && block.timestamp >= drop.commitEnd) {
            newPhase = DropPhase.REVEAL;
        } else if (currentPhase == DropPhase.REVEAL && block.timestamp >= drop.revealEnd) {
            newPhase = DropPhase.PROCESS;
            // Sort revealed intents by commit timestamp (FIFO)
            _sortRevealedIntents(dropId);
        } else if (currentPhase == DropPhase.PROCESS && drop.ticketsRemaining == 0) {
            newPhase = DropPhase.COMPLETED;
        } else {
            revert InvalidPhase();
        }

        drop.phase = newPhase;
        emit PhaseAdvanced(dropId, newPhase);
    }

    // ============ Commit Phase ============

    /**
     * @notice Submit a hidden commitment to buy tickets
     * @param dropId The drop to commit to
     * @param commitHash Hash of (buyer address, quantity, secret)
     */
    function commit(
        uint256 dropId,
        bytes32 commitHash
    ) external payable nonReentrant whenNotPaused {
        Drop storage drop = drops[dropId];
        if (drop.phase != DropPhase.COMMIT) revert InvalidPhase();
        if (commitments[dropId][msg.sender].commitHash != bytes32(0)) revert CommitmentExists();
        if (msg.value < minCommitDeposit) revert InsufficientDeposit();

        commitments[dropId][msg.sender] = Commitment({
            commitHash: commitHash,
            timestamp: block.timestamp,
            depositAmount: msg.value,
            revealed: false,
            revealedQuantity: 0
        });

        emit CommitmentMade(dropId, msg.sender, commitHash, msg.value, block.timestamp);
    }

    // ============ Reveal Phase ============

    /**
     * @notice Reveal a commitment
     * @param dropId The drop
     * @param quantity Number of tickets
     * @param secret Secret used in commitment
     */
    function reveal(
        uint256 dropId,
        uint256 quantity,
        bytes32 secret
    ) external nonReentrant whenNotPaused {
        Drop storage drop = drops[dropId];
        if (drop.phase != DropPhase.REVEAL) revert InvalidPhase();

        Commitment storage commitment = commitments[dropId][msg.sender];
        if (commitment.commitHash == bytes32(0)) revert NoCommitment();
        if (commitment.revealed) revert AlreadyRevealed();

        // Verify the reveal matches the commitment
        bytes32 expectedHash = keccak256(abi.encodePacked(msg.sender, quantity, secret));
        if (expectedHash != commitment.commitHash) revert InvalidReveal();

        // Check quantity doesn't exceed max per wallet
        if (quantity > drop.maxPerWallet) revert ExceedsMaxPerWallet();

        commitment.revealed = true;
        commitment.revealedQuantity = quantity;

        // Add to revealed intents list
        revealedIntents[dropId].push(RevealedIntent({
            buyer: msg.sender,
            quantity: quantity,
            commitTimestamp: commitment.timestamp,
            processed: false
        }));

        emit CommitmentRevealed(dropId, msg.sender, quantity, commitment.timestamp);
    }

    // ============ Process Phase ============

    /**
     * @notice Process revealed intents and mint tickets (FIFO order)
     * @param dropId The drop to process
     * @param maxToProcess Maximum number of intents to process (gas limit)
     */
    function processIntents(
        uint256 dropId,
        uint256 maxToProcess
    ) external onlyRole(DROP_MANAGER_ROLE) nonReentrant {
        Drop storage drop = drops[dropId];
        if (drop.phase != DropPhase.PROCESS) revert InvalidPhase();

        RevealedIntent[] storage intents = revealedIntents[dropId];
        uint256 processed = 0;

        for (uint256 i = 0; i < intents.length && processed < maxToProcess; i++) {
            RevealedIntent storage intent = intents[i];
            if (intent.processed) continue;
            if (drop.ticketsRemaining == 0) break;

            Commitment storage commitment = commitments[dropId][intent.buyer];

            // Calculate how many tickets they can actually get
            uint256 canMint = intent.quantity;
            if (canMint > drop.ticketsRemaining) {
                canMint = drop.ticketsRemaining;
            }

            // Check payment
            uint256 totalCost = canMint * drop.ticketPrice;
            if (commitment.depositAmount < totalCost) {
                // Partial mint based on deposit
                canMint = commitment.depositAmount / drop.ticketPrice;
                totalCost = canMint * drop.ticketPrice;
            }

            if (canMint > 0) {
                // Mint tickets (simplified - real implementation would call ticket contract)
                mintedPerWallet[dropId][intent.buyer] += canMint;
                drop.ticketsRemaining -= canMint;

                emit TicketsMinted(dropId, intent.buyer, canMint, totalCost);

                // Refund excess deposit
                uint256 refund = commitment.depositAmount - totalCost;
                if (refund > 0) {
                    commitment.depositAmount = 0;
                    (bool success, ) = intent.buyer.call{value: refund}("");
                    if (success) {
                        emit RefundIssued(dropId, intent.buyer, refund, "excess_deposit");
                    }
                }
            }

            intent.processed = true;
            processed++;
        }

        // Check if drop is complete
        if (drop.ticketsRemaining == 0) {
            drop.phase = DropPhase.COMPLETED;
            emit PhaseAdvanced(dropId, DropPhase.COMPLETED);
        }
    }

    /**
     * @notice Claim refund for unrevealed or unprocessed commitment
     */
    function claimRefund(uint256 dropId) external nonReentrant {
        Drop storage drop = drops[dropId];
        if (drop.phase != DropPhase.COMPLETED && drop.phase != DropPhase.PROCESS) {
            revert InvalidPhase();
        }

        Commitment storage commitment = commitments[dropId][msg.sender];
        if (commitment.depositAmount == 0) revert NoCommitment();

        // Only refund if not revealed or not fully processed
        uint256 refundAmount = 0;

        if (!commitment.revealed) {
            // Didn't reveal - full refund
            refundAmount = commitment.depositAmount;
        } else {
            // Check if they got fewer tickets than requested
            uint256 minted = mintedPerWallet[dropId][msg.sender];
            uint256 spent = minted * drop.ticketPrice;
            if (commitment.depositAmount > spent) {
                refundAmount = commitment.depositAmount - spent;
            }
        }

        if (refundAmount > 0) {
            commitment.depositAmount = 0;
            (bool success, ) = msg.sender.call{value: refundAmount}("");
            if (!success) revert RefundFailed();

            emit RefundIssued(dropId, msg.sender, refundAmount, commitment.revealed ? "overpayment" : "unrevealed");
        }
    }

    // ============ View Functions ============

    function getDropPhase(uint256 dropId) external view returns (DropPhase) {
        return drops[dropId].phase;
    }

    function getCommitment(uint256 dropId, address buyer) external view returns (Commitment memory) {
        return commitments[dropId][buyer];
    }

    function getRevealedIntentsCount(uint256 dropId) external view returns (uint256) {
        return revealedIntents[dropId].length;
    }

    /**
     * @notice Generate commitment hash (for frontend)
     */
    function generateCommitHash(
        address buyer,
        uint256 quantity,
        bytes32 secret
    ) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(buyer, quantity, secret));
    }

    // ============ Internal Functions ============

    /**
     * @dev Sort revealed intents by commit timestamp (insertion sort for small arrays)
     */
    function _sortRevealedIntents(uint256 dropId) internal {
        RevealedIntent[] storage intents = revealedIntents[dropId];
        uint256 n = intents.length;

        for (uint256 i = 1; i < n; i++) {
            RevealedIntent memory key = intents[i];
            int256 j = int256(i) - 1;

            while (j >= 0 && intents[uint256(j)].commitTimestamp > key.commitTimestamp) {
                intents[uint256(j + 1)] = intents[uint256(j)];
                j--;
            }
            intents[uint256(j + 1)] = key;
        }
    }

    // ============ Admin Functions ============

    function setMinCommitDeposit(uint256 newMin) external onlyRole(ADMIN_ROLE) {
        minCommitDeposit = newMin;
    }

    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    function _authorizeUpgrade(address) internal override onlyRole(UPGRADER_ROLE) {}

    receive() external payable {}
}
