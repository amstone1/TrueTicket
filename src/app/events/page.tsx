'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Container } from '@/components/layout/Container';
import { PageHeader } from '@/components/layout/PageHeader';
import { EventCard, EventGrid } from '@/components/events/EventCard';
import { EventFilters, QuickFilters } from '@/components/events/EventFilters';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { NoEventsEmpty } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import type { Event, EventFilters as Filters, EventCategory } from '@/types';

export const dynamic = 'force-dynamic';

function EventsContent() {
  const searchParams = useSearchParams();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Initialize filters from URL params
  const [filters, setFilters] = useState<Partial<Filters>>(() => ({
    category: searchParams.get('category') as EventCategory | undefined,
    search: searchParams.get('search') || undefined,
    sortBy: 'date',
    sortOrder: 'asc',
  }));

  useEffect(() => {
    fetchEvents();
  }, [filters, page]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '12',
      });

      if (filters.category) params.set('category', filters.category);
      if (filters.search) params.set('search', filters.search);
      if (filters.startDateFrom) params.set('startDateFrom', filters.startDateFrom);
      if (filters.minPrice) params.set('minPrice', filters.minPrice.toString());
      if (filters.maxPrice) params.set('maxPrice', filters.maxPrice.toString());
      if (filters.sortBy) params.set('sortBy', filters.sortBy);
      if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);

      const res = await fetch(`/api/events?${params}`);
      const data = await res.json();

      setEvents(data.data || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotal(data.pagination?.total || 0);
    } catch (error) {
      console.error('Error fetching events:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFiltersChange = (newFilters: Partial<Filters>) => {
    setFilters(newFilters);
    setPage(1);
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-12">
      <Container className="py-8">
        <PageHeader
          title="Discover Events"
          description={`${total > 0 ? `${total} events available` : 'Find your next experience'}`}
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Events' },
          ]}
        />

        {/* Quick Category Filters */}
        <div className="mb-6">
          <QuickFilters
            activeCategory={filters.category}
            onCategoryChange={(category) =>
              handleFiltersChange({ ...filters, category })
            }
          />
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Filters */}
          <aside className="lg:w-64 flex-shrink-0">
            <div className="sticky top-24">
              <EventFilters
                filters={filters}
                onFiltersChange={handleFiltersChange}
                showMobileToggle
              />
            </div>
          </aside>

          {/* Events Grid */}
          <main className="flex-1">
            {loading ? (
              <ListSkeleton count={6} variant="card" />
            ) : events.length === 0 ? (
              <NoEventsEmpty />
            ) : (
              <>
                <EventGrid>
                  {events.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </EventGrid>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-4 mt-8">
                    <Button
                      variant="outline"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-gray-600">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </Container>
    </div>
  );
}

export default function EventsPage() {
  return (
    <Suspense fallback={<ListSkeleton count={12} />}>
      <EventsContent />
    </Suspense>
  );
}
