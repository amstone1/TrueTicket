'use client';

import { cn, formatUSD, calculatePercentageSold } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Minus, Plus, Check } from 'lucide-react';
import type { TicketTier } from '@/types';

export interface TierSelection {
  tierId: string;
  quantity: number;
}

export interface TierSelectorProps {
  tiers: TicketTier[];
  selections: TierSelection[];
  onSelectionsChange: (selections: TierSelection[]) => void;
  maxPerTier?: number;
  className?: string;
}

export function TierSelector({
  tiers,
  selections,
  onSelectionsChange,
  maxPerTier = 10,
  className,
}: TierSelectorProps) {
  const getQuantity = (tierId: string) => {
    return selections.find((s) => s.tierId === tierId)?.quantity || 0;
  };

  const updateQuantity = (tierId: string, quantity: number) => {
    const tier = tiers.find((t) => t.id === tierId);
    if (!tier) return;

    const available = tier.totalQuantity - tier.soldQuantity;
    const maxAllowed = Math.min(available, tier.maxPerWallet, maxPerTier);
    const clampedQuantity = Math.max(0, Math.min(quantity, maxAllowed));

    const newSelections = selections.filter((s) => s.tierId !== tierId);
    if (clampedQuantity > 0) {
      newSelections.push({ tierId, quantity: clampedQuantity });
    }
    onSelectionsChange(newSelections);
  };

  const activeTiers = tiers.filter((t) => t.isActive);

  if (activeTiers.length === 0) {
    return (
      <div className={cn('text-center py-8', className)}>
        <p className="text-gray-500">No tickets available for this event.</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {activeTiers.map((tier) => {
        const available = tier.totalQuantity - tier.soldQuantity;
        const soldOut = available <= 0;
        const percentSold = calculatePercentageSold(tier.soldQuantity, tier.totalQuantity);
        const quantity = getQuantity(tier.id);
        const maxAllowed = Math.min(available, tier.maxPerWallet, maxPerTier);

        return (
          <div
            key={tier.id}
            className={cn(
              'p-4 rounded-xl border transition-colors',
              soldOut
                ? 'border-gray-200 bg-gray-50 opacity-60'
                : quantity > 0
                  ? 'border-indigo-200 bg-indigo-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
            )}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {/* Tier Info */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900">{tier.name}</h3>
                  {soldOut && <Badge variant="error">Sold Out</Badge>}
                  {!soldOut && percentSold >= 80 && (
                    <Badge variant="warning">Almost Gone</Badge>
                  )}
                </div>

                {tier.description && (
                  <p className="text-sm text-gray-500 mb-2">{tier.description}</p>
                )}

                {/* Perks */}
                {tier.perks && tier.perks.length > 0 && (
                  <ul className="space-y-1 mb-2">
                    {tier.perks.map((perk, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-1.5 text-sm text-gray-600"
                      >
                        <Check className="w-4 h-4 text-green-500" />
                        {perk}
                      </li>
                    ))}
                  </ul>
                )}

                {/* Availability */}
                {!soldOut && (
                  <p className="text-xs text-gray-400">
                    {available} tickets left • Limit {tier.maxPerWallet} per person
                  </p>
                )}
              </div>

              {/* Price & Quantity */}
              <div className="flex items-center justify-between sm:justify-end gap-4">
                <span className="text-xl font-bold text-gray-900">
                  {tier.priceUsd === 0 ? 'Free' : formatUSD(tier.priceUsd)}
                </span>

                {!soldOut && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(tier.id, quantity - 1)}
                      disabled={quantity === 0}
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center transition-colors',
                        quantity === 0
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      )}
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center font-medium">{quantity}</span>
                    <button
                      onClick={() => updateQuantity(tier.id, quantity + 1)}
                      disabled={quantity >= maxAllowed}
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center transition-colors',
                        quantity >= maxAllowed
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-indigo-600 text-white hover:bg-indigo-700'
                      )}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Summary component for cart/checkout
export function TierSelectionSummary({
  tiers,
  selections,
  className,
}: {
  tiers: TicketTier[];
  selections: TierSelection[];
  className?: string;
}) {
  if (selections.length === 0) return null;

  const items = selections
    .map((sel) => {
      const tier = tiers.find((t) => t.id === sel.tierId);
      if (!tier) return null;
      return {
        tier,
        quantity: sel.quantity,
        subtotal: tier.priceUsd * sel.quantity,
      };
    })
    .filter(Boolean) as { tier: TicketTier; quantity: number; subtotal: number }[];

  const total = items.reduce((sum, item) => sum + item.subtotal, 0);
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className={cn('bg-gray-50 rounded-lg p-4', className)}>
      <h4 className="font-medium text-gray-900 mb-3">Order Summary</h4>
      <div className="space-y-2 text-sm">
        {items.map(({ tier, quantity, subtotal }) => (
          <div key={tier.id} className="flex justify-between">
            <span className="text-gray-600">
              {tier.name} x {quantity}
            </span>
            <span className="text-gray-900">{formatUSD(subtotal)}</span>
          </div>
        ))}
      </div>
      <div className="border-t border-gray-200 mt-3 pt-3 flex justify-between">
        <span className="font-medium text-gray-900">
          Total ({totalQuantity} {totalQuantity === 1 ? 'ticket' : 'tickets'})
        </span>
        <span className="font-bold text-lg text-gray-900">{formatUSD(total)}</span>
      </div>
    </div>
  );
}
