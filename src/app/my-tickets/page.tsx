'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Container } from '@/components/layout/Container';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge, TicketStatusBadge } from '@/components/ui/Badge';
import { Tabs, Tab, TabPanel } from '@/components/ui/Tabs';
import { NoTicketsEmpty } from '@/components/ui/EmptyState';
import { Skeleton, TicketCardSkeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, formatTime, formatUSD, cn } from '@/lib/utils';
import {
  Ticket,
  Calendar,
  MapPin,
  Clock,
  QrCode,
  Tag,
  ExternalLink,
  Share2,
  Gift,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import type { Ticket as TicketType } from '@/types';

interface TicketWithDetails extends TicketType {
  tier: {
    id: string;
    name: string;
    priceUsd: number;
    perks: string[];
  };
}

export default function MyTicketsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [tickets, setTickets] = useState<TicketWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [selectedTicket, setSelectedTicket] = useState<TicketWithDetails | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/my-tickets');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchTickets();
    }
  }, [isAuthenticated, activeTab]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status: activeTab });
      const res = await fetch(`/api/tickets?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadQrCode = async (ticketId: string) => {
    setQrLoading(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/qr?format=dataurl`);
      if (res.ok) {
        const data = await res.json();
        setQrCode(data.qrCode);
      }
    } catch (error) {
      console.error('Error loading QR code:', error);
    } finally {
      setQrLoading(false);
    }
  };

  const openTicketModal = async (ticket: TicketWithDetails) => {
    setSelectedTicket(ticket);
    setQrCode(null);
    await loadQrCode(ticket.id);
  };

  // Group tickets by event
  const ticketsByEvent = tickets.reduce((acc, ticket) => {
    const eventId = ticket.event.id;
    if (!acc[eventId]) {
      acc[eventId] = {
        event: ticket.event,
        tickets: [],
      };
    }
    acc[eventId].tickets.push(ticket);
    return acc;
  }, {} as Record<string, { event: TicketWithDetails['event']; tickets: TicketWithDetails[] }>);

  if (authLoading) {
    return (
      <div className="bg-gray-50 min-h-screen pb-12">
        <Container className="py-8">
          <Skeleton className="h-8 w-48 mb-8" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <TicketCardSkeleton key={i} />
            ))}
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-12">
      <Container className="py-8">
        <PageHeader
          title="My Tickets"
          description="View and manage your event tickets"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'My Tickets' },
          ]}
        />

        {/* Tabs */}
        <Tabs value={activeTab} onChange={setActiveTab}>
          <div className="flex gap-2 mb-6">
            <Tab value="upcoming">Upcoming</Tab>
            <Tab value="past">Past</Tab>
            <Tab value="all">All Tickets</Tab>
          </div>

          {/* Content */}
          <TabPanel value="upcoming">
            <TicketsList
              ticketsByEvent={ticketsByEvent}
              loading={loading}
              onTicketClick={openTicketModal}
              emptyMessage="You don't have any upcoming tickets"
            />
          </TabPanel>

          <TabPanel value="past">
            <TicketsList
              ticketsByEvent={ticketsByEvent}
              loading={loading}
              onTicketClick={openTicketModal}
              emptyMessage="You don't have any past tickets"
            />
          </TabPanel>

          <TabPanel value="all">
            <TicketsList
              ticketsByEvent={ticketsByEvent}
              loading={loading}
              onTicketClick={openTicketModal}
              emptyMessage="You don't have any tickets yet"
            />
          </TabPanel>
        </Tabs>
      </Container>

      {/* Ticket Detail Modal */}
      <Modal
        isOpen={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
        title=""
        size="md"
      >
        {selectedTicket && (
          <div className="-m-6">
            {/* Ticket Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
              <h2 className="text-xl font-bold mb-1">{selectedTicket.event.name}</h2>
              <p className="opacity-80">{selectedTicket.tier.name}</p>
            </div>

            {/* QR Code */}
            <div className="p-6 bg-white flex flex-col items-center justify-center border-b border-gray-200">
              {qrLoading ? (
                <div className="w-48 h-48 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent" />
                </div>
              ) : qrCode ? (
                <img src={qrCode} alt="Ticket QR Code" className="w-48 h-48" />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center bg-gray-100 rounded-lg">
                  <QrCode className="w-16 h-16 text-gray-300" />
                </div>
              )}
              <p className="text-xs text-gray-500 mt-3">Show this at the venue for entry</p>
            </div>

            {/* Ticket Details */}
            <div className="p-6 space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-500">Date</span>
                <span className="font-medium text-gray-900">
                  {formatDate(selectedTicket.event.startDate)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500">Time</span>
                <span className="font-medium text-gray-900">
                  {formatTime(selectedTicket.event.startDate)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500">Venue</span>
                <span className="font-medium text-gray-900">
                  {selectedTicket.event.venueName || 'TBA'}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500">Location</span>
                <span className="font-medium text-gray-900">
                  {[selectedTicket.event.city, selectedTicket.event.state]
                    .filter(Boolean)
                    .join(', ') || 'TBA'}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-500">Status</span>
                <TicketStatusBadge status={selectedTicket.status} />
              </div>

              {selectedTicket.tier.perks && selectedTicket.tier.perks.length > 0 && (
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-gray-500 text-sm mb-2">Perks</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedTicket.tier.perks.map((perk, i) => (
                      <span
                        key={i}
                        className="text-sm bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full"
                      >
                        {perk}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="pt-4 flex gap-3">
                {selectedTicket.status === 'VALID' &&
                  !selectedTicket.isListed &&
                  selectedTicket.event.resaleEnabled && (
                    <Link href={`/marketplace/sell?ticketId=${selectedTicket.id}`} className="flex-1">
                      <Button variant="primary" className="w-full">
                        <Tag className="w-4 h-4 mr-2" />
                        List for Resale
                      </Button>
                    </Link>
                  )}
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setSelectedTicket(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

interface TicketsListProps {
  ticketsByEvent: Record<string, { event: TicketWithDetails['event']; tickets: TicketWithDetails[] }>;
  loading: boolean;
  onTicketClick: (ticket: TicketWithDetails) => void;
  emptyMessage: string;
}

function TicketsList({ ticketsByEvent, loading, onTicketClick, emptyMessage }: TicketsListProps) {
  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <TicketCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  const events = Object.values(ticketsByEvent);

  if (events.length === 0) {
    return <NoTicketsEmpty />;
  }

  return (
    <div className="space-y-8">
      {events.map(({ event, tickets }) => (
        <div key={event.id}>
          {/* Event Header */}
          <div className="flex items-center gap-4 mb-4">
            {event.coverImageUrl ? (
              <img
                src={event.coverImageUrl}
                alt={event.name}
                className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
              />
            ) : (
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex-shrink-0" />
            )}
            <div>
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
          </div>

          {/* Tickets Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tickets.map((ticket) => (
              <Card
                key={ticket.id}
                variant="bordered"
                className="cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all"
                onClick={() => onTicketClick(ticket)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <Ticket className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{ticket.tier.name}</p>
                    <p className="text-sm text-gray-500">{formatUSD(ticket.originalPriceUsd)}</p>
                  </div>
                  <TicketStatusBadge status={ticket.status} size="sm" />
                </div>

                {ticket.isListed && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                    <Tag className="w-4 h-4" />
                    Listed for resale
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between text-sm">
                  <button className="text-indigo-600 font-medium flex items-center gap-1 hover:underline">
                    <QrCode className="w-4 h-4" />
                    View QR
                  </button>
                  <span className="text-gray-400">
                    #{ticket.id.slice(0, 8).toUpperCase()}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
