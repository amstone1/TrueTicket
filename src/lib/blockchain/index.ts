/**
 * Blockchain Module
 *
 * This module provides the interface between TrueTicket and the blockchain.
 * All on-chain operations should go through this module.
 */

export * from './config';
export * from './service';
export * from './verification';

export { blockchainService } from './service';
