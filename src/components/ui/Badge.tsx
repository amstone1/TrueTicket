'use client';

import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'outline';
  size?: 'sm' | 'md';
}

const variants = {
  default: 'bg-gray-100 text-gray-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-yellow-100 text-yellow-700',
  error: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
  outline: 'bg-transparent border border-gray-300 text-gray-600',
};

const sizes = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
};

export function Badge({
  className,
  variant = 'default',
  size = 'sm',
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

// Convenience components for common ticket/event statuses
export function TicketStatusBadge({ status, size = 'sm' }: { status: string; size?: 'sm' | 'md' }) {
  const statusConfig: Record<string, { variant: BadgeProps['variant']; label: string }> = {
    VALID: { variant: 'success', label: 'Valid' },
    PENDING_MINT: { variant: 'info', label: 'Processing' },
    USED: { variant: 'default', label: 'Used' },
    EXPIRED: { variant: 'error', label: 'Expired' },
    REVOKED: { variant: 'error', label: 'Revoked' },
    TRANSFERRED: { variant: 'warning', label: 'Transferred' },
  };

  const config = statusConfig[status] || { variant: 'default', label: status };

  return <Badge variant={config.variant} size={size}>{config.label}</Badge>;
}

export function EventStatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { variant: BadgeProps['variant']; label: string }> = {
    DRAFT: { variant: 'default', label: 'Draft' },
    PENDING_APPROVAL: { variant: 'warning', label: 'Pending' },
    APPROVED: { variant: 'info', label: 'Approved' },
    PUBLISHED: { variant: 'success', label: 'Published' },
    CANCELLED: { variant: 'error', label: 'Cancelled' },
    COMPLETED: { variant: 'default', label: 'Completed' },
  };

  const config = statusConfig[status] || { variant: 'default', label: status };

  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function ListingStatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { variant: BadgeProps['variant']; label: string }> = {
    ACTIVE: { variant: 'success', label: 'For Sale' },
    SOLD: { variant: 'default', label: 'Sold' },
    CANCELLED: { variant: 'error', label: 'Cancelled' },
    EXPIRED: { variant: 'warning', label: 'Expired' },
  };

  const config = statusConfig[status] || { variant: 'default', label: status };

  return <Badge variant={config.variant}>{config.label}</Badge>;
}
