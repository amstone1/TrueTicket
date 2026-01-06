'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { format } from 'date-fns';
import { Receipt, Ticket, ExternalLink, ChevronRight } from 'lucide-react';

interface Order {
  id: string;
  orderNumber: string;
  eventName: string;
  eventDate: string;
  eventSlug: string;
  ticketCount: number;
  totalAmount: number;
  status: 'COMPLETED' | 'PENDING' | 'FAILED' | 'REFUNDED';
  createdAt: string;
}

export default function OrdersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const res = await fetch('/api/orders');
      if (!res.ok) throw new Error('Failed to fetch orders');
      return res.json();
    },
  });

  const orders: Order[] = data?.orders || [];

  const getStatusBadge = (status: Order['status']) => {
    const styles = {
      COMPLETED: 'bg-green-100 text-green-700',
      PENDING: 'bg-yellow-100 text-yellow-700',
      FAILED: 'bg-red-100 text-red-700',
      REFUNDED: 'bg-gray-100 text-gray-700',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {status.charAt(0) + status.slice(1).toLowerCase()}
      </span>
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Order History</h1>
        <p className="text-gray-500 mt-1">View all your past ticket purchases</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
              <div className="h-6 bg-gray-200 rounded w-48"></div>
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No orders yet</h3>
          <p className="text-gray-500 mb-6">Your purchase history will appear here</p>
          <Link
            href="/events"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
          >
            Browse Events
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/orders/${order.id}`}
              className="block bg-white rounded-xl border border-gray-200 p-6 hover:border-indigo-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-mono text-gray-500">#{order.orderNumber}</span>
                    {getStatusBadge(order.status)}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">{order.eventName}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {format(new Date(order.eventDate), 'EEEE, MMMM d, yyyy')}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Ticket className="w-4 h-4" />
                    <span>{order.ticketCount} ticket{order.ticketCount > 1 ? 's' : ''}</span>
                  </div>
                  <span className="text-sm text-gray-400">
                    {format(new Date(order.createdAt), 'MMM d, yyyy')}
                  </span>
                </div>
                <span className="text-lg font-semibold text-gray-900">
                  ${order.totalAmount.toFixed(2)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
