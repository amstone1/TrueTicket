'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { useCartStore } from '@/stores/cartStore';

export function Header() {
  const { user, isAuthenticated, isLoading, login, logout, displayName, initials } = useAuth();
  const totalItems = useCartStore((state) => state.getTotalItems());

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">TT</span>
            </div>
            <span className="text-xl font-bold text-gray-900">TrueTicket</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              href="/events"
              className="text-gray-600 hover:text-gray-900 font-medium"
            >
              Events
            </Link>
            <Link
              href="/marketplace"
              className="text-gray-600 hover:text-gray-900 font-medium"
            >
              Resale
            </Link>
            {isAuthenticated && (
              <>
                <Link
                  href="/my-tickets"
                  className="text-gray-600 hover:text-gray-900 font-medium"
                >
                  My Tickets
                </Link>
                {user?.isArtist || user?.isVenue ? (
                  <Link
                    href="/creator/dashboard"
                    className="text-gray-600 hover:text-gray-900 font-medium"
                  >
                    Creator Dashboard
                  </Link>
                ) : null}
              </>
            )}
          </nav>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            {/* Cart */}
            {totalItems > 0 && (
              <Link
                href="/checkout"
                className="relative p-2 text-gray-600 hover:text-gray-900"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                  />
                </svg>
                <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {totalItems}
                </span>
              </Link>
            )}

            {/* Auth */}
            {isLoading ? (
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-200 to-purple-200 animate-pulse" />
                <div className="hidden sm:block w-20 h-4 bg-gray-200 rounded animate-pulse" />
              </div>
            ) : isAuthenticated ? (
              <div className="flex items-center space-x-3">
                <Link
                  href="/profile"
                  className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <span className="text-white font-medium text-sm">
                      {initials}
                    </span>
                  </div>
                  <span className="hidden sm:block text-sm font-medium text-gray-700">
                    {displayName}
                  </span>
                </Link>
                <Button variant="ghost" size="sm" onClick={logout}>
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  href="/login"
                  className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
                >
                  Sign In
                </Link>
                <Link href="/register">
                  <Button>Sign Up</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
