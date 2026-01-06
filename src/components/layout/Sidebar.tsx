'use client';

import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Calendar,
  Wallet,
  Settings,
  Plus,
  BarChart3,
  QrCode,
  Ticket,
} from 'lucide-react';

export interface SidebarLink {
  label: string;
  href: string;
  icon: ReactNode;
  badge?: string | number;
}

const creatorLinks: SidebarLink[] = [
  { label: 'Overview', href: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  { label: 'My Events', href: '/dashboard/events', icon: <Calendar className="w-5 h-5" /> },
  { label: 'Tickets Sold', href: '/dashboard/tickets', icon: <Ticket className="w-5 h-5" /> },
  { label: 'Analytics', href: '/dashboard/analytics', icon: <BarChart3 className="w-5 h-5" /> },
  { label: 'Royalties', href: '/royalties', icon: <Wallet className="w-5 h-5" /> },
  { label: 'Scanner', href: '/scanner', icon: <QrCode className="w-5 h-5" /> },
  { label: 'Settings', href: '/settings', icon: <Settings className="w-5 h-5" /> },
];

export interface SidebarProps {
  links?: SidebarLink[];
  className?: string;
}

export function Sidebar({ links = creatorLinks, className }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className={cn('w-64 bg-white border-r border-gray-200 min-h-screen', className)}>
      <div className="p-4">
        {/* Create Event Button */}
        <Link
          href="/dashboard/events/new"
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Event
        </Link>
      </div>

      {/* Navigation */}
      <nav className="px-3 py-2">
        <ul className="space-y-1">
          {links.map((link) => {
            const isActive = pathname === link.href ||
              (link.href !== '/dashboard' && link.href !== '/royalties' && link.href !== '/scanner' && link.href !== '/settings' && pathname.startsWith(link.href));

            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'text-gray-700 hover:bg-gray-50'
                  )}
                >
                  <span className={isActive ? 'text-indigo-600' : 'text-gray-400'}>
                    {link.icon}
                  </span>
                  {link.label}
                  {link.badge && (
                    <span className="ml-auto bg-indigo-100 text-indigo-600 text-xs font-medium px-2 py-0.5 rounded-full">
                      {link.badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}

// Mobile-friendly sidebar wrapper
export function MobileSidebar({
  isOpen,
  onClose,
  links = creatorLinks,
}: {
  isOpen: boolean;
  onClose: () => void;
  links?: SidebarLink[];
}) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        onClick={onClose}
      />
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 lg:hidden">
        <Sidebar links={links} className="shadow-xl" />
      </div>
    </>
  );
}
