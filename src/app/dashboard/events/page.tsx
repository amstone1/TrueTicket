'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge, EventStatusBadge } from '@/components/ui/Badge';
import { Tabs, Tab, TabPanel } from '@/components/ui/Tabs';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatDate, formatUSD } from '@/lib/utils';
import {
  Calendar,
  PlusCircle,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  BarChart3,
  Ticket,
} from 'lucide-react';
import type { Event } from '@/types';

interface DashboardEvent extends Event {
  ticketsSold: number;
  totalCapacity: number;
  activeListings: number;
}

export default function DashboardEventsPage() {
  const [events, setEvents] = useState<DashboardEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchEvents();
  }, [activeTab]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (activeTab !== 'all') {
        params.set('status', activeTab.toUpperCase());
      }

      const res = await fetch(`/api/dashboard/events?${params}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = events.filter(
    (event) =>
      event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.venueName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Events</h1>
          <p className="text-gray-500 mt-1">Manage your events and tickets</p>
        </div>
        <Link href="/dashboard/events/new">
          <Button>
            <PlusCircle className="w-5 h-5 mr-2" />
            Create Event
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onChange={setActiveTab}>
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <Tab value="all">All Events</Tab>
          <Tab value="draft">Drafts</Tab>
          <Tab value="published">Published</Tab>
          <Tab value="completed">Completed</Tab>
          <Tab value="cancelled">Cancelled</Tab>
        </div>

        <TabPanel value={activeTab}>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} variant="bordered">
                  <div className="flex gap-4">
                    <Skeleton className="w-24 h-24 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-1/2" />
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-4 w-1/4" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : filteredEvents.length === 0 ? (
            <Card variant="bordered" className="text-center py-12">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery ? 'No events found' : 'No events yet'}
              </h3>
              <p className="text-gray-500 mb-6">
                {searchQuery
                  ? 'Try a different search term'
                  : 'Create your first event to get started'}
              </p>
              {!searchQuery && (
                <Link href="/dashboard/events/new">
                  <Button>
                    <PlusCircle className="w-5 h-5 mr-2" />
                    Create Event
                  </Button>
                </Link>
              )}
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredEvents.map((event) => (
                <Card
                  key={event.id}
                  variant="bordered"
                  className="hover:border-indigo-300 transition-colors"
                >
                  <div className="flex gap-4">
                    {/* Image */}
                    <Link href={`/dashboard/events/${event.id}`} className="flex-shrink-0">
                      {event.coverImageUrl ? (
                        <img
                          src={event.coverImageUrl}
                          alt={event.name}
                          className="w-24 h-24 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg" />
                      )}
                    </Link>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <Link
                            href={`/dashboard/events/${event.id}`}
                            className="font-semibold text-gray-900 hover:text-indigo-600"
                          >
                            {event.name}
                          </Link>
                          <div className="flex items-center gap-2 mt-1">
                            <EventStatusBadge status={event.status} />
                            {event.isFeatured && <Badge variant="warning">Featured</Badge>}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <Link href={`/events/${event.slug}`} target="_blank">
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Link href={`/dashboard/events/${event.id}/edit`}>
                            <Button variant="ghost" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Link href={`/dashboard/events/${event.id}`}>
                            <Button variant="ghost" size="sm">
                              <BarChart3 className="w-4 h-4" />
                            </Button>
                          </Link>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(event.startDate)}
                        </span>
                        {event.venueName && (
                          <span>
                            {event.venueName}, {event.city}
                          </span>
                        )}
                      </div>

                      {/* Stats */}
                      <div className="flex gap-6 mt-3">
                        <div className="text-sm">
                          <span className="text-gray-500">Sold: </span>
                          <span className="font-medium">
                            {event.ticketsSold}
                            <span className="text-gray-400">/{event.totalCapacity}</span>
                          </span>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-500">Revenue: </span>
                          <span className="font-medium">
                            {formatUSD(
                              event.ticketTiers?.reduce(
                                (sum, t) => sum + t.soldQuantity * t.priceUsd,
                                0
                              ) || 0
                            )}
                          </span>
                        </div>
                        {event.activeListings > 0 && (
                          <div className="text-sm">
                            <span className="text-gray-500">Resale: </span>
                            <span className="font-medium text-amber-600">
                              {event.activeListings} active
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabPanel>
      </Tabs>
    </div>
  );
}
