'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface EventStats {
  id: string;
  name: string;
  slug: string;
  startDate: string;
  status: string;
  totalCapacity: number;
  ticketsSold: number;
  revenue: number;
  checkIns: number;
}

export default function CreatorDashboard() {
  const [events, setEvents] = useState<EventStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [walletAddress, setWalletAddress] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Create event form
  const [newEvent, setNewEvent] = useState({
    name: '',
    description: '',
    category: 'MUSIC',
    startDate: '',
    venueName: '',
    city: '',
    state: '',
    totalCapacity: 1000,
    resaleEnabled: true,
    maxResaleMarkup: 10,
    tiers: [
      { name: 'General Admission', priceUsd: 50, totalQuantity: 800, maxPerWallet: 4 },
      { name: 'VIP', priceUsd: 150, totalQuantity: 200, maxPerWallet: 2 },
    ],
  });

  useEffect(() => {
    if (walletAddress) {
      fetchEvents();
    }
  }, [walletAddress]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      // In production, this would filter by organizer
      const res = await fetch('/api/events?limit=50');
      const data = await res.json();

      // Mock stats for demo
      const eventsWithStats = (data.data || []).map((e: any) => ({
        id: e.id,
        name: e.name,
        slug: e.slug,
        startDate: e.startDate,
        status: e.status,
        totalCapacity: e.totalCapacity,
        ticketsSold: e.ticketTiers?.reduce((sum: number, t: any) => sum + t.soldQuantity, 0) || 0,
        revenue: e.ticketTiers?.reduce((sum: number, t: any) => sum + (t.soldQuantity * t.priceUsd), 0) || 0,
        checkIns: Math.floor(Math.random() * 100), // Demo data
      }));

      setEvents(eventsWithStats);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async () => {
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newEvent,
          locationType: 'IN_PERSON',
          maxResaleMarkupBps: newEvent.maxResaleMarkup * 100,
        }),
      });

      if (res.ok) {
        alert('Event created successfully!');
        setShowCreateModal(false);
        fetchEvents();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to create event');
      }
    } catch (error) {
      alert('Failed to create event');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const totalRevenue = events.reduce((sum, e) => sum + e.revenue, 0);
  const totalTicketsSold = events.reduce((sum, e) => sum + e.ticketsSold, 0);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
              TrueTicket Creator
            </Link>
            <nav className="flex items-center gap-4">
              <Link href="/events" className="text-gray-400 hover:text-white">Public Events</Link>
              <Link href="/scanner" className="text-gray-400 hover:text-white">Scanner</Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Creator Dashboard</h1>
            <p className="text-gray-400 mt-1">Manage your events and track sales</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-lg font-bold"
          >
            + Create Event
          </button>
        </div>

        {/* Wallet Input */}
        {!walletAddress && (
          <div className="bg-gray-800/50 rounded-xl p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">Connect as Organizer</h2>
            <div className="flex gap-3">
              <input
                type="text"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="Enter organizer wallet address..."
                className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500"
              />
              <button
                onClick={() => setWalletAddress('0x70997970C51812dc3A010C7d01b50e0d17dc79C8')}
                className="bg-gray-700 hover:bg-gray-600 px-4 py-3 rounded-lg"
              >
                Use Demo (Venue)
              </button>
            </div>
          </div>
        )}

        {walletAddress && (
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-gray-800/50 rounded-xl p-6">
                <p className="text-gray-400 text-sm mb-1">Total Events</p>
                <p className="text-3xl font-bold">{events.length}</p>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-6">
                <p className="text-gray-400 text-sm mb-1">Tickets Sold</p>
                <p className="text-3xl font-bold text-green-400">{totalTicketsSold.toLocaleString()}</p>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-6">
                <p className="text-gray-400 text-sm mb-1">Total Revenue</p>
                <p className="text-3xl font-bold text-purple-400">{formatCurrency(totalRevenue)}</p>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-6">
                <p className="text-gray-400 text-sm mb-1">Resale Royalties</p>
                <p className="text-3xl font-bold text-yellow-400">{formatCurrency(totalRevenue * 0.05)}</p>
              </div>
            </div>

            {/* Events Table */}
            <div className="bg-gray-800/50 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-gray-700">
                <h2 className="text-xl font-bold">Your Events</h2>
              </div>

              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mx-auto"></div>
                </div>
              ) : events.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="text-6xl mb-4">📅</div>
                  <h3 className="text-xl font-semibold mb-2">No events yet</h3>
                  <p className="text-gray-400">Create your first event to get started</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-900">
                      <tr>
                        <th className="text-left p-4 font-medium text-gray-400">Event</th>
                        <th className="text-left p-4 font-medium text-gray-400">Date</th>
                        <th className="text-left p-4 font-medium text-gray-400">Status</th>
                        <th className="text-right p-4 font-medium text-gray-400">Sold</th>
                        <th className="text-right p-4 font-medium text-gray-400">Revenue</th>
                        <th className="text-right p-4 font-medium text-gray-400">Check-ins</th>
                        <th className="text-center p-4 font-medium text-gray-400">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {events.map((event) => (
                        <tr key={event.id} className="border-t border-gray-700 hover:bg-gray-800/50">
                          <td className="p-4">
                            <Link href={`/events/${event.slug}`} className="font-medium hover:text-purple-400">
                              {event.name}
                            </Link>
                          </td>
                          <td className="p-4 text-gray-400">{formatDate(event.startDate)}</td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              event.status === 'PUBLISHED' ? 'bg-green-600' :
                              event.status === 'DRAFT' ? 'bg-yellow-600' : 'bg-gray-600'
                            }`}>
                              {event.status}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            {event.ticketsSold.toLocaleString()} / {event.totalCapacity.toLocaleString()}
                          </td>
                          <td className="p-4 text-right font-medium text-green-400">
                            {formatCurrency(event.revenue)}
                          </td>
                          <td className="p-4 text-right">{event.checkIns}</td>
                          <td className="p-4 text-center">
                            <Link
                              href={`/scanner?eventId=${event.id}`}
                              className="text-purple-400 hover:underline text-sm"
                            >
                              Scan
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Create Event Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-gray-900 rounded-2xl max-w-2xl w-full p-6 my-8">
            <h2 className="text-2xl font-bold mb-6">Create New Event</h2>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Event Name</label>
                <input
                  type="text"
                  value={newEvent.name}
                  onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                  placeholder="My Awesome Event"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Description</label>
                <textarea
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                  placeholder="Describe your event..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Category</label>
                  <select
                    value={newEvent.category}
                    onChange={(e) => setNewEvent({ ...newEvent, category: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                  >
                    <option value="MUSIC">Music</option>
                    <option value="SPORTS">Sports</option>
                    <option value="COMEDY">Comedy</option>
                    <option value="THEATER">Theater</option>
                    <option value="CONFERENCE">Conference</option>
                    <option value="FESTIVAL">Festival</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Date & Time</label>
                  <input
                    type="datetime-local"
                    value={newEvent.startDate}
                    onChange={(e) => setNewEvent({ ...newEvent, startDate: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Venue</label>
                  <input
                    type="text"
                    value={newEvent.venueName}
                    onChange={(e) => setNewEvent({ ...newEvent, venueName: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                    placeholder="Venue name"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">City</label>
                  <input
                    type="text"
                    value={newEvent.city}
                    onChange={(e) => setNewEvent({ ...newEvent, city: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">State</label>
                  <input
                    type="text"
                    value={newEvent.state}
                    onChange={(e) => setNewEvent({ ...newEvent, state: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Total Capacity</label>
                  <input
                    type="number"
                    value={newEvent.totalCapacity}
                    onChange={(e) => setNewEvent({ ...newEvent, totalCapacity: parseInt(e.target.value) })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Max Resale Markup (%)</label>
                  <input
                    type="number"
                    value={newEvent.maxResaleMarkup}
                    onChange={(e) => setNewEvent({ ...newEvent, maxResaleMarkup: parseInt(e.target.value) })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Ticket Tiers */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Ticket Tiers</label>
                {newEvent.tiers.map((tier, i) => (
                  <div key={i} className="bg-gray-800 rounded-lg p-3 mb-2">
                    <div className="grid grid-cols-4 gap-2">
                      <input
                        type="text"
                        value={tier.name}
                        onChange={(e) => {
                          const tiers = [...newEvent.tiers];
                          tiers[i].name = e.target.value;
                          setNewEvent({ ...newEvent, tiers });
                        }}
                        className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                        placeholder="Tier name"
                      />
                      <input
                        type="number"
                        value={tier.priceUsd}
                        onChange={(e) => {
                          const tiers = [...newEvent.tiers];
                          tiers[i].priceUsd = parseFloat(e.target.value);
                          setNewEvent({ ...newEvent, tiers });
                        }}
                        className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                        placeholder="Price"
                      />
                      <input
                        type="number"
                        value={tier.totalQuantity}
                        onChange={(e) => {
                          const tiers = [...newEvent.tiers];
                          tiers[i].totalQuantity = parseInt(e.target.value);
                          setNewEvent({ ...newEvent, tiers });
                        }}
                        className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                        placeholder="Quantity"
                      />
                      <button
                        onClick={() => {
                          const tiers = newEvent.tiers.filter((_, j) => j !== i);
                          setNewEvent({ ...newEvent, tiers });
                        }}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => setNewEvent({
                    ...newEvent,
                    tiers: [...newEvent.tiers, { name: '', priceUsd: 0, totalQuantity: 100, maxPerWallet: 4 }],
                  })}
                  className="text-purple-400 hover:text-purple-300 text-sm"
                >
                  + Add Tier
                </button>
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t border-gray-700">
              <button
                onClick={handleCreateEvent}
                className="flex-1 bg-purple-600 hover:bg-purple-700 py-3 rounded-lg font-bold"
              >
                Create Event
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
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
