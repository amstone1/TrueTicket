'use client';

import Link from 'next/link';
import { cn, formatDate, formatUSD } from '@/lib/utils';
import { Badge, ListingStatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Calendar, MapPin, Tag, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { ResaleListing } from '@/types';

export interface ListingCardProps {
  listing: ResaleListing;
  onBuy?: () => void;
  isOwner?: boolean;
  className?: string;
}

export function ListingCard({
  listing,
  onBuy,
  isOwner = false,
  className,
}: ListingCardProps) {
  const { ticket, event, priceUsd, status } = listing;
  const originalPrice = ticket.originalPriceUsd;
  const priceDiff = priceUsd - originalPrice;
  const percentChange = originalPrice > 0 ? ((priceDiff / originalPrice) * 100).toFixed(0) : 0;

  // Calculate max allowed price based on event's resale markup cap
  const maxAllowedPrice = event.maxResaleMarkupBps
    ? originalPrice * (1 + event.maxResaleMarkupBps / 10000)
    : null;

  const isActive = status === 'ACTIVE';

  return (
    <div
      className={cn(
        'bg-white rounded-xl overflow-hidden border border-gray-100',
        'hover:border-gray-200 hover:shadow-sm transition-all',
        className
      )}
    >
      <div className="flex flex-col sm:flex-row">
        {/* Event Image */}
        <div className="sm:w-40 h-32 sm:h-auto flex-shrink-0 relative">
          {event.thumbnailUrl || event.coverImageUrl ? (
            <img
              src={event.thumbnailUrl || event.coverImageUrl}
              alt={event.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
              <Calendar className="w-10 h-10 text-indigo-300" />
            </div>
          )}
          {/* Price comparison badge */}
          {isActive && originalPrice > 0 && (
            <div className="absolute top-2 left-2">
              <Badge
                variant={priceDiff > 0 ? 'warning' : priceDiff < 0 ? 'success' : 'default'}
              >
                {priceDiff > 0 ? (
                  <>
                    <TrendingUp className="w-3 h-3 mr-1" />
                    +{percentChange}%
                  </>
                ) : priceDiff < 0 ? (
                  <>
                    <TrendingDown className="w-3 h-3 mr-1" />
                    {percentChange}%
                  </>
                ) : (
                  <>
                    <Minus className="w-3 h-3 mr-1" />
                    Face Value
                  </>
                )}
              </Badge>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-4 flex flex-col justify-between">
          <div>
            {/* Status */}
            <div className="flex items-center gap-2 mb-2">
              <ListingStatusBadge status={status} />
              <Badge variant="outline">{ticket.tier.name}</Badge>
            </div>

            {/* Event Name */}
            <Link
              href={`/events/${event.slug}`}
              className="font-semibold text-gray-900 hover:text-indigo-600 transition-colors line-clamp-1"
            >
              {event.name}
            </Link>

            {/* Date & Location */}
            <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {formatDate(event.startDate)}
              </span>
              {event.venueName && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {event.venueName}
                </span>
              )}
            </div>

            {/* Price Cap Info */}
            {maxAllowedPrice && isActive && (
              <p className="text-xs text-gray-400 mt-2">
                Max resale price: {formatUSD(maxAllowedPrice)}
              </p>
            )}
          </div>

          {/* Price & Action */}
          <div className="flex items-center justify-between mt-4">
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {formatUSD(priceUsd)}
              </p>
              {originalPrice > 0 && originalPrice !== priceUsd && (
                <p className="text-sm text-gray-500">
                  <span className="line-through">{formatUSD(originalPrice)}</span>
                  {' '}original
                </p>
              )}
            </div>

            {isActive && !isOwner && onBuy && (
              <Button onClick={onBuy}>
                <Tag className="w-4 h-4 mr-1" />
                Buy Now
              </Button>
            )}

            {isActive && isOwner && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  Edit Price
                </Button>
                <Button variant="ghost" size="sm">
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Price cap indicator component
export function PriceCapIndicator({
  originalPrice,
  currentPrice,
  maxMarkupBps,
  className,
}: {
  originalPrice: number;
  currentPrice: number;
  maxMarkupBps?: number;
  className?: string;
}) {
  if (!maxMarkupBps) return null;

  const maxPrice = originalPrice * (1 + maxMarkupBps / 10000);
  const percentUsed = ((currentPrice - originalPrice) / (maxPrice - originalPrice)) * 100;
  const cappedPercent = Math.min(100, Math.max(0, percentUsed));

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex justify-between text-sm">
        <span className="text-gray-500">Price Cap</span>
        <span className="font-medium text-gray-900">{formatUSD(maxPrice)} max</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            cappedPercent >= 100 ? 'bg-red-500' : cappedPercent >= 80 ? 'bg-yellow-500' : 'bg-green-500'
          )}
          style={{ width: `${cappedPercent}%` }}
        />
      </div>
      <p className="text-xs text-gray-500">
        {maxMarkupBps / 100}% above face value max • Original: {formatUSD(originalPrice)}
      </p>
    </div>
  );
}

// Grid wrapper
export function ListingGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-4', className)}>{children}</div>
  );
}
