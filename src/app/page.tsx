'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

export default function HomePage() {
  const { user, isAuthenticated, isLoading, logout, displayName, initials } = useAuth();

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
              TrueTicket
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/events" className="text-gray-400 hover:text-white transition-colors">Events</Link>
              <Link href="/marketplace" className="text-gray-400 hover:text-white transition-colors">Marketplace</Link>
              {isAuthenticated && (
                <>
                  <Link href="/my-tickets" className="text-gray-400 hover:text-white transition-colors">My Tickets</Link>
                  <Link href="/creator" className="text-gray-400 hover:text-white transition-colors">Creator</Link>
                  <Link href="/royalties" className="text-gray-400 hover:text-white transition-colors">Royalties</Link>
                </>
              )}
              <Link href="/scanner" className="text-gray-400 hover:text-white transition-colors">Scanner</Link>
              <div className="h-6 w-px bg-gray-700" />
              {isLoading ? (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500/30 to-pink-500/30 animate-pulse" />
                  <div className="w-16 h-4 bg-gray-700 rounded animate-pulse" />
                </div>
              ) : isAuthenticated ? (
                <div className="flex items-center gap-4">
                  <Link href="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <span className="text-white font-medium text-sm">{initials}</span>
                    </div>
                    <span className="text-white font-medium">{displayName}</span>
                  </Link>
                  <button
                    onClick={() => logout()}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <>
                  <Link href="/login" className="text-gray-400 hover:text-white transition-colors">Sign In</Link>
                  <Link href="/register" className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg font-medium transition-colors">Sign Up</Link>
                </>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/50 via-gray-900 to-pink-900/30" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM5QzkyQUMiIGZpbGwtb3BhY2l0eT0iMC4wNCI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />

        <div className="relative max-w-7xl mx-auto px-4 py-24 lg:py-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-purple-900/50 border border-purple-700 rounded-full px-4 py-2 mb-6">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-sm text-purple-200">Built on Polygon - Low fees, fast transactions</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              Fair Tickets.
              <br />
              <span className="bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                Real Prices.
              </span>
            </h1>
            <p className="text-xl text-gray-300 mb-8 leading-relaxed">
              TrueTicket protects fans from scalping with smart contract-enforced price caps.
              Artists and venues earn royalties on every resale. No bots. No scalpers. Just fair access to events.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/events"
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-8 py-4 rounded-xl font-bold text-lg text-center transition-all transform hover:scale-105"
              >
                Browse Events
              </Link>
              <Link
                href="/creator"
                className="border border-gray-700 hover:border-purple-500 bg-gray-800/50 hover:bg-gray-800 px-8 py-4 rounded-xl font-bold text-lg text-center transition-all"
              >
                Create Event
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How TrueTicket Works</h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Blockchain-powered ticketing that's invisible to users but revolutionary for fairness
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 hover:border-purple-500 transition-colors">
              <div className="w-14 h-14 bg-purple-600/20 rounded-xl flex items-center justify-center mb-4">
                <span className="text-2xl">🎫</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Buy Tickets</h3>
              <p className="text-gray-400">
                Purchase tickets at face value. Each ticket is an NFT on Polygon - but you just see a simple ticket.
              </p>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 hover:border-purple-500 transition-colors">
              <div className="w-14 h-14 bg-green-600/20 rounded-xl flex items-center justify-center mb-4">
                <span className="text-2xl">🛡️</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Price Protection</h3>
              <p className="text-gray-400">
                Resale prices are capped by smart contracts. Scalpers can't charge 10x - the blockchain won't allow it.
              </p>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 hover:border-purple-500 transition-colors">
              <div className="w-14 h-14 bg-yellow-600/20 rounded-xl flex items-center justify-center mb-4">
                <span className="text-2xl">💰</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Artist Royalties</h3>
              <p className="text-gray-400">
                Artists, venues, and hosts earn royalties on every resale. Fair compensation, automatically distributed.
              </p>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 hover:border-purple-500 transition-colors">
              <div className="w-14 h-14 bg-pink-600/20 rounded-xl flex items-center justify-center mb-4">
                <span className="text-2xl">📱</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Easy Check-in</h3>
              <p className="text-gray-400">
                QR codes verified on-chain. No fake tickets, no duplicates. Venues scan and attendees are checked in instantly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* User Types */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">For Everyone in the Ecosystem</h2>
            <p className="text-lg text-gray-400">Different tools for different needs</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            <Link href="/events" className="group bg-gradient-to-br from-blue-900/50 to-blue-800/30 border border-blue-700/50 rounded-2xl p-6 hover:border-blue-500 transition-all">
              <div className="text-4xl mb-4">🎭</div>
              <h3 className="text-xl font-bold mb-2 group-hover:text-blue-400 transition-colors">Fans</h3>
              <p className="text-gray-400 text-sm mb-4">Browse events, buy tickets at fair prices, resell without scalper markups</p>
              <span className="text-blue-400 text-sm font-medium">Browse Events →</span>
            </Link>

            <Link href="/creator" className="group bg-gradient-to-br from-purple-900/50 to-purple-800/30 border border-purple-700/50 rounded-2xl p-6 hover:border-purple-500 transition-all">
              <div className="text-4xl mb-4">🎤</div>
              <h3 className="text-xl font-bold mb-2 group-hover:text-purple-400 transition-colors">Creators</h3>
              <p className="text-gray-400 text-sm mb-4">Create events, set resale rules, earn royalties on secondary sales</p>
              <span className="text-purple-400 text-sm font-medium">Creator Dashboard →</span>
            </Link>

            <Link href="/scanner" className="group bg-gradient-to-br from-green-900/50 to-green-800/30 border border-green-700/50 rounded-2xl p-6 hover:border-green-500 transition-all">
              <div className="text-4xl mb-4">🏟️</div>
              <h3 className="text-xl font-bold mb-2 group-hover:text-green-400 transition-colors">Venues</h3>
              <p className="text-gray-400 text-sm mb-4">Scan tickets, track check-ins in real-time, prevent fraud</p>
              <span className="text-green-400 text-sm font-medium">Open Scanner →</span>
            </Link>

            <Link href="/marketplace" className="group bg-gradient-to-br from-pink-900/50 to-pink-800/30 border border-pink-700/50 rounded-2xl p-6 hover:border-pink-500 transition-all">
              <div className="text-4xl mb-4">🏪</div>
              <h3 className="text-xl font-bold mb-2 group-hover:text-pink-400 transition-colors">Resellers</h3>
              <p className="text-gray-400 text-sm mb-4">List and buy tickets on the fair marketplace with price caps</p>
              <span className="text-pink-400 text-sm font-medium">View Marketplace →</span>
            </Link>

            <Link href="/royalties" className="group bg-gradient-to-br from-yellow-900/50 to-yellow-800/30 border border-yellow-700/50 rounded-2xl p-6 hover:border-yellow-500 transition-all">
              <div className="text-4xl mb-4">🎤</div>
              <h3 className="text-xl font-bold mb-2 group-hover:text-yellow-400 transition-colors">Artists</h3>
              <p className="text-gray-400 text-sm mb-4">Track royalties from primary sales and secondary resales</p>
              <span className="text-yellow-400 text-sm font-medium">View Royalties →</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-gray-900/50 border-y border-gray-800">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-4xl font-bold text-purple-400">0%</p>
              <p className="text-gray-400 mt-1">Bot Purchases</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-green-400">10%</p>
              <p className="text-gray-400 mt-1">Max Resale Markup</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-yellow-400">$0</p>
              <p className="text-gray-400 mt-1">Gas Fees for Users</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-pink-400">100%</p>
              <p className="text-gray-400 mt-1">Ticket Authenticity</p>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 border border-purple-700/50 rounded-2xl p-8 md:p-12">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-bold mb-4">Try the Demo</h2>
              <p className="text-gray-300 mb-6">
                This is a fully functional demo running on a local Hardhat blockchain.
                Browse events, buy tickets, scan them at the venue, and see the anti-scalping
                protection in action.
              </p>
              <div className="bg-gray-900/50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-400 mb-2">Demo Wallets:</p>
                <code className="text-xs text-purple-300 block">Alice (Fan): 0x90F79bf6EB2c4f870365E785982E1f101E93b906</code>
                <code className="text-xs text-green-300 block mt-1">Bob (Fan): 0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65</code>
                <code className="text-xs text-yellow-300 block mt-1">Venue: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8</code>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/events" className="bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-lg font-medium transition-colors">
                  Browse Events
                </Link>
                <Link href="/my-tickets?wallet=0x90F79bf6EB2c4f870365E785982E1f101E93b906" className="bg-gray-700 hover:bg-gray-600 px-6 py-3 rounded-lg font-medium transition-colors">
                  View Alice's Tickets
                </Link>
                <Link href="/demo" className="bg-gray-700 hover:bg-gray-600 px-6 py-3 rounded-lg font-medium transition-colors">
                  NFT Viewer (Blockchain)
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
              TrueTicket
            </div>
            <p className="text-gray-500 text-sm">
              Fair ticketing powered by blockchain. No scalping, just fans.
            </p>
            <div className="flex gap-6">
              <Link href="/events" className="text-gray-400 hover:text-white text-sm">Events</Link>
              <Link href="/marketplace" className="text-gray-400 hover:text-white text-sm">Marketplace</Link>
              <Link href="/creator" className="text-gray-400 hover:text-white text-sm">Creator</Link>
              <Link href="/royalties" className="text-gray-400 hover:text-white text-sm">Royalties</Link>
              <Link href="/scanner" className="text-gray-400 hover:text-white text-sm">Scanner</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
