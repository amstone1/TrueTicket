'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EventCard } from '@/components/events/EventCard';
import { QuickFilters } from '@/components/events/EventFilters';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { Search, Music, Trophy, Laugh, Theater, Calendar, TrendingUp, Shield, DollarSign } from 'lucide-react';
import type { Event, EventCategory } from '@/types';

// Mock featured events for demo
const FEATURED_EVENTS: Partial<Event>[] = [
  {
    id: '1',
    name: 'Taylor Swift | The Eras Tour',
    slug: 'taylor-swift-eras-tour-2024',
    category: 'MUSIC',
    startDate: new Date('2024-08-15T19:30:00'),
    venueName: 'SoFi Stadium',
    city: 'Los Angeles',
    coverImageUrl: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&h=500&fit=crop',
    ticketTiers: [
      { id: '1', name: 'General Admission', priceUsd: 149, totalQuantity: 1000, soldQuantity: 950, isActive: true, maxPerWallet: 4, eventId: '1', perks: [] },
      { id: '2', name: 'VIP', priceUsd: 499, totalQuantity: 200, soldQuantity: 180, isActive: true, maxPerWallet: 2, eventId: '1', perks: [] },
    ],
    resaleEnabled: true,
    maxResaleMarkupBps: 1500,
  },
  {
    id: '2',
    name: 'NBA Finals Game 7',
    slug: 'nba-finals-game-7-2024',
    category: 'SPORTS',
    startDate: new Date('2024-06-20T20:00:00'),
    venueName: 'Chase Center',
    city: 'San Francisco',
    coverImageUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&h=500&fit=crop',
    ticketTiers: [
      { id: '3', name: 'Upper Level', priceUsd: 299, totalQuantity: 5000, soldQuantity: 4800, isActive: true, maxPerWallet: 6, eventId: '2', perks: [] },
    ],
    resaleEnabled: true,
    maxResaleMarkupBps: 2000,
  },
  {
    id: '3',
    name: 'Dave Chappelle Live',
    slug: 'dave-chappelle-live-2024',
    category: 'COMEDY',
    startDate: new Date('2024-07-10T21:00:00'),
    venueName: 'Radio City Music Hall',
    city: 'New York',
    coverImageUrl: 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=800&h=500&fit=crop',
    ticketTiers: [
      { id: '4', name: 'Orchestra', priceUsd: 175, totalQuantity: 800, soldQuantity: 400, isActive: true, maxPerWallet: 4, eventId: '3', perks: [] },
    ],
    resaleEnabled: true,
    maxResaleMarkupBps: 1000,
  },
];

const UPCOMING_EVENTS: Partial<Event>[] = [
  {
    id: '4',
    name: 'Coldplay: Music of the Spheres',
    slug: 'coldplay-spheres-tour',
    category: 'MUSIC',
    startDate: new Date('2024-09-05T20:00:00'),
    venueName: 'MetLife Stadium',
    city: 'East Rutherford',
    coverImageUrl: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&h=500&fit=crop',
    ticketTiers: [
      { id: '5', name: 'Floor', priceUsd: 225, totalQuantity: 2000, soldQuantity: 1200, isActive: true, maxPerWallet: 4, eventId: '4', perks: [] },
    ],
    resaleEnabled: true,
  },
  {
    id: '5',
    name: 'Hamilton - Broadway',
    slug: 'hamilton-broadway-2024',
    category: 'THEATER',
    startDate: new Date('2024-08-01T19:00:00'),
    venueName: 'Richard Rodgers Theatre',
    city: 'New York',
    coverImageUrl: 'https://images.unsplash.com/photo-1503095396549-807759245b35?w=800&h=500&fit=crop',
    ticketTiers: [
      { id: '6', name: 'Mezzanine', priceUsd: 199, totalQuantity: 300, soldQuantity: 100, isActive: true, maxPerWallet: 4, eventId: '5', perks: [] },
    ],
    resaleEnabled: true,
  },
  {
    id: '6',
    name: 'UFC 305: Main Event',
    slug: 'ufc-305-main-event',
    category: 'SPORTS',
    startDate: new Date('2024-10-12T22:00:00'),
    venueName: 'T-Mobile Arena',
    city: 'Las Vegas',
    coverImageUrl: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=800&h=500&fit=crop',
    ticketTiers: [
      { id: '7', name: 'General', priceUsd: 350, totalQuantity: 1500, soldQuantity: 500, isActive: true, maxPerWallet: 4, eventId: '6', perks: [] },
    ],
    resaleEnabled: true,
  },
];

