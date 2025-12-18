'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Container } from '@/components/layout/Container';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
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
  DollarSign,
  Send,
  X,
  Loader2,
} from 'lucide-react';
import type { Ticket as TicketType } from '@/types';

interface TicketWithDetails extends Omit<TicketType, 'tier'> {
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

  // Sell modal state
  const [showSellModal, setShowSellModal] = useState(false);
  const [sellPrice, setSellPrice] = useState('');
  const [sellLoading, setSellLoading] = useState(false);
  const [sellError, setSellError] = useState('');
  const [sellSuccess, setSellSuccess] = useState(false);

  // Transfer modal state
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferEmail, setTransferEmail] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferError, setTransferError] = useState('');
  const [transferSuccess, setTransferSuccess] = useState(false);

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

  // Calculate max resale price for selected ticket
  const getMaxResalePrice = () => {
    if (!selectedTicket) return null;
    if (!selectedTicket.event.maxResaleMarkupBps) return null;
    const originalPrice = selectedTicket.originalPriceUsd;
    const maxMarkup = selectedTicket.event.maxResaleMarkupBps / 10000;
    return originalPrice * (1 + maxMarkup);
  };

  // Handle sell ticket
  const handleSellTicket = async () => {
    if (!selectedTicket || !sellPrice) return;

    setSellLoading(true);
    setSellError('');
    setSellSuccess(false);

    try {
      const res = await fetch(`/api/tickets/${selectedTicket.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'list',
          priceUsd: parseFloat(sellPrice),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSellSuccess(true);
        fetchTickets(); // Refresh tickets
        setTimeout(() => {
          setShowSellModal(false);
          setSelectedTicket(null);
          setSellPrice('');
          setSellSuccess(false);
        }, 2000);
      } else {
        setSellError(data.error || 'Failed to list ticket');
      }
    } catch (error) {
      setSellError('An error occurred. Please try again.');
    } finally {
      setSellLoading(false);
    }
  };

  // Handle unlist ticket
  const handleUnlistTicket = async () => {
    if (!selectedTicket) return;

    setSellLoading(true);
    setSellError('');

    try {
      const res = await fetch(`/api/tickets/${selectedTicket.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unlist' }),
      });

      const data = await res.json();

      if (res.ok) {
        fetchTickets();
        setSelectedTicket(null);
      } else {
        setSellError(data.error || 'Failed to unlist ticket');
      }
    } catch (error) {
      setSellError('An error occurred. Please try again.');
    } finally {
      setSellLoading(false);
    }
  };

  // Handle transfer ticket
  const handleTransferTicket = async () => {
    if (!selectedTicket || !transferEmail) return;

    setTransferLoading(true);
    setTransferError('');
    setTransferSuccess(false);

    try {
      const res = await fetch(`/api/tickets/${selectedTicket.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'transfer',
          toEmail: transferEmail,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setTransferSuccess(true);
        fetchTickets(); // Refresh tickets
        setTimeout(() => {
          setShowTransferModal(false);
          setSelectedTicket(null);
          setTransferEmail('');
          setTransferSuccess(false);
        }, 2000);
      } else {
        setTransferError(data.error || 'Failed to transfer ticket');
      }
    } catch (error) {
      setTransferError('An error occurred. Please try again.');
    } finally {
      setTransferLoading(false);
    }
  };

  // Open sell modal
  const openSellModal = () => {
    setSellPrice(selectedTicket?.originalPriceUsd.toString() || '');
    setSellError('');
    setSellSuccess(false);
    setShowSellModal(true);
  };

  // Open transfer modal
  const openTransferModal = () => {
    setTransferEmail('');
    setTransferError('');
    setTransferSuccess(false);
    setShowTransferModal(true);
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
              <div className="pt-4 space-y-3">
                {selectedTicket.status === 'VALID' && !selectedTicket.isListed && (
                  <div className="flex gap-3">
                    {selectedTicket.event.resaleEnabled && (
                      <Button
                        variant="primary"
                        className="flex-1"
                        onClick={openSellModal}
                      >
                        <DollarSign className="w-4 h-4 mr-2" />
                        Sell Ticket
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={openTransferModal}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Transfer
                    </Button>
                  </div>
                )}

                {selectedTicket.isListed && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleUnlistTicket}
                    isLoading={sellLoading}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel Listing
                  </Button>
                )}

                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => setSelectedTicket(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Sell Ticket Modal */}
      <Modal
        isOpen={showSellModal}
        onClose={() => setShowSellModal(false)}
        title="List Ticket for Sale"
        size="sm"
      >
        {selectedTicket && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="font-medium text-gray-900">{selectedTicket.event.name}</p>
              <p className="text-sm text-gray-500">{selectedTicket.tier.name}</p>
              <p className="text-sm text-gray-500">
                Original price: {formatUSD(selectedTicket.originalPriceUsd)}
              </p>
            </div>

            {getMaxResalePrice() && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">Price Cap in Effect</p>
                    <p className="text-sm text-amber-700">
                      Maximum resale price: {formatUSD(getMaxResalePrice()!)}
                      {' '}({selectedTicket.event.maxResaleMarkupBps! / 100}% above face value)
                    </p>
                  </div>
                </div>
              </div>
            )}

            <Input
              label="Listing Price (USD)"
              type="number"
              min="0"
              step="0.01"
              max={getMaxResalePrice() || undefined}
              value={sellPrice}
              onChange={(e) => setSellPrice(e.target.value)}
              leftIcon={<DollarSign className="w-5 h-5" />}
              placeholder="0.00"
            />

            {sellError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                {sellError}
              </div>
            )}

            {sellSuccess && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2 text-sm text-green-700">
                <CheckCircle className="w-5 h-5" />
                Ticket listed successfully!
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowSellModal(false)}
                disabled={sellLoading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={handleSellTicket}
                isLoading={sellLoading}
                disabled={!sellPrice || sellSuccess}
              >
                List for Sale
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Transfer Ticket Modal */}
      <Modal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        title="Transfer Ticket"
        size="sm"
      >
        {selectedTicket && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="font-medium text-gray-900">{selectedTicket.event.name}</p>
              <p className="text-sm text-gray-500">{selectedTicket.tier.name}</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Gift className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-800">Gift this ticket</p>
                  <p className="text-sm text-blue-700">
                    The recipient will receive this ticket in their account.
                    This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>

            <Input
              label="Recipient's Email"
              type="email"
              value={transferEmail}
              onChange={(e) => setTransferEmail(e.target.value)}
              placeholder="friend@example.com"
            />

            {transferError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                {transferError}
              </div>
            )}

            {transferSuccess && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2 text-sm text-green-700">
                <CheckCircle className="w-5 h-5" />
                Ticket transferred successfully!
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowTransferModal(false)}
                disabled={transferLoading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={handleTransferTicket}
                isLoading={transferLoading}
                disabled={!transferEmail || transferSuccess}
              >
                Transfer Ticket
              </Button>
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
