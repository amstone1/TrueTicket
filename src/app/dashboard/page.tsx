'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge, EventStatusBadge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, formatUSD, cn } from '@/lib/utils';
import {
  Calendar,
  Ticket,
  DollarSign,
  TrendingUp,
  Users,
  PlusCircle,
  ArrowRight,
  Clock,
  CheckCircle,
  BarChart3,
} from 'lucide-react';
import type { Event } from '@/types';

interface DashboardStats {
  totalEvents: number;
  totalTicketsSold: number;
  totalRevenue: number;
  totalRoyalties: number;
  upcomingEvents: number;
}

export default function DashboardPage() {
  const { user, displayName } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentEvents, setRecentEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch stats and recent events
      const [statsRes, eventsRes] = await Promise.all([
        fetch('/api/dashboard/stats'),
        fetch('/api/dashboard/events?limit=5'),
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      } else {
        // Default stats for demo
        setStats({
          totalEvents: 0,
          totalTicketsSold: 0,
          totalRevenue: 0,
          totalRoyalties: 0,
          upcomingEvents: 0,
        });
      }

      if (eventsRes.ok) {
        const data = await eventsRes.json();
        setRecentEvents(data.events || []);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Set defaults
      setStats({
        totalEvents: 0,
        totalTicketsSold: 0,
        totalRevenue: 0,
        totalRoyalties: 0,
        upcomingEvents: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-64 mb-8" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {displayName || 'Creator'}
        </h1>
        <p className="text-gray-500 mt-1">Here's what's happening with your events</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          title="Total Events"
          value={stats?.totalEvents || 0}
          icon={Calendar}
          color="indigo"
        />
        <StatCard
          title="Tickets Sold"
          value={stats?.totalTicketsSold || 0}
          icon={Ticket}
          color="green"
        />
        <StatCard
          title="Total Revenue"
          value={formatUSD(stats?.totalRevenue || 0)}
          icon={DollarSign}
          color="purple"
        />
        <StatCard
          title="Resale Royalties"
          value={formatUSD(stats?.totalRoyalties || 0)}
          icon={TrendingUp}
          color="amber"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        <Card variant="bordered">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <Link href="/dashboard/events/new">
              <Button variant="outline" className="w-full justify-start h-auto py-4">
                <PlusCircle className="w-5 h-5 mr-3 text-indigo-600" />
                <div className="text-left">
                  <p className="font-medium">Create Event</p>
                  <p className="text-xs text-gray-500">Start a new event</p>
                </div>
              </Button>
            </Link>
            <Link href="/dashboard/events">
              <Button variant="outline" className="w-full justify-start h-auto py-4">
                <Calendar className="w-5 h-5 mr-3 text-green-600" />
                <div className="text-left">
                  <p className="font-medium">Manage Events</p>
                  <p className="text-xs text-gray-500">View all events</p>
                </div>
              </Button>
            </Link>
            <Link href="/dashboard/royalties">
              <Button variant="outline" className="w-full justify-start h-auto py-4">
                <DollarSign className="w-5 h-5 mr-3 text-purple-600" />
                <div className="text-left">
                  <p className="font-medium">View Royalties</p>
                  <p className="text-xs text-gray-500">Track earnings</p>
                </div>
              </Button>
            </Link>
            <Link href="/dashboard/analytics">
              <Button variant="outline" className="w-full justify-start h-auto py-4">
                <BarChart3 className="w-5 h-5 mr-3 text-amber-600" />
                <div className="text-left">
                  <p className="font-medium">Analytics</p>
                  <p className="text-xs text-gray-500">View insights</p>
                </div>
              </Button>
            </Link>
          </div>
        </Card>

        <Card variant="bordered">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Upcoming Events</h2>
            <Badge variant="info">{stats?.upcomingEvents || 0} upcoming</Badge>
          </div>

          {recentEvents.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-4">No events yet</p>
              <Link href="/dashboard/events/new">
                <Button size="sm">Create Your First Event</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentEvents.slice(0, 3).map((event) => (
                <Link
                  key={event.id}
                  href={`/dashboard/events/${event.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {event.coverImageUrl ? (
                    <img
                      src={event.coverImageUrl}
                      alt={event.name}
                      className="w-12 h-12 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{event.name}</p>
                    <p className="text-sm text-gray-500">{formatDate(event.startDate)}</p>
                  </div>
                  <EventStatusBadge status={event.status} />
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Recent Events Table */}
      <Card variant="bordered">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Recent Events</h2>
          <Link href="/dashboard/events">
            <Button variant="ghost" size="sm">
              View All
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>

        {recentEvents.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No events yet</h3>
            <p className="text-gray-500 mb-6">Create your first event to get started</p>
            <Link href="/dashboard/events/new">
              <Button>
                <PlusCircle className="w-5 h-5 mr-2" />
                Create Event
              </Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Event</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Tickets Sold</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Revenue</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentEvents.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <Link
                        href={`/dashboard/events/${event.id}`}
                        className="flex items-center gap-3 hover:text-indigo-600"
                      >
                        {event.coverImageUrl ? (
                          <img
                            src={event.coverImageUrl}
                            alt={event.name}
                            className="w-10 h-10 object-cover rounded"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded" />
                        )}
                        <span className="font-medium">{event.name}</span>
                      </Link>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-500">
                      {formatDate(event.startDate)}
                    </td>
                    <td className="py-4 px-4 text-sm">
                      {event.ticketTiers?.reduce((sum, t) => sum + t.soldQuantity, 0) || 0}
                      <span className="text-gray-400">
                        /{event.ticketTiers?.reduce((sum, t) => sum + t.totalQuantity, 0) || 0}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm font-medium">
                      {formatUSD(
                        event.ticketTiers?.reduce(
                          (sum, t) => sum + t.soldQuantity * t.priceUsd,
                          0
                        ) || 0
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <EventStatusBadge status={event.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: 'indigo' | 'green' | 'purple' | 'amber';
}

function StatCard({ title, value, icon: Icon, color }: StatCardProps) {
  const colorClasses = {
    indigo: 'bg-indigo-100 text-indigo-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    amber: 'bg-amber-100 text-amber-600',
  };

  return (
    <Card variant="bordered" className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', colorClasses[color])}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </Card>
  );
}
