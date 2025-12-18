'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';

interface Ticket {
  id: string;
  tokenId: bigint | null;
  status: string;
  checkInCode: string;
  originalPriceUsd: number;
  isListed: boolean;
  event: {
    id: string;
    name: string;
    slug: string;
    startDate: string;
    doorsOpen: string | null;
    venueName: string;
    city: string;
    state: string;
    coverImageUrl: string;
    thumbnailUrl: string;
  };
  tier: {
    id: string;
    name: string;
    priceUsd: number;
    perks: string;
  };
}

function MyTicketsContent() {
  const searchParams = useSearchParams();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [walletAddress, setWalletAddress] = useState(searchParams.get('wallet') || '');
  const [filter, setFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);

  useEffect(() => {
    if (walletAddress) {
      fetchTickets();
    }
  }, [walletAddress, filter]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        wallet: walletAddress,
        status: filter,
      });
      const res = await fetch(`/api/tickets?${params}`);
      const data = await res.json();
      setTickets(data.tickets || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadQrCode = async (ticketId: string) => {
    try {
      const res = await fetch(`/api/tickets/${ticketId}/qr?format=dataurl`);
      const data = await res.json();
      setQrCode(data.qrCode);
    } catch (error) {
      console.error('Error loading QR code:', error);
    }
  };

  const openTicketModal = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setQrCode(null);
    await loadQrCode(ticket.id);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'VALID': return 'bg-green-600';
      case 'USED': return 'bg-gray-600';
      case 'PENDING_MINT': return 'bg-yellow-600';
      default: return 'bg-red-600';
    }
  };

  const parsePerks = (perks: string) => {
    try {
      return JSON.parse(perks);
    } catch {
      return [];
    }
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
              <Link href="/marketplace" className="text-gray-400 hover:text-white">Marketplace</Link>
              <Link href="/my-tickets" className="text-white font-medium">My Tickets</Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">My Tickets</h1>

        {/* Wallet Input */}
        <div className="bg-gray-800/50 rounded-xl p-4 mb-6">
          <label className="block text-sm text-gray-400 mb-2">Wallet Address</label>
          <div className="flex gap-3">
            <input
              type="text"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              placeholder="0x..."
              className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
            />
            <button
              onClick={fetchTickets}
              className="bg-purple-600 hover:bg-purple-700 px-6 py-2 rounded-lg font-medium"
            >
              Load
            </button>
          </div>
          <p className="text-gray-500 text-xs mt-2">
            Demo wallets: 0x90F79bf6EB2c4f870365E785982E1f101E93b906 (Alice) or 0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65 (Bob)
          </p>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {(['upcoming', 'past', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-medium capitalize transition-colors ${
                filter === f
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Tickets List */}
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
                <div className="h-32 bg-gradient-to-br from-purple-900/30 to-pink-900/20 relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-10 h-10 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <div className="h-5 bg-gray-700/50 rounded w-3/4 animate-pulse" />
                  <div className="h-4 bg-gray-700/50 rounded w-1/2 animate-pulse" />
                  <div className="flex justify-between">
                    <div className="h-4 bg-gray-700/50 rounded w-20 animate-pulse" />
                    <div className="h-4 bg-gray-700/50 rounded w-24 animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : !walletAddress ? (
          <div className="text-center py-16 bg-gray-800/30 rounded-xl">
            <div className="text-6xl mb-4">🎫</div>
            <h3 className="text-xl font-semibold mb-2">Enter your wallet address</h3>
            <p className="text-gray-400">View tickets owned by your wallet</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-16 bg-gray-800/30 rounded-xl">
            <div className="text-6xl mb-4">🎫</div>
            <h3 className="text-xl font-semibold mb-2">No tickets found</h3>
            <p className="text-gray-400 mb-4">This wallet doesn't own any tickets yet</p>
            <Link href="/events" className="text-purple-400 hover:underline">
              Browse events →
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden hover:border-purple-500 transition-all cursor-pointer"
                onClick={() => openTicketModal(ticket)}
              >
                <div className="relative h-32 bg-gray-700">
                  {ticket.event.thumbnailUrl ? (
                    <Image
                      src={ticket.event.thumbnailUrl}
                      alt={ticket.event.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">🎫</div>
                  )}
                  <div className="absolute top-2 right-2 flex gap-2">
                    <span className={`${getStatusColor(ticket.status)} px-2 py-0.5 rounded text-xs font-semibold`}>
                      {ticket.status}
                    </span>
                    {ticket.isListed && (
                      <span className="bg-yellow-600 px-2 py-0.5 rounded text-xs font-semibold">
                        Listed
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="font-bold mb-1 line-clamp-1">{ticket.event.name}</h3>
                  <p className="text-purple-400 text-sm mb-2">{formatDate(ticket.event.startDate)}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">{ticket.tier.name}</span>
                    <span className="text-gray-400 text-sm">{ticket.event.venueName}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Ticket Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setSelectedTicket(null)}>
          <div className="bg-gray-900 rounded-2xl max-w-md w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Ticket Header */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-center">
              <h2 className="text-2xl font-bold mb-1">{selectedTicket.event.name}</h2>
              <p className="opacity-80">{selectedTicket.tier.name}</p>
            </div>

            {/* QR Code */}
            <div className="p-6 bg-white flex items-center justify-center">
              {qrCode ? (
                <img src={qrCode} alt="Ticket QR Code" className="w-64 h-64" />
              ) : (
                <div className="w-64 h-64 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
                </div>
              )}
            </div>

            {/* Ticket Details */}
            <div className="p-6 space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-400">Date</span>
                <span className="font-medium">{formatDate(selectedTicket.event.startDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Venue</span>
                <span className="font-medium">{selectedTicket.event.venueName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Location</span>
                <span className="font-medium">{selectedTicket.event.city}, {selectedTicket.event.state}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Status</span>
                <span className={`font-medium ${selectedTicket.status === 'VALID' ? 'text-green-400' : 'text-gray-400'}`}>
                  {selectedTicket.status}
                </span>
              </div>

              {parsePerks(selectedTicket.tier.perks).length > 0 && (
                <div className="pt-4 border-t border-gray-700">
                  <p className="text-gray-400 text-sm mb-2">Perks</p>
                  <div className="flex flex-wrap gap-2">
                    {parsePerks(selectedTicket.tier.perks).map((perk: string, i: number) => (
                      <span key={i} className="text-sm bg-gray-800 px-3 py-1 rounded-full">
                        {perk}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 flex gap-3">
                {selectedTicket.status === 'VALID' && !selectedTicket.isListed && (
                  <Link
                    href={`/marketplace?list=${selectedTicket.id}`}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 py-3 rounded-lg font-medium text-center"
                  >
                    List for Resale
                  </Link>
                )}
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 py-3 rounded-lg font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MyTicketsPage() {
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
                <div className="h-4 w-20 bg-gray-700 rounded animate-pulse" />
                <div className="h-4 w-20 bg-gray-700 rounded animate-pulse" />
              </div>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="h-9 w-40 bg-gray-700 rounded mb-6 animate-pulse" />
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
              <p className="text-gray-400 text-sm">Loading your tickets...</p>
            </div>
          </div>
        </main>
      </div>
    }>
      <MyTicketsContent />
    </Suspense>
  );
}
