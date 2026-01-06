import { FileText } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="mb-12">
        <FileText className="w-12 h-12 text-indigo-600 mb-4" />
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Terms of Service</h1>
        <p className="text-gray-600">Last updated: January 2026</p>
      </div>

      <div className="prose prose-gray max-w-none space-y-8">
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
          <p className="text-gray-600">
            By accessing or using TrueTicket, you agree to be bound by these Terms of Service.
            If you do not agree to these terms, please do not use our service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Service Description</h2>
          <p className="text-gray-600">
            TrueTicket is a ticketing platform that uses blockchain technology and zero-knowledge
            proofs to provide secure, fair, and privacy-preserving ticket sales and transfers.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">3. User Accounts</h2>
          <ul className="list-disc pl-6 text-gray-600 space-y-2">
            <li>You must provide accurate information when creating an account</li>
            <li>You are responsible for maintaining the security of your account</li>
            <li>One person may not maintain multiple accounts</li>
            <li>You must be at least 18 years old to use this service</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Ticket Purchases</h2>
          <ul className="list-disc pl-6 text-gray-600 space-y-2">
            <li>All sales are final unless the event is cancelled</li>
            <li>Tickets are non-fungible tokens (NFTs) representing entry rights</li>
            <li>Ticket validity is subject to event organizer terms</li>
            <li>We do not guarantee entry if you violate venue policies</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Resale Marketplace</h2>
          <ul className="list-disc pl-6 text-gray-600 space-y-2">
            <li>Resale prices are subject to caps set by event organizers</li>
            <li>Royalties are automatically distributed on resale transactions</li>
            <li>Fraudulent listings will result in account termination</li>
            <li>You may only list tickets you legitimately own</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Prohibited Activities</h2>
          <ul className="list-disc pl-6 text-gray-600 space-y-2">
            <li>Using bots or automated tools to purchase tickets</li>
            <li>Attempting to bypass anti-scalping measures</li>
            <li>Creating fake events or fraudulent listings</li>
            <li>Violating intellectual property rights</li>
            <li>Harassing other users or staff</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Biometric Features</h2>
          <p className="text-gray-600">
            If you opt into biometric verification, you consent to face scanning at event entry.
            Biometric data is stored only as cryptographic hashes and cannot be reverse-engineered.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Limitation of Liability</h2>
          <p className="text-gray-600">
            TrueTicket is not liable for event cancellations, venue changes, or performer no-shows.
            Our liability is limited to the ticket purchase price.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">9. Contact</h2>
          <p className="text-gray-600">
            For questions about these terms, contact us at{' '}
            <a href="mailto:legal@trueticket.me" className="text-indigo-600 hover:text-indigo-700">
              legal@trueticket.me
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
