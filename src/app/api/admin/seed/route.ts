import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth/password';

// One-time admin seeding endpoint
// Protected by a secret key to prevent unauthorized access
const SEED_SECRET = process.env.ADMIN_SEED_SECRET || 'trueticket-seed-secret-2024';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Verify seed secret
    if (body.secret !== SEED_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const email = 'admin@trueticket.me';
    const password = 'TrueTicket2024.';

    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email },
    });

    if (existingAdmin) {
      // Update to admin role if not already
      if (existingAdmin.role !== 'ADMIN') {
        await prisma.user.update({
          where: { id: existingAdmin.id },
          data: { role: 'ADMIN' },
        });
        return NextResponse.json({
          success: true,
          message: 'Updated existing user to ADMIN role',
          userId: existingAdmin.id,
        });
      }
      return NextResponse.json({
        success: true,
        message: 'Admin account already exists',
        userId: existingAdmin.id,
      });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create admin user
    const admin = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: 'ADMIN',
        emailVerified: true,
        displayName: 'TrueTicket Admin',
        firstName: 'Admin',
        lastName: 'User',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Admin account created',
      userId: admin.id,
      credentials: {
        email,
        password,
      },
    });
  } catch (error) {
    console.error('Admin seed error:', error);
    return NextResponse.json(
      { error: 'Failed to seed admin account' },
      { status: 500 }
    );
  }
}
