import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { verifyPassword } from '@/lib/auth/password';
import { generateTokenPair, setAuthCookies } from '@/lib/auth/jwt';

// Validation schema
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false),
});

// Rate limiting - simple in-memory store (use Redis in production)
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(identifier: string): { allowed: boolean; remainingAttempts: number; lockoutEnds?: Date } {
  const now = Date.now();
  const attempts = loginAttempts.get(identifier);

  if (!attempts) {
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }

  // Reset if lockout period has passed
  if (now - attempts.lastAttempt > LOCKOUT_TIME) {
    loginAttempts.delete(identifier);
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }

  if (attempts.count >= MAX_ATTEMPTS) {
    return {
      allowed: false,
      remainingAttempts: 0,
      lockoutEnds: new Date(attempts.lastAttempt + LOCKOUT_TIME),
    };
  }

  return { allowed: true, remainingAttempts: MAX_ATTEMPTS - attempts.count };
}

function recordFailedAttempt(identifier: string): void {
  const now = Date.now();
  const attempts = loginAttempts.get(identifier);

  if (!attempts || now - attempts.lastAttempt > LOCKOUT_TIME) {
    loginAttempts.set(identifier, { count: 1, lastAttempt: now });
  } else {
    loginAttempts.set(identifier, { count: attempts.count + 1, lastAttempt: now });
  }
}

function clearFailedAttempts(identifier: string): void {
  loginAttempts.delete(identifier);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validated = loginSchema.parse(body);
    const email = validated.email.toLowerCase();

    // Get IP for rate limiting
    const ipAddress = request.headers.get('x-forwarded-for') ||
                      request.headers.get('x-real-ip') ||
                      'Unknown';

    // Check rate limit by IP and email
    const ipLimit = checkRateLimit(`ip:${ipAddress}`);
    const emailLimit = checkRateLimit(`email:${email}`);

    if (!ipLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Too many login attempts. Please try again later.',
          lockoutEnds: ipLimit.lockoutEnds,
        },
        { status: 429 }
      );
    }

    if (!emailLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Account temporarily locked due to too many failed attempts.',
          lockoutEnds: emailLimit.lockoutEnds,
        },
        { status: 429 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Generic error message to prevent user enumeration
    const genericError = 'Invalid email or password';

    if (!user) {
      recordFailedAttempt(`ip:${ipAddress}`);
      recordFailedAttempt(`email:${email}`);
      return NextResponse.json(
        { error: genericError, remainingAttempts: emailLimit.remainingAttempts - 1 },
        { status: 401 }
      );
    }

    // Check if user has a password (might be wallet-only user)
    if (!user.passwordHash) {
      return NextResponse.json(
        { error: 'This account uses wallet authentication. Please connect your wallet to log in.' },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await verifyPassword(validated.password, user.passwordHash);

    if (!isValidPassword) {
      recordFailedAttempt(`ip:${ipAddress}`);
      recordFailedAttempt(`email:${email}`);
      return NextResponse.json(
        { error: genericError, remainingAttempts: emailLimit.remainingAttempts - 1 },
        { status: 401 }
      );
    }

    // Clear failed attempts on successful login
    clearFailedAttempts(`ip:${ipAddress}`);
    clearFailedAttempts(`email:${email}`);

    // Generate tokens
    const { accessToken, refreshToken } = await generateTokenPair(
      {
        userId: user.id,
        email: user.email!,
        role: user.role,
        walletAddress: user.walletAddress || undefined,
      },
      validated.rememberMe
    );

    // Invalidate old sessions if there are too many
    const activeSessions = await prisma.session.count({
      where: { userId: user.id, isValid: true },
    });

    if (activeSessions >= 5) {
      // Invalidate oldest sessions, keeping only 4
      const oldSessions = await prisma.session.findMany({
        where: { userId: user.id, isValid: true },
        orderBy: { lastUsedAt: 'asc' },
        take: activeSessions - 4,
      });

      await prisma.session.updateMany({
        where: { id: { in: oldSessions.map(s => s.id) } },
        data: { isValid: false },
      });
    }

    // Create new session
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    const expiresAt = validated.rememberMe
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        userAgent,
        ipAddress,
        expiresAt,
      },
    });

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Set cookies
    await setAuthCookies(accessToken, refreshToken, validated.rememberMe);

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        walletAddress: user.walletAddress,
        emailVerified: user.emailVerified,
        avatarUrl: user.avatarUrl,
      },
    });

  } catch (error) {
    console.error('Login error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Login failed. Please try again.' },
      { status: 500 }
    );
  }
}
