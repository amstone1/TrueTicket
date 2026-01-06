import Link from 'next/link';
import { HelpCircle, CreditCard, RefreshCw, Shield, Mail, MessageSquare } from 'lucide-react';

export default function HelpPage() {
  const topics = [
    {
      icon: CreditCard,
      title: 'Pricing & Fees',
      description: 'Learn about our transparent pricing structure',
      href: '/help/pricing',
    },
    {
      icon: RefreshCw,
      title: 'Resale Rules',
      description: 'How our fair resale marketplace works',
      href: '/help/resale-rules',
    },
    {
      icon: Shield,
      title: 'Security & Privacy',
      description: 'How we protect your data with zero-knowledge proofs',
      href: '/demo',
    },
    {
      icon: MessageSquare,
      title: 'Contact Support',
      description: 'Get help from our team',
      href: '/contact',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <HelpCircle className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Help Center</h1>
        <p className="text-lg text-gray-600">
          Find answers to common questions about TrueTicket
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-12">
        {topics.map((topic) => (
          <Link
            key={topic.title}
            href={topic.href}
            className="block p-6 bg-white rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all"
          >
            <topic.icon className="w-8 h-8 text-indigo-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{topic.title}</h3>
            <p className="text-gray-600">{topic.description}</p>
          </Link>
        ))}
      </div>

      <div className="bg-indigo-50 rounded-xl p-8 text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Still need help?</h2>
        <p className="text-gray-600 mb-4">Our support team is here to assist you</p>
        <Link
          href="/contact"
          className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
        >
          <Mail className="w-4 h-4" />
          Contact Us
        </Link>
      </div>
    </div>
  );
}
