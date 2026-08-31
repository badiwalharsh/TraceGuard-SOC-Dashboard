import { NextResponse } from 'next/server';
import { clearSession, getSession } from '@/lib/auth/session';
import { db } from '@/prisma/db';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    
    if (session) {
      // Audit log logout event
      await db.orm.public.AuditLog.create({
        id: `audit-${crypto.randomUUID()}`,
        userId: session.userId,
        action: 'USER_LOGOUT',
        details: `User ${session.username} logged out.`,
        ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
        createdAt: new Date().toISOString(),
      });
    }
    
    await clearSession();
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
