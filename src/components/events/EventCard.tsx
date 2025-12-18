'use client';

import Link from 'next/link';
import { cn, formatDate, formatUSD } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Calendar, MapPin, Clock } from 'lucide-react';
import type { Event, TicketTier } from '@/types';

export interface EventCardProps {
  event: Event;
  variant?: 'default' | 'compact' | 'featured';
  className?: string;
}

function getLowestPrice(tiers: TicketTier[]): number | null {
  if (!tiers || tiers.length === 0) return null;
  const activeTiers = tiers.filter((t) => t.isActive && t.soldQuantity < t.totalQuantity);
  if (activeTiers.length === 0) return null;
  return Math.min(...activeTiers.map((t) => t.priceUsd));
}

function getPriceRange(tiers: TicketTier[]): string {
  if (!tiers || tiers.length === 0) return 'Free';
  const activeTiers = tiers.filter((t) => t.isActive);
  if (activeTiers.length === 0) return 'Sold Out';

  const prices = activeTiers.map((t) => t.priceUsd);
  const min = Math.min(...prices);
  const max = Math.max(...prices);

  if (min === 0 && max === 0) return 'Free';
  if (min === max) return formatUSD(min);
  return `${formatUSD(min)} - ${formatUSD(max)}`;
}

function isSoldOut(tiers: TicketTier[]): boolean {
  if (!tiers || tiers.length === 0) return false;
  return tiers.every((t) => t.soldQuantity >= t.totalQuantity);
}

export function EventCard({ event, variant = 'default', className }: EventCardProps) {
  const soldOut = isSoldOut(event.ticketTiers);
  const lowestPrice = getLowestPrice(event.ticketTiers);
  const priceRange = getPriceRange(event.ticketTiers);

  if (variant === 'compact') {
    return (
      <Link
        href={`/events/${event.slug}`}
        className={cn(
          'flex gap-4 p-3 bg-white rounded-lg border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all',
          className
        )}
      >
        <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
          {event.thumbnailUrl || event.coverImageUrl ? (
            <img
              src={event.thumbnailUrl || event.coverImageUrl}
              alt={event.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <Calendar className="w-8 h-8" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 truncate">{event.name}</h3>
          <p className="text-sm text-gray-500 mt-1">
            {formatDate(event.startDate)}
          </p>
          <p className="text-sm font-medium text-indigo-600 mt-1">
            {priceRange}
          </p>
        </div>
      </Link>
    );
  }

  if (variant === 'featured') {
    return (
      <Link
        href={`/events/${event.slug}`}
        className={cn(
          'relative block rounded-2xl overflow-hidden group',
          'aspect-[16/9] sm:aspect-[21/9]',
          className
        )}
      >
        {/* Background Image */}
        <div className="absolute inset-0">
          {event.coverImageUrl ? (
            <img
              src={event.coverImageUrl}
              alt={event.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-indigo-600 to-purple-700" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        </div>

        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
          <Badge variant="info" className="mb-3">Featured</Badge>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            {event.name}
          </h2>
          <div className="flex flex-wrap items-center gap-4 text-white/80 text-sm">
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
            <span className="text-white font-medium">
              {soldOut ? 'Sold Out' : `From ${formatUSD(lowestPrice || 0)}`}
            </span>
          </div>
        </div>
      </Link>
    );
  }

  // Default card
  return (
    <Link
      href={`/events/${event.slug}`}
      className={cn(
        'block bg-white rounded-xl overflow-hidden border border-gray-100',
        'hover:border-gray-200 hover:shadow-lg transition-all group',
        className
      )}
    >
      {/* Image */}
      <div className="aspect-[16/10] overflow-hidden bg-gray-100">
        {event.coverImageUrl || event.thumbnailUrl ? (
          <img
            src={event.coverImageUrl || event.thumbnailUrl}
            alt={event.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100">
            <Calendar className="w-12 h-12 text-indigo-300" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Category & Status */}
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="outline">{event.category}</Badge>
          {soldOut && <Badge variant="error">Sold Out</Badge>}
        </div>

        {/* Title */}
        <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-2 mb-2">
          {event.name}
        </h3>

        {/* Date & Location */}
        <div className="space-y-1 text-sm text-gray-500 mb-3">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 flex-shrink-0" />
            <span>{formatDate(event.startDate)}</span>
          </div>
          {event.venueName && (
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{event.venueName}</span>
            </div>
          )}
        </div>

        {/* Price */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <span className="text-lg font-semibold text-gray-900">
            {priceRange}
          </span>
          <span className="text-sm font-medium text-indigo-600 group-hover:underline">
            {soldOut ? 'View Details' : 'Get Tickets'}
          </span>
        </div>
      </div>
    </Link>
  );
}

// Grid wrapper for consistent layout
export function EventGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('grid gap-6 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {children}
    </div>
  );
}
