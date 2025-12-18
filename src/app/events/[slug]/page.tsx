'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface TicketTier {
  id: string;
  name: string;
  description: string | null;
  priceUsd: number;
  totalQuantity: number;
  soldQuantity: number;
  maxPerWallet: number;
  perks: string;
  available: number;
  soldOut: boolean;
}

interface Event {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  startDate: string;
  endDate: string | null;
  doorsOpen: string | null;
  venueName: string;
  venueAddress: string;
  city: string;
  state: string;
  country: string;
  coverImageUrl: string;
  resaleEnabled: boolean;
  maxResaleMarkupBps: number | null;
  ticketTiers: TicketTier[];
  resaleListingsCount: number;
  organizer: {
    id: string;
    displayName: string;
    isVerified: boolean;
  };
}

export default function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [purchasing, setPurchasing] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');

  useEffect(() => {
    fetchEvent();
  }, [slug]);

  const fetchEvent = async () => {
    try {
      const res = await fetch(`/api/events/${slug}`);
      if (res.ok) {
        const data = await res.json();
        setEvent(data);
        // Auto-select first available tier
        const availableTier = data.ticketTiers.find((t: TicketTier) => !t.soldOut);
        if (availableTier) setSelectedTier(availableTier.id);
      }
    } catch (error) {
      console.error('Error fetching event:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!selectedTier || !walletAddress) {
      alert('Please enter your wallet address');
      return;
    }

    setPurchasing(true);
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: event!.id,
          tierId: selectedTier,
          quantity,
          walletAddress,
          paymentMethod: 'CRYPTO_MATIC',
        }),
      });

      const data = await res.json();

      if (res.ok) {
        alert(`Success! ${quantity} ticket(s) purchased. Check "My Tickets" to view them.`);
        router.push('/my-tickets?wallet=' + walletAddress);
      } else {
        alert(data.error || 'Purchase failed');
      }
    } catch (error) {
      alert('Purchase failed. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const parsePerks = (perks: string) => {
    try {
      return JSON.parse(perks);
    } catch {
      return [];
    }
  };

  const selectedTierData = event?.ticketTiers.find((t) => t.id === selectedTier);
  const subtotal = selectedTierData ? selectedTierData.priceUsd * quantity : 0;
  const fees = subtotal * 0.05;
  const total = subtotal + fees;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Event not found</h1>
          <Link href="/events" className="text-purple-400 hover:underline">
            Browse all events
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
              TrueTicket
            </Link>
            <nav className="flex items-center gap-6">
              <Link href="/events" className="text-gray-400 hover:text-white">Events</Link>
              <Link href="/marketplace" className="text-gray-400 hover:text-white">Marketplace</Link>
              <Link href="/my-tickets" className="text-gray-400 hover:text-white">My Tickets</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Image */}
      <div className="relative h-80 md:h-96 bg-gray-800">
        {event.coverImageUrl ? (
          <Image
            src={event.coverImageUrl}
            alt={event.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-8xl">🎫</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 to-transparent" />
      </div>

      <main className="max-w-7xl mx-auto px-4 -mt-32 relative z-10 pb-16">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Event Details */}
          <div className="lg:col-span-2">
            <div className="bg-gray-900/80 backdrop-blur rounded-xl p-6 mb-6">
              <span className="inline-block bg-purple-600 px-3 py-1 rounded text-sm font-semibold mb-4">
                {event.category}
              </span>
              <h1 className="text-3xl md:text-4xl font-bold mb-4">{event.name}</h1>

              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div className="flex items-start gap-3">
                  <div className="bg-purple-600/20 p-2 rounded-lg">
                    <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Date</p>
                    <p className="font-semibold">{formatDate(event.startDate)}</p>
                    <p className="text-gray-400">{formatTime(event.startDate)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="bg-purple-600/20 p-2 rounded-lg">
                    <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Venue</p>
                    <p className="font-semibold">{event.venueName}</p>
                    <p className="text-gray-400">{event.city}, {event.state}</p>
                  </div>
                </div>
              </div>

              {event.doorsOpen && (
                <p className="text-gray-400 mb-4">
                  Doors open at {formatTime(event.doorsOpen)}
                </p>
              )}

              <div className="border-t border-gray-700 pt-4">
                <h3 className="font-semibold mb-2">About this event</h3>
                <p className="text-gray-300 whitespace-pre-wrap">{event.description}</p>
              </div>

              {event.resaleEnabled && (
                <div className="mt-4 p-3 bg-green-900/20 border border-green-700 rounded-lg">
                  <p className="text-green-400 text-sm">
                    <strong>Fair Resale Enabled</strong>
                    {event.maxResaleMarkupBps && (
                      <span> - Max {event.maxResaleMarkupBps / 100}% markup allowed</span>
                    )}
                  </p>
                  {event.resaleListingsCount > 0 && (
                    <Link href={`/marketplace?eventId=${event.id}`} className="text-green-400 hover:underline text-sm">
                      {event.resaleListingsCount} tickets available on marketplace →
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* Organizer */}
            <div className="bg-gray-900/80 backdrop-blur rounded-xl p-6">
              <h3 className="font-semibold mb-4">Organized by</h3>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-xl font-bold">
                  {event.organizer.displayName?.[0] || '?'}
                </div>
                <div>
                  <p className="font-semibold flex items-center gap-2">
                    {event.organizer.displayName}
                    {event.organizer.isVerified && (
                      <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Purchase Panel */}
          <div className="lg:col-span-1">
            <div className="bg-gray-900/80 backdrop-blur rounded-xl p-6 sticky top-24">
              <h2 className="text-xl font-bold mb-4">Get Tickets</h2>

              {/* Tier Selection */}
              <div className="space-y-3 mb-6">
                {event.ticketTiers.map((tier) => (
                  <button
                    key={tier.id}
                    onClick={() => !tier.soldOut && setSelectedTier(tier.id)}
                    disabled={tier.soldOut}
                    className={`w-full text-left p-4 rounded-lg border transition-all ${
                      selectedTier === tier.id
                        ? 'border-purple-500 bg-purple-900/30'
                        : tier.soldOut
                        ? 'border-gray-700 bg-gray-800/50 opacity-50 cursor-not-allowed'
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">{tier.name}</p>
                        {tier.description && (
                          <p className="text-gray-400 text-sm">{tier.description}</p>
                        )}
                        {parsePerks(tier.perks).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {parsePerks(tier.perks).slice(0, 3).map((perk: string, i: number) => (
                              <span key={i} className="text-xs bg-gray-700 px-2 py-0.5 rounded">
                                {perk}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">${tier.priceUsd}</p>
                        {tier.soldOut ? (
                          <p className="text-red-400 text-sm">Sold out</p>
                        ) : (
                          <p className="text-gray-400 text-sm">{tier.available} left</p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {selectedTierData && !selectedTierData.soldOut && (
                <>
                  {/* Quantity */}
                  <div className="mb-4">
                    <label className="block text-sm text-gray-400 mb-2">Quantity</label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        className="w-10 h-10 bg-gray-700 rounded-lg hover:bg-gray-600 text-xl"
                      >
                        -
                      </button>
                      <span className="w-12 text-center text-xl font-semibold">{quantity}</span>
                      <button
                        onClick={() => setQuantity((q) => Math.min(selectedTierData.maxPerWallet, q + 1))}
                        className="w-10 h-10 bg-gray-700 rounded-lg hover:bg-gray-600 text-xl"
                      >
                        +
                      </button>
                    </div>
                    <p className="text-gray-500 text-xs mt-1">Max {selectedTierData.maxPerWallet} per wallet</p>
                  </div>

                  {/* Wallet Address */}
                  <div className="mb-4">
                    <label className="block text-sm text-gray-400 mb-2">Your Wallet Address</label>
                    <input
                      type="text"
                      value={walletAddress}
                      onChange={(e) => setWalletAddress(e.target.value)}
                      placeholder="0x..."
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                    />
                    <p className="text-gray-500 text-xs mt-1">Demo: Use 0x90F79bf6EB2c4f870365E785982E1f101E93b906</p>
                  </div>

                  {/* Price Breakdown */}
                  <div className="border-t border-gray-700 pt-4 mb-4 space-y-2">
                    <div className="flex justify-between text-gray-400">
                      <span>Subtotal</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Service fee (5%)</span>
                      <span>${fees.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-700">
                      <span>Total</span>
                      <span>${total.toFixed(2)}</span>
                    </div>
                  </div>

                  <button
                    onClick={handlePurchase}
                    disabled={purchasing || !walletAddress}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed py-4 rounded-xl font-bold text-lg transition-all"
                  >
                    {purchasing ? 'Processing...' : `Buy ${quantity} Ticket${quantity > 1 ? 's' : ''}`}
                  </button>

                  <p className="text-center text-gray-500 text-xs mt-3">
                    Tickets are minted as NFTs on Polygon
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
