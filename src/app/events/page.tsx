'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface TicketTier {
  id: string;
  name: string;
  priceUsd: number;
  totalQuantity: number;
  soldQuantity: number;
}

interface Event {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  category: string;
  startDate: string;
  venueName: string;
  city: string;
  state: string;
  coverImageUrl: string;
  thumbnailUrl: string;
  isFeatured: boolean;
  ticketTiers: TicketTier[];
}

const CATEGORIES = [
  { value: '', label: 'All Events' },
  { value: 'MUSIC', label: 'Music' },
  { value: 'SPORTS', label: 'Sports' },
  { value: 'COMEDY', label: 'Comedy' },
  { value: 'THEATER', label: 'Theater' },
  { value: 'CONFERENCE', label: 'Conference' },
  { value: 'FESTIVAL', label: 'Festival' },
];

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchEvents();
  }, [category, page]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '12',
      });
      if (category) params.set('category', category);
      if (search) params.set('search', search);

      const res = await fetch(`/api/events?${params}`);
      const data = await res.json();

      setEvents(data.data || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchEvents();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getLowestPrice = (tiers: TicketTier[]) => {
    if (!tiers.length) return null;
    const available = tiers.filter((t) => t.soldQuantity < t.totalQuantity);
    if (!available.length) return null;
    return Math.min(...available.map((t) => t.priceUsd));
  };

  const getCategoryColor = (cat: string) => {
    const colors: Record<string, string> = {
      MUSIC: 'bg-purple-600',
      SPORTS: 'bg-green-600',
      COMEDY: 'bg-yellow-600',
      THEATER: 'bg-red-600',
      CONFERENCE: 'bg-blue-600',
      FESTIVAL: 'bg-pink-600',
      OTHER: 'bg-gray-600',
    };
    return colors[cat] || 'bg-gray-600';
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
              <Link href="/events" className="text-white font-medium">Events</Link>
              <Link href="/marketplace" className="text-gray-400 hover:text-white">Marketplace</Link>
              <Link href="/my-tickets" className="text-gray-400 hover:text-white">My Tickets</Link>
              <Link href="/scanner" className="text-gray-400 hover:text-white">Scanner</Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Discover Events</h1>
          <p className="text-gray-400">Find your next unforgettable experience</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-8">
          <form onSubmit={handleSearch} className="flex-1 min-w-[300px]">
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search events..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 pl-10 focus:outline-none focus:border-purple-500"
              />
              <svg className="absolute left-3 top-3.5 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </form>

          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => { setCategory(cat.value); setPage(1); }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  category === cat.value
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Events Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
                <div className="h-48 bg-gradient-to-br from-purple-900/30 to-pink-900/20 relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-700/50 rounded w-1/3 animate-pulse" />
                  <div className="h-6 bg-gray-700/50 rounded w-3/4 animate-pulse" />
                  <div className="h-4 bg-gray-700/50 rounded w-1/2 animate-pulse" />
                  <div className="pt-3 border-t border-gray-700 flex justify-between items-center">
                    <div className="h-8 bg-gray-700/50 rounded w-20 animate-pulse" />
                    <div className="h-4 bg-gray-700/50 rounded w-16 animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🎫</div>
            <h3 className="text-xl font-semibold mb-2">No events found</h3>
            <p className="text-gray-400">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => {
              const lowestPrice = getLowestPrice(event.ticketTiers);
              const soldOut = !lowestPrice;

              return (
                <Link
                  key={event.id}
                  href={`/events/${event.slug}`}
                  className="group bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden hover:border-purple-500 transition-all hover:transform hover:scale-[1.02]"
                >
                  <div className="relative h-48 bg-gradient-to-br from-purple-900/50 to-pink-900/30">
                    {event.coverImageUrl ? (
                      <Image
                        src={event.coverImageUrl}
                        alt={event.name || 'Event'}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="text-center">
                          <span className="text-5xl block mb-2">🎫</span>
                          <span className="text-gray-400 text-sm">{event.category || 'Event'}</span>
                        </div>
                      </div>
                    )}
                    <div className="absolute top-3 left-3 flex gap-2">
                      <span className={`${getCategoryColor(event.category || 'OTHER')} px-2 py-1 rounded text-xs font-semibold`}>
                        {event.category || 'Event'}
                      </span>
                      {event.isFeatured && (
                        <span className="bg-yellow-500 text-black px-2 py-1 rounded text-xs font-semibold">
                          Featured
                        </span>
                      )}
                    </div>
                    {soldOut && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="bg-red-600 px-4 py-2 rounded-lg font-bold">SOLD OUT</span>
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <p className="text-purple-400 text-sm font-medium mb-1">
                      {event.startDate ? formatDate(event.startDate) : 'Date TBA'}
                    </p>
                    <h3 className="text-lg font-bold mb-2 group-hover:text-purple-400 transition-colors line-clamp-2">
                      {event.name || 'Untitled Event'}
                    </h3>
                    <p className="text-gray-400 text-sm mb-3 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {event.venueName || event.city || 'Location TBA'}
                      {event.venueName && event.city && `, ${event.city}`}
                    </p>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-700">
                      {lowestPrice ? (
                        <div>
                          <span className="text-gray-400 text-xs">From</span>
                          <p className="text-lg font-bold">${lowestPrice.toFixed(2)}</p>
                        </div>
                      ) : (
                        <p className="text-red-400 font-medium">Sold Out</p>
                      )}
                      <span className="text-purple-400 font-medium group-hover:translate-x-1 transition-transform">
                        View →
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-gray-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-gray-400">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 bg-gray-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700"
            >
              Next
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
