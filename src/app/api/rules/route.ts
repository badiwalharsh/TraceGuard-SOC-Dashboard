import { NextResponse } from 'next/server';
import { db } from '@/prisma/db';
import { getSession } from '@/lib/auth/session';
import { detectionRuleSchema } from '@/schemas/rule';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rules = await db.orm.public.DetectionRule.all();
    rules.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ rules });
  } catch (error) {
    console.error('Failed to retrieve rules:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden. Admin privileges required.' }, { status: 403 });
    }

    const body = await request.json();
    const validation = detectionRuleSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input', details: validation.error.format() }, { status: 400 });
    }

    const data = validation.data;
    const ruleId = `rule-${crypto.randomUUID()}`;

    // Create rule
    const newRule = await db.orm.public.DetectionRule.create({
      id: ruleId,
      name: data.name,
      description: data.description,
      severity: data.severity,
      category: data.category,
      mitreAttack: data.mitreAttack,
      query: data.query,
      enabled: data.enabled ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Create audit log
    await db.orm.public.AuditLog.create({
      id: `audit-${crypto.randomUUID()}`,
      userId: session.userId,
      action: 'CREATE_RULE',
      details: `Created detection rule: ${data.name}`,
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, rule: newRule });
  } catch (error) {
    console.error('Failed to create rule:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
