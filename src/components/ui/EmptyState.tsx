'use client';

import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Ticket, Calendar, Search, ShoppingBag, Tag } from 'lucide-react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-12 px-4',
        className
      )}
    >
      {icon && (
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <div className="text-gray-400">{icon}</div>
        </div>
      )}
      <h3 className="text-lg font-medium text-gray-900 mb-1">{title}</h3>
      {description && (
        <p className="text-gray-500 max-w-sm mb-6">{description}</p>
      )}
      {action && (
        action.href ? (
          <a href={action.href}>
            <Button>{action.label}</Button>
          </a>
        ) : (
          <Button onClick={action.onClick}>{action.label}</Button>
        )
      )}
    </div>
  );
}

// Pre-configured empty states for common scenarios
export function NoTicketsEmpty() {
  return (
    <EmptyState
      icon={<Ticket className="w-8 h-8" />}
      title="No tickets yet"
      description="Once you purchase tickets, they'll appear here."
      action={{ label: 'Browse Events', href: '/events' }}
    />
  );
}

export function NoEventsEmpty() {
  return (
    <EmptyState
      icon={<Calendar className="w-8 h-8" />}
      title="No events found"
      description="Try adjusting your filters or search terms."
    />
  );
}

export function NoSearchResultsEmpty({ query }: { query?: string }) {
  return (
    <EmptyState
      icon={<Search className="w-8 h-8" />}
      title="No results found"
      description={
        query
          ? `We couldn't find anything matching "${query}"`
          : "Try searching for something else"
      }
    />
  );
}

export function EmptyCartEmpty() {
  return (
    <EmptyState
      icon={<ShoppingBag className="w-8 h-8" />}
      title="Your cart is empty"
      description="Add some tickets to get started."
      action={{ label: 'Browse Events', href: '/events' }}
    />
  );
}

export function NoListingsEmpty() {
  return (
    <EmptyState
      icon={<Tag className="w-8 h-8" />}
      title="No tickets for sale"
      description="There are no resale listings available right now."
      action={{ label: 'Browse Events', href: '/events' }}
    />
  );
}
