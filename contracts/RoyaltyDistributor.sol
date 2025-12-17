// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "./interfaces/ITrueTicket.sol";

/**
 * @title RoyaltyDistributor
 * @notice Handles royalty configuration and distribution for secondary sales
 * @dev Implements ERC-2981 compatible interface with multi-beneficiary splits
 */
contract RoyaltyDistributor is
    Initializable,
    UUPSUpgradeable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable,
    IRoyaltyDistributor
{
    bytes32 public constant ROYALTY_ADMIN_ROLE = keccak256("ROYALTY_ADMIN_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");

    uint16 public constant MAX_ROYALTY_BPS = 2500; // 25% max royalty
    uint16 public constant BPS_DENOMINATOR = 10000;

    address public eventFactory;
    address public platformWallet;
    uint16 public platformFeeBps;

    // eventId => royalty configuration
    mapping(uint256 => uint16) private _totalRoyaltyBps;
    mapping(uint256 => RoyaltySplit[]) private _royaltySplits;
    mapping(uint256 => bool) private _royaltyLocked;

    // Pull payment pattern
    mapping(address => uint256) public pendingWithdrawals;

    error RoyaltyLocked();
    error NotAuthorized();
    error RoyaltyTooHigh();
    error SplitsMustSumTo100();
    error ZeroAddress();
    error InsufficientPayment();
    error WithdrawalFailed();
    error NothingToWithdraw();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address eventFactory_,
        address platformWallet_,
        uint16 platformFeeBps_,
        address admin
    ) external initializer {
        __UUPSUpgradeable_init();
        __AccessControl_init();
        __ReentrancyGuard_init();

        if (platformFeeBps_ > 1000) revert RoyaltyTooHigh(); // Max 10%

        eventFactory = eventFactory_;
        platformWallet = platformWallet_;
        platformFeeBps = platformFeeBps_;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ROYALTY_ADMIN_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
    }

    // ============ Configuration ============

    function setEventRoyalties(
        uint256 eventId,
        uint16 totalRoyaltyBps,
        RoyaltySplit[] calldata splits
    ) external {
        if (_royaltyLocked[eventId]) revert RoyaltyLocked();
        if (!_isAuthorizedForEvent(eventId)) revert NotAuthorized();
        if (totalRoyaltyBps > MAX_ROYALTY_BPS) revert RoyaltyTooHigh();

        // Validate splits sum to 100%
        uint16 totalSplitBps;
        for (uint256 i = 0; i < splits.length; i++) {
            if (splits[i].recipient == address(0)) revert ZeroAddress();
            totalSplitBps += splits[i].basisPoints;
        }
        if (totalSplitBps != BPS_DENOMINATOR) revert SplitsMustSumTo100();

        // Store configuration
        _totalRoyaltyBps[eventId] = totalRoyaltyBps;

        // Clear existing splits
        delete _royaltySplits[eventId];

        // Add new splits
        for (uint256 i = 0; i < splits.length; i++) {
            _royaltySplits[eventId].push(splits[i]);
        }

        emit RoyaltyConfigSet(eventId, totalRoyaltyBps);
    }

    function lockRoyalties(uint256 eventId) external {
        if (!_isAuthorizedForEvent(eventId)) revert NotAuthorized();
        _royaltyLocked[eventId] = true;
    }

    // ============ Distribution ============

    function distribute(
        uint256 eventId,
        uint256 tokenId,
        uint256 salePrice
    ) external payable nonReentrant onlyRole(DISTRIBUTOR_ROLE) {
        uint256 totalRoyalty = (salePrice * _totalRoyaltyBps[eventId]) / BPS_DENOMINATOR;
        if (msg.value < totalRoyalty) revert InsufficientPayment();

        // Calculate and distribute platform fee first
        uint256 platformFee = (totalRoyalty * platformFeeBps) / BPS_DENOMINATOR;
        uint256 distributableRoyalty = totalRoyalty - platformFee;

        if (platformFee > 0) {
            pendingWithdrawals[platformWallet] += platformFee;
            emit RoyaltyPaid(platformWallet, platformFee, "platform");
        }

        // Distribute to beneficiaries
        RoyaltySplit[] storage splits = _royaltySplits[eventId];
        for (uint256 i = 0; i < splits.length; i++) {
            uint256 amount = (distributableRoyalty * splits[i].basisPoints) / BPS_DENOMINATOR;

            if (amount > 0) {
                pendingWithdrawals[splits[i].recipient] += amount;
                emit RoyaltyPaid(splits[i].recipient, amount, splits[i].role);
            }
        }

        emit RoyaltyDistributed(eventId, tokenId, salePrice, totalRoyalty);

        // Refund excess payment
        uint256 excess = msg.value - totalRoyalty;
        if (excess > 0) {
            (bool success, ) = msg.sender.call{value: excess}("");
            if (!success) revert WithdrawalFailed();
        }
    }

    function withdraw() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        if (amount == 0) revert NothingToWithdraw();

        pendingWithdrawals[msg.sender] = 0;

        (bool success, ) = msg.sender.call{value: amount}("");
        if (!success) revert WithdrawalFailed();
    }

    // ============ View Functions ============

    function getRoyaltyInfo(
        uint256 eventId,
        uint256, // tokenId - not used for now
        uint256 salePrice
    ) external view returns (address receiver, uint256 royaltyAmount) {
        royaltyAmount = (salePrice * _totalRoyaltyBps[eventId]) / BPS_DENOMINATOR;
        receiver = address(this);
    }

    function getSplits(uint256 eventId) external view returns (RoyaltySplit[] memory) {
        return _royaltySplits[eventId];
    }

    function getTotalRoyaltyBps(uint256 eventId) external view returns (uint16) {
        return _totalRoyaltyBps[eventId];
    }

    function isLocked(uint256 eventId) external view returns (bool) {
        return _royaltyLocked[eventId];
    }

    // ============ Admin ============

    function setEventFactory(address eventFactory_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        eventFactory = eventFactory_;
    }

    function setPlatformWallet(address platformWallet_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        platformWallet = platformWallet_;
    }

    function setPlatformFeeBps(uint16 platformFeeBps_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (platformFeeBps_ > 1000) revert RoyaltyTooHigh();
        platformFeeBps = platformFeeBps_;
    }

    // ============ Internal ============

    function _isAuthorizedForEvent(uint256 eventId) internal view returns (bool) {
        if (hasRole(ROYALTY_ADMIN_ROLE, msg.sender)) return true;

        IEventFactory factory = IEventFactory(eventFactory);
        IEventFactory.EventConfig memory config = factory.getEventConfig(eventId);

        return msg.sender == config.artist ||
               msg.sender == config.venue ||
               msg.sender == config.host;
    }

    function _authorizeUpgrade(address) internal override onlyRole(UPGRADER_ROLE) {}

    receive() external payable {}
}
