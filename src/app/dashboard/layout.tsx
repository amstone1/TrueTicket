'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar, SidebarLink } from '@/components/layout/Sidebar';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/Skeleton';
import { Menu, X } from 'lucide-react';
import {
  LayoutDashboard,
  Calendar,
  PlusCircle,
  Ticket,
  DollarSign,
  BarChart3,
  Settings,
  Users,
} from 'lucide-react';

const sidebarLinks: SidebarLink[] = [
  { label: 'Overview', href: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  { label: 'Events', href: '/dashboard/events', icon: <Calendar className="w-5 h-5" /> },
  { label: 'Create Event', href: '/dashboard/events/new', icon: <PlusCircle className="w-5 h-5" /> },
  { label: 'Tickets', href: '/dashboard/tickets', icon: <Ticket className="w-5 h-5" /> },
  { label: 'Royalties', href: '/royalties', icon: <DollarSign className="w-5 h-5" /> },
  { label: 'Analytics', href: '/dashboard/analytics', icon: <BarChart3 className="w-5 h-5" /> },
  { label: 'Settings', href: '/settings', icon: <Settings className="w-5 h-5" /> },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Check if user has creator permissions
  const isCreator = user?.isArtist || user?.isVenue || user?.role === 'ORGANIZER' || user?.role === 'ADMIN';

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/login?redirect=/dashboard');
      } else if (!isCreator) {
        router.push('/');
      }
    }
  }, [isLoading, isAuthenticated, isCreator, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex">
          <div className="hidden lg:block w-64 flex-shrink-0">
            <div className="h-screen bg-gray-900 p-4 space-y-4">
              <Skeleton className="h-8 w-32 bg-gray-700" />
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-full bg-gray-700" />
              ))}
            </div>
          </div>
          <main className="flex-1 p-8">
            <Skeleton className="h-8 w-48 mb-4" />
            <Skeleton className="h-64 w-full" />
          </main>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isCreator) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <span className="text-lg font-semibold text-gray-900">Dashboard</span>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-gray-600 hover:text-gray-900"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 lg:hidden">
            <Sidebar links={sidebarLinks} className="shadow-xl" />
          </div>
        </>
      )}

      <div className="flex">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block fixed inset-y-0 left-0 z-20">
          <Sidebar links={sidebarLinks} />
        </div>

        {/* Main Content */}
        <main className="flex-1 min-h-screen lg:ml-64 pt-14 lg:pt-0">
          {children}
        </main>
      </div>
    </div>
  );
}
