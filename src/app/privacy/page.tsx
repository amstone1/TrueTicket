import { Shield } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="mb-12">
        <Shield className="w-12 h-12 text-indigo-600 mb-4" />
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
        <p className="text-gray-600">Last updated: January 2026</p>
      </div>

      <div className="prose prose-gray max-w-none">
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Our Commitment to Privacy</h2>
          <p className="text-gray-600 mb-4">
            TrueTicket is built with privacy at its core. We use zero-knowledge proofs and
            privacy-preserving technology to protect your personal information while ensuring
            ticket authenticity.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Information We Collect</h2>
          <ul className="list-disc pl-6 text-gray-600 space-y-2">
            <li>Account information (email, name) when you register</li>
            <li>Payment information processed securely through Stripe</li>
            <li>Biometric data (optional) - stored only as cryptographic hashes, never raw data</li>
            <li>Transaction history for your purchases</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">How We Protect Your Data</h2>
          <ul className="list-disc pl-6 text-gray-600 space-y-2">
            <li><strong>Zero-Knowledge Proofs:</strong> Verify ticket ownership without revealing personal details</li>
            <li><strong>Biometric Hashing:</strong> Face data is converted to irreversible hashes using Poseidon</li>
            <li><strong>No Tracking:</strong> Venues only see that a ticket is valid, not who you are</li>
            <li><strong>Encryption:</strong> All data is encrypted in transit and at rest</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Information Sharing</h2>
          <p className="text-gray-600 mb-4">
            We do not sell your personal information. We share data only with:
          </p>
          <ul className="list-disc pl-6 text-gray-600 space-y-2">
            <li>Payment processors (Stripe) to complete transactions</li>
            <li>Event organizers - only necessary booking information</li>
            <li>Law enforcement when legally required</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Rights</h2>
          <ul className="list-disc pl-6 text-gray-600 space-y-2">
            <li>Access your personal data</li>
            <li>Request data deletion</li>
            <li>Opt out of biometric features</li>
            <li>Export your data</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Contact Us</h2>
          <p className="text-gray-600">
            For privacy-related questions, contact us at{' '}
            <a href="mailto:privacy@trueticket.me" className="text-indigo-600 hover:text-indigo-700">
              privacy@trueticket.me
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
