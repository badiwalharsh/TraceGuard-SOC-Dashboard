import { NextResponse } from 'next/server';
import { db } from '@/prisma/db';
import { getSession } from '@/lib/auth/session';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let auditLogs = await db.orm.public.AuditLog.all();

    // Filter analyst logs to their own activity, admin sees all
    if (session.role !== 'ADMIN') {
      auditLogs = auditLogs.filter(log => log.userId === session.userId);
    }

    // Sort by createdAt descending
    auditLogs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ auditLogs });
  } catch (error) {
    console.error('Failed to retrieve audit logs:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
