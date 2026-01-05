// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ITrueTicketNFT
 * @notice Interface for the main ticket NFT contract
 */
interface ITrueTicketNFT {
    struct TicketMetadata {
        uint256 eventId;
        string section;
        string row;
        uint16 seatNumber;
        uint8 tier;
        uint256 originalPrice;
        uint256 mintTimestamp;
        bool used;
    }

    struct TransferRestriction {
        bool transferable;
        bool resaleAllowed;
        uint256 lockUntil;
        uint256 maxTransfers;
        uint256 transferCount;
    }

    event TicketMinted(
        uint256 indexed tokenId,
        address indexed to,
        uint256 indexed eventId,
        uint8 tier,
        uint256 price
    );

    struct BiometricBinding {
        bytes32 biometricHash;      // Hash of biometric template (never raw data)
        uint256 boundAt;            // Timestamp of binding
        uint8 bindingVersion;       // Version for upgrade compatibility
        bool isActive;              // Whether binding is currently active
    }

    event TicketUsed(uint256 indexed tokenId, uint256 timestamp);
    event TicketTransferred(
        uint256 indexed tokenId,
        address indexed from,
        address indexed to,
        uint256 salePrice
    );

    // Biometric binding events - patent-critical innovation
    event BiometricBound(
        uint256 indexed tokenId,
        bytes32 indexed biometricHash,
        uint256 boundAt
    );
    event BiometricUnbound(
        uint256 indexed tokenId,
        bytes32 previousHash,
        uint256 unboundAt,
        string reason
    );
    event BiometricRebindRequired(
        uint256 indexed tokenId,
        address indexed newOwner,
        uint256 transferTimestamp
    );

    function mint(
        address to,
        TicketMetadata calldata metadata,
        TransferRestriction calldata restrictions
    ) external returns (uint256 tokenId);

    function mintBatch(
        address[] calldata recipients,
        TicketMetadata[] calldata metadataArray,
        TransferRestriction calldata restrictions
    ) external returns (uint256[] memory tokenIds);

    function markAsUsed(uint256 tokenId) external;
    function getTicketMetadata(uint256 tokenId) external view returns (TicketMetadata memory);
    function getTransferRestriction(uint256 tokenId) external view returns (TransferRestriction memory);
    function eventId() external view returns (uint256);

    // Biometric binding functions - patent-critical
    function bindBiometric(
        uint256 tokenId,
        bytes32 biometricHash,
        bytes calldata signature
    ) external;

    function rebindBiometric(
        uint256 tokenId,
        bytes32 newBiometricHash,
        bytes calldata ownerSignature
    ) external;

    function unbindBiometric(
        uint256 tokenId,
        string calldata reason
    ) external;

    function getBiometricBinding(uint256 tokenId) external view returns (BiometricBinding memory);
    function requiresBiometricRebind(uint256 tokenId) external view returns (bool);
    function isBiometricBound(uint256 tokenId) external view returns (bool);
}

/**
 * @title IEventFactory
 * @notice Interface for event creation factory
 */
interface IEventFactory {
    struct EventConfig {
        string name;
        string symbol;
        string baseURI;
        uint256 eventDate;
        uint256 doorsOpen;
        address venue;
        address artist;
        address host;
        uint32 maxCapacity;
        bool transferable;
        bool resaleAllowed;
    }

    struct TierConfig {
        string name;
        uint256 price;
        uint32 supply;
        uint32 maxPerWallet;
    }

    event EventCreated(
        uint256 indexed eventId,
        address indexed ticketContract,
        address indexed creator,
        string name,
        uint256 eventDate
    );

    event EventPaused(uint256 indexed eventId);
    event EventUnpaused(uint256 indexed eventId);

    function createEvent(
        EventConfig calldata config,
        TierConfig[] calldata tiers
    ) external returns (uint256 eventId, address ticketContract);

