'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [lockoutEnds, setLockoutEnds] = useState<Date | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });

  // Check for messages from other pages
  const message = searchParams.get('message');
  const returnTo = searchParams.get('returnTo') || '/my-tickets';

  // Countdown for lockout
  useEffect(() => {
    if (!lockoutEnds) return;

    const interval = setInterval(() => {
      const now = new Date();
      if (now >= lockoutEnds) {
        setLockoutEnds(null);
        setError('');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lockoutEnds]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.lockoutEnds) {
          setLockoutEnds(new Date(data.lockoutEnds));
        }
        if (data.remainingAttempts !== undefined) {
          setRemainingAttempts(data.remainingAttempts);
        }
        setError(data.error || 'Login failed');
        return;
      }

      // Success - redirect
      router.push(returnTo);
      router.refresh();

    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getLockoutTimeRemaining = () => {
    if (!lockoutEnds) return '';
    const now = new Date();
    const diff = lockoutEnds.getTime() - now.getTime();
    if (diff <= 0) return '';
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
              TrueTicket
            </Link>
            <nav className="flex items-center gap-4">
              <Link href="/register" className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg font-medium">
                Sign Up
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome Back</h1>
          <p className="text-gray-400">Sign in to your TrueTicket account</p>
        </div>

        <div className="bg-gray-900 rounded-2xl p-6">
          {/* Success/Info Messages */}
          {message && (
            <div className="bg-green-900/50 border border-green-500 text-green-200 px-4 py-3 rounded-lg mb-6">
              {message}
            </div>
          )}

          {/* Error Messages */}
          {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-6">
              {error}
              {remainingAttempts !== null && remainingAttempts > 0 && (
                <p className="text-sm mt-1 text-red-300">
                  {remainingAttempts} attempt{remainingAttempts !== 1 ? 's' : ''} remaining
                </p>
              )}
              {lockoutEnds && (
                <p className="text-sm mt-1 text-red-300">
                  Try again in {getLockoutTimeRemaining()}
                </p>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                autoComplete="email"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500"
                placeholder="you@example.com"
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-sm text-gray-400">Password</label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-purple-400 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  autoComplete="current-password"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 pr-12 focus:outline-none focus:border-purple-500"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                name="rememberMe"
                id="rememberMe"
                checked={formData.rememberMe}
                onChange={handleChange}
                className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-purple-500 focus:ring-purple-500"
              />
              <label htmlFor="rememberMe" className="text-sm text-gray-400">
                Remember me for 30 days
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !!lockoutEnds}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed py-3 rounded-lg font-bold transition-all"
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-900 text-gray-500">or continue with</span>
            </div>
          </div>

          {/* Social/Wallet Login */}
          <div className="space-y-3">
            <button
              type="button"
              disabled
              className="w-full bg-gray-800 hover:bg-gray-700 disabled:opacity-50 border border-gray-700 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <span className="text-xl">🦊</span>
              Connect Wallet
              <span className="text-xs text-gray-500">(Coming soon)</span>
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-700 text-center">
            <p className="text-gray-400">
              Don't have an account?{' '}
              <Link href="/register" className="text-purple-400 hover:underline font-medium">
                Sign Up
              </Link>
            </p>
          </div>
        </div>

        {/* Demo Accounts */}
        <div className="mt-6 bg-gray-800/50 rounded-xl p-4">
          <h3 className="font-semibold text-sm text-gray-300 mb-2">Demo Accounts</h3>
          <p className="text-gray-500 text-xs mb-3">
            Register a new account to test, or use the demo wallet addresses on other pages.
          </p>
          <div className="space-y-1 text-xs font-mono">
            <p className="text-purple-400">Fan: 0x90F79bf6EB2c4f870365E785982E1f101E93b906</p>
            <p className="text-green-400">Venue: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8</p>
            <p className="text-yellow-400">Artist: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC</p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
