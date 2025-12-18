'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';

interface Listing {
  id: string;
  priceUsd: number;
  originalPrice: number;
  markupPercent: number;
  listedAt: string;
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
  const eventIdFilter = searchParams.get('eventId');

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [buyerWallet, setBuyerWallet] = useState('');
  const [purchasing, setPurchasing] = useState(false);

  // For listing a ticket
  const [showListModal, setShowListModal] = useState(false);
  const [listingPrice, setListingPrice] = useState('');
  const [listingTicketId, setListingTicketId] = useState('');
  const [sellerWallet, setSellerWallet] = useState('');

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
    } catch (error) {
      console.error('Error fetching listings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async () => {
    if (!selectedListing || !buyerWallet) return;

    setPurchasing(true);
    try {
      const res = await fetch(`/api/marketplace/${selectedListing.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'buy',
          buyerWallet,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        alert('Purchase successful! The ticket has been transferred to your wallet.');
        setSelectedListing(null);
        setBuyerWallet('');
        fetchListings();
        router.push('/my-tickets?wallet=' + buyerWallet);
      } else {
        alert(data.error || 'Purchase failed');
      }
    } catch (error) {
      alert('Purchase failed');
    } finally {
      setPurchasing(false);
    }
  };

  const handleList = async () => {
    if (!listingTicketId || !listingPrice || !sellerWallet) return;

    try {
      const res = await fetch('/api/marketplace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: listingTicketId,
          priceUsd: parseFloat(listingPrice),
          walletAddress: sellerWallet,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        alert('Ticket listed successfully!');
        setShowListModal(false);
        setListingTicketId('');
        setListingPrice('');
        fetchListings();
      } else {
        alert(data.error || 'Failed to list ticket');
      }
    } catch (error) {
      alert('Failed to list ticket');
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

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
              <Link href="/marketplace" className="text-white font-medium">Marketplace</Link>
              <Link href="/my-tickets" className="text-gray-400 hover:text-white">My Tickets</Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Ticket Marketplace</h1>
            <p className="text-gray-400 mt-1">Fair resale with price caps - no scalping</p>
          </div>
          <button
            onClick={() => setShowListModal(true)}
            className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg font-medium"
          >
            List a Ticket
          </button>
        </div>

        {eventIdFilter && (
          <div className="mb-4">
            <button
              onClick={() => router.push('/marketplace')}
              className="text-purple-400 hover:underline text-sm"
            >
              ← Show all events
            </button>
          </div>
        )}

        {/* Info Banner */}
        <div className="bg-green-900/20 border border-green-700 rounded-xl p-4 mb-6">
          <h3 className="font-semibold text-green-400 mb-1">Protected Resale</h3>
          <p className="text-gray-400 text-sm">
            All listings are verified against price caps set by event organizers.
            Sellers cannot exceed the maximum allowed markup, protecting fans from scalping.
          </p>
        </div>

        {/* Listings */}
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
                <div className="h-32 bg-gradient-to-br from-purple-900/30 to-pink-900/20 relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-10 h-10 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <div className="h-5 bg-gray-700/50 rounded w-3/4 animate-pulse" />
                  <div className="h-4 bg-gray-700/50 rounded w-1/2 animate-pulse" />
                  <div className="h-4 bg-gray-700/50 rounded w-1/3 animate-pulse" />
                  <div className="pt-3 border-t border-gray-700 flex justify-between items-center">
                    <div className="space-y-1">
                      <div className="h-3 bg-gray-700/50 rounded w-12 animate-pulse" />
                      <div className="h-6 bg-gray-700/50 rounded w-16 animate-pulse" />
                    </div>
                    <div className="h-9 bg-gray-700/50 rounded w-16 animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-16 bg-gray-800/30 rounded-xl">
            <div className="text-6xl mb-4">🏪</div>
            <h3 className="text-xl font-semibold mb-2">No listings available</h3>
            <p className="text-gray-400">Check back later for resale tickets</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => (
              <div
                key={listing.id}
                className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden hover:border-purple-500 transition-all cursor-pointer"
                onClick={() => setSelectedListing(listing)}
              >
                <div className="relative h-32 bg-gray-700">
                  {listing.event.thumbnailUrl ? (
                    <Image
                      src={listing.event.thumbnailUrl}
                      alt={listing.event.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">🎫</div>
                  )}
                  <div className="absolute top-2 right-2">
                    {listing.markupPercent <= 0 ? (
                      <span className="bg-green-600 px-2 py-0.5 rounded text-xs font-semibold">
                        {Math.abs(listing.markupPercent)}% below face
                      </span>
                    ) : (
                      <span className="bg-yellow-600 px-2 py-0.5 rounded text-xs font-semibold">
                        +{listing.markupPercent}% markup
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="font-bold mb-1 line-clamp-1">{listing.event.name}</h3>
                  <p className="text-gray-400 text-sm mb-2">{formatDate(listing.event.startDate)}</p>
                  <p className="text-gray-400 text-sm mb-3">{listing.ticket.tier.name}</p>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-700">
                    <div>
                      <p className="text-gray-500 text-xs line-through">${listing.originalPrice.toFixed(2)}</p>
                      <p className="text-xl font-bold">${listing.priceUsd.toFixed(2)}</p>
                    </div>
                    <button className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg font-medium text-sm">
                      Buy
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Buy Modal */}
      {selectedListing && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setSelectedListing(null)}>
          <div className="bg-gray-900 rounded-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold mb-4">Buy Ticket</h2>

            <div className="bg-gray-800 rounded-xl p-4 mb-4">
              <h3 className="font-semibold">{selectedListing.event.name}</h3>
              <p className="text-gray-400 text-sm">{selectedListing.ticket.tier.name}</p>
              <p className="text-gray-400 text-sm">{formatDate(selectedListing.event.startDate)}</p>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between">
                <span className="text-gray-400">Original Price</span>
                <span className="line-through text-gray-500">${selectedListing.originalPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Listing Price</span>
                <span className="font-bold">${selectedListing.priceUsd.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Buyer Fee (2.5%)</span>
                <span>${(selectedListing.priceUsd * 0.025).toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-700">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-xl">${(selectedListing.priceUsd * 1.025).toFixed(2)}</span>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">Your Wallet Address</label>
              <input
                type="text"
                value={buyerWallet}
                onChange={(e) => setBuyerWallet(e.target.value)}
                placeholder="0x..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleBuy}
                disabled={purchasing || !buyerWallet}
                className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed py-3 rounded-lg font-bold"
              >
                {purchasing ? 'Processing...' : 'Confirm Purchase'}
              </button>
              <button
                onClick={() => setSelectedListing(null)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 py-3 rounded-lg font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List Modal */}
      {showListModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowListModal(false)}>
          <div className="bg-gray-900 rounded-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold mb-4">List Ticket for Sale</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Ticket ID</label>
                <input
                  type="text"
                  value={listingTicketId}
                  onChange={(e) => setListingTicketId(e.target.value)}
                  placeholder="Paste your ticket ID"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                />
                <p className="text-gray-500 text-xs mt-1">Find ticket IDs in "My Tickets"</p>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Price (USD)</label>
                <input
                  type="number"
                  value={listingPrice}
                  onChange={(e) => setListingPrice(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                />
                <p className="text-gray-500 text-xs mt-1">Price must be within the event's max markup limit</p>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Your Wallet Address</label>
                <input
                  type="text"
                  value={sellerWallet}
                  onChange={(e) => setSellerWallet(e.target.value)}
                  placeholder="0x..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleList}
                disabled={!listingTicketId || !listingPrice || !sellerWallet}
                className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed py-3 rounded-lg font-bold"
              >
                List Ticket
              </button>
              <button
                onClick={() => setShowListModal(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 py-3 rounded-lg font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MarketplacePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-950 text-white">
        {/* Header skeleton */}
        <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                TrueTicket
              </div>
              <div className="flex items-center gap-6">
                <div className="h-4 w-16 bg-gray-700 rounded animate-pulse" />
                <div className="h-4 w-24 bg-gray-700 rounded animate-pulse" />
                <div className="h-4 w-20 bg-gray-700 rounded animate-pulse" />
              </div>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="h-9 w-52 bg-gray-700 rounded mb-2 animate-pulse" />
          <div className="h-5 w-72 bg-gray-700/50 rounded mb-6 animate-pulse" />
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
              <p className="text-gray-400 text-sm">Loading marketplace...</p>
            </div>
          </div>
        </main>
      </div>
    }>
      <MarketplaceContent />
    </Suspense>
  );
}