    function getEventContract(uint256 eventId) external view returns (address);
    function getEventConfig(uint256 eventId) external view returns (EventConfig memory);
    function pauseEvent(uint256 eventId) external;
    function unpauseEvent(uint256 eventId) external;
}

/**
 * @title IPricingController
 * @notice Interface for pricing and resale cap logic
 */
interface IPricingController {
    enum ResaleCapType {
        NO_CAP,
        FIXED_PRICE,
        PERCENTAGE_CAP,
        ABSOLUTE_CAP
    }

    struct PricingConfig {
        ResaleCapType capType;
        uint256 capValue;
        uint256 minResalePrice;
        bool dynamicPricing;
    }

    event PricingConfigSet(uint256 indexed eventId, uint8 indexed tier, PricingConfig config);
    event ResaleCapUpdated(uint256 indexed eventId, ResaleCapType capType, uint256 capValue);

    function setPricingConfig(
        uint256 eventId,
        uint8 tier,
        PricingConfig calldata config
    ) external;

    function validateResalePrice(
        uint256 eventId,
        uint256 tokenId,
        uint256 originalPrice,
        uint256 proposedPrice
    ) external view returns (bool valid, string memory reason);

    function getMaxResalePrice(
        uint256 eventId,
        uint256 tokenId,
        uint256 originalPrice
    ) external view returns (uint256);

    function getMinResalePrice(
        uint256 eventId,
        uint256 tokenId,
        uint256 originalPrice
    ) external view returns (uint256);
}

/**
 * @title IRoyaltyDistributor
 * @notice Interface for royalty distribution on secondary sales
 */
interface IRoyaltyDistributor {
    struct RoyaltySplit {
        address recipient;
        uint16 basisPoints;
        string role;
    }

    struct EventRoyaltyConfig {
        uint16 totalRoyaltyBps;
        RoyaltySplit[] splits;
        bool locked;
    }

    event RoyaltyConfigSet(uint256 indexed eventId, uint16 totalBps);
    event RoyaltyDistributed(
        uint256 indexed eventId,
        uint256 indexed tokenId,
        uint256 salePrice,
        uint256 totalRoyalty
    );
    event RoyaltyPaid(address indexed recipient, uint256 amount, string role);

    function setEventRoyalties(
        uint256 eventId,
        uint16 totalRoyaltyBps,
        RoyaltySplit[] calldata splits
    ) external;

    function distribute(
        uint256 eventId,
        uint256 tokenId,
        uint256 salePrice
    ) external payable;

    function getRoyaltyInfo(
        uint256 eventId,
        uint256 tokenId,
        uint256 salePrice
    ) external view returns (address receiver, uint256 royaltyAmount);

    function getSplits(uint256 eventId) external view returns (RoyaltySplit[] memory);
    function lockRoyalties(uint256 eventId) external;
}

/**
 * @title IMarketplace
 * @notice Interface for secondary market operations
 */
interface IMarketplace {
    struct Listing {
        address seller;
        address ticketContract;
        uint256 tokenId;
        uint256 price;
        uint256 listedAt;
        uint256 expiresAt;
        bool active;
    }

    event TicketListed(
        uint256 indexed listingId,
        address indexed seller,
        address indexed ticketContract,
        uint256 tokenId,
        uint256 price
    );

    event TicketSold(
        uint256 indexed listingId,
        address indexed buyer,
        uint256 finalPrice,
        uint256 royaltyPaid
    );

    event ListingCancelled(uint256 indexed listingId);
    event ListingPriceUpdated(uint256 indexed listingId, uint256 newPrice);

    function listTicket(
        address ticketContract,
        uint256 tokenId,
        uint256 price,
        uint256 duration
    ) external returns (uint256 listingId);

    function buyTicket(uint256 listingId) external payable;
    function cancelListing(uint256 listingId) external;
    function updateListingPrice(uint256 listingId, uint256 newPrice) external;
    function getListing(uint256 listingId) external view returns (Listing memory);
    function getActiveListings(address ticketContract) external view returns (uint256[] memory);
}
