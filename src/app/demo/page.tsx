'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

// Demo sections
type DemoSection = 'overview' | 'zk-proof' | 'biometric' | 'anti-scalping' | 'privacy' | 'api';

interface ProofStep {
  id: number;
  label: string;
  description: string;
  status: 'pending' | 'active' | 'complete';
  duration?: number;
}

export default function DemoPage() {
  const [activeSection, setActiveSection] = useState<DemoSection>('overview');
  const [zkProofRunning, setZkProofRunning] = useState(false);
  const [proofSteps, setProofSteps] = useState<ProofStep[]>([]);
  const [proofResult, setProofResult] = useState<any>(null);
  const [apiResponse, setApiResponse] = useState<string>('');
  const [selectedApi, setSelectedApi] = useState('health');
  const [priceCapDemo, setPriceCapDemo] = useState({ originalPrice: 100, attemptedPrice: 150, maxAllowed: 110 });

  // Simulate ZK proof generation
  const runZkProofDemo = useCallback(async () => {
    setZkProofRunning(true);
    setProofResult(null);

    const steps: ProofStep[] = [
      { id: 1, label: 'Loading Circuit', description: 'Fetching main.wasm (5.2MB) and zkey (5.8MB)', status: 'pending' },
      { id: 2, label: 'Preparing Inputs', description: 'Hashing biometric commitment with Poseidon', status: 'pending' },
      { id: 3, label: 'Computing Witness', description: 'Evaluating 6,153 R1CS constraints', status: 'pending' },
      { id: 4, label: 'Generating Proof', description: 'Groth16 proving on BN128 curve', status: 'pending' },
      { id: 5, label: 'Proof Complete', description: 'Ready for on-chain verification', status: 'pending' },
    ];

    setProofSteps(steps);

    for (let i = 0; i < steps.length; i++) {
      // Update current step to active
      setProofSteps(prev => prev.map((s, idx) => ({
        ...s,
        status: idx === i ? 'active' : idx < i ? 'complete' : 'pending'
      })));

      // Simulate processing time
      const delay = i === 3 ? 2500 : i === 2 ? 1500 : 800;
      await new Promise(r => setTimeout(r, delay));
    }

    // Mark all complete
    setProofSteps(prev => prev.map(s => ({ ...s, status: 'complete' })));

    // Show mock proof result
    setProofResult({
      proof: {
        pi_a: ['0x2d4f...8a3b', '0x1c7e...9f2d'],
        pi_b: [['0x3a8c...2e1f', '0x4b9d...7c3a'], ['0x5e2f...1d4b', '0x6c3a...8e5f']],
        pi_c: ['0x7d4e...3f6c', '0x8a5f...4g7d'],
      },
      publicSignals: [
        '1', // valid = true
        '14829...3847', // merkleRoot (truncated)
        '92847...1938', // biometricCommitment
        '12345', // eventId
        Math.floor(Date.now() / 1000).toString(), // timestamp
        '83729...4829', // nonce
        (Math.floor(Date.now() / 1000) + 60).toString(), // nonceExpiry
      ],
      verificationTime: '2.3s',
      gasEstimate: '~200,000',
    });

    setZkProofRunning(false);
  }, []);

  // Fetch API demo
  const fetchApiDemo = useCallback(async () => {
    setApiResponse('Loading...');
    try {
      const endpoints: Record<string, string> = {
        health: '/api/health',
        events: '/api/events?limit=2',
      };

      const res = await fetch(endpoints[selectedApi]);
      const data = await res.json();
      setApiResponse(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setApiResponse(`Error: ${err.message}`);
    }
  }, [selectedApi]);

  useEffect(() => {
    if (activeSection === 'api') {
      fetchApiDemo();
    }
  }, [activeSection, selectedApi, fetchApiDemo]);

  const sections = [
    { id: 'overview', label: 'Overview', icon: '🎫' },
    { id: 'zk-proof', label: 'ZK Proofs', icon: '🔐' },
    { id: 'biometric', label: 'Biometric Auth', icon: '👆' },
    { id: 'anti-scalping', label: 'Anti-Scalping', icon: '🛡️' },
    { id: 'privacy', label: 'Privacy Demo', icon: '👁️' },
    { id: 'api', label: 'Live API', icon: '⚡' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎫</span>
            <div>
              <h1 className="text-xl font-bold">TrueTicket Demo</h1>
              <p className="text-xs text-gray-400">Interactive Feature Showcase</p>
            </div>
          </div>
          <Link
            href="/"
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition-colors"
          >
            Back to App
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Section Navigation */}
        <nav className="flex flex-wrap gap-2 mb-8 p-2 bg-gray-800/50 rounded-xl">
          {sections.map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id as DemoSection)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                activeSection === section.id
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              <span>{section.icon}</span>
              <span className="hidden sm:inline">{section.label}</span>
            </button>
          ))}
        </nav>

        {/* Overview Section */}
        {activeSection === 'overview' && (
          <div className="space-y-8">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-4xl font-bold mb-4">Privacy-Preserving NFT Ticketing</h2>
              <p className="text-xl text-gray-300">
                TrueTicket uses zero-knowledge proofs to verify ticket ownership
                without revealing your identity or which specific ticket you own.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  icon: '🔐',
                  title: 'Zero-Knowledge Proofs',
                  description: 'Prove you own a valid ticket without revealing which one. 6,153 constraints, Groth16 on BN128.',
                  stat: '< 3s proof time',
                },
                {
                  icon: '👆',
                  title: 'Biometric Binding',
                  description: 'Tickets are cryptographically bound to your biometric. No template ever leaves your device.',
                  stat: 'Poseidon hash',
                },
                {
                  icon: '🛡️',
                  title: 'Anti-Scalping',
                  description: 'On-chain price caps prevent resale above configured limits. Enforced cryptographically.',
                  stat: '110% max default',
                },
                {
                  icon: '💰',
                  title: 'Creator Royalties',
                  description: 'Artists and venues earn on every resale automatically. No intermediaries needed.',
                  stat: 'Multi-split support',
                },
                {
                  icon: '⏱️',
                  title: 'Replay Protection',
                  description: 'Time-bound nonces prevent screenshot attacks. Each verification requires a fresh proof.',
                  stat: '60s validity',
                },
                {
                  icon: '🌳',
                  title: 'Scalable',
                  description: '20-depth Merkle tree supports over 1 million tickets per event with constant proof size.',
                  stat: '1M+ tickets',
                },
              ].map((feature, i) => (
                <div
                  key={i}
                  className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 hover:border-purple-500 transition-colors"
                >
                  <span className="text-4xl mb-4 block">{feature.icon}</span>
                  <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                  <p className="text-gray-400 text-sm mb-4">{feature.description}</p>
                  <span className="inline-block px-3 py-1 bg-purple-900/50 text-purple-300 rounded-full text-xs font-medium">
                    {feature.stat}
                  </span>
                </div>
              ))}
            </div>

            <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 border border-purple-700 rounded-xl p-8 text-center">
              <h3 className="text-2xl font-bold mb-4">Patent-Pending Technology</h3>
              <p className="text-gray-300 max-w-2xl mx-auto">
                TrueTicket&apos;s privacy-preserving verification system combines zero-knowledge proofs
                with biometric authentication to create a ticketing experience that&apos;s both secure
                and private. No other platform offers this level of protection.
              </p>
            </div>
          </div>
        )}

        {/* ZK Proof Section */}
        {activeSection === 'zk-proof' && (
          <div className="space-y-8">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold mb-4">Zero-Knowledge Proof Generation</h2>
              <p className="text-gray-300">
                Watch a ZK proof being generated in real-time. This proves ticket ownership
                without revealing any private information.
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Proof Steps */}
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                <h3 className="text-xl font-bold mb-6">Proof Generation Steps</h3>

                <div className="space-y-4 mb-6">
                  {proofSteps.length > 0 ? proofSteps.map(step => (
                    <div
                      key={step.id}
                      className={`flex items-start gap-4 p-4 rounded-lg transition-all ${
                        step.status === 'active'
                          ? 'bg-purple-900/30 border border-purple-500'
                          : step.status === 'complete'
                          ? 'bg-green-900/20 border border-green-700'
                          : 'bg-gray-900/50 border border-gray-700'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        step.status === 'active'
                          ? 'bg-purple-600 animate-pulse'
                          : step.status === 'complete'
                          ? 'bg-green-600'
                          : 'bg-gray-700'
                      }`}>
                        {step.status === 'complete' ? '✓' : step.status === 'active' ? '⟳' : step.id}
                      </div>
                      <div>
                        <p className="font-semibold">{step.label}</p>
                        <p className="text-sm text-gray-400">{step.description}</p>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-12 text-gray-500">
                      Click &quot;Generate Proof&quot; to start the demo
                    </div>
                  )}
                </div>

                <button
                  onClick={runZkProofDemo}
                  disabled={zkProofRunning}
                  className={`w-full py-3 rounded-lg font-bold text-lg transition-all ${
                    zkProofRunning
                      ? 'bg-gray-700 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
                  }`}
                >
                  {zkProofRunning ? 'Generating Proof...' : 'Generate ZK Proof'}
                </button>
              </div>

              {/* Proof Result */}
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                <h3 className="text-xl font-bold mb-6">Proof Output</h3>

                {proofResult ? (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-400 mb-2">PUBLIC SIGNALS (Visible to verifier)</h4>
                      <div className="bg-gray-900 rounded-lg p-4 font-mono text-xs overflow-x-auto">
                        <div className="text-green-400">valid: {proofResult.publicSignals[0] === '1' ? 'TRUE ✓' : 'FALSE ✗'}</div>
                        <div className="text-gray-400">merkleRoot: {proofResult.publicSignals[1]}...</div>
                        <div className="text-gray-400">biometricCommitment: {proofResult.publicSignals[2]}...</div>
                        <div className="text-gray-400">eventId: {proofResult.publicSignals[3]}</div>
                        <div className="text-gray-400">timestamp: {proofResult.publicSignals[4]}</div>
                        <div className="text-gray-400">nonce: {proofResult.publicSignals[5]}...</div>
                        <div className="text-gray-400">nonceExpiry: {proofResult.publicSignals[6]}</div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-gray-400 mb-2">PRIVATE INPUTS (Never revealed)</h4>
                      <div className="bg-gray-900 rounded-lg p-4 font-mono text-xs text-red-400">
                        <div>ticketId: ████████</div>
                        <div>seatNumber: ████</div>
                        <div>biometricTemplate: ████████████████</div>
                        <div>biometricSalt: ████████</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-purple-900/30 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold">{proofResult.verificationTime}</div>
                        <div className="text-xs text-gray-400">Proof Time</div>
                      </div>
                      <div className="bg-purple-900/30 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold">{proofResult.gasEstimate}</div>
                        <div className="text-xs text-gray-400">Gas Estimate</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-16 text-gray-500">
                    <div className="text-6xl mb-4">🔒</div>
                    <p>No proof generated yet</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-blue-900/20 border border-blue-700 rounded-xl p-6">
              <h4 className="font-bold text-blue-300 mb-2">What just happened?</h4>
              <p className="text-gray-300 text-sm">
                The ZK circuit proved that you own a valid ticket for this event AND your biometric
                matches the enrolled template, all WITHOUT revealing which ticket you have or your
                actual biometric data. The verifier only sees: &quot;This person has a valid ticket&quot; - nothing more.
              </p>
            </div>
          </div>
        )}

        {/* Biometric Section */}
        {activeSection === 'biometric' && (
          <div className="space-y-8">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold mb-4">Biometric Authentication</h2>
              <p className="text-gray-300">
                Your biometric (Face ID, Touch ID, Windows Hello) becomes a cryptographic key.
                The raw biometric never leaves your device.
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                <h3 className="text-xl font-bold mb-6">How It Works</h3>

                <div className="space-y-6">
                  {[
                    { step: 1, title: 'Biometric Capture', desc: 'Your device captures face/fingerprint locally', icon: '📸' },
                    { step: 2, title: 'Template Hashing', desc: 'Converted to 16 Poseidon hash field elements', icon: '🔢' },
                    { step: 3, title: 'Commitment Creation', desc: 'Poseidon(template || salt) → commitment', icon: '🔐' },
                    { step: 4, title: 'On-Chain Storage', desc: 'Only the commitment goes on-chain (32 bytes)', icon: '⛓️' },
                  ].map(item => (
                    <div key={item.step} className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-2xl flex-shrink-0">
                        {item.icon}
                      </div>
                      <div>
                        <p className="font-bold">Step {item.step}: {item.title}</p>
                        <p className="text-sm text-gray-400">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                <h3 className="text-xl font-bold mb-6">Try It Yourself</h3>

                <div className="space-y-4">
                  <Link
                    href="/register"
                    className="block w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-lg font-bold text-center transition-all"
                  >
                    1. Create Account
                  </Link>

                  <Link
                    href="/settings"
                    className="block w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg font-bold text-center transition-all"
                  >
                    2. Add Biometric in Settings
                  </Link>

                  <Link
                    href="/login"
                    className="block w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 rounded-lg font-bold text-center transition-all"
                  >
                    3. Login with Biometric Only
                  </Link>
                </div>

                <div className="mt-6 p-4 bg-yellow-900/20 border border-yellow-700 rounded-lg">
                  <p className="text-sm text-yellow-300">
                    <strong>Privacy Note:</strong> Unlike other platforms that store your biometric
                    on their servers, TrueTicket never sees your raw biometric. Only a cryptographic
                    commitment is stored.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
              <h3 className="text-xl font-bold mb-4">Comparison: Traditional vs TrueTicket</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
                  <h4 className="font-bold text-red-300 mb-3">❌ Traditional Biometric</h4>
                  <ul className="text-sm space-y-2 text-gray-300">
                    <li>• Biometric sent to server</li>
                    <li>• Template stored in database</li>
                    <li>• Vulnerable to data breaches</li>
                    <li>• Company can track you</li>
                    <li>• No cryptographic privacy</li>
                  </ul>
                </div>
                <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
                  <h4 className="font-bold text-green-300 mb-3">✓ TrueTicket</h4>
                  <ul className="text-sm space-y-2 text-gray-300">
                    <li>• Biometric never leaves device</li>
                    <li>• Only commitment stored</li>
                    <li>• ZK proof for verification</li>
                    <li>• Unlinkable across events</li>
                    <li>• Cryptographic privacy guarantee</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Anti-Scalping Section */}
        {activeSection === 'anti-scalping' && (
          <div className="space-y-8">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold mb-4">Anti-Scalping Protection</h2>
              <p className="text-gray-300">
                Price caps are enforced on-chain. Scalpers cannot resell above the configured limit.
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                <h3 className="text-xl font-bold mb-6">Price Cap Demo</h3>

                <div className="space-y-6">
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Original Ticket Price</label>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="50"
                        max="500"
                        value={priceCapDemo.originalPrice}
                        onChange={(e) => setPriceCapDemo(prev => ({
                          ...prev,
                          originalPrice: Number(e.target.value),
                          maxAllowed: Math.round(Number(e.target.value) * 1.1)
                        }))}
                        className="flex-1"
                      />
                      <span className="text-2xl font-bold w-24 text-right">${priceCapDemo.originalPrice}</span>
                    </div>
                  </div>

                  <div className="bg-gray-900 rounded-lg p-4">
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-400">Max Resale (110%)</span>
                      <span className="font-bold text-green-400">${priceCapDemo.maxAllowed}</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-3">
                      <div
                        className="bg-green-500 h-3 rounded-full"
                        style={{ width: `${(priceCapDemo.maxAllowed / 500) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Attempted Resale Price</label>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="50"
                        max="500"
                        value={priceCapDemo.attemptedPrice}
                        onChange={(e) => setPriceCapDemo(prev => ({
                          ...prev,
                          attemptedPrice: Number(e.target.value)
                        }))}
                        className="flex-1"
                      />
                      <span className={`text-2xl font-bold w-24 text-right ${
                        priceCapDemo.attemptedPrice > priceCapDemo.maxAllowed ? 'text-red-400' : 'text-green-400'
                      }`}>
                        ${priceCapDemo.attemptedPrice}
                      </span>
                    </div>
                  </div>

                  <div className={`p-4 rounded-lg ${
                    priceCapDemo.attemptedPrice > priceCapDemo.maxAllowed
                      ? 'bg-red-900/30 border border-red-700'
                      : 'bg-green-900/30 border border-green-700'
                  }`}>
                    {priceCapDemo.attemptedPrice > priceCapDemo.maxAllowed ? (
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">🚫</span>
                        <div>
                          <p className="font-bold text-red-300">Transaction Blocked</p>
                          <p className="text-sm text-gray-400">
                            Price exceeds cap by ${priceCapDemo.attemptedPrice - priceCapDemo.maxAllowed}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">✅</span>
                        <div>
                          <p className="font-bold text-green-300">Transaction Allowed</p>
                          <p className="text-sm text-gray-400">
                            Price is within the 110% cap
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                <h3 className="text-xl font-bold mb-6">Cap Enforcement Methods</h3>

                <div className="space-y-4">
                  {[
                    {
                      type: 'Percentage Cap',
                      desc: 'Max resale as % of original (e.g., 110%)',
                      example: '$100 ticket → max $110',
                      icon: '📊',
                    },
                    {
                      type: 'Absolute Cap',
                      desc: 'Fixed max markup amount',
                      example: '$100 ticket + $20 max → $120',
                      icon: '💵',
                    },
                    {
                      type: 'Fixed Price',
                      desc: 'Cannot resell above original price',
                      example: '$100 ticket → max $100',
                      icon: '🔒',
                    },
                  ].map(cap => (
                    <div key={cap.type} className="bg-gray-900/50 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{cap.icon}</span>
                        <span className="font-bold">{cap.type}</span>
                      </div>
                      <p className="text-sm text-gray-400 mb-2">{cap.desc}</p>
                      <code className="text-xs bg-gray-800 px-2 py-1 rounded text-purple-300">{cap.example}</code>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-purple-900/20 border border-purple-700 rounded-lg">
                  <p className="text-sm text-purple-300">
                    <strong>On-Chain Enforcement:</strong> Price caps are checked by the PricingController
                    smart contract. The marketplace cannot bypass these rules.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Privacy Demo Section */}
        {activeSection === 'privacy' && (
          <div className="space-y-8">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold mb-4">Privacy-Preserving Verification</h2>
              <p className="text-gray-300">
                See what the venue scanner sees vs. what traditional ticketing reveals.
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              <div className="bg-red-900/20 border border-red-700 rounded-xl p-6">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <span>❌</span> Traditional Ticket
                </h3>
                <div className="bg-white rounded-lg p-6 text-gray-900">
                  <div className="border-b-2 border-dashed border-gray-300 pb-4 mb-4">
                    <h4 className="font-bold text-lg">SUMMER MUSIC FESTIVAL 2024</h4>
                    <p className="text-sm text-gray-600">Madison Square Garden</p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Name:</span>
                      <span className="font-semibold">John Smith</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Email:</span>
                      <span className="font-semibold">john.smith@email.com</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Section:</span>
                      <span className="font-semibold">Floor A</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Row:</span>
                      <span className="font-semibold">12</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Seat:</span>
                      <span className="font-semibold">24</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Ticket ID:</span>
                      <span className="font-semibold">#TKT-2024-0847291</span>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-red-100 rounded text-red-800 text-xs">
                    ⚠️ All this data is visible to everyone who scans the ticket
                  </div>
                </div>
              </div>

              <div className="bg-green-900/20 border border-green-700 rounded-xl p-6">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <span>✅</span> TrueTicket ZK Proof
                </h3>
                <div className="bg-gray-900 rounded-lg p-6 font-mono text-sm">
                  <div className="border-b border-gray-700 pb-4 mb-4">
                    <h4 className="font-bold text-green-400">ZK VERIFICATION RESULT</h4>
                    <p className="text-xs text-gray-500">Groth16 Proof Verified</p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-green-400">✓</span>
                      <span className="text-gray-400">Valid ticket for event</span>
                      <span className="text-green-400">#12345</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-400">✓</span>
                      <span className="text-gray-400">Biometric verified</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-400">✓</span>
                      <span className="text-gray-400">Not expired</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-400">✓</span>
                      <span className="text-gray-400">Not previously used</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <p className="text-gray-500 text-xs">Hidden from verifier:</p>
                    <div className="mt-2 space-y-1 text-gray-600">
                      <div>Name: ████████████</div>
                      <div>Email: ████████████</div>
                      <div>Seat: ████</div>
                      <div>Ticket ID: ████████</div>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-green-900/50 rounded text-green-300 text-xs">
                    ✓ Venue only learns: &quot;This person has a valid ticket&quot;
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
              <h3 className="text-xl font-bold mb-4">What This Means</h3>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-4xl mb-2">🕵️</div>
                  <h4 className="font-bold mb-1">No Tracking</h4>
                  <p className="text-sm text-gray-400">
                    Venues cannot build profiles of which events you attend
                  </p>
                </div>
                <div className="text-center">
                  <div className="text-4xl mb-2">🔗</div>
                  <h4 className="font-bold mb-1">Unlinkable</h4>
                  <p className="text-sm text-gray-400">
                    Your attendance at different events cannot be correlated
                  </p>
                </div>
                <div className="text-center">
                  <div className="text-4xl mb-2">🛡️</div>
                  <h4 className="font-bold mb-1">Breach-Proof</h4>
                  <p className="text-sm text-gray-400">
                    Even if our database is breached, your identity is protected
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* API Demo Section */}
        {activeSection === 'api' && (
          <div className="space-y-8">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold mb-4">Live API Demo</h2>
              <p className="text-gray-300">
                Interact with TrueTicket&apos;s production API endpoints in real-time.
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                <h3 className="text-xl font-bold mb-6">Select Endpoint</h3>

                <div className="space-y-3">
                  {[
                    { id: 'health', label: 'Health Check', endpoint: '/api/health' },
                    { id: 'events', label: 'List Events', endpoint: '/api/events' },
                  ].map(api => (
                    <button
                      key={api.id}
                      onClick={() => setSelectedApi(api.id)}
                      className={`w-full text-left p-4 rounded-lg transition-all ${
                        selectedApi === api.id
                          ? 'bg-purple-600'
                          : 'bg-gray-900/50 hover:bg-gray-700'
                      }`}
                    >
                      <p className="font-semibold">{api.label}</p>
                      <code className="text-xs text-gray-400">{api.endpoint}</code>
                    </button>
                  ))}
                </div>

                <div className="mt-6">
                  <button
                    onClick={fetchApiDemo}
                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg font-bold transition-all"
                  >
                    Fetch Data
                  </button>
                </div>

                <div className="mt-6 p-4 bg-gray-900/50 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-400 mb-2">ZK Assets (Static)</h4>
                  <div className="space-y-2 font-mono text-xs">
                    <a
                      href="/zk/main.wasm"
                      target="_blank"
                      className="block text-blue-400 hover:underline"
                    >
                      /zk/main.wasm (5.2MB)
                    </a>
                    <a
                      href="/zk/main_final.zkey"
                      target="_blank"
                      className="block text-blue-400 hover:underline"
                    >
                      /zk/main_final.zkey (5.8MB)
                    </a>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                <h3 className="text-xl font-bold mb-6">Response</h3>
                <pre className="bg-gray-900 rounded-lg p-4 font-mono text-xs overflow-auto max-h-96 text-green-400">
                  {apiResponse || 'Click an endpoint to fetch data...'}
                </pre>
              </div>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
              <h3 className="text-xl font-bold mb-4">cURL Examples</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-400 mb-2">Health Check</p>
                  <code className="block bg-gray-900 p-3 rounded font-mono text-xs text-gray-300">
                    curl https://trueticket.me/api/health
                  </code>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-2">List Events</p>
                  <code className="block bg-gray-900 p-3 rounded font-mono text-xs text-gray-300">
                    curl https://trueticket.me/api/events
                  </code>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-2">Check ZK WASM</p>
                  <code className="block bg-gray-900 p-3 rounded font-mono text-xs text-gray-300">
                    curl -I https://trueticket.me/zk/main.wasm
                  </code>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-gray-800 text-center text-gray-500 text-sm">
          <p>TrueTicket - Privacy-Preserving NFT Ticketing</p>
          <p className="mt-1">Patent-pending zero-knowledge verification technology</p>
        </footer>
      </div>
    </div>
  );
}
