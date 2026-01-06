import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { hashPassword, validatePasswordStrength } from '@/lib/auth/password';
import { generateTokenPair, setAuthCookies } from '@/lib/auth/jwt';
import crypto from 'crypto';

// Validation schema
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  role: z.enum(['USER', 'ORGANIZER', 'VENUE', 'ARTIST']).default('USER'),
  walletAddress: z.string().optional(),
  phone: z.string().optional(),
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: 'You must accept the terms and conditions',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validated = registerSchema.parse(body);

    // Validate password strength
    const passwordCheck = validatePasswordStrength(validated.password);
    if (!passwordCheck.valid) {
      return NextResponse.json(
        { error: 'Password too weak', details: passwordCheck.errors },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validated.email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // Check if wallet already exists (if provided)
    if (validated.walletAddress) {
      const existingWallet = await prisma.user.findUnique({
        where: { walletAddress: validated.walletAddress },
      });

      if (existingWallet) {
        return NextResponse.json(
          { error: 'An account with this wallet address already exists' },
          { status: 409 }
        );
      }
    }

    // Hash password
    const passwordHash = await hashPassword(validated.password);

    // Generate email verification token
    const emailVerifyToken = crypto.randomBytes(32).toString('hex');
    const emailVerifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user
    const user = await prisma.user.create({
      data: {
        email: validated.email.toLowerCase(),
        passwordHash,
        firstName: validated.firstName,
        lastName: validated.lastName,
        displayName: `${validated.firstName} ${validated.lastName}`,
        role: validated.role,
        walletAddress: validated.walletAddress,
        phone: validated.phone,
        emailVerifyToken,
        emailVerifyExpiry,
        emailVerified: false,
        // Set legacy flags based on role
        isArtist: validated.role === 'ARTIST',
        isVenue: validated.role === 'VENUE',
      },
    });

    // Generate tokens
    const { accessToken, refreshToken } = await generateTokenPair({
      userId: user.id,
      email: user.email!,
      role: user.role,
      walletAddress: user.walletAddress || undefined,
    });

    // Create session record
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    const ipAddress = request.headers.get('x-forwarded-for') ||
                      request.headers.get('x-real-ip') ||
                      'Unknown';

    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        userAgent,
        ipAddress,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Set cookies
    await setAuthCookies(accessToken, refreshToken);

    // TODO: Send verification email
    // await sendVerificationEmail(user.email, emailVerifyToken);

    return NextResponse.json({
      success: true,
      message: 'Registration successful. Please check your email to verify your account.',
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        walletAddress: user.walletAddress,
        emailVerified: user.emailVerified,
      },
    }, { status: 201 });

  } catch (error) {
    console.error('Registration error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    // Return error details for debugging (temporarily)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        error: 'Registration failed. Please try again.',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
