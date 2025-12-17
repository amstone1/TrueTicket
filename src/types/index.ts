// ============================================
// USER TYPES
// ============================================

export interface User {
  id: string;
  email?: string;
  displayName?: string;
  avatarUrl?: string;
  walletAddress: string;
  isVerified: boolean;
  isArtist: boolean;
  isVenue: boolean;
  isAdmin: boolean;
}

// ============================================
// EVENT TYPES
// ============================================

export type EventCategory =
  | 'MUSIC'
  | 'SPORTS'
  | 'ARTS'
  | 'THEATER'
  | 'COMEDY'
  | 'CONFERENCE'
  | 'FESTIVAL'
  | 'NETWORKING'
  | 'OTHER';

export type LocationType = 'IN_PERSON' | 'VIRTUAL' | 'HYBRID';

export type EventStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'PUBLISHED'
  | 'CANCELLED'
  | 'COMPLETED';

export interface Event {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  category: EventCategory;
  tags: string[];
  startDate: Date;
  endDate?: Date;
  doorsOpen?: Date;
  timezone: string;
  locationType: LocationType;
  venueName?: string;
  venueAddress?: string;
  city?: string;
  state?: string;
  country?: string;
  virtualUrl?: string;
  coverImageUrl?: string;
  thumbnailUrl?: string;
  totalCapacity: number;
  ticketTiers: TicketTier[];
  resaleEnabled: boolean;
  maxResaleMarkupBps?: number;
  resaleRoyaltyBps: number;
  status: EventStatus;
  isPublished: boolean;
  isFeatured: boolean;
  organizerId: string;
  organizer?: User;
  createdAt: Date;
  updatedAt: Date;
}

export interface TicketTier {
  id: string;
  eventId: string;
  name: string;
  description?: string;
  priceUsd: number;
  totalQuantity: number;
  soldQuantity: number;
  maxPerWallet: number;
  saleStartDate?: Date;
  saleEndDate?: Date;
  perks: string[];
  ticketImageUrl?: string;
  isActive: boolean;
}

// ============================================
// TICKET TYPES
// ============================================

export type TicketStatus =
  | 'PENDING_MINT'
  | 'VALID'
  | 'USED'
  | 'EXPIRED'
  | 'REVOKED'
  | 'TRANSFERRED';

export interface Ticket {
  id: string;
  tokenId?: string;
  eventId: string;
  event: Event;
  tierId: string;
  tier: TicketTier;
  ownerId: string;
  owner?: User;
  status: TicketStatus;
  isListed: boolean;
  checkInCode?: string;
  originalPriceUsd: number;
  mintedAt?: Date;
  createdAt: Date;
}

// ============================================
// RESALE TYPES
// ============================================

export type ListingStatus = 'ACTIVE' | 'SOLD' | 'CANCELLED' | 'EXPIRED';

export interface ResaleListing {
  id: string;
  ticketId: string;
  ticket: Ticket;
  eventId: string;
  event: Event;
  sellerId: string;
  seller: User;
  priceUsd: number;
  status: ListingStatus;
  listedAt: Date;
  expiresAt?: Date;
  soldAt?: Date;
}

// ============================================
// PURCHASE TYPES
// ============================================

export type PaymentMethod =
  | 'CREDIT_CARD'
  | 'CRYPTO_MATIC'
  | 'CRYPTO_USDC'
  | 'CRYPTO_ETH'
  | 'FREE';

export type PurchaseStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'REFUNDED';

export interface Purchase {
  id: string;
  userId: string;
  eventId: string;
  event: Event;
  paymentMethod: PaymentMethod;
  subtotalUsd: number;
  feesUsd: number;
  totalUsd: number;
  status: PurchaseStatus;
  ticketQuantity: number;
  ticketIds: string[];
  createdAt: Date;
  completedAt?: Date;
}

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

export interface CreateEventRequest {
  name: string;
  description: string;
  shortDescription?: string;
  category: EventCategory;
  tags?: string[];
  startDate: string;
  endDate?: string;
  doorsOpen?: string;
  timezone?: string;
  locationType: LocationType;
  venueName?: string;
  venueAddress?: string;
  city?: string;
  state?: string;
  country?: string;
  virtualUrl?: string;
  totalCapacity: number;
  resaleEnabled?: boolean;
  maxResaleMarkupBps?: number;
  resaleRoyaltyBps?: number;
  tiers: CreateTierRequest[];
}

export interface CreateTierRequest {
  name: string;
  description?: string;
  priceUsd: number;
  totalQuantity: number;
  maxPerWallet?: number;
  saleStartDate?: string;
  saleEndDate?: string;
  perks?: string[];
}

export interface PurchaseRequest {
  eventId: string;
  tierSelections: {
    tierId: string;
    quantity: number;
  }[];
  paymentMethod: PaymentMethod;
}

export interface PurchaseResponse {
  purchaseId: string;
  stripeSessionUrl?: string;
  paymentAddress?: string;
  expectedAmount?: string;
  currency?: string;
  expiresAt?: string;
}

export interface TransferTicketRequest {
  ticketId: string;
  recipientEmail: string;
}

export interface ListForSaleRequest {
  ticketId: string;
  priceUsd: number;
  expiresInHours?: number;
}

// ============================================
// PAGINATION
// ============================================

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

// ============================================
// FILTER TYPES
// ============================================

export interface EventFilters extends PaginationParams {
  category?: EventCategory;
  city?: string;
  state?: string;
  startDateFrom?: string;
  startDateTo?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  sortBy?: 'date' | 'popularity' | 'price';
  sortOrder?: 'asc' | 'desc';
}
