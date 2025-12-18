'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Container } from '@/components/layout/Container';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge, ListingStatusBadge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal, ConfirmModal } from '@/components/ui/Modal';
import { NoListingsEmpty } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, formatTime, formatUSD, cn } from '@/lib/utils';
import {
  Tag,
  Calendar,
  MapPin,
  Shield,
  TrendingDown,
  TrendingUp,
  ArrowLeft,
  ShoppingBag,
  AlertCircle,
  CheckCircle,
  Ticket,
  DollarSign,
  Clock,
} from 'lucide-react';

interface Listing {
  id: string;
  priceUsd: number;
  originalPrice: number;
  markupPercent: number;
  listedAt: string;
  expiresAt: string;
  ticket: {
    id: string;
    tier: {
      name: string;
      priceUsd: number;
    };
  };
  event: {
    id: string;
    name: string;
    slug: string;
    startDate: string;
    venueName: string;
    city: string;
    state: string;
    thumbnailUrl: string;
    coverImageUrl?: string;
    maxResaleMarkupBps: number | null;
  };
  seller: {
    displayName: string;
    walletAddress: string;
  };
}

function MarketplaceContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { success, error } = useToast();

  const eventIdFilter = searchParams.get('eventId');

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    fetchListings();
  }, [eventIdFilter]);

  const fetchListings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (eventIdFilter) params.set('eventId', eventIdFilter);

      const res = await fetch(`/api/marketplace?${params}`);
      const data = await res.json();
      setListings(data.listings || []);
    } catch (err) {
      console.error('Error fetching listings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async () => {
    if (!selectedListing || !isAuthenticated) {
      if (!isAuthenticated) {
        router.push('/login?redirect=/marketplace');
      }
      return;
    }

    setPurchasing(true);
    try {
      const res = await fetch(`/api/marketplace/${selectedListing.id}/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();

      if (res.ok) {
        success('Purchase Successful!', 'The ticket has been added to your account.');
        setSelectedListing(null);
        fetchListings();
        router.push('/my-tickets');
      } else {
        error('Purchase Failed', data.error || 'Please try again');
      }
    } catch (err) {
      error('Purchase Failed', 'An error occurred. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  // Group listings by event
  const listingsByEvent = listings.reduce((acc, listing) => {
    const eventId = listing.event.id;
    if (!acc[eventId]) {
      acc[eventId] = {
        event: listing.event,
        listings: [],
      };
    }
    acc[eventId].listings.push(listing);
    return acc;
  }, {} as Record<string, { event: Listing['event']; listings: Listing[] }>);

  return (
    <div className="bg-gray-50 min-h-screen pb-12">
      <Container className="py-8">
        <PageHeader
          title="Resale Marketplace"
          description="Fair resale with price caps - no scalping allowed"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Marketplace' },
          ]}
          actions={
            isAuthenticated && (
              <Link href="/my-tickets">
                <Button variant="outline">
                  <Tag className="w-4 h-4 mr-2" />
                  Sell My Tickets
                </Button>
              </Link>
            )
          }
        />

        {/* Info Banner */}
        <Card variant="bordered" className="bg-green-50 border-green-200 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-green-800">Protected Resale</h3>
              <p className="text-green-700 text-sm mt-1">
                All listings are verified against price caps set by event organizers.
                Sellers cannot exceed the maximum allowed markup, protecting fans from scalping.
              </p>
            </div>
          </div>
        </Card>

        {eventIdFilter && (
          <div className="mb-4">
            <button
              onClick={() => router.push('/marketplace')}
              className="flex items-center text-sm text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Show all events
            </button>
          </div>
        )}

        {/* Listings */}
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} variant="bordered" className="overflow-hidden">
                <Skeleton className="h-32 w-full rounded-none" />
                <div className="p-4 space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              </Card>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <NoListingsEmpty />
        ) : eventIdFilter ? (
          // Single event view
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                onClick={() => setSelectedListing(listing)}
              />
            ))}
          </div>
        ) : (
          // Grouped by event view
          <div className="space-y-8">
            {Object.values(listingsByEvent).map(({ event, listings: eventListings }) => (
              <div key={event.id}>
                {/* Event Header */}
                <div className="flex items-center gap-4 mb-4">
                  {event.thumbnailUrl || event.coverImageUrl ? (
                    <img
                      src={event.thumbnailUrl || event.coverImageUrl}
                      alt={event.name}
                      className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <Link
                      href={`/events/${event.slug}`}
                      className="font-semibold text-gray-900 hover:text-indigo-600"
                    >
                      {event.name}
                    </Link>
                    <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
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
                  </div>
                  <Link href={`/marketplace?eventId=${event.id}`}>
                    <Button variant="outline" size="sm">
                      View All ({eventListings.length})
                    </Button>
                  </Link>
                </div>

                {/* Listings */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {eventListings.slice(0, 3).map((listing) => (
                    <ListingCard
                      key={listing.id}
                      listing={listing}
                      onClick={() => setSelectedListing(listing)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Container>

      {/* Purchase Modal */}
      <Modal
        isOpen={!!selectedListing}
        onClose={() => setSelectedListing(null)}
        title="Purchase Resale Ticket"
        size="md"
      >
        {selectedListing && (
          <div className="space-y-6">
            {/* Event Info */}
            <Card variant="bordered" className="bg-gray-50">
              <div className="flex gap-4">
                {selectedListing.event.thumbnailUrl ? (
                  <img
                    src={selectedListing.event.thumbnailUrl}
                    alt={selectedListing.event.name}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg" />
                )}
                <div>
                  <h3 className="font-semibold text-gray-900">{selectedListing.event.name}</h3>
                  <p className="text-sm text-gray-500">{selectedListing.ticket.tier.name}</p>
                  <p className="text-sm text-gray-500">{formatDate(selectedListing.event.startDate)}</p>
                </div>
              </div>
            </Card>

            {/* Price Breakdown */}
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Original Price</span>
                <span className="text-gray-400 line-through">{formatUSD(selectedListing.originalPrice)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Resale Price</span>
                <span className="font-semibold">{formatUSD(selectedListing.priceUsd)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Service Fee (10%)</span>
                <span>{formatUSD(selectedListing.priceUsd * 0.1)}</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-gray-200">
                <span className="font-semibold">Total</span>
                <span className="text-lg font-bold">{formatUSD(selectedListing.priceUsd * 1.1)}</span>
              </div>
            </div>

            {/* Price Protection */}
            {selectedListing.markupPercent <= 0 ? (
              <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-4 py-3 rounded-lg">
                <TrendingDown className="w-4 h-4" />
                <span>
                  {Math.abs(selectedListing.markupPercent)}% below face value - Great deal!
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-4 py-3 rounded-lg">
                <TrendingUp className="w-4 h-4" />
                <span>
                  {selectedListing.markupPercent}% above face value
                  {selectedListing.event.maxResaleMarkupBps && (
                    <> (max allowed: {selectedListing.event.maxResaleMarkupBps / 100}%)</>
                  )}
                </span>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              {isAuthenticated ? (
                <Button
                  onClick={handleBuy}
                  disabled={purchasing}
                  className="flex-1"
                  size="lg"
                >
                  {purchasing ? (
                    <>
                      <span className="animate-spin mr-2">
                        <Clock className="w-5 h-5" />
                      </span>
                      Processing...
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-5 h-5 mr-2" />
                      Buy Now - {formatUSD(selectedListing.priceUsd * 1.1)}
                    </>
                  )}
                </Button>
              ) : (
                <Link href="/login?redirect=/marketplace" className="flex-1">
                  <Button className="w-full" size="lg">
                    Sign In to Purchase
                  </Button>
                </Link>
              )}
              <Button
                variant="outline"
                onClick={() => setSelectedListing(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

interface ListingCardProps {
  listing: Listing;
  onClick: () => void;
}

function ListingCard({ listing, onClick }: ListingCardProps) {
  return (
    <Card
      variant="bordered"
      className="overflow-hidden cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all"
      onClick={onClick}
    >
      {/* Image */}
      <div className="relative h-32 bg-gray-200">
        {listing.event.thumbnailUrl || listing.event.coverImageUrl ? (
          <img
            src={listing.event.thumbnailUrl || listing.event.coverImageUrl}
            alt={listing.event.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600" />
        )}

        {/* Markup Badge */}
        <div className="absolute top-2 right-2">
          {listing.markupPercent <= 0 ? (
            <Badge variant="success">
              <TrendingDown className="w-3 h-3 mr-1" />
              {Math.abs(listing.markupPercent)}% below
            </Badge>
          ) : (
            <Badge variant="warning">
              <TrendingUp className="w-3 h-3 mr-1" />
              +{listing.markupPercent}%
            </Badge>
          )}
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-gray-900 line-clamp-1 mb-1">
          {listing.event.name}
        </h3>
        <p className="text-sm text-gray-500 mb-2">{formatDate(listing.event.startDate)}</p>
        <p className="text-sm text-indigo-600 font-medium mb-3">{listing.ticket.tier.name}</p>

        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div>
            <p className="text-xs text-gray-400 line-through">{formatUSD(listing.originalPrice)}</p>
            <p className="text-xl font-bold text-gray-900">{formatUSD(listing.priceUsd)}</p>
          </div>
          <Button size="sm">Buy</Button>
        </div>
      </div>
    </Card>
  );
}

export default function MarketplacePage() {
  return (
    <Suspense
      fallback={
        <div className="bg-gray-50 min-h-screen pb-12">
          <Container className="py-8">
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64 mb-8" />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} variant="bordered" className="overflow-hidden">
                  <Skeleton className="h-32 w-full rounded-none" />
                  <div className="p-4 space-y-3">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </Card>
              ))}
            </div>
          </Container>
        </div>
      }
    >
      <MarketplaceContent />
    </Suspense>
  );
}
