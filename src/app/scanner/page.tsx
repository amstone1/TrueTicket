'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

interface ScanResult {
  valid: boolean;
  status: string;
  message: string;
  color: string;
  ticket?: {
    id?: string;
    tier?: string;
    perks?: string;
    owner?: string;
    event?: {
      name: string;
      venue: string;
    };
  };
  checkedInAt?: string;
  gate?: string;
  ticketEvent?: string;
}

interface CheckInStats {
  event: {
    id: string;
    name: string;
    capacity: number;
  };
  stats: {
    ticketsSold: number;
    checkedIn: number;
    remaining: number;
    checkInRate: number;
  };
  recentCheckIns: {
    time: string;
    gate: string;
    tier: string;
    guest: string;
  }[];
}

export default function ScannerPage() {
  const [manualCode, setManualCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [eventId, setEventId] = useState('');
  const [gate, setGate] = useState('Main');
  const [stats, setStats] = useState<CheckInStats | null>(null);
  const [events, setEvents] = useState<{ id: string; name: string }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load events for selection
  useEffect(() => {
    fetchEvents();
  }, []);

  // Load stats when event selected
  useEffect(() => {
    if (eventId) {
      fetchStats();
      const interval = setInterval(fetchStats, 10000); // Refresh every 10s
      return () => clearInterval(interval);
    }
  }, [eventId]);

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/events?limit=50');
      const data = await res.json();
      setEvents(data.data?.map((e: any) => ({ id: e.id, name: e.name })) || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const fetchStats = async () => {
    if (!eventId) return;
    try {
      const res = await fetch(`/api/scan?eventId=${eventId}`);
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleScan = async (code: string) => {
    if (!code.trim() || scanning) return;

    setScanning(true);
    setResult(null);

    try {
      // Try to parse if it's JSON (QR code data)
      let scanCode = code.trim();
      try {
        const parsed = JSON.parse(scanCode);
        if (parsed.code) scanCode = parsed.code;
      } catch {
        // Not JSON, use raw code
      }

      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: scanCode,
          eventId: eventId || undefined,
          gate,
          scannedBy: 'Scanner App',
        }),
      });

      const data = await res.json();
      setResult(data);

      // Play sound based on result
      if (data.valid) {
        playSound('success');
      } else {
        playSound('error');
      }

      // Refresh stats after scan
      if (eventId) {
        setTimeout(fetchStats, 500);
      }
    } catch (error) {
      setResult({
        valid: false,
        status: 'ERROR',
        message: 'Scan failed - network error',
        color: 'red',
      });
      playSound('error');
    } finally {
      setScanning(false);
      setManualCode('');
      inputRef.current?.focus();
    }
  };

  const playSound = (type: 'success' | 'error') => {
    // Use Web Audio API for simple beeps
    try {
      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.frequency.value = type === 'success' ? 800 : 300;
      oscillator.type = 'sine';
      gain.gain.value = 0.3;
      oscillator.start();
      oscillator.stop(context.currentTime + 0.15);
    } catch {
      // Audio not supported
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleScan(manualCode);
    }
  };

  const getResultBg = (color: string) => {
    switch (color) {
      case 'green': return 'bg-green-600';
      case 'red': return 'bg-red-600';
      case 'yellow': return 'bg-yellow-600';
      case 'orange': return 'bg-orange-600';
      default: return 'bg-gray-600';
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
              TrueTicket Scanner
            </Link>
            <nav className="flex items-center gap-4">
              <select
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500"
              >
                <option value="">Select Event</option>
                {events.map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
              <select
                value={gate}
                onChange={(e) => setGate(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500"
              >
                <option value="Main">Main Gate</option>
                <option value="VIP">VIP Gate</option>
                <option value="North">North Gate</option>
                <option value="South">South Gate</option>
              </select>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Scanner Section */}
          <div>
            <div className="bg-gray-900 rounded-2xl p-6">
              <h2 className="text-2xl font-bold mb-6 text-center">Scan Ticket</h2>

              {/* Result Display */}
              {result && (
                <div className={`${getResultBg(result.color)} rounded-xl p-6 mb-6 text-center transition-all`}>
                  <div className="text-6xl mb-4">
                    {result.valid ? '✅' : result.status === 'ALREADY_USED' ? '🔄' : '❌'}
                  </div>
                  <h3 className="text-2xl font-bold mb-2">{result.message}</h3>
                  {result.ticket && (
                    <div className="mt-4 text-left bg-black/20 rounded-lg p-4">
                      {result.ticket.tier && (
                        <p><span className="opacity-70">Tier:</span> {result.ticket.tier}</p>
                      )}
                      {result.ticket.owner && (
                        <p><span className="opacity-70">Guest:</span> {result.ticket.owner}</p>
                      )}
                      {result.ticket.event && (
                        <p><span className="opacity-70">Event:</span> {result.ticket.event.name}</p>
                      )}
                    </div>
                  )}
                  {result.checkedInAt && (
                    <p className="mt-2 text-sm opacity-70">
                      Previously checked in at {formatTime(result.checkedInAt)}
                      {result.gate && ` via ${result.gate}`}
                    </p>
                  )}
                </div>
              )}

              {/* Manual Input */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Enter Check-in Code
                  </label>
                  <input
                    ref={inputRef}
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Scan QR or enter code manually..."
                    autoFocus
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-4 text-lg focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>

                <button
                  onClick={() => handleScan(manualCode)}
                  disabled={scanning || !manualCode.trim()}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed py-4 rounded-xl font-bold text-xl transition-all"
                >
                  {scanning ? 'Scanning...' : 'Validate Ticket'}
                </button>
              </div>

              {/* Demo Codes */}
              <div className="mt-6 p-4 bg-gray-800 rounded-lg">
                <p className="text-gray-400 text-sm mb-2">Demo: Enter any check-in code from "My Tickets"</p>
                <p className="text-gray-500 text-xs">Use Alice's wallet (0x90F79bf6EB2c4f870365E785982E1f101E93b906) to see ticket codes</p>
              </div>
            </div>
          </div>

          {/* Stats Section */}
          <div>
            {stats ? (
              <div className="space-y-6">
                {/* Event Info */}
                <div className="bg-gray-900 rounded-xl p-6">
                  <h3 className="text-xl font-bold mb-4">{stats.event.name}</h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-800 rounded-lg p-4 text-center">
                      <p className="text-3xl font-bold text-green-400">{stats.stats.checkedIn}</p>
                      <p className="text-gray-400 text-sm">Checked In</p>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-4 text-center">
                      <p className="text-3xl font-bold text-yellow-400">{stats.stats.remaining}</p>
                      <p className="text-gray-400 text-sm">Remaining</p>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-4 text-center">
                      <p className="text-3xl font-bold">{stats.stats.ticketsSold}</p>
                      <p className="text-gray-400 text-sm">Total Sold</p>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-4 text-center">
                      <p className="text-3xl font-bold text-purple-400">{stats.stats.checkInRate}%</p>
                      <p className="text-gray-400 text-sm">Check-in Rate</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="flex justify-between text-sm text-gray-400 mb-1">
                      <span>Attendance</span>
                      <span>{stats.stats.checkedIn} / {stats.stats.ticketsSold}</span>
                    </div>
                    <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-600 to-pink-600 transition-all"
                        style={{ width: `${stats.stats.checkInRate}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Recent Check-ins */}
                <div className="bg-gray-900 rounded-xl p-6">
                  <h3 className="font-bold mb-4">Recent Check-ins</h3>
                  {stats.recentCheckIns.length > 0 ? (
                    <div className="space-y-2">
                      {stats.recentCheckIns.map((checkIn, i) => (
                        <div key={i} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                          <div>
                            <p className="font-medium">{checkIn.guest}</p>
                            <p className="text-gray-400 text-sm">{checkIn.tier}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-gray-400 text-sm">{formatTime(checkIn.time)}</p>
                            <p className="text-gray-500 text-xs">{checkIn.gate || 'Main'} Gate</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">No check-ins yet</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-gray-900 rounded-xl p-8 text-center">
                <div className="text-6xl mb-4">📊</div>
                <h3 className="text-xl font-semibold mb-2">Select an Event</h3>
                <p className="text-gray-400">Choose an event above to view check-in statistics</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
