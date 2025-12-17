// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/common/ERC2981Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./interfaces/ITrueTicket.sol";

/**
 * @title TrueTicketNFT
 * @notice Main ticket NFT contract with transfer restrictions and royalty enforcement
 * @dev ERC-721 with extensions for ticketing functionality
 */
contract TrueTicketNFT is
    Initializable,
    ERC721Upgradeable,
    ERC721URIStorageUpgradeable,
    ERC721EnumerableUpgradeable,
    ERC2981Upgradeable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    ITrueTicketNFT
{
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant SCANNER_ROLE = keccak256("SCANNER_ROLE");

    uint256 private _eventId;
    uint256 private _nextTokenId;
    address public factory;
    address public pricingController;
    address public royaltyDistributor;
    address public marketplace;
    string private _baseTokenURI;

    mapping(uint256 => TicketMetadata) private _ticketMetadata;
    mapping(uint256 => TransferRestriction) private _transferRestrictions;
    mapping(uint8 => TierInfo) private _tierInfo;
    mapping(address => mapping(uint8 => uint256)) private _mintedPerWalletPerTier;

    struct TierInfo {
        uint256 price;
        uint32 supply;
        uint32 minted;
        uint32 maxPerWallet;
        string name;
    }

    error TransfersDisabled();
    error TransferLocked(uint256 unlockTime);
    error MaxTransfersReached();
    error TicketAlreadyUsed();
    error InvalidTier();
    error TierSoldOut();
    error ExceedsMaxPerWallet();
    error ArrayLengthMismatch();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        string calldata name_,
        string calldata symbol_,
        uint256 eventId_,
        address admin,
        address pricingController_,
        address royaltyDistributor_
    ) external initializer {
        __ERC721_init(name_, symbol_);
        __ERC721URIStorage_init();
        __ERC721Enumerable_init();
        __ERC2981_init();
        __AccessControl_init();
        __Pausable_init();
        __ReentrancyGuard_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);

        _eventId = eventId_;
        factory = msg.sender;
        pricingController = pricingController_;
        royaltyDistributor = royaltyDistributor_;
        _nextTokenId = 1;
    }

    // ============ Tier Management ============

    function setTier(
        uint8 tierId,
        string calldata name,
        uint256 price,
        uint32 supply,
        uint32 maxPerWallet
    ) external onlyRole(OPERATOR_ROLE) {
        _tierInfo[tierId] = TierInfo({
            price: price,
            supply: supply,
            minted: 0,
            maxPerWallet: maxPerWallet,
            name: name
        });
    }

    function getTierInfo(uint8 tierId) external view returns (TierInfo memory) {
        return _tierInfo[tierId];
    }

    // ============ Minting Functions ============

    function mint(
        address to,
        TicketMetadata calldata metadata,
        TransferRestriction calldata restrictions
    ) external onlyRole(MINTER_ROLE) whenNotPaused returns (uint256 tokenId) {
        TierInfo storage tier = _tierInfo[metadata.tier];

        if (tier.supply == 0) revert InvalidTier();
        if (tier.minted >= tier.supply) revert TierSoldOut();
        if (_mintedPerWalletPerTier[to][metadata.tier] >= tier.maxPerWallet) {
            revert ExceedsMaxPerWallet();
        }

        tokenId = _nextTokenId++;

        _safeMint(to, tokenId);

        _ticketMetadata[tokenId] = TicketMetadata({
            eventId: _eventId,
            section: metadata.section,
            row: metadata.row,
            seatNumber: metadata.seatNumber,
            tier: metadata.tier,
            originalPrice: metadata.originalPrice,
            mintTimestamp: block.timestamp,
            used: false
        });

        _transferRestrictions[tokenId] = restrictions;

        tier.minted++;
        _mintedPerWalletPerTier[to][metadata.tier]++;

        emit TicketMinted(tokenId, to, _eventId, metadata.tier, metadata.originalPrice);
    }

    function mintBatch(
        address[] calldata recipients,
        TicketMetadata[] calldata metadataArray,
        TransferRestriction calldata restrictions
    ) external onlyRole(MINTER_ROLE) whenNotPaused returns (uint256[] memory tokenIds) {
        if (recipients.length != metadataArray.length) revert ArrayLengthMismatch();

        tokenIds = new uint256[](recipients.length);

        for (uint256 i = 0; i < recipients.length; i++) {
            TierInfo storage tier = _tierInfo[metadataArray[i].tier];

            if (tier.supply == 0) revert InvalidTier();
            if (tier.minted >= tier.supply) revert TierSoldOut();

            uint256 tokenId = _nextTokenId++;
            tokenIds[i] = tokenId;

            _safeMint(recipients[i], tokenId);

            _ticketMetadata[tokenId] = TicketMetadata({
                eventId: _eventId,
                section: metadataArray[i].section,
                row: metadataArray[i].row,
                seatNumber: metadataArray[i].seatNumber,
                tier: metadataArray[i].tier,
                originalPrice: metadataArray[i].originalPrice,
                mintTimestamp: block.timestamp,
                used: false
            });

            _transferRestrictions[tokenId] = restrictions;

            tier.minted++;
            _mintedPerWalletPerTier[recipients[i]][metadataArray[i].tier]++;

            emit TicketMinted(
                tokenId,
                recipients[i],
                _eventId,
                metadataArray[i].tier,
                metadataArray[i].originalPrice
            );
        }
    }

    // ============ Transfer Hook ============

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal virtual override(ERC721Upgradeable, ERC721EnumerableUpgradeable) returns (address) {
        address from = _ownerOf(tokenId);

        // Skip checks for minting and burning
        if (from != address(0) && to != address(0)) {
            TransferRestriction storage restriction = _transferRestrictions[tokenId];

            if (!restriction.transferable) revert TransfersDisabled();
            if (block.timestamp < restriction.lockUntil) {
                revert TransferLocked(restriction.lockUntil);
            }

            if (restriction.maxTransfers > 0) {
                if (restriction.transferCount >= restriction.maxTransfers) {
                    revert MaxTransfersReached();
                }
            }

            if (_ticketMetadata[tokenId].used) revert TicketAlreadyUsed();

            restriction.transferCount++;

            emit TicketTransferred(tokenId, from, to, 0);
        }

        return super._update(to, tokenId, auth);
    }

    // ============ Ticket Usage ============

    function markAsUsed(uint256 tokenId) external onlyRole(SCANNER_ROLE) {
        if (_ownerOf(tokenId) == address(0)) revert ERC721NonexistentToken(tokenId);
        if (_ticketMetadata[tokenId].used) revert TicketAlreadyUsed();

        _ticketMetadata[tokenId].used = true;
        emit TicketUsed(tokenId, block.timestamp);
    }

    // ============ View Functions ============

    function getTicketMetadata(uint256 tokenId) external view returns (TicketMetadata memory) {
        return _ticketMetadata[tokenId];
    }

    function getTransferRestriction(uint256 tokenId) external view returns (TransferRestriction memory) {
        return _transferRestrictions[tokenId];
    }

    function eventId() external view returns (uint256) {
        return _eventId;
    }

    // ============ Admin Functions ============

    function setBaseURI(string calldata baseURI_) external onlyRole(OPERATOR_ROLE) {
        _baseTokenURI = baseURI_;
    }

    function setMarketplace(address marketplace_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        marketplace = marketplace_;
    }

    function pause() external onlyRole(OPERATOR_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(OPERATOR_ROLE) {
        _unpause();
    }

    // ============ Required Overrides ============

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    function tokenURI(uint256 tokenId) public view override(ERC721Upgradeable, ERC721URIStorageUpgradeable) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(
        ERC721Upgradeable,
        ERC721EnumerableUpgradeable,
        ERC721URIStorageUpgradeable,
        ERC2981Upgradeable,
        AccessControlUpgradeable
    ) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function _increaseBalance(address account, uint128 amount) internal override(ERC721Upgradeable, ERC721EnumerableUpgradeable) {
        super._increaseBalance(account, amount);
    }
}
