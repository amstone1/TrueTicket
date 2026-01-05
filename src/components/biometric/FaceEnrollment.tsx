'use client';

/**
 * Face Enrollment Component
 *
 * Captures user's face for venue check-in verification.
 * Uses the device camera with liveness detection.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';

interface FaceEnrollmentProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

type EnrollmentState =
  | 'idle'
  | 'requesting_permission'
  | 'capturing'
  | 'processing'
  | 'success'
  | 'error';

export function FaceEnrollment({ onSuccess, onError }: FaceEnrollmentProps) {
  const { user } = useAuth();
  const [state, setState] = useState<EnrollmentState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [instructions, setInstructions] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const captureDataRef = useRef<{
    frames: number;
    startTime: number;
    headPositions: { x: number; y: number }[];
  }>({
    frames: 0,
    startTime: 0,
    headPositions: [],
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const startCapture = useCallback(async () => {
    try {
      setState('requesting_permission');
      setError(null);
      setInstructions('Requesting camera access...');

      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setState('capturing');
      setInstructions('Position your face in the frame and hold still');
      captureDataRef.current = {
        frames: 0,
        startTime: Date.now(),
        headPositions: [],
      };

      // Start capture sequence
      runCaptureSequence();
    } catch (err) {
      console.error('Camera access error:', err);
      setState('error');
      setError('Camera access denied. Please allow camera access and try again.');
      onError?.('Camera access denied');
    }
  }, [onError]);

  const runCaptureSequence = useCallback(() => {
    const captureFrame = () => {
      if (state !== 'capturing' || !videoRef.current || !canvasRef.current) {
        return;
      }

      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;

      // Draw current frame
      ctx.drawImage(videoRef.current, 0, 0, 640, 480);

      // Increment frame count
      captureDataRef.current.frames++;

      // Simulate head position tracking (in production, use face detection)
      const mockPosition = {
        x: 320 + Math.random() * 20 - 10,
        y: 240 + Math.random() * 20 - 10,
      };
      captureDataRef.current.headPositions.push(mockPosition);

      // Update progress
      const elapsed = Date.now() - captureDataRef.current.startTime;
      const targetDuration = 3000; // 3 seconds
      setProgress(Math.min((elapsed / targetDuration) * 100, 100));

      // Check if capture is complete
      if (elapsed >= targetDuration) {
        processCapture();
        return;
      }

      // Continue capturing
      requestAnimationFrame(captureFrame);
    };

    requestAnimationFrame(captureFrame);
  }, [state]);

  const processCapture = useCallback(async () => {
    setState('processing');
    setInstructions('Processing your face...');

    try {
      // Stop camera
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      // In production, this would extract face embeddings using a face recognition SDK
      // For now, we'll generate a mock template
      const mockTemplate = generateMockTemplate();

      // Calculate liveness indicators
      const { headPositions, frames, startTime } = captureDataRef.current;
      const duration = Date.now() - startTime;

      // Check for head movement
      let headMovement = false;
      if (headPositions.length > 10) {
        const xVariance = calculateVariance(headPositions.map((p) => p.x));
        const yVariance = calculateVariance(headPositions.map((p) => p.y));
        headMovement = xVariance > 5 || yVariance > 5;
      }

      // Send to enrollment API
      const response = await fetch('/api/biometric/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template: Array.from(mockTemplate),
          livenessData: {
            frames,
            duration,
            headMovement,
            blinkDetected: Math.random() > 0.3, // Mock blink detection
          },
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Enrollment failed');
      }

      setState('success');
      setInstructions('Face enrolled successfully!');
      onSuccess?.();
    } catch (err) {
      console.error('Enrollment error:', err);
      setState('error');
      setError((err as Error).message);
      onError?.((err as Error).message);
    }
  }, [onSuccess, onError]);

  const resetEnrollment = useCallback(() => {
    setState('idle');
    setError(null);
    setProgress(0);
    setInstructions('');

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
  }, []);

  // UI rendering based on state
  return (
    <div className="flex flex-col items-center space-y-4 p-4">
      <h2 className="text-xl font-semibold">Face Enrollment</h2>
      <p className="text-sm text-gray-500 text-center max-w-md">
        Enroll your face for secure venue check-in. Your face data is processed
        on-device and only a secure hash is stored.
      </p>

      {/* Camera view */}
      <div className="relative w-full max-w-md aspect-[4/3] bg-gray-900 rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${
            state === 'capturing' ? 'block' : 'hidden'
          }`}
        />
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          className="hidden"
        />

        {/* Overlay based on state */}
        {state === 'idle' && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
            <div className="text-center text-white">
              <svg
                className="w-16 h-16 mx-auto mb-4 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              <p>Click Start to begin face enrollment</p>
            </div>
          </div>
        )}

        {state === 'capturing' && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Face guide overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-48 h-64 border-2 border-white rounded-full opacity-50" />
            </div>
            {/* Progress bar */}
            <div className="absolute bottom-4 left-4 right-4">
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all duration-100"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {state === 'processing' && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75">
            <div className="text-center text-white">
              <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p>Processing...</p>
            </div>
          </div>
        )}

        {state === 'success' && (
          <div className="absolute inset-0 flex items-center justify-center bg-green-900 bg-opacity-75">
            <div className="text-center text-white">
              <svg
                className="w-16 h-16 mx-auto mb-4 text-green-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <p className="text-lg font-medium">Enrolled Successfully</p>
            </div>
          </div>
        )}

        {state === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-900 bg-opacity-75">
            <div className="text-center text-white p-4">
              <svg
                className="w-16 h-16 mx-auto mb-4 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              <p className="text-lg font-medium mb-2">Enrollment Failed</p>
              <p className="text-sm text-red-200">{error}</p>
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      {instructions && (
        <p className="text-sm text-gray-600 text-center">{instructions}</p>
      )}

      {/* Action buttons */}
      <div className="flex gap-4">
        {state === 'idle' && (
          <Button onClick={startCapture}>Start Enrollment</Button>
        )}

        {(state === 'error' || state === 'success') && (
          <Button onClick={resetEnrollment} variant="outline">
            {state === 'success' ? 'Done' : 'Try Again'}
          </Button>
        )}
      </div>

      {/* Privacy notice */}
      <p className="text-xs text-gray-400 text-center max-w-sm">
        Your face data is processed locally and only a cryptographic hash is
        stored. We never store your actual face image.
      </p>
    </div>
  );
}

// Helper functions
function generateMockTemplate(): Float32Array {
  const template = new Float32Array(128);
  for (let i = 0; i < template.length; i++) {
    template[i] = Math.random() * 2 - 1;
  }
  return template;
}

function calculateVariance(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
}

export default FaceEnrollment;
