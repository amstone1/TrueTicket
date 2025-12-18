'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface EventEarning {
  id: string;
  name: string;
  slug: string;
  startDate: string;
  status: string;
  ticketsSold: number;
  totalCapacity: number;
  primarySales: number;
  resaleRoyalties: number;
  totalEarnings: number;
  resaleRoyaltyBps: number;
}

interface Transaction {
  id: string;
  type: 'PRIMARY_SALE' | 'ROYALTY';
  eventName: string;
  tierName: string;
  amount: number;
  buyerName: string;
  date: string;
}

interface Payout {
  id: string;
  amount: number;
  status: string;
  method: string;
  date: string;
  processedAt: string | null;
}

interface RoyaltyData {
  user: {
    id: string;
    displayName: string;
    walletAddress: string;
    role: string;
  };
  earnings: {
    primarySales: number;
    resaleRoyalties: number;
    totalEarnings: number;
    pendingPayout: number;
    paidOut: number;
  };
  events: EventEarning[];
  recentTransactions: Transaction[];
  payouts: Payout[];
}

export default function RoyaltiesPage() {
  const [walletAddress, setWalletAddress] = useState('');
  const [data, setData] = useState<RoyaltyData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'transactions' | 'payouts'>('overview');
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutMethod, setPayoutMethod] = useState('CRYPTO_USDC');

  const fetchRoyalties = async () => {
    if (!walletAddress) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/royalties?wallet=${walletAddress}`);
      const result = await res.json();
      setData(result);
    } catch (error) {
      console.error('Error fetching royalties:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (walletAddress) {
      fetchRoyalties();
    }
  }, [walletAddress]);

  const handleRequestPayout = async () => {
    if (!payoutAmount || parseFloat(payoutAmount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    try {
      const res = await fetch('/api/royalties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          amount: parseFloat(payoutAmount),
          method: payoutMethod,
        }),
      });

      if (res.ok) {
        alert('Payout request submitted successfully!');
        setShowPayoutModal(false);
        setPayoutAmount('');
        fetchRoyalties();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to request payout');
      }
    } catch (error) {
      alert('Failed to request payout');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const availableForPayout = data
    ? data.earnings.totalEarnings - data.earnings.paidOut - data.earnings.pendingPayout
    : 0;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
              TrueTicket Royalties
            </Link>
            <nav className="flex items-center gap-4">
              <Link href="/creator" className="text-gray-400 hover:text-white">Creator Dashboard</Link>
              <Link href="/events" className="text-gray-400 hover:text-white">Events</Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Royalties & Earnings</h1>
          <p className="text-gray-400">Track your earnings from ticket sales and resale royalties</p>
        </div>

        {/* Wallet Input */}
        {!data && (
          <div className="bg-gray-800/50 rounded-xl p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">Connect Your Wallet</h2>
            <div className="flex gap-3 mb-4">
              <input
                type="text"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="Enter your wallet address..."
                className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500"
              />
              <button
                onClick={fetchRoyalties}
                disabled={loading || !walletAddress}
                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 px-6 py-3 rounded-lg font-medium"
              >
                {loading ? 'Loading...' : 'View Earnings'}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setWalletAddress('0x70997970C51812dc3A010C7d01b50e0d17dc79C8')}
                className="bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded-lg text-sm"
              >
                Demo: Venue Wallet
              </button>
              <button
                onClick={() => setWalletAddress('0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC')}
                className="bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded-lg text-sm"
              >
                Demo: Artist Wallet
              </button>
            </div>
          </div>
        )}

        {data && (
          <>
            {/* User Info */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center text-xl font-bold">
                  {data.user.displayName?.charAt(0) || '?'}
                </div>
                <div>
                  <h2 className="font-bold">{data.user.displayName || 'Unknown'}</h2>
                  <p className="text-gray-400 text-sm font-mono">{data.user.walletAddress.slice(0, 6)}...{data.user.walletAddress.slice(-4)}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  data.user.role === 'ADMIN' ? 'bg-red-600' :
                  data.user.role === 'ORGANIZER' ? 'bg-purple-600' :
                  data.user.role === 'VENUE' ? 'bg-green-600' :
                  data.user.role === 'ARTIST' ? 'bg-yellow-600' : 'bg-gray-600'
                }`}>
                  {data.user.role}
                </span>
              </div>
              <button
                onClick={() => {
                  setData(null);
                  setWalletAddress('');
                }}
                className="text-gray-400 hover:text-white text-sm"
              >
                Switch Wallet
              </button>
            </div>

            {/* Earnings Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
              <div className="bg-gradient-to-br from-green-900/50 to-green-800/30 border border-green-700/50 rounded-xl p-6">
                <p className="text-green-400 text-sm mb-1">Primary Sales</p>
                <p className="text-2xl font-bold">{formatCurrency(data.earnings.primarySales)}</p>
              </div>
              <div className="bg-gradient-to-br from-yellow-900/50 to-yellow-800/30 border border-yellow-700/50 rounded-xl p-6">
                <p className="text-yellow-400 text-sm mb-1">Resale Royalties</p>
                <p className="text-2xl font-bold">{formatCurrency(data.earnings.resaleRoyalties)}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-900/50 to-purple-800/30 border border-purple-700/50 rounded-xl p-6">
                <p className="text-purple-400 text-sm mb-1">Total Earnings</p>
                <p className="text-2xl font-bold">{formatCurrency(data.earnings.totalEarnings)}</p>
              </div>
              <div className="bg-gradient-to-br from-blue-900/50 to-blue-800/30 border border-blue-700/50 rounded-xl p-6">
                <p className="text-blue-400 text-sm mb-1">Available to Withdraw</p>
                <p className="text-2xl font-bold">{formatCurrency(availableForPayout)}</p>
              </div>
              <div className="bg-gradient-to-br from-gray-800/50 to-gray-700/30 border border-gray-600/50 rounded-xl p-6">
                <p className="text-gray-400 text-sm mb-1">Paid Out</p>
                <p className="text-2xl font-bold">{formatCurrency(data.earnings.paidOut)}</p>
              </div>
            </div>

            {/* Request Payout Button */}
            {availableForPayout > 0 && (
              <div className="bg-purple-900/20 border border-purple-700 rounded-xl p-4 mb-8 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-purple-300">Ready to withdraw?</h3>
                  <p className="text-gray-400 text-sm">You have {formatCurrency(availableForPayout)} available for payout</p>
                </div>
                <button
                  onClick={() => setShowPayoutModal(true)}
                  className="bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-lg font-bold"
                >
                  Request Payout
                </button>
              </div>
            )}

            {/* Tabs */}
            <div className="flex border-b border-gray-700 mb-6">
              {(['overview', 'events', 'transactions', 'payouts'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-3 font-medium transition-colors ${
                    activeTab === tab
                      ? 'text-purple-400 border-b-2 border-purple-400'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <div className="grid md:grid-cols-2 gap-6">
                {/* How Royalties Work */}
                <div className="bg-gray-800/50 rounded-xl p-6">
                  <h3 className="font-bold mb-4">How Royalties Work</h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-green-600/20 rounded-lg flex items-center justify-center shrink-0">
                        <span>1</span>
                      </div>
                      <div>
                        <p className="font-medium">Primary Sales</p>
                        <p className="text-gray-400 text-sm">You earn the ticket price minus platform fees (typically 5%) on every primary sale.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-yellow-600/20 rounded-lg flex items-center justify-center shrink-0">
                        <span>2</span>
                      </div>
                      <div>
                        <p className="font-medium">Resale Royalties</p>
                        <p className="text-gray-400 text-sm">When fans resell tickets, you automatically receive a percentage of the resale price (set per event).</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-purple-600/20 rounded-lg flex items-center justify-center shrink-0">
                        <span>3</span>
                      </div>
                      <div>
                        <p className="font-medium">Automatic Distribution</p>
                        <p className="text-gray-400 text-sm">Smart contracts automatically distribute royalties - no chasing payments or manual splits.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-gray-800/50 rounded-xl p-6">
                  <h3 className="font-bold mb-4">Recent Activity</h3>
                  {data.recentTransactions.length > 0 ? (
                    <div className="space-y-3">
                      {data.recentTransactions.slice(0, 5).map((tx) => (
                        <div key={tx.id} className="flex items-center justify-between py-2 border-b border-gray-700 last:border-0">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              tx.type === 'PRIMARY_SALE' ? 'bg-green-600/20' : 'bg-yellow-600/20'
                            }`}>
                              {tx.type === 'PRIMARY_SALE' ? '🎫' : '💰'}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{tx.eventName}</p>
                              <p className="text-gray-500 text-xs">{tx.tierName} - {tx.buyerName}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-medium ${tx.type === 'PRIMARY_SALE' ? 'text-green-400' : 'text-yellow-400'}`}>
                              +{formatCurrency(tx.amount)}
                            </p>
                            <p className="text-gray-500 text-xs">{formatDateTime(tx.date)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">No recent transactions</p>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'events' && (
              <div className="bg-gray-800/50 rounded-xl overflow-hidden">
                {data.events.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-900">
                        <tr>
                          <th className="text-left p-4 font-medium text-gray-400">Event</th>
                          <th className="text-left p-4 font-medium text-gray-400">Date</th>
                          <th className="text-right p-4 font-medium text-gray-400">Sold</th>
                          <th className="text-right p-4 font-medium text-gray-400">Primary</th>
                          <th className="text-right p-4 font-medium text-gray-400">Royalties</th>
                          <th className="text-right p-4 font-medium text-gray-400">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.events.map((event) => (
                          <tr key={event.id} className="border-t border-gray-700 hover:bg-gray-800/50">
                            <td className="p-4">
                              <Link href={`/events/${event.slug}`} className="font-medium hover:text-purple-400">
                                {event.name}
                              </Link>
                              <p className="text-gray-500 text-xs mt-1">
                                {event.resaleRoyaltyBps / 100}% royalty on resales
                              </p>
                            </td>
                            <td className="p-4 text-gray-400">{formatDate(event.startDate)}</td>
                            <td className="p-4 text-right">
                              {event.ticketsSold} / {event.totalCapacity}
                            </td>
                            <td className="p-4 text-right text-green-400">{formatCurrency(event.primarySales)}</td>
                            <td className="p-4 text-right text-yellow-400">{formatCurrency(event.resaleRoyalties)}</td>
                            <td className="p-4 text-right font-bold">{formatCurrency(event.totalEarnings)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-900">
                        <tr>
                          <td colSpan={3} className="p-4 font-bold">Total</td>
                          <td className="p-4 text-right font-bold text-green-400">{formatCurrency(data.earnings.primarySales)}</td>
                          <td className="p-4 text-right font-bold text-yellow-400">{formatCurrency(data.earnings.resaleRoyalties)}</td>
                          <td className="p-4 text-right font-bold text-purple-400">{formatCurrency(data.earnings.totalEarnings)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <div className="text-6xl mb-4">📅</div>
                    <h3 className="text-xl font-semibold mb-2">No events yet</h3>
                    <p className="text-gray-400 mb-4">Create your first event to start earning</p>
                    <Link href="/creator" className="text-purple-400 hover:underline">
                      Go to Creator Dashboard →
                    </Link>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'transactions' && (
              <div className="bg-gray-800/50 rounded-xl overflow-hidden">
                {data.recentTransactions.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-900">
                        <tr>
                          <th className="text-left p-4 font-medium text-gray-400">Type</th>
                          <th className="text-left p-4 font-medium text-gray-400">Event</th>
                          <th className="text-left p-4 font-medium text-gray-400">Tier</th>
                          <th className="text-left p-4 font-medium text-gray-400">Buyer</th>
                          <th className="text-right p-4 font-medium text-gray-400">Amount</th>
                          <th className="text-right p-4 font-medium text-gray-400">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.recentTransactions.map((tx) => (
                          <tr key={tx.id} className="border-t border-gray-700 hover:bg-gray-800/50">
                            <td className="p-4">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                tx.type === 'PRIMARY_SALE' ? 'bg-green-600' : 'bg-yellow-600'
                              }`}>
                                {tx.type === 'PRIMARY_SALE' ? 'Sale' : 'Royalty'}
                              </span>
                            </td>
                            <td className="p-4">{tx.eventName}</td>
                            <td className="p-4 text-gray-400">{tx.tierName}</td>
                            <td className="p-4 text-gray-400">{tx.buyerName}</td>
                            <td className="p-4 text-right font-medium text-green-400">+{formatCurrency(tx.amount)}</td>
                            <td className="p-4 text-right text-gray-400">{formatDateTime(tx.date)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <div className="text-6xl mb-4">📊</div>
                    <h3 className="text-xl font-semibold mb-2">No transactions yet</h3>
                    <p className="text-gray-400">Transactions will appear here when you make sales</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'payouts' && (
              <div className="bg-gray-800/50 rounded-xl overflow-hidden">
                {data.payouts.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-900">
                        <tr>
                          <th className="text-left p-4 font-medium text-gray-400">ID</th>
                          <th className="text-left p-4 font-medium text-gray-400">Method</th>
                          <th className="text-right p-4 font-medium text-gray-400">Amount</th>
                          <th className="text-left p-4 font-medium text-gray-400">Status</th>
                          <th className="text-right p-4 font-medium text-gray-400">Requested</th>
                          <th className="text-right p-4 font-medium text-gray-400">Processed</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.payouts.map((payout) => (
                          <tr key={payout.id} className="border-t border-gray-700 hover:bg-gray-800/50">
                            <td className="p-4 font-mono text-sm">{payout.id.slice(0, 8)}...</td>
                            <td className="p-4">{payout.method.replace('_', ' ')}</td>
                            <td className="p-4 text-right font-medium">{formatCurrency(payout.amount)}</td>
                            <td className="p-4">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                payout.status === 'COMPLETED' ? 'bg-green-600' :
                                payout.status === 'PENDING' ? 'bg-yellow-600' :
                                payout.status === 'PROCESSING' ? 'bg-blue-600' : 'bg-red-600'
                              }`}>
                                {payout.status}
                              </span>
                            </td>
                            <td className="p-4 text-right text-gray-400">{formatDateTime(payout.date)}</td>
                            <td className="p-4 text-right text-gray-400">
                              {payout.processedAt ? formatDateTime(payout.processedAt) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <div className="text-6xl mb-4">💳</div>
                    <h3 className="text-xl font-semibold mb-2">No payouts yet</h3>
                    <p className="text-gray-400">Request a payout when you have earnings available</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Payout Modal */}
      {showPayoutModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowPayoutModal(false)}>
          <div className="bg-gray-900 rounded-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold mb-4">Request Payout</h2>

            <div className="bg-gray-800 rounded-lg p-4 mb-4">
              <p className="text-gray-400 text-sm mb-1">Available Balance</p>
              <p className="text-2xl font-bold text-green-400">{formatCurrency(availableForPayout)}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Amount (USD)</label>
                <input
                  type="number"
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  max={availableForPayout}
                  step="0.01"
                  placeholder="0.00"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Payout Method</label>
                <select
                  value={payoutMethod}
                  onChange={(e) => setPayoutMethod(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500"
                >
                  <option value="CRYPTO_USDC">USDC (Polygon)</option>
                  <option value="CRYPTO_MATIC">MATIC (Polygon)</option>
                  <option value="BANK_TRANSFER">Bank Transfer (ACH)</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleRequestPayout}
                disabled={!payoutAmount || parseFloat(payoutAmount) <= 0 || parseFloat(payoutAmount) > availableForPayout}
                className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed py-3 rounded-lg font-bold"
              >
                Request Payout
              </button>
              <button
                onClick={() => setShowPayoutModal(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 py-3 rounded-lg font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
