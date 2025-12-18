import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">TT</span>
              </div>
              <span className="text-xl font-bold text-white">TrueTicket</span>
            </div>
            <p className="text-sm text-gray-400">
              Fair ticketing for everyone. No scalping, transparent pricing, and artists get paid.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Discover</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/events" className="text-sm hover:text-white">
                  All Events
                </Link>
              </li>
              <li>
                <Link href="/events?category=MUSIC" className="text-sm hover:text-white">
                  Concerts
                </Link>
              </li>
              <li>
                <Link href="/events?category=SPORTS" className="text-sm hover:text-white">
                  Sports
                </Link>
              </li>
              <li>
                <Link href="/marketplace" className="text-sm hover:text-white">
                  Resale Marketplace
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">For Creators</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/dashboard" className="text-sm hover:text-white">
                  Creator Dashboard
                </Link>
              </li>
              <li>
                <Link href="/dashboard/events/new" className="text-sm hover:text-white">
                  Create Event
                </Link>
              </li>
              <li>
                <Link href="/help/pricing" className="text-sm hover:text-white">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/help/resale-rules" className="text-sm hover:text-white">
                  Resale Rules
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Support</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/help" className="text-sm hover:text-white">
                  Help Center
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-sm hover:text-white">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-sm hover:text-white">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-sm hover:text-white">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
          <p>&copy; {new Date().getFullYear()} TrueTicket. All rights reserved.</p>
          <p className="mt-2">
            Fair pricing. Transparent resale. Artists get paid.
          </p>
        </div>
      </div>
    </footer>
  );
}
