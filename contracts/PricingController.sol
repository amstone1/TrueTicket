// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "./interfaces/ITrueTicket.sol";

/**
 * @title PricingController
 * @notice Manages pricing rules and resale caps for events
 */
contract PricingController is
    Initializable,
    UUPSUpgradeable,
    AccessControlUpgradeable,
    IPricingController
{
    bytes32 public constant PRICING_ADMIN_ROLE = keccak256("PRICING_ADMIN_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    uint16 public constant BPS_DENOMINATOR = 10000;

    address public eventFactory;

    // eventId => tier => PricingConfig
    mapping(uint256 => mapping(uint8 => PricingConfig)) public pricingConfigs;

    // eventId => whether config is locked
    mapping(uint256 => bool) public configLocked;

    error ConfigLocked();
    error NotAuthorized();
    error InvalidPercentage();
    error PriceBelowMinimum();
    error PriceExceedsCap();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address eventFactory_, address admin) external initializer {
        __UUPSUpgradeable_init();
        __AccessControl_init();

        eventFactory = eventFactory_;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(PRICING_ADMIN_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
    }

    // ============ Configuration ============

    function setPricingConfig(
        uint256 eventId,
        uint8 tier,
        PricingConfig calldata config
    ) external {
        if (configLocked[eventId]) revert ConfigLocked();
        if (!_isAuthorizedForEvent(eventId)) revert NotAuthorized();

        if (config.capType == ResaleCapType.PERCENTAGE_CAP) {
            if (config.capValue < BPS_DENOMINATOR) revert InvalidPercentage();
            if (config.capValue > 100000) revert InvalidPercentage(); // Max 1000%
        }

        pricingConfigs[eventId][tier] = config;
        emit PricingConfigSet(eventId, tier, config);
    }

    function lockPricingConfig(uint256 eventId) external {
        if (!_isAuthorizedForEvent(eventId)) revert NotAuthorized();
        configLocked[eventId] = true;
    }

    // ============ Validation ============

    function validateResalePrice(
        uint256 eventId,
        uint256 tokenId,
        uint256 originalPrice,
        uint256 proposedPrice
    ) external view returns (bool valid, string memory reason) {
        uint8 tier = _getTicketTier(eventId, tokenId);
        PricingConfig storage config = pricingConfigs[eventId][tier];

        // Check minimum price
        if (config.minResalePrice > 0 && proposedPrice < config.minResalePrice) {
            return (false, "Price below minimum");
        }

        // Check cap based on type
        if (config.capType == ResaleCapType.NO_CAP) {
            return (true, "");
        } else if (config.capType == ResaleCapType.FIXED_PRICE) {
            if (proposedPrice != originalPrice) {
                return (false, "Must resell at face value");
            }
        } else if (config.capType == ResaleCapType.PERCENTAGE_CAP) {
            uint256 maxPrice = (originalPrice * config.capValue) / BPS_DENOMINATOR;
            if (proposedPrice > maxPrice) {
                return (false, "Exceeds percentage cap");
            }
        } else if (config.capType == ResaleCapType.ABSOLUTE_CAP) {
            if (proposedPrice > config.capValue) {
                return (false, "Exceeds absolute cap");
            }
        }

        return (true, "");
    }

    function getMaxResalePrice(
        uint256 eventId,
        uint256 tokenId,
        uint256 originalPrice
    ) external view returns (uint256) {
        uint8 tier = _getTicketTier(eventId, tokenId);
        PricingConfig storage config = pricingConfigs[eventId][tier];

        if (config.capType == ResaleCapType.NO_CAP) {
            return type(uint256).max;
        } else if (config.capType == ResaleCapType.FIXED_PRICE) {
            return originalPrice;
        } else if (config.capType == ResaleCapType.PERCENTAGE_CAP) {
            return (originalPrice * config.capValue) / BPS_DENOMINATOR;
        } else if (config.capType == ResaleCapType.ABSOLUTE_CAP) {
            return config.capValue;
        }

        return type(uint256).max;
    }

    function getMinResalePrice(
        uint256 eventId,
        uint256 tokenId,
        uint256 originalPrice
    ) external view returns (uint256) {
        uint8 tier = _getTicketTier(eventId, tokenId);
        return pricingConfigs[eventId][tier].minResalePrice;
    }

    // ============ Internal ============

    function _isAuthorizedForEvent(uint256 eventId) internal view returns (bool) {
        if (hasRole(PRICING_ADMIN_ROLE, msg.sender)) return true;

        IEventFactory factory = IEventFactory(eventFactory);
        IEventFactory.EventConfig memory config = factory.getEventConfig(eventId);

        return msg.sender == config.artist ||
               msg.sender == config.venue ||
               msg.sender == config.host;
    }

    function _getTicketTier(uint256 eventId, uint256 tokenId) internal view returns (uint8) {
        address ticketContract = IEventFactory(eventFactory).getEventContract(eventId);
        return ITrueTicketNFT(ticketContract).getTicketMetadata(tokenId).tier;
    }

    function setEventFactory(address eventFactory_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        eventFactory = eventFactory_;
    }

    function _authorizeUpgrade(address) internal override onlyRole(UPGRADER_ROLE) {}
}
