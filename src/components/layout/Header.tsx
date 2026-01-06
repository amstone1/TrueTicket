'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useCartStore } from '@/stores/cartStore';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';
import {
  Menu,
  X,
  ShoppingBag,
  User,
  LogOut,
  LayoutDashboard,
  Ticket,
  Settings,
  QrCode,
  Wallet,
  Receipt,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

const publicLinks = [
  { label: 'Events', href: '/events' },
  { label: 'Resale', href: '/marketplace' },
  { label: 'Demo', href: '/demo' },
];

const authLinks = [
  { label: 'My Tickets', href: '/my-tickets' },
];

export function Header() {
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, logout, displayName, initials, avatarUrl } = useAuth();
  const totalItems = useCartStore((state) => state.getTotalItems());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const isCreator = user?.isArtist || user?.isVenue || user?.role === 'ORGANIZER' || user?.role === 'ADMIN';
  const isAdmin = user?.role === 'ADMIN';

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">TT</span>
            </div>
            <span className="text-xl font-bold text-gray-900 hidden sm:block">TrueTicket</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {publicLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  pathname === link.href
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                )}
              >
                {link.label}
              </Link>
            ))}
            {isAuthenticated && authLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  pathname === link.href
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                )}
              >
                {link.label}
              </Link>
            ))}
            {isCreator && (
              <>
                <Link
                  href="/dashboard"
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    pathname.startsWith('/dashboard')
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  )}
                >
                  Dashboard
                </Link>
                <Link
                  href="/scanner"
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    pathname === '/scanner'
                      ? 'bg-green-50 text-green-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  )}
                >
                  Scanner
                </Link>
              </>
            )}
          </nav>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            {/* Cart */}
            {totalItems > 0 && (
              <Link
                href="/checkout"
                className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ShoppingBag className="w-6 h-6" />
                <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                  {totalItems > 9 ? '9+' : totalItems}
                </span>
              </Link>
            )}

            {/* Auth */}
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
                <div className="w-20 h-4 bg-gray-200 rounded animate-pulse hidden sm:block" />
              </div>
            ) : isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Avatar
                    src={avatarUrl}
                    name={displayName}
                    size="sm"
                  />
                  <span className="hidden sm:block text-sm font-medium text-gray-700 max-w-24 truncate">
                    {displayName}
                  </span>
                  {isAdmin && (
                    <span className="hidden sm:flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                      <ShieldCheck className="w-3 h-3" />
                      Admin
                    </span>
                  )}
                </button>

                {/* User Dropdown */}
                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-20">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900 truncate">{displayName}</p>
                          {isAdmin && (
                            <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                              <ShieldCheck className="w-3 h-3" />
                              Admin
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 truncate">{user?.email}</p>
                        {user?.role && user.role !== 'USER' && (
                          <p className="text-xs text-indigo-600 mt-1 capitalize">{user.role.toLowerCase()}</p>
                        )}
                      </div>

                      {/* Tickets Section */}
                      <div className="py-1 border-b border-gray-100">
                        <p className="px-4 py-1 text-xs font-semibold text-gray-400 uppercase">Tickets</p>
                        <Link
                          href="/my-tickets"
                          className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <Ticket className="w-4 h-4 text-gray-400" />
                          My Tickets
                        </Link>
                        <Link
                          href="/orders"
                          className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <Receipt className="w-4 h-4 text-gray-400" />
                          Order History
                        </Link>
                      </div>

                      {/* Creator Section */}
                      {isCreator && (
                        <div className="py-1 border-b border-gray-100">
                          <p className="px-4 py-1 text-xs font-semibold text-gray-400 uppercase">Creator Tools</p>
                          <Link
                            href="/dashboard"
                            className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            <LayoutDashboard className="w-4 h-4 text-gray-400" />
                            Dashboard
                          </Link>
                          <Link
                            href="/dashboard/events/new"
                            className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            <Sparkles className="w-4 h-4 text-gray-400" />
                            Create Event
                          </Link>
                          <Link
                            href="/scanner"
                            className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            <QrCode className="w-4 h-4 text-gray-400" />
                            Ticket Scanner
                          </Link>
                          <Link
                            href="/royalties"
                            className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            <Wallet className="w-4 h-4 text-gray-400" />
                            Royalties
                          </Link>
                        </div>
                      )}

                      {/* Account Section */}
                      <div className="py-1">
                        <p className="px-4 py-1 text-xs font-semibold text-gray-400 uppercase">Account</p>
                        <Link
                          href="/profile"
                          className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <User className="w-4 h-4 text-gray-400" />
                          Profile
                        </Link>
                        <Link
                          href="/settings"
                          className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <Settings className="w-4 h-4 text-gray-400" />
                          Settings
                        </Link>
                      </div>

                      <div className="border-t border-gray-100 py-1">
                        <button
                          onClick={() => {
                            setUserMenuOpen(false);
                            logout();
                          }}
                          className="flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="text-gray-600 hover:text-gray-900 font-medium text-sm px-3 py-2 transition-colors"
                >
                  Sign In
                </Link>
                <Link href="/register">
                  <Button size="sm">Sign Up</Button>
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-600 hover:text-gray-900"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <nav className="px-4 py-4 space-y-1">
            {publicLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'block px-4 py-3 rounded-lg text-base font-medium',
                  pathname === link.href
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600'
                )}
              >
                {link.label}
              </Link>
            ))}
            {isAuthenticated && authLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'block px-4 py-3 rounded-lg text-base font-medium',
                  pathname === link.href
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600'
                )}
              >
                {link.label}
              </Link>
            ))}
            {isCreator && (
              <>
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'block px-4 py-3 rounded-lg text-base font-medium',
                    pathname.startsWith('/dashboard')
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'text-gray-600'
                  )}
                >
                  Creator Dashboard
                </Link>
                <Link
                  href="/scanner"
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'block px-4 py-3 rounded-lg text-base font-medium',
                    pathname === '/scanner'
                      ? 'bg-green-50 text-green-600'
                      : 'text-gray-600'
                  )}
                >
                  Ticket Scanner
                </Link>
                <Link
                  href="/royalties"
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'block px-4 py-3 rounded-lg text-base font-medium',
                    pathname === '/royalties'
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600'
                  )}
                >
                  Royalties
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
