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
};

export const getContractAddresses = (chain?: ChainName): DeployedContracts | null => {
  // Re-load in case deployment happened after module initialization
  const cached = CONTRACT_ADDRESSES[chain || ACTIVE_CHAIN];
  if (cached) return cached;
  return loadContractAddresses(chain || ACTIVE_CHAIN);
};
