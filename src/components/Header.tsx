'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function Header() {
  const { user, loading, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-red-600';
      case 'ORGANIZER': return 'bg-purple-600';
      case 'VENUE': return 'bg-green-600';
      case 'ARTIST': return 'bg-yellow-600';
      default: return 'bg-blue-600';
    }
  };

  return (
    <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
            TrueTicket
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/events" className="text-gray-400 hover:text-white transition-colors">Events</Link>
            <Link href="/marketplace" className="text-gray-400 hover:text-white transition-colors">Marketplace</Link>
            <Link href="/my-tickets" className="text-gray-400 hover:text-white transition-colors">My Tickets</Link>

            {user && ['ORGANIZER', 'VENUE', 'ARTIST', 'ADMIN'].includes(user.role) && (
              <>
                <Link href="/creator" className="text-gray-400 hover:text-white transition-colors">Creator</Link>
                <Link href="/royalties" className="text-gray-400 hover:text-white transition-colors">Royalties</Link>
              </>
            )}

            {user && ['VENUE', 'ORGANIZER', 'ADMIN'].includes(user.role) && (
              <Link href="/scanner" className="text-gray-400 hover:text-white transition-colors">Scanner</Link>
            )}

            <div className="h-6 w-px bg-gray-700" />

            {loading ? (
              <div className="w-8 h-8 rounded-full bg-gray-700 animate-pulse" />
            ) : user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-sm font-bold">
                    {user.displayName?.charAt(0) || user.email.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm text-gray-300 hidden lg:block">{user.displayName || user.email}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${getRoleColor(user.role)} hidden lg:block`}>
                    {user.role}
                  </span>
                </button>

                {showUserMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowUserMenu(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-gray-900 border border-gray-700 rounded-xl shadow-lg z-20 py-2">
                      <div className="px-4 py-2 border-b border-gray-700">
                        <p className="font-medium">{user.displayName}</p>
                        <p className="text-sm text-gray-400">{user.email}</p>
                        <span className={`text-xs px-2 py-0.5 rounded ${getRoleColor(user.role)} mt-1 inline-block`}>
                          {user.role}
                        </span>
                      </div>
                      <Link
                        href="/profile"
                        className="block px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-800"
                        onClick={() => setShowUserMenu(false)}
                      >
                        Profile Settings
                      </Link>
                      <Link
                        href="/my-tickets"
                        className="block px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-800"
                        onClick={() => setShowUserMenu(false)}
                      >
                        My Tickets
                      </Link>
                      {['ORGANIZER', 'VENUE', 'ARTIST', 'ADMIN'].includes(user.role) && (
                        <Link
                          href="/royalties"
                          className="block px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-800"
                          onClick={() => setShowUserMenu(false)}
                        >
                          Royalties & Earnings
                        </Link>
                      )}
                      <div className="border-t border-gray-700 mt-2 pt-2">
                        <button
                          onClick={() => {
                            setShowUserMenu(false);
                            logout();
                          }}
                          className="block w-full text-left px-4 py-2 text-red-400 hover:text-red-300 hover:bg-gray-800"
                        >
                          Sign Out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                <Link href="/login" className="text-gray-400 hover:text-white transition-colors">Sign In</Link>
                <Link href="/register" className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg font-medium transition-colors">
                  Sign Up
                </Link>
              </>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-gray-400 hover:text-white"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
          >
            {showMobileMenu ? '✕' : '☰'}
          </button>
        </div>

        {/* Mobile Navigation */}
        {showMobileMenu && (
          <nav className="md:hidden mt-4 pb-4 border-t border-gray-800 pt-4 space-y-2">
            <Link href="/events" className="block py-2 text-gray-400 hover:text-white" onClick={() => setShowMobileMenu(false)}>Events</Link>
            <Link href="/marketplace" className="block py-2 text-gray-400 hover:text-white" onClick={() => setShowMobileMenu(false)}>Marketplace</Link>
            <Link href="/my-tickets" className="block py-2 text-gray-400 hover:text-white" onClick={() => setShowMobileMenu(false)}>My Tickets</Link>
            <Link href="/creator" className="block py-2 text-gray-400 hover:text-white" onClick={() => setShowMobileMenu(false)}>Creator</Link>
            <Link href="/royalties" className="block py-2 text-gray-400 hover:text-white" onClick={() => setShowMobileMenu(false)}>Royalties</Link>
            <Link href="/scanner" className="block py-2 text-gray-400 hover:text-white" onClick={() => setShowMobileMenu(false)}>Scanner</Link>

            <div className="border-t border-gray-800 pt-4 mt-4">
              {user ? (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-sm font-bold">
                      {user.displayName?.charAt(0) || '?'}
                    </div>
                    <div>
                      <p className="font-medium">{user.displayName}</p>
                      <span className={`text-xs px-2 py-0.5 rounded ${getRoleColor(user.role)}`}>
                        {user.role}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowMobileMenu(false);
                      logout();
                    }}
                    className="w-full text-left py-2 text-red-400 hover:text-red-300"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <div className="flex flex-col gap-2">
                  <Link
                    href="/login"
                    className="block py-2 text-center border border-gray-700 rounded-lg hover:bg-gray-800"
                    onClick={() => setShowMobileMenu(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    className="block py-2 text-center bg-purple-600 hover:bg-purple-700 rounded-lg font-medium"
                    onClick={() => setShowMobileMenu(false)}
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
