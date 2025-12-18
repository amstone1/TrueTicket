'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface ProfileData {
  id: string;
  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
  role: string;
  walletAddress: string | null;
  avatarUrl: string | null;
  bio: string | null;
  emailVerified: boolean;
  createdAt: string;
  ticketCount: number;
  eventCount: number;
  listingCount: number;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    bio: '',
    phone: '',
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login?returnTo=/profile');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchProfile();
    }
  }, [isAuthenticated]);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setProfile(data.user);
        setFormData({
          firstName: data.user.firstName || '',
          lastName: data.user.lastName || '',
          bio: data.user.bio || '',
          phone: data.user.phone || '',
        });
      }
    } catch (err) {
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const data = await res.json();
        setProfile((prev) => prev ? { ...prev, ...data.user } : null);
        setSuccess('Profile updated successfully');
        setEditing(false);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to update profile');
      }
    } catch (err) {
      setError('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoutAll = async () => {
    if (confirm('This will sign you out from all devices. Continue?')) {
      try {
        await fetch('/api/auth/logout', { method: 'DELETE' });
        router.push('/login?message=Signed out from all devices');
      } catch (err) {
        // Ignore
      }
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-red-600';
      case 'ORGANIZER': return 'bg-purple-600';
      case 'VENUE': return 'bg-green-600';
      case 'ARTIST': return 'bg-yellow-600';
      default: return 'bg-blue-600';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'USER': return 'Fan';
      case 'ORGANIZER': return 'Event Organizer';
      case 'VENUE': return 'Venue Manager';
      case 'ARTIST': return 'Artist';
      case 'ADMIN': return 'Administrator';
      default: return role;
    }
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        {/* Header skeleton */}
        <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                TrueTicket
              </div>
              <div className="flex items-center gap-4">
                <div className="h-4 w-20 bg-gray-700 rounded animate-pulse" />
                <div className="h-4 w-16 bg-gray-700 rounded animate-pulse" />
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 py-8">
          <div className="h-9 w-48 bg-gray-700 rounded mb-8 animate-pulse" />

          {/* Profile card skeleton */}
          <div className="bg-gray-900 rounded-2xl p-6 mb-6">
            <div className="flex items-start gap-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-600/50 to-pink-600/50 animate-pulse" />
              <div className="flex-1 space-y-3">
                <div className="h-8 w-48 bg-gray-700 rounded animate-pulse" />
                <div className="h-4 w-36 bg-gray-700 rounded animate-pulse" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-700">
              {[1, 2, 3].map((i) => (
                <div key={i} className="text-center">
                  <div className="h-8 w-12 mx-auto bg-gray-700 rounded animate-pulse mb-2" />
                  <div className="h-4 w-16 mx-auto bg-gray-700 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-center py-8">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
              <p className="text-gray-400 text-sm">Loading your profile...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

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
              <Link href="/my-tickets" className="text-gray-400 hover:text-white">My Tickets</Link>
              <button
                onClick={() => logout()}
                className="text-gray-400 hover:text-white"
              >
                Sign Out
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Profile Settings</h1>

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-900/50 border border-green-500 text-green-200 px-4 py-3 rounded-lg mb-6">
            {success}
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-gray-900 rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-3xl font-bold">
              {profile.displayName?.charAt(0) || profile.email?.charAt(0) || '?'}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold">{profile.displayName}</h2>
                <span className={`text-xs px-2 py-1 rounded ${getRoleColor(profile.role)}`}>
                  {getRoleLabel(profile.role)}
                </span>
              </div>
              <p className="text-gray-400">{profile.email}</p>
              {!profile.emailVerified && (
                <p className="text-yellow-400 text-sm mt-1">Email not verified</p>
              )}
              {profile.bio && (
                <p className="text-gray-300 mt-2">{profile.bio}</p>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-700">
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-400">{profile.ticketCount}</p>
              <p className="text-gray-400 text-sm">Tickets</p>
            </div>
            {['ORGANIZER', 'VENUE', 'ARTIST', 'ADMIN'].includes(profile.role) && (
              <>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-400">{profile.eventCount}</p>
                  <p className="text-gray-400 text-sm">Events</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-400">{profile.listingCount}</p>
                  <p className="text-gray-400 text-sm">Listings</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Edit Profile */}
        <div className="bg-gray-900 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold">Personal Information</h3>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="text-purple-400 hover:text-purple-300 font-medium"
              >
                Edit
              </button>
            )}
          </div>

          {editing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">First Name</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Bio</label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                  placeholder="Tell us about yourself..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 px-6 py-2 rounded-lg font-medium"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    setFormData({
                      firstName: profile.firstName || '',
                      lastName: profile.lastName || '',
                      bio: profile.bio || '',
                      phone: '',
                    });
                  }}
                  className="bg-gray-700 hover:bg-gray-600 px-6 py-2 rounded-lg font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400">First Name</p>
                  <p>{profile.firstName || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Last Name</p>
                  <p>{profile.lastName || '-'}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-400">Email</p>
                <p>{profile.email}</p>
              </div>
              {profile.walletAddress && (
                <div>
                  <p className="text-sm text-gray-400">Wallet Address</p>
                  <p className="font-mono text-sm">{profile.walletAddress}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-400">Member Since</p>
                <p>{new Date(profile.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          )}
        </div>

        {/* Security */}
        <div className="bg-gray-900 rounded-2xl p-6 mb-6">
          <h3 className="text-xl font-bold mb-6">Security</h3>

          <div className="space-y-4">
            <Link
              href="/forgot-password"
              className="block bg-gray-800 hover:bg-gray-700 rounded-lg p-4 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Change Password</p>
                  <p className="text-gray-400 text-sm">Update your password</p>
                </div>
                <span className="text-gray-400">→</span>
              </div>
            </Link>

            <button
              onClick={handleLogoutAll}
              className="w-full bg-gray-800 hover:bg-gray-700 rounded-lg p-4 text-left transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Sign Out All Devices</p>
                  <p className="text-gray-400 text-sm">Sign out from all your sessions</p>
                </div>
                <span className="text-gray-400">→</span>
              </div>
            </button>
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-gray-900 rounded-2xl p-6">
          <h3 className="text-xl font-bold mb-6">Quick Links</h3>

          <div className="grid grid-cols-2 gap-4">
            <Link
              href="/my-tickets"
              className="bg-gray-800 hover:bg-gray-700 rounded-lg p-4 text-center transition-colors"
            >
              <span className="text-2xl mb-2 block">🎫</span>
              <p className="font-medium">My Tickets</p>
            </Link>

            {['ORGANIZER', 'VENUE', 'ARTIST', 'ADMIN'].includes(profile.role) && (
              <>
                <Link
                  href="/creator"
                  className="bg-gray-800 hover:bg-gray-700 rounded-lg p-4 text-center transition-colors"
                >
                  <span className="text-2xl mb-2 block">📅</span>
                  <p className="font-medium">My Events</p>
                </Link>

                <Link
                  href="/royalties"
                  className="bg-gray-800 hover:bg-gray-700 rounded-lg p-4 text-center transition-colors"
                >
                  <span className="text-2xl mb-2 block">💰</span>
                  <p className="font-medium">Royalties</p>
                </Link>
              </>
            )}

            <Link
              href="/marketplace"
              className="bg-gray-800 hover:bg-gray-700 rounded-lg p-4 text-center transition-colors"
            >
              <span className="text-2xl mb-2 block">🏪</span>
              <p className="font-medium">Marketplace</p>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
