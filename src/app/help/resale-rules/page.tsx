import Link from 'next/link';
import { ArrowLeft, RefreshCw, Shield, TrendingUp, Users } from 'lucide-react';

export default function ResaleRulesPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <Link href="/help" className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 mb-8">
        <ArrowLeft className="w-4 h-4" />
        Back to Help Center
      </Link>

      <div className="mb-12">
        <RefreshCw className="w-12 h-12 text-indigo-600 mb-4" />
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Resale Rules</h1>
        <p className="text-lg text-gray-600">
          Our fair resale marketplace protects fans while ensuring artists get paid.
        </p>
      </div>

      <div className="space-y-8">
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-start gap-4">
            <TrendingUp className="w-8 h-8 text-indigo-600 flex-shrink-0" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Price Caps</h2>
              <p className="text-gray-600 mb-4">
                Resale prices are capped to prevent scalping. Event creators can set:
              </p>
              <ul className="space-y-2 text-gray-600">
                <li><strong>Face value only</strong> - Tickets can only be resold at original price</li>
                <li><strong>Percentage cap</strong> - e.g., max 20% above face value</li>
                <li><strong>Absolute cap</strong> - e.g., max $50 above face value</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-start gap-4">
            <Users className="w-8 h-8 text-indigo-600 flex-shrink-0" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Royalty Distribution</h2>
              <p className="text-gray-600 mb-4">
                Every resale generates royalties for the original stakeholders:
              </p>
              <ul className="space-y-2 text-gray-600">
                <li><strong>10% royalty</strong> on all resale transactions</li>
                <li>Split between artist, venue, and event host</li>
                <li>Transparent, automatic on-chain distribution</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-start gap-4">
            <Shield className="w-8 h-8 text-indigo-600 flex-shrink-0" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Anti-Scalping Protection</h2>
              <p className="text-gray-600 mb-4">
                Built-in protections ensure tickets go to real fans:
              </p>
              <ul className="space-y-2 text-gray-600">
                <li><strong>Biometric binding</strong> - Optional face verification at entry</li>
                <li><strong>Transfer limits</strong> - Configurable max transfers per ticket</li>
                <li><strong>Identity verification</strong> - Prevent bot purchases</li>
                <li><strong>Time-locked transfers</strong> - Prevent last-minute scalping</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="bg-indigo-50 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">How to Resell Your Ticket</h2>
          <ol className="space-y-3 text-gray-600">
            <li><strong>1.</strong> Go to My Tickets and select the ticket you want to sell</li>
            <li><strong>2.</strong> Click "List for Resale" and set your price (within allowed limits)</li>
            <li><strong>3.</strong> Your ticket is listed on our marketplace</li>
            <li><strong>4.</strong> When sold, funds are transferred to you minus fees and royalties</li>
          </ol>
        </section>
      </div>
    </div>
  );
}
