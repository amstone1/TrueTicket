'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { useCartStore, CartItem } from '@/stores/cartStore';
import { formatDate, formatTime, formatUSD, cn } from '@/lib/utils';
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  Lock,
  AlertCircle,
  Calendar,
  MapPin,
  ArrowLeft,
  Ticket,
  CheckCircle,
} from 'lucide-react';

const PLATFORM_FEE_PERCENT = 10;

// Force dynamic rendering due to useSearchParams
export const dynamic = 'force-dynamic';

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { error, warning, success } = useToast();

  const items = useCartStore((state) => state.items);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const clear = useCartStore((state) => state.clear);
  const getTotalPrice = useCartStore((state) => state.getTotalPrice);
  const getTotalItems = useCartStore((state) => state.getTotalItems);

  const [isProcessing, setIsProcessing] = useState(false);

  // Handle cancelled checkout
  useEffect(() => {
    if (searchParams.get('cancelled') === 'true') {
      warning('Checkout Cancelled', 'Your order was not completed. Your cart items are still saved.');
      // Remove the query param
      router.replace('/checkout', { scroll: false });
    }
  }, [searchParams, warning, router]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/checkout');
    }
  }, [authLoading, isAuthenticated, router]);

  const subtotal = getTotalPrice();
  const fees = Math.round(subtotal * (PLATFORM_FEE_PERCENT / 100) * 100) / 100;
  const total = subtotal + fees;

  const handleCheckout = async () => {
    if (items.length === 0) return;

    setIsProcessing(true);

    try {
      const response = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((item) => ({
            eventId: item.eventId,
            tierId: item.tierId,
            quantity: item.quantity,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Clear cart before redirect
      clear();

      // Redirect to Stripe checkout
      if (data.sessionUrl) {
        window.location.href = data.sessionUrl;
      }
    } catch (err) {
      error('Checkout Failed', err instanceof Error ? err.message : 'Please try again');
      setIsProcessing(false);
    }
  };

  if (authLoading) {
    return (
      <div className="bg-gray-50 min-h-screen pb-12">
        <Container className="py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8" />
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                <div className="h-32 bg-gray-200 rounded" />
                <div className="h-32 bg-gray-200 rounded" />
              </div>
              <div className="h-64 bg-gray-200 rounded" />
            </div>
          </div>
        </Container>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-gray-50 min-h-screen pb-12">
        <Container className="py-8">
          <PageHeader
            title="Your Cart"
            breadcrumbs={[
              { label: 'Home', href: '/' },
              { label: 'Cart' },
            ]}
          />

          <Card variant="bordered" className="text-center py-16">
            <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Your cart is empty</h2>
            <p className="text-gray-500 mb-6">Find an event and add some tickets to get started.</p>
            <Link href="/events">
              <Button>Browse Events</Button>
            </Link>
          </Card>
        </Container>
      </div>
    );
  }

  // Group items by event
  const itemsByEvent = items.reduce((acc, item) => {
    if (!acc[item.eventId]) {
      acc[item.eventId] = {
        event: item.event,
        items: [],
      };
    }
    acc[item.eventId].items.push(item);
    return acc;
  }, {} as Record<string, { event: CartItem['event']; items: CartItem[] }>);

  return (
    <div className="bg-gray-50 min-h-screen pb-12">
      <Container className="py-8">
        <PageHeader
          title="Checkout"
          description={`${getTotalItems()} ticket${getTotalItems() !== 1 ? 's' : ''} in your cart`}
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Events', href: '/events' },
            { label: 'Checkout' },
          ]}
        />

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-6">
            <Link
              href="/events"
              className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Continue Shopping
            </Link>

            {Object.entries(itemsByEvent).map(([eventId, { event, items: eventItems }]) => (
              <Card key={eventId} variant="bordered" className="overflow-hidden">
                {/* Event Header */}
                <div className="flex gap-4 p-4 bg-gray-50 border-b border-gray-200">
                  {event.coverImageUrl ? (
                    <img
                      src={event.coverImageUrl}
                      alt={event.name}
                      className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{event.name}</h3>
                    <div className="flex flex-wrap gap-3 mt-1 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(event.startDate)}
                      </span>
                      {event.venueName && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {event.venueName}, {event.city}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Ticket Items */}
                <div className="divide-y divide-gray-100">
                  {eventItems.map((item) => (
                    <div key={item.id} className="p-4 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                        <Ticket className="w-5 h-5 text-indigo-600" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900">{item.tier.name}</p>
                        <p className="text-sm text-gray-500">{formatUSD(item.tier.priceUsd)} each</p>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-50"
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Item Total */}
                      <div className="text-right w-24">
                        <p className="font-semibold text-gray-900">
                          {formatUSD(item.tier.priceUsd * item.quantity)}
                        </p>
                      </div>

                      {/* Remove */}
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <Card variant="elevated" className="p-0 overflow-hidden">
                <div className="bg-gray-900 px-6 py-4 text-white">
                  <h2 className="text-lg font-semibold">Order Summary</h2>
                </div>

                <div className="p-6 space-y-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal ({getTotalItems()} tickets)</span>
                      <span className="text-gray-900">{formatUSD(subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Service Fee</span>
                      <span className="text-gray-900">{formatUSD(fees)}</span>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex justify-between text-lg font-semibold">
                      <span>Total</span>
                      <span>{formatUSD(total)}</span>
                    </div>
                  </div>

                  <Button
                    onClick={handleCheckout}
                    disabled={isProcessing || items.length === 0}
                    className="w-full"
                    size="lg"
                  >
                    {isProcessing ? (
                      <>
                        <span className="animate-spin mr-2">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24">
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                            />
                          </svg>
                        </span>
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-5 h-5 mr-2" />
                        Proceed to Payment
                      </>
                    )}
                  </Button>

                  <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                    <Lock className="w-3 h-3" />
                    Secure checkout powered by Stripe
                  </div>
                </div>
              </Card>

              {/* Trust Badges */}
              <div className="mt-4 space-y-3">
                <div className="flex items-start gap-3 text-sm text-gray-600">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>100% authentic tickets guaranteed</span>
                </div>
                <div className="flex items-start gap-3 text-sm text-gray-600">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Tickets delivered instantly to your account</span>
                </div>
                <div className="flex items-start gap-3 text-sm text-gray-600">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Resale protected with fair price caps</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}

function CheckoutLoading() {
  return (
    <div className="bg-gray-50 min-h-screen pb-12">
      <Container className="py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8" />
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <div className="h-32 bg-gray-200 rounded" />
              <div className="h-32 bg-gray-200 rounded" />
            </div>
            <div className="h-64 bg-gray-200 rounded" />
          </div>
        </div>
      </Container>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<CheckoutLoading />}>
      <CheckoutContent />
    </Suspense>
  );
}
