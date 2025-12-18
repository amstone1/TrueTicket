import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency in USD
 */
export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Format date for display
 */
export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  });
}

/**
 * Format time for display
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format date and time together
 */
export function formatDateTime(date: Date | string): string {
  return `${formatDate(date)} at ${formatTime(date)}`;
}

/**
 * Truncate wallet address for display
 * @internal - Use sparingly, prefer showing user names
 */
export function truncateAddress(address: string, startChars = 6, endChars = 4): string {
  if (address.length <= startChars + endChars) return address;
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Generate slug from string
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Delay execution
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if value is defined
 */
export function isDefined<T>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null;
}

/**
 * Get initials from name for avatar fallback
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Calculate percentage sold for an event tier
 */
export function calculatePercentageSold(sold: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((sold / total) * 100);
}

/**
 * Check if an event is in the past
 */
export function isEventPast(eventDate: Date | string): boolean {
  const d = typeof eventDate === 'string' ? new Date(eventDate) : eventDate;
  return d < new Date();
}

/**
 * Check if an event is today
 */
export function isEventToday(eventDate: Date | string): boolean {
  const d = typeof eventDate === 'string' ? new Date(eventDate) : eventDate;
  const today = new Date();
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
}

/**
 * Get relative time string (e.g., "in 2 days", "3 hours ago")
 */
export function getRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffSecs = Math.round(diffMs / 1000);
  const diffMins = Math.round(diffSecs / 60);
  const diffHours = Math.round(diffMins / 60);
  const diffDays = Math.round(diffHours / 24);

  if (diffDays > 0) return `in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
  if (diffDays < 0) return `${Math.abs(diffDays)} day${Math.abs(diffDays) > 1 ? 's' : ''} ago`;
  if (diffHours > 0) return `in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
  if (diffHours < 0) return `${Math.abs(diffHours)} hour${Math.abs(diffHours) > 1 ? 's' : ''} ago`;
  if (diffMins > 0) return `in ${diffMins} minute${diffMins > 1 ? 's' : ''}`;
  if (diffMins < 0) return `${Math.abs(diffMins)} minute${Math.abs(diffMins) > 1 ? 's' : ''} ago`;
  return 'just now';
}

// ============================================
// TERMINOLOGY TRANSLATION
// ============================================

/**
 * Translate blockchain terminology to user-friendly ticketing language
 * Users should never see crypto jargon
 */
export const TERMINOLOGY: Record<string, string | null> = {
  // NFT -> Ticket
  nft: 'ticket',
  mint: 'purchase',
  burn: 'use',
  token: 'ticket',
  tokenId: 'ticket number',

  // Wallet -> Account
  wallet: 'account',
  walletAddress: 'account ID',
  connect_wallet: 'sign in',

  // Transactions
  transaction: 'confirmation',
  gas: null, // Never shown
  gasless: null, // Never mentioned
  pending: 'processing',
  confirmed: 'complete',
  failed: 'unsuccessful',

  // Transfer
  transfer: 'send',
  airdrop: 'gift',
};

export function translateTerm(cryptoTerm: string): string {
  const translated = TERMINOLOGY[cryptoTerm.toLowerCase()];
  if (translated === null) return ''; // Don't show this term
  return translated || cryptoTerm;
}

// ============================================
// JSON SERIALIZATION HELPERS
// ============================================

/**
 * Serialize data for JSON response, converting BigInt to string
 * Use this before NextResponse.json() when data may contain BigInt
 */
export function serializeForJson<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === 'bigint' ? value.toString() : value
    )
  );
}

/**
 * Custom JSON replacer that handles BigInt and Date
 */
export function jsonReplacer(_key: string, value: unknown): unknown {
  if (typeof value === 'bigint') {
    return value.toString();
  }
  return value;
}
