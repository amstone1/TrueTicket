// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";
import "./interfaces/ITrueTicket.sol";
import "./TrueTicketNFT.sol";

/**
 * @title EventFactory
 * @notice Factory for creating new event ticket collections
 * @dev Uses Beacon Proxy pattern for gas-efficient deployments
 */
contract EventFactory is
    Initializable,
    UUPSUpgradeable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    IEventFactory
{
    bytes32 public constant EVENT_CREATOR_ROLE = keccak256("EVENT_CREATOR_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    UpgradeableBeacon public ticketBeacon;
    address public pricingController;
    address public royaltyDistributor;
    address public marketplace;

    uint256 public nextEventId;

    struct EventRecord {
        address ticketContract;
        EventConfig config;
        address creator;
        uint256 createdAt;
        bool paused;
    }

    mapping(uint256 => EventRecord) public events;
    mapping(uint256 => TierConfig[]) public eventTiers;
    mapping(address => uint256[]) public eventsByCreator;

    error EventInPast();
    error NoTiersProvided();
    error ExceedsCapacity();
    error NotAuthorized();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address ticketImplementation,
        address pricingController_,
        address royaltyDistributor_,
        address admin
    ) external initializer {
        __UUPSUpgradeable_init();
        __AccessControl_init();
        __Pausable_init();

        ticketBeacon = new UpgradeableBeacon(ticketImplementation, address(this));
        pricingController = pricingController_;
        royaltyDistributor = royaltyDistributor_;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
        _grantRole(EVENT_CREATOR_ROLE, admin);

        nextEventId = 1;
    }

    // ============ Event Creation ============

    function createEvent(
        EventConfig calldata config,
        TierConfig[] calldata tiers
    ) external onlyRole(EVENT_CREATOR_ROLE) whenNotPaused
        returns (uint256 eventId_, address ticketContract)
    {
        if (config.eventDate <= block.timestamp) revert EventInPast();
        if (tiers.length == 0) revert NoTiersProvided();

        // Validate total supply matches capacity
        uint32 totalSupply;
        for (uint256 i = 0; i < tiers.length; i++) {
            totalSupply += tiers[i].supply;
        }
        if (totalSupply > config.maxCapacity) revert ExceedsCapacity();

        eventId_ = nextEventId++;

        // Deploy ticket contract via Beacon Proxy
        bytes memory initData = abi.encodeWithSelector(
            TrueTicketNFT.initialize.selector,
            config.name,
            config.symbol,
            eventId_,
            msg.sender,
            pricingController,
            royaltyDistributor
        );

        ticketContract = address(new BeaconProxy(address(ticketBeacon), initData));

        // Store event record
        events[eventId_] = EventRecord({
            ticketContract: ticketContract,
            config: config,
            creator: msg.sender,
            createdAt: block.timestamp,
            paused: false
        });

        // Store tiers
        for (uint256 i = 0; i < tiers.length; i++) {
            eventTiers[eventId_].push(tiers[i]);

            // Set tier in ticket contract
            TrueTicketNFT(ticketContract).setTier(
                uint8(i),
                tiers[i].name,
                tiers[i].price,
                tiers[i].supply,
                tiers[i].maxPerWallet
            );
        }

        eventsByCreator[msg.sender].push(eventId_);

        emit EventCreated(eventId_, ticketContract, msg.sender, config.name, config.eventDate);
    }

    // ============ Event Management ============

    function pauseEvent(uint256 eventId_) external {
        EventRecord storage record = events[eventId_];
        if (record.creator != msg.sender && !hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) {
            revert NotAuthorized();
        }

        record.paused = true;
        TrueTicketNFT(record.ticketContract).pause();
        emit EventPaused(eventId_);
    }

    function unpauseEvent(uint256 eventId_) external {
        EventRecord storage record = events[eventId_];
        if (record.creator != msg.sender && !hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) {
            revert NotAuthorized();
        }

        record.paused = false;
        TrueTicketNFT(record.ticketContract).unpause();
        emit EventUnpaused(eventId_);
    }

    // ============ Configuration ============

    function setMarketplace(address marketplace_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        marketplace = marketplace_;
    }

    function setPricingController(address pricingController_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        pricingController = pricingController_;
    }

    function setRoyaltyDistributor(address royaltyDistributor_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        royaltyDistributor = royaltyDistributor_;
    }

    // ============ Upgrade Functions ============

    function upgradeTicketImplementation(address newImplementation) external onlyRole(UPGRADER_ROLE) {
        ticketBeacon.upgradeTo(newImplementation);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {}

    // ============ View Functions ============

    function getEventContract(uint256 eventId_) external view returns (address) {
        return events[eventId_].ticketContract;
    }

    function getEventConfig(uint256 eventId_) external view returns (EventConfig memory) {
        return events[eventId_].config;
    }

    function getEventTiers(uint256 eventId_) external view returns (TierConfig[] memory) {
        return eventTiers[eventId_];
    }

    function getEventsByCreator(address creator) external view returns (uint256[] memory) {
        return eventsByCreator[creator];
    }
}
