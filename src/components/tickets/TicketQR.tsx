'use client';

import { useEffect, useState } from 'react';
import { cn, formatDate, formatTime } from '@/lib/utils';
import { Badge, TicketStatusBadge } from '@/components/ui/Badge';
import { Calendar, MapPin, Clock, User, AlertCircle } from 'lucide-react';
import type { Ticket } from '@/types';

export interface TicketQRProps {
  ticket: Ticket;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
  className?: string;
}

const sizes = {
  sm: 150,
  md: 200,
  lg: 280,
};

export function TicketQR({
  ticket,
  size = 'md',
  showDetails = true,
  className,
}: TicketQRProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { event, tier, status } = ticket;
  const isValid = status === 'VALID';

  useEffect(() => {
    async function loadQR() {
      if (!ticket.checkInCode) {
        setError('No check-in code available');
        setLoading(false);
        return;
      }

      try {
        // Dynamically import qrcode library
        const QRCode = await import('qrcode');
        const dataUrl = await QRCode.toDataURL(ticket.checkInCode, {
          width: sizes[size],
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
          errorCorrectionLevel: 'H',
        });
        setQrDataUrl(dataUrl);
      } catch (err) {
        setError('Failed to generate QR code');
        console.error('QR generation error:', err);
      } finally {
        setLoading(false);
      }
    }

    loadQR();
  }, [ticket.checkInCode, size]);

  return (
    <div className={cn('bg-white rounded-2xl overflow-hidden', className)}>
      {/* Ticket Header */}
      {showDetails && (
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 text-white">
          <h2 className="font-bold text-lg">{event.name}</h2>
          <p className="text-indigo-100 text-sm mt-1">{tier.name}</p>
        </div>
      )}

      {/* QR Code */}
      <div className="flex flex-col items-center p-6 border-b border-dashed border-gray-200">
        {loading ? (
          <div
            className="animate-pulse bg-gray-200 rounded-lg"
            style={{ width: sizes[size], height: sizes[size] }}
          />
        ) : error ? (
          <div
            className="flex flex-col items-center justify-center bg-gray-100 rounded-lg"
            style={{ width: sizes[size], height: sizes[size] }}
          >
            <AlertCircle className="w-8 h-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-500">{error}</p>
          </div>
        ) : !isValid ? (
          <div
            className="flex flex-col items-center justify-center bg-gray-100 rounded-lg relative"
            style={{ width: sizes[size], height: sizes[size] }}
          >
            {qrDataUrl && (
              <img
                src={qrDataUrl}
                alt="Ticket QR Code"
                className="opacity-30"
              />
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <Badge variant="error" size="md">
                {status === 'USED' ? 'Already Used' : 'Not Valid'}
              </Badge>
            </div>
          </div>
        ) : (
          <img
            src={qrDataUrl || ''}
            alt="Ticket QR Code"
            className="rounded-lg"
          />
        )}

        {/* Status */}
        <div className="mt-4">
          <TicketStatusBadge status={status} />
        </div>

        {/* Instructions */}
        {isValid && (
          <p className="text-center text-sm text-gray-500 mt-3 max-w-xs">
            Show this code at the entrance. Make sure your screen brightness is up.
          </p>
        )}
      </div>

      {/* Ticket Details */}
      {showDetails && (
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <Calendar className="w-5 h-5 text-gray-400" />
            <div>
              <p className="font-medium text-gray-900">
                {formatDate(event.startDate)}
              </p>
              <p className="text-gray-500">{formatTime(event.startDate)}</p>
            </div>
          </div>

          {event.venueName && (
            <div className="flex items-center gap-3 text-sm">
              <MapPin className="w-5 h-5 text-gray-400" />
              <div>
                <p className="font-medium text-gray-900">{event.venueName}</p>
                {event.venueAddress && (
                  <p className="text-gray-500">{event.venueAddress}</p>
                )}
              </div>
            </div>
          )}

          {/* Ticket holder info would go here */}
          {ticket.owner && (
            <div className="flex items-center gap-3 text-sm">
              <User className="w-5 h-5 text-gray-400" />
              <div>
                <p className="font-medium text-gray-900">
                  {ticket.owner.displayName || ticket.owner.email}
                </p>
                <p className="text-gray-500">Ticket Holder</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Ticket Number */}
      <div className="px-4 pb-4">
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
            Ticket Number
          </p>
          <p className="font-mono text-sm text-gray-900">
            {ticket.tokenId || ticket.id.slice(0, 8).toUpperCase()}
          </p>
        </div>
      </div>
    </div>
  );
}

// Simple QR display for inline use
export function TicketQRSimple({
  checkInCode,
  size = 120,
  className,
}: {
  checkInCode: string;
  size?: number;
  className?: string;
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    async function loadQR() {
      try {
        const QRCode = await import('qrcode');
        const dataUrl = await QRCode.toDataURL(checkInCode, {
          width: size,
          margin: 1,
        });
        setQrDataUrl(dataUrl);
      } catch (err) {
        console.error('QR generation error:', err);
      }
    }

    loadQR();
  }, [checkInCode, size]);

  if (!qrDataUrl) {
    return (
      <div
        className={cn('animate-pulse bg-gray-200 rounded', className)}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <img
      src={qrDataUrl}
      alt="QR Code"
      className={cn('rounded', className)}
      style={{ width: size, height: size }}
    />
  );
}
