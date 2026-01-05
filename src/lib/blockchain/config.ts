/**
 * Blockchain Configuration
 * Supports local Hardhat, testnets (Polygon Amoy), and mainnet (Polygon)
 */

export const CHAIN_CONFIG = {
  // Local development
  hardhat: {
    chainId: 31337,
    name: 'Hardhat Local',
    rpcUrl: 'http://127.0.0.1:8545',
    blockExplorer: '',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  },
  // Polygon Amoy Testnet
  polygonAmoy: {
    chainId: 80002,
    name: 'Polygon Amoy',
    rpcUrl: process.env.POLYGON_AMOY_RPC_URL || 'https://rpc-amoy.polygon.technology',
    blockExplorer: 'https://amoy.polygonscan.com',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
  },
  // Polygon Mainnet
  polygon: {
    chainId: 137,
    name: 'Polygon',
    rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
    blockExplorer: 'https://polygonscan.com',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
  },
  // TrueTicket L2 Testnet (Conduit-based Arbitrum Orbit)
  trueticketL2Testnet: {
    chainId: 88887,
    name: 'TrueTicket L2 Testnet',
    rpcUrl: process.env.TRUETICKET_L2_TESTNET_RPC_URL || 'https://testnet-rpc.trueticket.conduit.xyz',
    blockExplorer: 'https://testnet-explorer.trueticket.conduit.xyz',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    bridgeUrl: 'https://testnet-bridge.trueticket.conduit.xyz',
  },
  // TrueTicket L2 Mainnet (Conduit-based Arbitrum Orbit)
  trueticketL2: {
    chainId: 88888,
    name: 'TrueTicket L2',
    rpcUrl: process.env.TRUETICKET_L2_RPC_URL || 'https://rpc.trueticket.conduit.xyz',
    blockExplorer: 'https://explorer.trueticket.conduit.xyz',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    bridgeUrl: 'https://bridge.trueticket.conduit.xyz',
    // L2 specific settings
    settlementLayer: 'arbitrumOne',
    dataAvailability: 'celestia',
  },
  // Arbitrum One (settlement layer)
  arbitrumOne: {
    chainId: 42161,
    name: 'Arbitrum One',
    rpcUrl: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
    blockExplorer: 'https://arbiscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  },
} as const;

export type ChainName = keyof typeof CHAIN_CONFIG;

// Current active chain (from environment)
export const ACTIVE_CHAIN: ChainName = (process.env.BLOCKCHAIN_NETWORK as ChainName) || 'hardhat';

export const getChainConfig = (chain?: ChainName) => {
  return CHAIN_CONFIG[chain || ACTIVE_CHAIN];
};

// Contract addresses (deployed addresses per chain)
export interface DeployedContracts {
  eventFactory: string;
  pricingController: string;
  royaltyDistributor: string;
  marketplace: string;
  // Event-specific NFT contracts are created dynamically
}

// Load deployed addresses from deployment files or environment
function loadContractAddresses(chain: ChainName): DeployedContracts | null {
  // First try environment variables
  const envKey = chain === 'hardhat' ? 'HARDHAT_CONTRACTS' :
                 chain === 'polygonAmoy' ? 'AMOY_CONTRACTS' : 'POLYGON_CONTRACTS';

  if (process.env[envKey]) {
    try {
      return JSON.parse(process.env[envKey]!);
    } catch {
      console.warn(`Failed to parse ${envKey}`);
    }
  }

  // Try loading from deployment file (server-side only)
  if (typeof window === 'undefined') {
    try {
      const networkName = chain === 'polygonAmoy' ? 'amoy' : chain;
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const deployment = require(`../../../../deployments/${networkName}.json`);
      return deployment.contracts;
    } catch {
      // Deployment file doesn't exist
    }
  }

  return null;
}

// Store deployed addresses (loaded from env or deployment output)
export const CONTRACT_ADDRESSES: Record<ChainName, DeployedContracts | null> = {
  hardhat: loadContractAddresses('hardhat'),
  polygonAmoy: loadContractAddresses('polygonAmoy'),
  polygon: loadContractAddresses('polygon'),
  trueticketL2Testnet: loadContractAddresses('trueticketL2Testnet'),
  trueticketL2: loadContractAddresses('trueticketL2'),
  arbitrumOne: loadContractAddresses('arbitrumOne'),
};

export const getContractAddresses = (chain?: ChainName): DeployedContracts | null => {
  // Re-load in case deployment happened after module initialization
  const cached = CONTRACT_ADDRESSES[chain || ACTIVE_CHAIN];
  if (cached) return cached;
  return loadContractAddresses(chain || ACTIVE_CHAIN);
};
