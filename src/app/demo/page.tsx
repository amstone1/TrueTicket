'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

const TICKET_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function getTicketMetadata(uint256 tokenId) view returns (tuple(uint256 eventId, string section, string row, uint32 seatNumber, uint8 tier, uint256 originalPrice, uint256 mintTimestamp, bool used))',
  'function name() view returns (string)',
  'function symbol() view returns (string)',
];

// Direct RPC connection to Hardhat (bypasses wallet for read-only operations)
const HARDHAT_RPC = 'http://127.0.0.1:8545';

interface TicketData {
  tokenId: number;
  section: string;
  row: string;
  seatNumber: number;
  tier: number;
  originalPrice: string;
  used: boolean;
  owner: string;
}

export default function DemoPage() {
  const [connected, setConnected] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState('0x70997970C51812dc3A010C7d01b50e0d17dc79C8');
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contractAddress, setContractAddress] = useState('0xDa1A2E33BD9E8ae3641A61ab72f137e61A7edf6e');
  const [eventName, setEventName] = useState('');

  const connectWallet = async () => {
    try {
      setError(null);
      if (typeof window.ethereum === 'undefined') {
        // No wallet - just use the default address
        setConnected(true);
        return;
      }

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (accounts.length > 0) {
        setAccount(accounts[0]);
        setWalletAddress(accounts[0]);
        setConnected(true);
      }
    } catch (err: any) {
      // If wallet connection fails, still allow viewing with manual address
      setConnected(true);
      setError('Wallet not connected. Using default address. You can enter any address below.');
    }
  };

  const loadTickets = async () => {
    if (!walletAddress || !contractAddress) return;

    setLoading(true);
    setError(null);
    setTickets([]);

    try {
      // Use direct JSON-RPC connection to Hardhat (more reliable than wallet provider)
      const provider = new ethers.JsonRpcProvider(HARDHAT_RPC);
      const contract = new ethers.Contract(contractAddress, TICKET_ABI, provider);

      // Get event name
      try {
        const name = await contract.name();
        setEventName(name);
      } catch {
        setEventName('Unknown Event');
      }

      // Get balance
      const balance = await contract.balanceOf(walletAddress);
      const balanceNum = Number(balance);

      if (balanceNum === 0) {
        setError(`No tickets found for this wallet at contract ${contractAddress.slice(0, 10)}...`);
        setLoading(false);
        return;
      }

      const ticketList: TicketData[] = [];

      for (let i = 0; i < balanceNum; i++) {
        const tokenId = await contract.tokenOfOwnerByIndex(walletAddress, i);
        const metadata = await contract.getTicketMetadata(tokenId);
        const owner = await contract.ownerOf(tokenId);

        ticketList.push({
          tokenId: Number(tokenId),
          section: metadata.section,
          row: metadata.row,
          seatNumber: Number(metadata.seatNumber),
          tier: Number(metadata.tier),
          originalPrice: ethers.formatEther(metadata.originalPrice),
          used: metadata.used,
          owner: owner,
        });
      }

      setTickets(ticketList);
    } catch (err: any) {
      console.error('Error loading tickets:', err);
      setError(err.message || 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (connected && walletAddress) {
      loadTickets();
    }
  }, [connected, walletAddress, contractAddress]);

  const tierNames: Record<number, string> = {
    0: 'General Admission',
    1: 'VIP',
    2: 'Platinum',
  };

  const tierColors: Record<number, string> = {
    0: 'bg-blue-500',
    1: 'bg-purple-500',
    2: 'bg-yellow-500',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-2 text-center">🎫 TrueTicket NFT Viewer</h1>
        <p className="text-gray-400 text-center mb-8">View your NFT tickets on the local Hardhat network</p>

        {!connected ? (
          <div className="text-center">
            <button
              onClick={connectWallet}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-4 px-8 rounded-xl text-xl transition-all transform hover:scale-105"
            >
              View Tickets
            </button>
            <p className="mt-4 text-gray-400 text-sm">No wallet needed - just click to view demo tickets</p>
          </div>
        ) : (
          <div>
            <div className="bg-gray-800/50 rounded-xl p-4 mb-6 border border-gray-700">
              <label className="text-sm text-gray-400 block mb-2">Wallet Address to View</label>
              <input
                type="text"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 font-mono text-sm focus:outline-none focus:border-purple-500"
                placeholder="0x..."
              />
              {account && (
                <p className="text-xs text-green-400 mt-2">Connected: {account.slice(0, 10)}...</p>
              )}
            </div>

            <div className="bg-gray-800/50 rounded-xl p-4 mb-6 border border-gray-700">
              <label className="text-sm text-gray-400 block mb-2">Ticket Contract Address</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={contractAddress}
                  onChange={(e) => setContractAddress(e.target.value)}
                  className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 font-mono text-sm focus:outline-none focus:border-purple-500"
                />
                <button
                  onClick={loadTickets}
                  className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg font-semibold transition-colors"
                >
                  Load
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 mb-6">
                <p className="text-red-400">{error}</p>
              </div>
            )}

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
                <p className="mt-4 text-gray-400">Loading your tickets...</p>
              </div>
            ) : tickets.length > 0 ? (
              <div>
                <h2 className="text-2xl font-bold mb-4">{eventName}</h2>
                <p className="text-gray-400 mb-6">This wallet owns {tickets.length} ticket(s)</p>

                <div className="grid gap-6 md:grid-cols-2">
                  {tickets.map((ticket) => (
                    <div
                      key={ticket.tokenId}
                      className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl overflow-hidden border border-gray-700 hover:border-purple-500 transition-all transform hover:scale-[1.02]"
                    >
                      <div className={`${tierColors[ticket.tier] || 'bg-gray-600'} px-4 py-2`}>
                        <span className="font-semibold">{tierNames[ticket.tier] || `Tier ${ticket.tier}`}</span>
                      </div>

                      <div className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <p className="text-3xl font-bold">#{ticket.tokenId}</p>
                            <p className="text-gray-400">Token ID</p>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-sm font-semibold ${ticket.used ? 'bg-red-900 text-red-300' : 'bg-green-900 text-green-300'}`}>
                            {ticket.used ? '✓ Used' : '● Valid'}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Section</span>
                            <span className="font-semibold">{ticket.section}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Row</span>
                            <span className="font-semibold">{ticket.row}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Seat</span>
                            <span className="font-semibold">{ticket.seatNumber}</span>
                          </div>
                          <div className="border-t border-gray-700 pt-3 mt-3">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Price</span>
                              <span className="font-bold text-lg">{ticket.originalPrice} ETH</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-900/50 px-6 py-3 border-t border-gray-700">
                        <p className="text-xs text-gray-500 font-mono truncate">
                          Owner: {ticket.owner}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : !error && (
              <div className="text-center py-12 bg-gray-800/30 rounded-xl border border-gray-700">
                <p className="text-gray-400">Click "Load" to view tickets for the address above</p>
              </div>
            )}

            <div className="mt-8 p-4 bg-blue-900/20 border border-blue-700 rounded-xl">
              <h3 className="font-semibold text-blue-300 mb-2">Demo Wallets with Tickets:</h3>
              <ul className="text-sm text-gray-400 space-y-1">
                <li><code className="text-blue-300">0x70997970C51812dc3A010C7d01b50e0d17dc79C8</code> - 1 GA ticket</li>
                <li><code className="text-blue-300">0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC</code> - 2 tickets (1 GA + 1 VIP)</li>
              </ul>
            </div>
          </div>
        )}

        <div className="mt-12 text-center text-gray-500 text-sm">
          <p>Running on Hardhat Local Network (Chain ID: 31337)</p>
          <p className="mt-1">Make sure your wallet is connected to localhost:8545</p>
        </div>
      </div>
    </div>
  );
}
