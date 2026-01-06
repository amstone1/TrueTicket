'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Ticket, Search, Filter, Download, CheckCircle, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface TicketSale {
  id: string;
  ticketNumber: string;
  eventName: string;
  eventDate: string;
  tierName: string;
  buyerEmail: string;
  pricePaid: number;
  status: 'VALID' | 'USED' | 'REVOKED' | 'TRANSFERRED';
  purchasedAt: string;
  usedAt?: string;
}

export default function TicketsSoldPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-tickets', searchQuery, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`/api/dashboard/tickets?${params}`);
      if (!res.ok) throw new Error('Failed to fetch tickets');
      return res.json();
    },
  });

  const tickets: TicketSale[] = data?.tickets || [];
  const stats = data?.stats || { total: 0, valid: 0, used: 0, revoked: 0 };

  const getStatusBadge = (status: TicketSale['status']) => {
    const badges = {
      VALID: { icon: CheckCircle, color: 'bg-green-100 text-green-700', label: 'Valid' },
      USED: { icon: CheckCircle, color: 'bg-blue-100 text-blue-700', label: 'Used' },
      REVOKED: { icon: XCircle, color: 'bg-red-100 text-red-700', label: 'Revoked' },
      TRANSFERRED: { icon: Clock, color: 'bg-yellow-100 text-yellow-700', label: 'Transferred' },
    };
    const badge = badges[status];
    const Icon = badge.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="w-3 h-3" />
        {badge.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tickets Sold</h1>
          <p className="text-gray-500 mt-1">View and manage all tickets sold for your events</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Sold</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Valid</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{stats.valid}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Used</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{stats.used}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Revoked</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{stats.revoked}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by ticket number, event, or buyer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">All Status</option>
            <option value="VALID">Valid</option>
            <option value="USED">Used</option>
            <option value="REVOKED">Revoked</option>
            <option value="TRANSFERRED">Transferred</option>
          </select>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-gray-500 mt-4">Loading tickets...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-12 text-center">
            <Ticket className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No tickets found</h3>
            <p className="text-gray-500">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filter'
                : 'Tickets will appear here once sold'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Ticket</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Event</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Buyer</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Price</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Purchased</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {tickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-mono text-sm font-medium text-gray-900">{ticket.ticketNumber}</p>
                        <p className="text-xs text-gray-500">{ticket.tierName}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{ticket.eventName}</p>
                        <p className="text-xs text-gray-500">{format(new Date(ticket.eventDate), 'MMM d, yyyy')}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900">{ticket.buyerEmail}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900">${ticket.pricePaid.toFixed(2)}</p>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(ticket.status)}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-500">{format(new Date(ticket.purchasedAt), 'MMM d, yyyy')}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
