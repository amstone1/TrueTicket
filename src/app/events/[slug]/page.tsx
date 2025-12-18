'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Container } from '@/components/layout/Container';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { TierSelector, TierSelection, TierSelectionSummary } from '@/components/events/TierSelector';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { useCartStore } from '@/stores/cartStore';
import { formatDate, formatTime, formatUSD } from '@/lib/utils';
import { Calendar, MapPin, Clock, User, Shield, TrendingUp, ExternalLink, Share2 } from 'lucide-react';
import type { Event, TicketTier } from '@/types';

interface EventDetailData extends Omit<Event, 'organizer'> {
  resaleListingsCount?: number;
  organizer?: {
    id: string;
    displayName: string;
    isVerified: boolean;
  };
}

export default function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const { success } = useToast();
  const addItem = useCartStore((state) => state.addItem);

  const [event, setEvent] = useState<EventDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selections, setSelections] = useState<TierSelection[]>([]);

  useEffect(() => {
    fetchEvent();
  }, [slug]);

  const fetchEvent = async () => {
    try {
      const res = await fetch(`/api/events/${slug}`);
      if (res.ok) {
        const data = await res.json();
        // Parse perks if they're JSON strings
        if (data.ticketTiers) {
          data.ticketTiers = data.ticketTiers.map((tier: any) => ({
            ...tier,
            perks: typeof tier.perks === 'string' ? JSON.parse(tier.perks || '[]') : tier.perks || [],
          }));
        }
        setEvent(data);
      }
    } catch (error) {
      console.error('Error fetching event:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!event || selections.length === 0) return;

    selections.forEach((sel) => {
      const tier = event.ticketTiers.find((t) => t.id === sel.tierId);
      if (tier) {
        addItem({
          eventId: event.id,
          event: {
            id: event.id,
            name: event.name,
            startDate: event.startDate,
            venueName: event.venueName,
            city: event.city,
            coverImageUrl: event.coverImageUrl,
          },
          tierId: tier.id,
          tier: {
            id: tier.id,
            name: tier.name,
            priceUsd: tier.priceUsd,
          },
          quantity: sel.quantity,
        });
      }
    });

    success('Added to cart', `${selections.reduce((sum, s) => sum + s.quantity, 0)} tickets added`);
    setSelections([]);
  };

  const handleBuyNow = () => {
    handleAddToCart();
    router.push('/checkout');
  };

  if (loading) {
    return (
      <div className="bg-gray-50 min-h-screen pb-12">
        <div className="bg-gray-200 h-80 animate-pulse" />
        <Container className="py-8">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-8 w-1/3" />
              <Skeleton className="h-12 w-2/3" />
              <Skeleton className="h-24 w-full" />
            </div>
            <div>
              <Skeleton className="h-96 w-full" />
            </div>
          </div>
        </Container>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="bg-gray-50 min-h-screen pb-12">
        <Container className="py-16 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Event not found</h1>
          <p className="text-gray-600 mb-6">This event may have been removed or the URL is incorrect.</p>
          <Link href="/events">
            <Button>Browse All Events</Button>
          </Link>
        </Container>
      </div>
    );
  }

  const hasSelections = selections.length > 0;
  const totalQuantity = selections.reduce((sum, s) => sum + s.quantity, 0);

  return (
    <div className="bg-gray-50 min-h-screen pb-12">
      {/* Hero Image */}
      <div className="relative h-64 md:h-80 lg:h-96 bg-gray-900">
        {event.coverImageUrl ? (
          <img
            src={event.coverImageUrl}
            alt={event.name}
            className="w-full h-full object-cover opacity-80"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-indigo-600 to-purple-700" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        {/* Event Title Overlay */}
        <Container className="absolute bottom-0 left-0 right-0 pb-6 text-white">
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="info">{event.category}</Badge>
            {event.isFeatured && <Badge variant="warning">Featured</Badge>}
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-2">{event.name}</h1>
          <div className="flex flex-wrap items-center gap-4 text-white/80">
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
                {event.venueName}, {event.city}
              </span>
            )}
          </div>
        </Container>
      </div>

      <Container className="py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Info */}
            <Card variant="bordered" className="flex flex-wrap gap-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="font-medium text-gray-900">{formatDate(event.startDate)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Time</p>
                  <p className="font-medium text-gray-900">
                    {formatTime(event.startDate)}
                    {event.doorsOpen && (
                      <span className="text-gray-500 text-sm ml-2">
                        (Doors: {formatTime(event.doorsOpen)})
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Venue</p>
                  <p className="font-medium text-gray-900">{event.venueName || 'TBA'}</p>
                  <p className="text-sm text-gray-500">
                    {[event.city, event.state, event.country].filter(Boolean).join(', ')}
                  </p>
                </div>
              </div>
            </Card>

            {/* Description */}
            <Card variant="bordered">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">About This Event</h2>
              <div className="prose prose-gray max-w-none">
                <p className="text-gray-600 whitespace-pre-wrap">{event.description}</p>
              </div>
            </Card>

            {/* Fair Pricing Info */}
            {event.resaleEnabled && (
              <Card variant="bordered" className="bg-green-50 border-green-200">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-green-800">Fair Resale Protected</h3>
                    <p className="text-green-700 text-sm mt-1">
                      Resale is enabled for this event with price protection.
                      {event.maxResaleMarkupBps && (
                        <> Maximum markup is {event.maxResaleMarkupBps / 100}% above face value.</>
                      )}
                    </p>
                    {event.resaleListingsCount && event.resaleListingsCount > 0 && (
                      <Link
                        href={`/marketplace?eventId=${event.id}`}
                        className="inline-flex items-center gap-1 text-green-600 font-medium text-sm mt-2 hover:underline"
                      >
                        {event.resaleListingsCount} resale tickets available
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {/* Organizer */}
            {event.organizer && (
              <Card variant="bordered">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Organized By</h2>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                    {event.organizer.displayName?.[0] || 'O'}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 flex items-center gap-1">
                      {event.organizer.displayName}
                      {event.organizer.isVerified && (
                        <Badge variant="info" size="sm">Verified</Badge>
                      )}
                    </p>
                    <p className="text-sm text-gray-500">Event Organizer</p>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar - Ticket Selection */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <Card variant="elevated" className="p-0 overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 text-white">
                  <h2 className="text-lg font-semibold">Select Tickets</h2>
                  <p className="text-indigo-100 text-sm">Choose your ticket type and quantity</p>
                </div>

                <div className="p-6">
                  <TierSelector
                    tiers={event.ticketTiers}
                    selections={selections}
                    onSelectionsChange={setSelections}
                  />

                  {hasSelections && (
                    <div className="mt-6">
                      <TierSelectionSummary
                        tiers={event.ticketTiers}
                        selections={selections}
                      />

                      <div className="mt-6 space-y-3">
                        <Button
                          onClick={handleBuyNow}
                          className="w-full"
                          size="lg"
                        >
                          Buy Now
                        </Button>
                        <Button
                          onClick={handleAddToCart}
                          variant="outline"
                          className="w-full"
                        >
                          Add to Cart
                        </Button>
                      </div>
                    </div>
                  )}

                  <p className="text-center text-xs text-gray-500 mt-4">
                    Secure checkout • All sales final
                  </p>
                </div>
              </Card>

              {/* Share */}
              <div className="mt-4 flex justify-center">
                <Button variant="ghost" size="sm" className="text-gray-500">
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Event
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
