import { NextResponse } from 'next/server';
import { db } from '@/prisma/db';
import { getSession } from '@/lib/auth/session';
import { createIncidentSchema } from '@/schemas/incident';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const severity = searchParams.get('severity');
    const assignee = searchParams.get('assignee');
    const query = searchParams.get('query')?.toLowerCase();

    // Fetch all records sequentially
    let incidents = await db.orm.public.Incident.all();
    const users = await db.orm.public.User.all();
    const rules = await db.orm.public.DetectionRule.all();
    const incidentAssets = await db.orm.public.IncidentAsset.all();
    const assets = await db.orm.public.Asset.all();

    // Filter in memory for full robustness and compatibility
    if (status) {
      if (status === 'UNRESOLVED') {
        incidents = incidents.filter(inc => inc.status !== 'RESOLVED' && inc.status !== 'CLOSED');
      } else {
        incidents = incidents.filter(inc => inc.status === status);
      }
    }
    if (severity) {
      incidents = incidents.filter(inc => inc.severity === severity);
    }
    if (assignee) {
      if (assignee === 'unassigned' || assignee === 'UNASSIGNED') {
        incidents = incidents.filter(inc => !inc.assignedToId);
      } else if (assignee === 'ME') {
        incidents = incidents.filter(inc => inc.assignedToId === session.userId);
      } else {
        incidents = incidents.filter(inc => inc.assignedToId === assignee);
      }
    }

    // Sort by createdAt descending by default
    incidents.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Map relations sequentially
    const result = incidents.map(inc => {
      const assignedTo = users.find(u => u.id === inc.assignedToId);
      const rule = rules.find(r => r.id === inc.ruleId);
      const linkedAssets = incidentAssets
        .filter(ia => ia.incidentId === inc.id)
        .map(ia => assets.find(a => a.id === ia.assetId))
        .filter((a): a is NonNullable<typeof a> => !!a);

      return {
        ...inc,
        assignedTo: assignedTo ? { id: assignedTo.id, username: assignedTo.username, name: assignedTo.name, role: assignedTo.role } : null,
        rule: rule || null,
        assets: linkedAssets
      };
    });

    // Handle search query
    let filteredResult = result;
    if (query) {
      filteredResult = result.filter(inc => 
        inc.title.toLowerCase().includes(query) ||
        inc.description.toLowerCase().includes(query) ||
        inc.category.toLowerCase().includes(query) ||
        (inc.sourceIp && inc.sourceIp.toLowerCase().includes(query)) ||
        (inc.destIp && inc.destIp.toLowerCase().includes(query)) ||
        (inc.assignedTo && inc.assignedTo.name.toLowerCase().includes(query)) ||
        (inc.rule && inc.rule.name.toLowerCase().includes(query)) ||
        (inc.assets && inc.assets.some(a => a.hostname.toLowerCase().includes(query) || a.ipAddress.includes(query)))
      );
    }

    return NextResponse.json({ incidents: filteredResult });
  } catch (error) {
    console.error('Failed to get incidents:', error);
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
    const validation = createIncidentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input', details: validation.error.format() }, { status: 400 });
    }

    const data = validation.data;
    const incidentId = `inc-${crypto.randomUUID()}`;

    // Create incident
    const newIncident = await db.orm.public.Incident.create({
      id: incidentId,
      title: data.title,
      description: data.description,
      status: 'NEW',
      severity: data.severity,
      category: data.category,
      sourceIp: data.sourceIp || null,
      destIp: data.destIp || null,
      ruleId: data.ruleId || null,
      assignedToId: null,
      createdAt: new Date().toISOString(),
    });

    // If assetId is provided, link it in the join table
    if (data.assetId) {
      await db.orm.public.IncidentAsset.create({
        incidentId,
        assetId: data.assetId,
      });
    }

    // Create event timeline entry
    await db.orm.public.EventTimeline.create({
      id: `timeline-${crypto.randomUUID()}`,
      incidentId,
      eventTime: new Date().toISOString(),
      title: 'Incident Created Manually',
      description: `Incident created by admin ${session.username}.`,
      source: 'System',
    });

    // Create audit log
    await db.orm.public.AuditLog.create({
      id: `audit-${crypto.randomUUID()}`,
      userId: session.userId,
      incidentId,
      action: 'CREATE_INCIDENT',
      details: `Created incident: ${data.title}`,
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, incident: newIncident });
  } catch (error) {
    console.error('Failed to create incident:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
