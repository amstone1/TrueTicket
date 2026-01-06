'use client';

import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Ticket,
  DollarSign,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

interface AnalyticsData {
  overview: {
    totalRevenue: number;
    revenueChange: number;
    totalTicketsSold: number;
    ticketsChange: number;
    totalEvents: number;
    eventsChange: number;
    avgTicketPrice: number;
    priceChange: number;
  };
  recentSales: {
    date: string;
    tickets: number;
    revenue: number;
  }[];
  topEvents: {
    id: string;
    name: string;
    ticketsSold: number;
    revenue: number;
    capacity: number;
  }[];
  tierBreakdown: {
    tier: string;
    count: number;
    percentage: number;
  }[];
}

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['dashboard-analytics'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/analytics');
      if (!res.ok) throw new Error('Failed to fetch analytics');
      return res.json();
    },
  });

  // Default data for display
  const overview = data?.overview || {
    totalRevenue: 0,
    revenueChange: 0,
    totalTicketsSold: 0,
    ticketsChange: 0,
    totalEvents: 0,
    eventsChange: 0,
    avgTicketPrice: 0,
    priceChange: 0,
  };

  const StatCard = ({
    title,
    value,
    change,
    icon: Icon,
    prefix = '',
    suffix = '',
  }: {
    title: string;
    value: number;
    change: number;
    icon: typeof DollarSign;
    prefix?: string;
    suffix?: string;
  }) => (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-gray-500 text-sm font-medium">{title}</span>
        <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
          <Icon className="w-5 h-5 text-indigo-600" />
        </div>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold text-gray-900">
            {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
          </p>
        </div>
        <div className={`flex items-center gap-1 text-sm font-medium ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {change >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
          {Math.abs(change)}%
        </div>
      </div>
      <p className="text-xs text-gray-500 mt-1">vs last 30 days</p>
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-500 mt-1">Track your event performance and sales</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-24 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-32"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 mt-1">Track your event performance and sales</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Revenue"
          value={overview.totalRevenue}
          change={overview.revenueChange}
          icon={DollarSign}
          prefix="$"
        />
        <StatCard
          title="Tickets Sold"
          value={overview.totalTicketsSold}
          change={overview.ticketsChange}
          icon={Ticket}
        />
        <StatCard
          title="Active Events"
          value={overview.totalEvents}
          change={overview.eventsChange}
          icon={Calendar}
        />
        <StatCard
          title="Avg Ticket Price"
          value={overview.avgTicketPrice}
          change={overview.priceChange}
          icon={TrendingUp}
          prefix="$"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Chart Placeholder */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Over Time</h3>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">Chart visualization</p>
              <p className="text-sm text-gray-400">Coming soon</p>
            </div>
          </div>
        </div>

        {/* Top Events */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Events</h3>
          {data?.topEvents && data.topEvents.length > 0 ? (
            <div className="space-y-4">
              {data.topEvents.map((event, index) => (
                <div key={event.id} className="flex items-center gap-4">
                  <span className="w-8 h-8 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 font-semibold text-sm">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{event.name}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>{event.ticketsSold} sold</span>
                      <span>${event.revenue.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="w-24">
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full"
                        style={{ width: `${(event.ticketsSold / event.capacity) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1 text-right">
                      {Math.round((event.ticketsSold / event.capacity) * 100)}% capacity
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center">
              <div className="text-center">
                <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">No events yet</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tier Breakdown */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales by Tier</h3>
        {data?.tierBreakdown && data.tierBreakdown.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {data.tierBreakdown.map((tier) => (
              <div key={tier.tier} className="text-center">
                <div className="relative w-24 h-24 mx-auto mb-3">
                  <svg className="w-24 h-24 -rotate-90">
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      className="text-gray-100"
                    />
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${tier.percentage * 2.51} 251`}
                      className="text-indigo-600"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-gray-900">{tier.percentage}%</span>
                  </div>
                </div>
                <p className="font-medium text-gray-900">{tier.tier}</p>
                <p className="text-sm text-gray-500">{tier.count} tickets</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-32 flex items-center justify-center">
            <p className="text-gray-500">No tier data available</p>
          </div>
        )}
      </div>
    </div>
  );
}
