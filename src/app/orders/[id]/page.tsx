'use client';

import { useState, useEffect, use, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Container } from '@/components/layout/Container';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatDate, formatTime, formatUSD } from '@/lib/utils';
import {
  CheckCircle,
  Clock,
  XCircle,
  Calendar,
  MapPin,
  Ticket,
  Download,
  Share2,
  ArrowRight,
  Mail,
  AlertCircle,
} from 'lucide-react';
import type { Purchase } from '@/types';

export const dynamic = 'force-dynamic';

interface OrderData extends Purchase {
  tickets: {
    id: string;
    checkInCode: string;
    tier: {
      name: string;
    };
  }[];
}

function OrderContent({ id }: { id: string }) {
  const searchParams = useSearchParams();
  const isSuccess = searchParams.get('success') === 'true';

  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/orders/${id}`);
      if (res.ok) {
        const data = await res.json();
        setOrder(data);
      } else if (res.status === 404) {
        setError('Order not found');
      } else {
        setError('Failed to load order');
      }
    } catch (err) {
      setError('Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-50 min-h-screen pb-12">
        <Container className="py-8">
          <div className="max-w-2xl mx-auto">
            <Skeleton className="h-16 w-16 rounded-full mx-auto mb-4" />
            <Skeleton className="h-8 w-48 mx-auto mb-2" />
            <Skeleton className="h-4 w-64 mx-auto mb-8" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </Container>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="bg-gray-50 min-h-screen pb-12">
        <Container className="py-16">
          <div className="max-w-md mx-auto text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Not Found</h1>
            <p className="text-gray-600 mb-6">
              We couldn't find this order. Please check your email for confirmation or contact support.
            </p>
            <div className="flex justify-center gap-4">
              <Link href="/my-tickets">
                <Button>View My Tickets</Button>
              </Link>
              <Link href="/events">
                <Button variant="outline">Browse Events</Button>
              </Link>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  const isPending = order.status === 'PENDING' || order.status === 'PROCESSING';
  const isCompleted = order.status === 'COMPLETED';
  const isFailed = order.status === 'FAILED';

  return (
    <div className="bg-gray-50 min-h-screen pb-12">
      <Container className="py-8">
        <div className="max-w-2xl mx-auto">
          {/* Status Header */}
          <div className="text-center mb-8">
            {isCompleted && (
              <>
                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Confirmed!</h1>
                <p className="text-gray-600">
                  Your tickets are ready. Check your email for confirmation.
                </p>
              </>
            )}

            {isPending && (
              <>
                <div className="w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-10 h-10 text-yellow-600 animate-pulse" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Processing Payment</h1>
                <p className="text-gray-600">
                  Please wait while we confirm your payment. This usually takes a few seconds.
                </p>
              </>
            )}

            {isFailed && (
              <>
                <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                  <XCircle className="w-10 h-10 text-red-600" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Failed</h1>
                <p className="text-gray-600">
                  Unfortunately, your payment could not be processed. Please try again.
                </p>
              </>
            )}
          </div>

          {/* Order Details Card */}
          <Card variant="bordered" className="overflow-hidden mb-6">
            {/* Event Info */}
            <div className="flex gap-4 p-6 bg-gray-50 border-b border-gray-200">
              {order.event.coverImageUrl ? (
                <img
                  src={order.event.coverImageUrl}
                  alt={order.event.name}
                  className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                />
              ) : (
                <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex-shrink-0" />
              )}
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">{order.event.name}</h2>
                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {formatDate(order.event.startDate)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {formatTime(order.event.startDate)}
                  </span>
                </div>
                {order.event.venueName && (
                  <p className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                    <MapPin className="w-4 h-4" />
                    {order.event.venueName}, {order.event.city}
                  </p>
                )}
              </div>
            </div>

            {/* Order Info */}
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                <span className="text-gray-600">Order Number</span>
                <span className="font-mono text-sm">{order.id.slice(0, 8).toUpperCase()}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600">Tickets</span>
                <span className="font-medium">{order.ticketQuantity} ticket{order.ticketQuantity !== 1 ? 's' : ''}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600">Subtotal</span>
                <span>{formatUSD(order.subtotalUsd)}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600">Service Fee</span>
                <span>{formatUSD(order.feesUsd)}</span>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                <span className="text-lg font-semibold">Total</span>
                <span className="text-lg font-semibold">{formatUSD(order.totalUsd)}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600">Status</span>
                <Badge
                  variant={isCompleted ? 'success' : isPending ? 'warning' : 'error'}
                >
                  {order.status}
                </Badge>
              </div>
            </div>
          </Card>

          {/* Tickets List (if completed) */}
          {isCompleted && order.tickets && order.tickets.length > 0 && (
            <Card variant="bordered" className="mb-6">
              <div className="p-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">Your Tickets</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {order.tickets.map((ticket, index) => (
                  <div key={ticket.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                        <Ticket className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{ticket.tier.name}</p>
                        <p className="text-sm text-gray-500">Ticket #{index + 1}</p>
                      </div>
                    </div>
                    <code className="text-sm font-mono text-gray-500">{ticket.checkInCode}</code>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Email Notice */}
          {isCompleted && (
            <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg mb-6">
              <Mail className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900">Confirmation email sent</p>
                <p className="text-blue-700">
                  We've sent a confirmation email with your ticket details. Please check your inbox.
                </p>
              </div>
            </div>
          )}

          {/* Pending Notice */}
          {isPending && (
            <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded-lg mb-6">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-900">Payment processing</p>
                <p className="text-yellow-700">
                  This page will automatically update once your payment is confirmed. You can also refresh the page.
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            {isCompleted && (
              <Link href="/my-tickets" className="flex-1">
                <Button className="w-full" size="lg">
                  <Ticket className="w-5 h-5 mr-2" />
                  View My Tickets
                </Button>
              </Link>
            )}

            {isFailed && (
              <Link href="/checkout" className="flex-1">
                <Button className="w-full" size="lg">
                  Try Again
                </Button>
              </Link>
            )}

            <Link href="/events" className="flex-1">
              <Button variant="outline" className="w-full" size="lg">
                Browse More Events
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </Container>
    </div>
  );
}

function OrderLoading() {
  return (
    <div className="bg-gray-50 min-h-screen pb-12">
      <Container className="py-8">
        <div className="max-w-2xl mx-auto">
          <Skeleton className="h-16 w-16 rounded-full mx-auto mb-4" />
          <Skeleton className="h-8 w-48 mx-auto mb-2" />
          <Skeleton className="h-4 w-64 mx-auto mb-8" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </Container>
    </div>
  );
}

export default function OrderConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <Suspense fallback={<OrderLoading />}>
      <OrderContent id={id} />
    </Suspense>
  );
}
