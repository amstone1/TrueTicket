'use client';

import Link from 'next/link';
import { cn, formatDate, formatTime, isEventPast, isEventToday } from '@/lib/utils';
import { Badge, TicketStatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Calendar, MapPin, Clock, QrCode, Tag } from 'lucide-react';
import type { Ticket, TicketStatus } from '@/types';

export interface TicketCardProps {
  ticket: Ticket;
  showActions?: boolean;
  className?: string;
}

export function TicketCard({ ticket, showActions = true, className }: TicketCardProps) {
  const { event, tier, status } = ticket;
  const isPast = isEventPast(event.startDate);
  const isToday = isEventToday(event.startDate);
  const canSell = status === 'VALID' && !isPast && event.resaleEnabled && !ticket.isListed;
  const canViewQR = status === 'VALID' && !isPast;

  return (
    <div
      className={cn(
        'bg-white rounded-xl overflow-hidden border border-gray-100',
        'hover:border-gray-200 hover:shadow-sm transition-all',
        isPast && 'opacity-75',
        className
      )}
    >
      <div className="flex flex-col sm:flex-row">
        {/* Event Image */}
        <div className="sm:w-40 h-32 sm:h-auto flex-shrink-0">
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
        </div>

        {/* Content */}
        <div className="flex-1 p-4 flex flex-col justify-between">
          <div>
            {/* Status & Today Badge */}
            <div className="flex items-center gap-2 mb-2">
              <TicketStatusBadge status={status} />
              {isToday && status === 'VALID' && (
                <Badge variant="info">Today!</Badge>
              )}
              {ticket.isListed && (
                <Badge variant="warning">Listed for Sale</Badge>
              )}
            </div>

            {/* Event Name */}
            <Link
              href={`/events/${event.slug}`}
              className="font-semibold text-gray-900 hover:text-indigo-600 transition-colors line-clamp-1"
            >
              {event.name}
            </Link>

            {/* Tier */}
            <p className="text-sm text-indigo-600 font-medium mt-1">
              {tier.name}
            </p>

            {/* Date & Location */}
            <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {formatDate(event.startDate)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {formatTime(event.startDate)}
              </span>
              {event.venueName && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {event.venueName}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          {showActions && (
            <div className="flex items-center gap-2 mt-4">
              {canViewQR && (
                <Link href={`/my-tickets/${ticket.id}`}>
                  <Button size="sm" variant="primary">
                    <QrCode className="w-4 h-4 mr-1" />
                    View Ticket
                  </Button>
                </Link>
              )}
              {canSell && (
                <Link href={`/my-tickets/${ticket.id}/sell`}>
                  <Button size="sm" variant="outline">
                    <Tag className="w-4 h-4 mr-1" />
                    Sell
                  </Button>
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Compact version for listings
export function TicketCardCompact({
  ticket,
  className,
}: {
  ticket: Ticket;
  className?: string;
}) {
  const { event, tier } = ticket;

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100',
        className
      )}
    >
      <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
        {event.thumbnailUrl ? (
          <img
            src={event.thumbnailUrl}
            alt={event.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-indigo-100">
            <Calendar className="w-6 h-6 text-indigo-300" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">{event.name}</p>
        <p className="text-sm text-gray-500">{tier.name}</p>
      </div>
      <TicketStatusBadge status={ticket.status} />
    </div>
  );
}

// Grid wrapper
export function TicketGrid({
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

// Group tickets by event
export interface GroupedTickets {
  event: Ticket['event'];
  tickets: Ticket[];
}

export function groupTicketsByEvent(tickets: Ticket[]): GroupedTickets[] {
  const groups = new Map<string, GroupedTickets>();

  tickets.forEach((ticket) => {
    const existing = groups.get(ticket.eventId);
    if (existing) {
      existing.tickets.push(ticket);
    } else {
      groups.set(ticket.eventId, {
        event: ticket.event,
        tickets: [ticket],
      });
    }
  });

  return Array.from(groups.values()).sort(
    (a, b) => new Date(a.event.startDate).getTime() - new Date(b.event.startDate).getTime()
  );
}
