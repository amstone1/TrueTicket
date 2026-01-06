'use client';

import { useState } from 'react';
import { Mail, MessageSquare, Clock, Send } from 'lucide-react';

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <MessageSquare className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Contact Us</h1>
        <p className="text-lg text-gray-600">
          Have a question or need help? We are here for you.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
          <Mail className="w-8 h-8 text-indigo-600 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-900 mb-1">Email</h3>
          <p className="text-gray-600 text-sm">support@trueticket.me</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
          <Clock className="w-8 h-8 text-indigo-600 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-900 mb-1">Response Time</h3>
          <p className="text-gray-600 text-sm">Within 24 hours</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
          <MessageSquare className="w-8 h-8 text-indigo-600 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-900 mb-1">Live Chat</h3>
          <p className="text-gray-600 text-sm">Coming soon</p>
        </div>
      </div>

      {submitted ? (
        <div className="bg-green-50 rounded-xl p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Send className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Message Sent!</h2>
          <p className="text-gray-600">We will get back to you within 24 hours.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-8">
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
              <input
                type="text"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="your@email.com"
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
            <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
              <option>General Inquiry</option>
              <option>Ticket Issue</option>
              <option>Refund Request</option>
              <option>Event Creator Support</option>
              <option>Technical Issue</option>
              <option>Other</option>
            </select>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
            <textarea
              rows={5}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="How can we help you?"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            Send Message
          </button>
        </form>
      )}
    </div>
  );
}
