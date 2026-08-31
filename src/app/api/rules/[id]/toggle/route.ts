import { NextResponse } from 'next/server';
import { db } from '@/prisma/db';
import { getSession } from '@/lib/auth/session';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden. Admin privileges required.' }, { status: 403 });
    }

    const { id } = await params;
    
    const rule = await db.orm.public.DetectionRule.where({ id }).first();
    if (!rule) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    const nextState = !rule.enabled;

    await db.orm.public.DetectionRule.where({ id }).update({
      ...rule,
      enabled: nextState,
      updatedAt: new Date().toISOString(),
    });

    // Create audit log
    await db.orm.public.AuditLog.create({
      id: `audit-${crypto.randomUUID()}`,
      userId: session.userId,
      action: 'TOGGLE_RULE',
      details: `${nextState ? 'Enabled' : 'Disabled'} detection rule: ${rule.name}`,
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, enabled: nextState });
  } catch (error) {
    console.error('Failed to toggle rule state:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
