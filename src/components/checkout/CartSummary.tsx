'use client';

import { cn, formatUSD } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { ShoppingCart, Trash2, Tag, AlertCircle } from 'lucide-react';
import type { Event, TicketTier } from '@/types';

export interface CartItem {
  eventId: string;
  event: Event;
  tierId: string;
  tier: TicketTier;
  quantity: number;
}

export interface CartSummaryProps {
  items: CartItem[];
  onUpdateQuantity?: (eventId: string, tierId: string, quantity: number) => void;
  onRemoveItem?: (eventId: string, tierId: string) => void;
  onCheckout?: () => void;
  isLoading?: boolean;
  className?: string;
}

export function CartSummary({
  items,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
  isLoading = false,
  className,
}: CartSummaryProps) {
  const subtotal = items.reduce(
    (sum, item) => sum + item.tier.priceUsd * item.quantity,
    0
  );

  // Platform fee (example: 5%)
  const platformFeeRate = 0.05;
  const platformFee = subtotal * platformFeeRate;
  const total = subtotal + platformFee;

  const totalTickets = items.reduce((sum, item) => sum + item.quantity, 0);

  if (items.length === 0) {
    return (
      <div className={cn('bg-white rounded-xl border border-gray-200 p-6', className)}>
        <div className="text-center py-8">
          <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900">Your cart is empty</h3>
          <p className="text-gray-500 mt-1">Add some tickets to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('bg-white rounded-xl border border-gray-200 overflow-hidden', className)}>
      <div className="p-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <ShoppingCart className="w-5 h-5" />
          Order Summary
        </h3>
      </div>

      {/* Cart Items */}
      <div className="divide-y divide-gray-100">
        {items.map((item) => (
          <div key={`${item.eventId}-${item.tierId}`} className="p-4">
            <div className="flex justify-between items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{item.event.name}</p>
                <p className="text-sm text-indigo-600">{item.tier.name}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {formatUSD(item.tier.priceUsd)} each
                </p>
              </div>
              <div className="text-right">
                <p className="font-medium text-gray-900">
                  {formatUSD(item.tier.priceUsd * item.quantity)}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  {onUpdateQuantity ? (
                    <select
                      value={item.quantity}
                      onChange={(e) =>
                        onUpdateQuantity(item.eventId, item.tierId, Number(e.target.value))
                      }
                      className="text-sm border border-gray-300 rounded px-2 py-1"
                    >
                      {Array.from(
                        { length: Math.min(item.tier.maxPerWallet, 10) },
                        (_, i) => i + 1
                      ).map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-sm text-gray-500">Qty: {item.quantity}</span>
                  )}
                  {onRemoveItem && (
                    <button
                      onClick={() => onRemoveItem(item.eventId, item.tierId)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="p-4 bg-gray-50 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">
            Subtotal ({totalTickets} {totalTickets === 1 ? 'ticket' : 'tickets'})
          </span>
          <span className="text-gray-900">{formatUSD(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Service Fee</span>
          <span className="text-gray-900">{formatUSD(platformFee)}</span>
        </div>
        <div className="flex justify-between font-semibold text-lg pt-2 border-t border-gray-200">
          <span className="text-gray-900">Total</span>
          <span className="text-gray-900">{formatUSD(total)}</span>
        </div>
      </div>

      {/* Checkout Button */}
      {onCheckout && (
        <div className="p-4 border-t border-gray-100">
          <Button
            onClick={onCheckout}
            isLoading={isLoading}
            className="w-full"
            size="lg"
          >
            <Tag className="w-5 h-5 mr-2" />
            Proceed to Checkout
          </Button>
          <p className="text-xs text-gray-500 text-center mt-3">
            Secure checkout powered by Stripe
          </p>
        </div>
      )}
    </div>
  );
}

// Compact inline cart for header
export function CartBadge({
  itemCount,
  onClick,
  className,
}: {
  itemCount: number;
  onClick?: () => void;
  className?: string;
}) {
  if (itemCount === 0) return null;

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative p-2 text-gray-600 hover:text-gray-900 transition-colors',
        className
      )}
    >
      <ShoppingCart className="w-6 h-6" />
      <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
        {itemCount > 9 ? '9+' : itemCount}
      </span>
    </button>
  );
}

// Price breakdown for checkout page
export function PriceBreakdown({
  subtotal,
  fees,
  discount,
  total,
  className,
}: {
  subtotal: number;
  fees: number;
  discount?: number;
  total: number;
  className?: string;
}) {
  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">Subtotal</span>
        <span className="text-gray-900">{formatUSD(subtotal)}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">Service Fee</span>
        <span className="text-gray-900">{formatUSD(fees)}</span>
      </div>
      {discount && discount > 0 && (
        <div className="flex justify-between text-sm text-green-600">
          <span>Discount</span>
          <span>-{formatUSD(discount)}</span>
        </div>
      )}
      <div className="flex justify-between font-semibold text-lg pt-3 border-t border-gray-200">
        <span>Total</span>
        <span>{formatUSD(total)}</span>
      </div>
    </div>
  );
}