const CATEGORIES = [
  { name: 'Concerts', icon: Music, href: '/events?category=MUSIC', color: 'bg-purple-100 text-purple-600' },
  { name: 'Sports', icon: Trophy, href: '/events?category=SPORTS', color: 'bg-green-100 text-green-600' },
  { name: 'Comedy', icon: Laugh, href: '/events?category=COMEDY', color: 'bg-yellow-100 text-yellow-600' },
  { name: 'Theater', icon: Theater, href: '/events?category=THEATER', color: 'bg-red-100 text-red-600' },
  { name: 'All Events', icon: Calendar, href: '/events', color: 'bg-gray-100 text-gray-600' },
];

export default function HomePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/events?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white">
        <Container className="py-16 md:py-24">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Find your next
              <br />
              unforgettable experience
            </h1>
            <p className="text-lg md:text-xl text-indigo-100 mb-8">
              Concerts, sports, theater, and more. Fair prices, guaranteed authentic tickets.
            </p>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
              <div className="flex gap-2 bg-white rounded-xl p-2 shadow-xl">
                <Input
                  type="text"
                  placeholder="Search for events, artists, or venues..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  leftIcon={<Search className="w-5 h-5 text-gray-400" />}
                  className="flex-1 border-0 focus:ring-0"
                />
                <Button type="submit" size="lg">
                  Search
                </Button>
              </div>
            </form>

            {/* Quick Category Links */}
            <div className="flex flex-wrap justify-center gap-3 mt-8">
              {CATEGORIES.map((cat) => (
                <Link
                  key={cat.name}
                  href={cat.href}
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium transition-colors"
                >
                  <cat.icon className="w-4 h-4" />
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* Value Props */}
      <section className="bg-white border-b border-gray-100">
        <Container className="py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
                <Shield className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900">100% Authentic</h3>
              <p className="text-sm text-gray-500">Every ticket verified and guaranteed genuine</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Fair Resale Prices</h3>
              <p className="text-sm text-gray-500">Price caps prevent scalper markups</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mb-3">
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Artists Get Paid</h3>
              <p className="text-sm text-gray-500">Royalties on every resale go to creators</p>
            </div>
          </div>
        </Container>
      </section>

      {/* Featured Events */}
      <section className="py-12 md:py-16">
        <Container>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Featured Events</h2>
              <p className="text-gray-500 mt-1">Don't miss these popular events</p>
            </div>
            <Link href="/events">
              <Button variant="outline">View All</Button>
            </Link>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {FEATURED_EVENTS.map((event) => (
              <EventCard key={event.id} event={event as Event} />
            ))}
          </div>
        </Container>
      </section>

      {/* Browse by Category */}
      <section className="py-12 bg-white">
        <Container>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">
            Browse by Category
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.name}
                href={cat.href}
                className="flex flex-col items-center p-6 rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all group"
              >
                <div className={`w-14 h-14 rounded-full ${cat.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                  <cat.icon className="w-7 h-7" />
                </div>
                <span className="font-medium text-gray-900">{cat.name}</span>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      {/* Upcoming Events */}
      <section className="py-12 md:py-16">
        <Container>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Upcoming Events</h2>
              <p className="text-gray-500 mt-1">Get tickets before they sell out</p>
            </div>
            <Link href="/events">
              <Button variant="outline">View All</Button>
            </Link>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {UPCOMING_EVENTS.map((event) => (
              <EventCard key={event.id} event={event as Event} />
            ))}
          </div>
        </Container>
      </section>

      {/* Resale Marketplace CTA */}
      <section className="py-12 bg-gradient-to-r from-indigo-50 to-purple-50">
        <Container>
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="max-w-xl">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                Looking for resale tickets?
              </h2>
              <p className="text-gray-600 mb-6">
                Our marketplace features verified tickets with price caps to ensure fair pricing.
                Every resale benefits the original artists and venues with automatic royalties.
              </p>
              <div className="flex gap-4">
                <Link href="/marketplace">
                  <Button>Browse Resale</Button>
                </Link>
                <Link href="/my-tickets">
                  <Button variant="outline">Sell Your Tickets</Button>
                </Link>
              </div>
            </div>
            <div className="flex-shrink-0">
              <div className="bg-white rounded-2xl shadow-lg p-6 max-w-xs">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Price Protected</p>
                    <p className="text-sm text-gray-500">Max 15% above face value</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Artist Royalties</p>
                    <p className="text-sm text-gray-500">10% to original creators</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* For Creators CTA */}
      <section className="py-12 md:py-16 bg-gray-900 text-white">
        <Container>
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Are you an event organizer?
            </h2>
            <p className="text-gray-400 mb-8">
              Create events with fair pricing, prevent scalping, and earn royalties on every resale.
              Our platform gives you complete control over your ticket economy.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/dashboard/events/new">
                <Button size="lg">Create an Event</Button>
              </Link>
              <Link href="/dashboard">
                <Button size="lg" variant="outline" className="text-white border-white hover:bg-white hover:text-gray-900">
                  Creator Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}
