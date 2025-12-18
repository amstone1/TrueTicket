'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface FormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  acceptTerms?: string;
  general?: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    role: 'USER',
    walletAddress: '',
    phone: '',
    acceptTerms: false,
  });

  const validatePassword = (password: string) => {
    const issues: string[] = [];
    if (password.length < 8) issues.push('At least 8 characters');
    if (!/[A-Z]/.test(password)) issues.push('One uppercase letter');
    if (!/[a-z]/.test(password)) issues.push('One lowercase letter');
    if (!/[0-9]/.test(password)) issues.push('One number');
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) issues.push('One special character');
    setPasswordStrength(issues);
    return issues.length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    // Clear error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }

    // Validate password as user types
    if (name === 'password') {
      validatePassword(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    // Client-side validation
    const newErrors: FormErrors = {};

    if (!formData.email) newErrors.email = 'Email is required';
    if (!formData.password) newErrors.password = 'Password is required';
    if (!validatePassword(formData.password)) newErrors.password = 'Password does not meet requirements';
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    if (!formData.firstName) newErrors.firstName = 'First name is required';
    if (!formData.lastName) newErrors.lastName = 'Last name is required';
    if (!formData.acceptTerms) newErrors.acceptTerms = 'You must accept the terms';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.details) {
          // Zod validation errors
          const fieldErrors: FormErrors = {};
          data.details.forEach((err: any) => {
            const field = err.path[0];
            fieldErrors[field as keyof FormErrors] = err.message;
          });
          setErrors(fieldErrors);
        } else {
          setErrors({ general: data.error || 'Registration failed' });
        }
        return;
      }

      // Success - redirect to dashboard or verification page
      router.push('/my-tickets?registered=true');

    } catch (error) {
      setErrors({ general: 'An unexpected error occurred. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const roleDescriptions: Record<string, string> = {
    USER: 'Buy and resell tickets to events',
    ORGANIZER: 'Create and manage events, sell tickets',
    VENUE: 'Manage venue events and scan tickets',
    ARTIST: 'Create events and earn royalties from sales',
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
              <Link href="/login" className="text-gray-400 hover:text-white">
                Sign In
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Create Account</h1>
          <p className="text-gray-400">Join TrueTicket for fair ticketing</p>
        </div>

        <div className="bg-gray-900 rounded-2xl p-6">
          {errors.general && (
            <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-6">
              {errors.general}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">First Name</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className={`w-full bg-gray-800 border ${
                    errors.firstName ? 'border-red-500' : 'border-gray-700'
                  } rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500`}
                  placeholder="John"
                />
                {errors.firstName && (
                  <p className="text-red-400 text-xs mt-1">{errors.firstName}</p>
                )}
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className={`w-full bg-gray-800 border ${
                    errors.lastName ? 'border-red-500' : 'border-gray-700'
                  } rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500`}
                  placeholder="Doe"
                />
                {errors.lastName && (
                  <p className="text-red-400 text-xs mt-1">{errors.lastName}</p>
                )}
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full bg-gray-800 border ${
                  errors.email ? 'border-red-500' : 'border-gray-700'
                } rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500`}
                placeholder="you@example.com"
              />
              {errors.email && (
                <p className="text-red-400 text-xs mt-1">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`w-full bg-gray-800 border ${
                    errors.password ? 'border-red-500' : 'border-gray-700'
                  } rounded-lg px-4 py-3 pr-12 focus:outline-none focus:border-purple-500`}
                  placeholder="Create a strong password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-400 text-xs mt-1">{errors.password}</p>
              )}
              {formData.password && passwordStrength.length > 0 && (
                <div className="mt-2 text-xs">
                  <p className="text-gray-400 mb-1">Password needs:</p>
                  {passwordStrength.map((issue, i) => (
                    <span key={i} className="text-yellow-400 mr-2">• {issue}</span>
                  ))}
                </div>
              )}
              {formData.password && passwordStrength.length === 0 && (
                <p className="text-green-400 text-xs mt-1">Strong password</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Confirm Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`w-full bg-gray-800 border ${
                  errors.confirmPassword ? 'border-red-500' : 'border-gray-700'
                } rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500`}
                placeholder="Confirm your password"
              />
              {errors.confirmPassword && (
                <p className="text-red-400 text-xs mt-1">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Account Type */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Account Type</label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500"
              >
                <option value="USER">Fan / Ticket Buyer</option>
                <option value="ORGANIZER">Event Organizer</option>
                <option value="VENUE">Venue Manager</option>
                <option value="ARTIST">Artist / Performer</option>
              </select>
              <p className="text-gray-500 text-xs mt-1">
                {roleDescriptions[formData.role]}
              </p>
            </div>

            {/* Optional: Wallet Address */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Wallet Address <span className="text-gray-600">(Optional)</span>
              </label>
              <input
                type="text"
                name="walletAddress"
                value={formData.walletAddress}
                onChange={handleChange}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500 font-mono text-sm"
                placeholder="0x..."
              />
              <p className="text-gray-500 text-xs mt-1">
                Link a Web3 wallet for NFT ticket ownership
              </p>
            </div>

            {/* Terms */}
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                name="acceptTerms"
                checked={formData.acceptTerms}
                onChange={handleChange}
                className="mt-1 w-4 h-4 rounded border-gray-600 bg-gray-800 text-purple-500 focus:ring-purple-500"
              />
              <div>
                <label className="text-sm text-gray-300">
                  I agree to the{' '}
                  <Link href="/terms" className="text-purple-400 hover:underline">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="text-purple-400 hover:underline">
                    Privacy Policy
                  </Link>
                </label>
                {errors.acceptTerms && (
                  <p className="text-red-400 text-xs mt-1">{errors.acceptTerms}</p>
                )}
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed py-3 rounded-lg font-bold transition-all"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-700 text-center">
            <p className="text-gray-400">
              Already have an account?{' '}
              <Link href="/login" className="text-purple-400 hover:underline font-medium">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
