import { NextResponse } from 'next/server';
import { db } from '@/prisma/db';
import { getSession, setSession } from '@/lib/auth/session';
import bcryptjs from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, newPassword } = body;

    if (!name && !newPassword) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const user = await db.orm.public.User.where({ id: session.userId }).first();
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updatedPayload: Record<string, string> = {
      ...user,
    };

    if (name) {
      updatedPayload.name = name;
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
      }
      updatedPayload.passwordHash = await bcryptjs.hash(newPassword, 10);
    }

    await db.orm.public.User.where({ id: session.userId }).update({
      ...updatedPayload,
      updatedAt: new Date().toISOString(),
    });

    // Refresh session if name was changed
    if (name) {
      await setSession({
        userId: session.userId,
        username: session.username,
        role: session.role,
        name: name,
      });
    }

    // Write audit log
    await db.orm.public.AuditLog.create({
      id: `audit-${crypto.randomUUID()}`,
      userId: session.userId,
      action: 'UPDATE_PROFILE',
      details: `User profile updated: ${name ? 'Name updated' : ''} ${newPassword ? 'Password updated' : ''}`,
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update profile:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
