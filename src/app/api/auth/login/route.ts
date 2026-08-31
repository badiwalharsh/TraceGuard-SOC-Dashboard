import { NextResponse } from 'next/server';
import { db } from '@/prisma/db';
import { setSession } from '@/lib/auth/session';
import { loginSchema } from '@/schemas/auth';
import bcryptjs from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = loginSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input data', details: result.error.format() },
        { status: 400 }
      );
    }
    
    const { username, password } = result.data;
    
    // Find user in database
    const user = await db.orm.public.User.where({ username }).first();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }
    
    // Verify password hash
    const isPasswordValid = await bcryptjs.compare(password, user.passwordHash);
    
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }
    
    // Create session cookie
    await setSession({
      userId: user.id,
      username: user.username,
      role: user.role as 'ADMIN' | 'ANALYST',
      name: user.name,
    });

    // Audit log login event
    await db.orm.public.AuditLog.create({
      id: `audit-${crypto.randomUUID()}`,
      userId: user.id,
      action: 'USER_LOGIN',
      details: `User ${username} logged in successfully.`,
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
      createdAt: new Date().toISOString(),
    });
    
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
