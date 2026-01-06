import Link from 'next/link';
import { ArrowLeft, Check, DollarSign } from 'lucide-react';

export default function PricingPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <Link href="/help" className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 mb-8">
        <ArrowLeft className="w-4 h-4" />
        Back to Help Center
      </Link>

      <div className="mb-12">
        <DollarSign className="w-12 h-12 text-indigo-600 mb-4" />
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Pricing & Fees</h1>
        <p className="text-lg text-gray-600">
          Transparent pricing with no hidden fees. Artists and venues get paid fairly.
        </p>
      </div>

      <div className="space-y-8">
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">For Ticket Buyers</h2>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <Check className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <strong>Face value pricing</strong> - You pay what the artist intended
              </div>
            </li>
            <li className="flex items-start gap-3">
              <Check className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <strong>Small service fee (5-10%)</strong> - Covers payment processing and platform costs
              </div>
            </li>
            <li className="flex items-start gap-3">
              <Check className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <strong>No surprise fees at checkout</strong> - Price shown is price paid
              </div>
            </li>
          </ul>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">For Event Creators</h2>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <Check className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <strong>Free to list events</strong> - No upfront costs
              </div>
            </li>
            <li className="flex items-start gap-3">
              <Check className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <strong>2.9% + $0.30 per ticket</strong> - Standard payment processing
              </div>
            </li>
            <li className="flex items-start gap-3">
              <Check className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <strong>Resale royalties</strong> - Earn from secondary market sales
              </div>
            </li>
          </ul>
        </section>

        <section className="bg-indigo-50 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Resale Royalty Split</h2>
          <p className="text-gray-600 mb-4">
            When tickets are resold, a 10% royalty is collected and distributed:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-indigo-600">50%</p>
              <p className="text-sm text-gray-600">Artist</p>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-indigo-600">30%</p>
              <p className="text-sm text-gray-600">Venue</p>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-indigo-600">15%</p>
              <p className="text-sm text-gray-600">Host</p>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-indigo-600">5%</p>
              <p className="text-sm text-gray-600">Platform</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
