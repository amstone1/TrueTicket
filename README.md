# TrueTicket

**Fair Ticketing for Everyone** - An NFT-based ticketing platform that provides fair, scalp-resistant ticketing while feeling like a traditional ticketing experience.

## Features

- **Price-Capped Resales**: Artists and venues set maximum resale prices to prevent scalping
- **Royalty Distribution**: Artists, venues, and hosts earn royalties on every resale transaction
- **Seamless UX**: Blockchain is invisible - users see "tickets" not "NFTs", no gas fees visible
- **Dual Authentication**: Support for email login (embedded wallets) AND traditional Web3 wallets
- **Fiat & Crypto Payments**: Accept credit cards via Stripe or cryptocurrency

## Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Privy** - Authentication & embedded wallets
- **TanStack Query** - Server state management
- **Zustand** - Client state management

### Backend
- **Next.js API Routes** - REST API
- **Prisma** - Database ORM
- **PostgreSQL** - Database
- **BullMQ** - Background job processing
- **Redis** - Caching & queues

### Blockchain
- **Polygon** - Low-fee Ethereum L2
- **Solidity** - Smart contracts
- **Hardhat** - Contract development
- **OpenZeppelin** - Contract libraries
- **Biconomy** - Gas sponsorship (Account Abstraction)

## Smart Contracts

| Contract | Purpose |
|----------|---------|
| `TrueTicketNFT.sol` | ERC-721 ticket with transfer hooks and check-in |
| `EventFactory.sol` | Factory for creating events with Beacon Proxy pattern |
| `PricingController.sol` | Resale price cap enforcement |
| `RoyaltyDistributor.sol` | Multi-beneficiary royalty distribution |
| `Marketplace.sol` | Secondary market with price cap enforcement |

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Redis server

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/trueticket.git
cd trueticket

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Generate Prisma client
npm run db:generate

# Push database schema
npm run db:push

# Run development server
npm run dev
```

### Environment Variables

Copy `.env.example` to `.env.local` and fill in:

- `DATABASE_URL` - PostgreSQL connection string
- `NEXT_PUBLIC_PRIVY_APP_ID` - Privy app ID
- `POLYGON_RPC_URL` - Polygon RPC endpoint
- `STRIPE_SECRET_KEY` - Stripe API key
- See `.env.example` for full list

### Contract Deployment

```bash
# Compile contracts
npm run compile

# Deploy to local network
npm run deploy:local

# Deploy to Polygon testnet (Amoy)
npm run deploy:amoy

# Deploy to Polygon mainnet
npm run deploy:polygon
```

## Project Structure

```
trueticket/
├── contracts/           # Solidity smart contracts
│   ├── interfaces/      # Contract interfaces
│   ├── TrueTicketNFT.sol
│   ├── EventFactory.sol
│   ├── PricingController.sol
│   ├── RoyaltyDistributor.sol
│   └── Marketplace.sol
├── prisma/
│   └── schema.prisma    # Database schema
├── scripts/
│   └── deploy.ts        # Contract deployment
├── src/
│   ├── app/             # Next.js pages & API routes
│   ├── components/      # React components
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utilities & services
│   ├── providers/       # Context providers
│   ├── stores/          # Zustand stores
│   └── types/           # TypeScript types
└── test/                # Contract tests
```

## Key Concepts

### Resale Price Caps

Artists can set one of four cap types:
- **No Cap** - Unlimited resale price
- **Fixed Price** - Must resell at face value
- **Percentage Cap** - Maximum markup (e.g., 110% of original)
- **Absolute Cap** - Maximum price regardless of original

### Royalty Distribution

When a ticket resells, royalties are automatically distributed:
```
Total Royalty (e.g., 10%)
├── Artist: 50%
├── Venue: 30%
├── Host: 15%
└── Platform: 5%
```

### Gas Sponsorship

All user transactions are sponsored using ERC-4337 Account Abstraction. Users never see or pay gas fees - the platform covers all transaction costs for a seamless experience.

## License

MIT
