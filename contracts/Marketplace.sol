// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./interfaces/ITrueTicket.sol";

/**
 * @title Marketplace
 * @notice Secondary market for TrueTicket NFTs with price cap and royalty enforcement
 */
contract Marketplace is
    Initializable,
    UUPSUpgradeable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    IMarketplace
{
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    address public eventFactory;
    address public pricingController;
    address public royaltyDistributor;

    uint256 public nextListingId;

    mapping(uint256 => Listing) public listings;

    // ticketContract => tokenId => listingId (0 if not listed)
    mapping(address => mapping(uint256 => uint256)) public activeListingByToken;

    // ticketContract => array of active listing IDs
    mapping(address => uint256[]) private _activeListings;
    mapping(address => mapping(uint256 => uint256)) private _activeListingIndex;

    error NotOwner();
    error NotApproved();
    error AlreadyListed();
    error ResaleNotAllowed();
    error TransfersDisabled();
    error InvalidPrice();
    error ListingNotActive();
    error ListingExpired();
    error CannotBuyOwnListing();
    error InsufficientPayment();
    error NotSeller();
    error PaymentFailed();
    error RefundFailed();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address eventFactory_,
        address pricingController_,
        address royaltyDistributor_,
        address admin
    ) external initializer {
        __UUPSUpgradeable_init();
        __AccessControl_init();
        __Pausable_init();
        __ReentrancyGuard_init();

        eventFactory = eventFactory_;
        pricingController = pricingController_;
        royaltyDistributor = royaltyDistributor_;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);

        nextListingId = 1;
    }

    // ============ Listing Functions ============

    function listTicket(
        address ticketContract,
        uint256 tokenId,
        uint256 price,
        uint256 duration
    ) external whenNotPaused nonReentrant returns (uint256 listingId) {
        address seller = msg.sender;

        // Verify ownership
        if (IERC721(ticketContract).ownerOf(tokenId) != seller) revert NotOwner();

        // Verify approval
        if (!IERC721(ticketContract).isApprovedForAll(seller, address(this)) &&
            IERC721(ticketContract).getApproved(tokenId) != address(this)) {
            revert NotApproved();
        }

        // Check not already listed
        if (activeListingByToken[ticketContract][tokenId] != 0) revert AlreadyListed();

        // Get event ID and validate resale is allowed
        ITrueTicketNFT ticket = ITrueTicketNFT(ticketContract);
        uint256 eventId = ticket.eventId();

        ITrueTicketNFT.TransferRestriction memory restrictions = ticket.getTransferRestriction(tokenId);
        if (!restrictions.resaleAllowed) revert ResaleNotAllowed();
        if (!restrictions.transferable) revert TransfersDisabled();

        // Validate price against caps
        ITrueTicketNFT.TicketMetadata memory metadata = ticket.getTicketMetadata(tokenId);
        (bool valid, string memory reason) = IPricingController(pricingController)
            .validateResalePrice(eventId, tokenId, metadata.originalPrice, price);
        if (!valid) revert InvalidPrice();

        // Create listing
        listingId = nextListingId++;

        listings[listingId] = Listing({
            seller: seller,
            ticketContract: ticketContract,
            tokenId: tokenId,
            price: price,
            listedAt: block.timestamp,
            expiresAt: duration > 0 ? block.timestamp + duration : 0,
            active: true
        });

        activeListingByToken[ticketContract][tokenId] = listingId;
        _activeListings[ticketContract].push(listingId);
        _activeListingIndex[ticketContract][listingId] = _activeListings[ticketContract].length - 1;

        emit TicketListed(listingId, seller, ticketContract, tokenId, price);
    }

    function buyTicket(uint256 listingId) external payable whenNotPaused nonReentrant {
        Listing storage listing = listings[listingId];

        if (!listing.active) revert ListingNotActive();
        if (listing.expiresAt != 0 && block.timestamp >= listing.expiresAt) revert ListingExpired();
        if (msg.value < listing.price) revert InsufficientPayment();

        address buyer = msg.sender;
        if (buyer == listing.seller) revert CannotBuyOwnListing();

        // Get event info for royalty distribution
        ITrueTicketNFT ticket = ITrueTicketNFT(listing.ticketContract);
        uint256 eventId = ticket.eventId();

        // Calculate royalty
        (address royaltyReceiver, uint256 royaltyAmount) = IRoyaltyDistributor(royaltyDistributor)
            .getRoyaltyInfo(eventId, listing.tokenId, listing.price);

        // Deactivate listing before external calls
        listing.active = false;
        _removeFromActiveListings(listing.ticketContract, listingId);
        activeListingByToken[listing.ticketContract][listing.tokenId] = 0;

        // Transfer ticket to buyer
        IERC721(listing.ticketContract).safeTransferFrom(listing.seller, buyer, listing.tokenId);

        // Distribute royalty
        if (royaltyAmount > 0) {
            IRoyaltyDistributor(royaltyDistributor).distribute{value: royaltyAmount}(
                eventId,
                listing.tokenId,
                listing.price
            );
        }

        // Pay seller (price - royalty)
        uint256 sellerProceeds = listing.price - royaltyAmount;
        (bool success, ) = listing.seller.call{value: sellerProceeds}("");
        if (!success) revert PaymentFailed();

        // Refund excess payment
        uint256 excess = msg.value - listing.price;
        if (excess > 0) {
            (bool refundSuccess, ) = buyer.call{value: excess}("");
            if (!refundSuccess) revert RefundFailed();
        }

        emit TicketSold(listingId, buyer, listing.price, royaltyAmount);
    }

    function cancelListing(uint256 listingId) external nonReentrant {
        Listing storage listing = listings[listingId];

        if (!listing.active) revert ListingNotActive();
        if (listing.seller != msg.sender) revert NotSeller();

        listing.active = false;
        _removeFromActiveListings(listing.ticketContract, listingId);
        activeListingByToken[listing.ticketContract][listing.tokenId] = 0;

        emit ListingCancelled(listingId);
    }

    function updateListingPrice(uint256 listingId, uint256 newPrice) external nonReentrant {
        Listing storage listing = listings[listingId];

        if (!listing.active) revert ListingNotActive();
        if (listing.seller != msg.sender) revert NotSeller();

        // Validate new price
        ITrueTicketNFT ticket = ITrueTicketNFT(listing.ticketContract);
        uint256 eventId = ticket.eventId();
        ITrueTicketNFT.TicketMetadata memory metadata = ticket.getTicketMetadata(listing.tokenId);

        (bool valid, ) = IPricingController(pricingController)
            .validateResalePrice(eventId, listing.tokenId, metadata.originalPrice, newPrice);
        if (!valid) revert InvalidPrice();

        listing.price = newPrice;
        emit ListingPriceUpdated(listingId, newPrice);
    }

    // ============ View Functions ============

    function getListing(uint256 listingId) external view returns (Listing memory) {
        return listings[listingId];
    }

    function getActiveListings(address ticketContract) external view returns (uint256[] memory) {
        return _activeListings[ticketContract];
    }

    // ============ Internal ============

    function _removeFromActiveListings(address ticketContract, uint256 listingId) internal {
        uint256 index = _activeListingIndex[ticketContract][listingId];
        uint256 lastIndex = _activeListings[ticketContract].length - 1;

        if (index != lastIndex) {
            uint256 lastListingId = _activeListings[ticketContract][lastIndex];
            _activeListings[ticketContract][index] = lastListingId;
            _activeListingIndex[ticketContract][lastListingId] = index;
        }

        _activeListings[ticketContract].pop();
        delete _activeListingIndex[ticketContract][listingId];
    }

    // ============ Admin ============

    function pause() external onlyRole(OPERATOR_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(OPERATOR_ROLE) {
        _unpause();
    }

    function setEventFactory(address eventFactory_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        eventFactory = eventFactory_;
    }

    function setPricingController(address pricingController_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        pricingController = pricingController_;
    }

    function setRoyaltyDistributor(address royaltyDistributor_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        royaltyDistributor = royaltyDistributor_;
    }

    function _authorizeUpgrade(address) internal override onlyRole(UPGRADER_ROLE) {}
}
