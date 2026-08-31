import { NextResponse } from 'next/server';
import { db } from '@/prisma/db';
import { getSession } from '@/lib/auth/session';
import { updateIncidentSchema } from '@/schemas/incident';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // 1. Fetch incident
    const incident = await db.orm.public.Incident.where({ id }).first();
    if (!incident) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }

    // 2. Prevent insecure direct object references (IDOR) for analysts
    if (session.role === 'ANALYST') {
      if (incident.assignedToId !== null && incident.assignedToId !== session.userId) {
        return NextResponse.json(
          { error: 'Forbidden. Access to this incident is restricted.' },
          { status: 403 }
        );
      }
    }

    // 3. Fetch associated rule
    let rule = null;
    if (incident.ruleId) {
      rule = await db.orm.public.DetectionRule.where({ id: incident.ruleId }).first();
    }

    // 4. Fetch assignee details
    let assignedTo = null;
    if (incident.assignedToId) {
      const user = await db.orm.public.User.where({ id: incident.assignedToId }).first();
      if (user) {
        assignedTo = {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
        };
      }
    }

    // 5. Fetch timeline events
    const timelineEvents = await db.orm.public.EventTimeline.where({ incidentId: id }).all();
    timelineEvents.sort((a, b) => new Date(a.eventTime).getTime() - new Date(b.eventTime).getTime());

    // 6. Fetch notes and map authors
    const notes = await db.orm.public.Note.where({ incidentId: id }).all();
    const users = await db.orm.public.User.all();
    const notesWithAuthor = notes.map(note => {
      const author = users.find(u => u.id === note.userId);
      return {
        ...note,
        author: author ? { name: author.name, username: author.username, role: author.role } : null
      };
    });
    notesWithAuthor.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    // 7. Fetch assets
    const incidentAssets = await db.orm.public.IncidentAsset.where({ incidentId: id }).all();
    const allAssets = await db.orm.public.Asset.all();
    const assets = incidentAssets.map(ia => allAssets.find(a => a.id === ia.assetId)).filter(Boolean);

    return NextResponse.json({
      incident: {
        ...incident,
        rule,
        assignedTo,
        timelineEvents,
        notes: notesWithAuthor,
        assets,
      }
    });
  } catch (error) {
    console.error('Failed to retrieve incident details:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validation = updateIncidentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input data', details: validation.error.format() }, { status: 400 });
    }

    const updates = validation.data;

    // Fetch existing incident
    const incident = await db.orm.public.Incident.where({ id }).first();
    if (!incident) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }

    // Enforce role-based authorization and prevent IDOR
    if (session.role === 'ANALYST') {
      // 1. Analyst cannot touch incidents assigned to other analysts
      if (incident.assignedToId !== null && incident.assignedToId !== session.userId) {
        return NextResponse.json(
          { error: 'Forbidden. You are not authorized to update this incident.' },
          { status: 403 }
        );
      }
      
      // 2. Analyst can claim unassigned incident, or unassign themselves, but cannot assign to others
      if (updates.assignedToId !== undefined && updates.assignedToId !== null && updates.assignedToId !== session.userId) {
        return NextResponse.json(
          { error: 'Forbidden. Analysts cannot assign incidents to other users.' },
          { status: 403 }
        );
      }
    }

    // Capture logs for timeline and audit
    const changes: string[] = [];
    const updatePayload: Record<string, string | null> = {};

    if (updates.status !== undefined && updates.status !== incident.status) {
      changes.push(`status changed from ${incident.status} to ${updates.status}`);
      updatePayload.status = updates.status;
    }

    if (updates.severity !== undefined && updates.severity !== incident.severity) {
      changes.push(`severity changed from ${incident.severity} to ${updates.severity}`);
      updatePayload.severity = updates.severity;
    }

    if (updates.assignedToId !== undefined && updates.assignedToId !== incident.assignedToId) {
      const users = await db.orm.public.User.all();
      const oldUser = incident.assignedToId ? users.find(u => u.id === incident.assignedToId) : null;
      const newUser = updates.assignedToId ? users.find(u => u.id === updates.assignedToId) : null;
      
      const oldName = oldUser ? oldUser.name : 'Unassigned';
      const newName = newUser ? newUser.name : 'Unassigned';
      
      changes.push(`assignment changed from ${oldName} to ${newName}`);
      updatePayload.assignedToId = updates.assignedToId;
    }

    if (changes.length === 0) {
      return NextResponse.json({ success: true, message: 'No changes detected' });
    }

    // Apply updates
    await db.orm.public.Incident.where({ id }).update({
      ...incident,
      ...updatePayload,
      updatedAt: new Date().toISOString(),
    });

    // Create timeline logs for each change
    for (const change of changes) {
      await db.orm.public.EventTimeline.create({
        id: `timeline-${crypto.randomUUID()}`,
        incidentId: id,
        eventTime: new Date().toISOString(),
        title: 'Incident Updated',
        description: `Analyst ${session.username} updated incident: ${change}`,
        source: 'StatusChange',
      });
    }

    // Write audit log
    await db.orm.public.AuditLog.create({
      id: `audit-${crypto.randomUUID()}`,
      userId: session.userId,
      incidentId: id,
      action: 'UPDATE_INCIDENT',
      details: `Updated incident parameters: ${changes.join(', ')}`,
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, changes });
  } catch (error) {
    console.error('Failed to update incident details:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    // Only Admin can delete/archive incidents
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden. Admin privileges required.' }, { status: 403 });
    }

    const { id } = await params;

    // Check if incident exists
    const incident = await db.orm.public.Incident.where({ id }).first();
    if (!incident) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }

    // 1. Delete associated notes
    await db.orm.public.Note.where({ incidentId: id }).delete();

    // 2. Delete associated timeline events
    await db.orm.public.EventTimeline.where({ incidentId: id }).delete();

    // 3. Delete associated IncidentAsset relations
    await db.orm.public.IncidentAsset.where({ incidentId: id }).delete();

    // 4. Update SecurityEvents to sever relationship
    const securityEvents = await db.orm.public.SecurityEvent.where({ incidentId: id }).all();
    for (const event of securityEvents) {
      await db.orm.public.SecurityEvent.where({ id: event.id }).update({
        ...event,
        incidentId: null
      });
    }

    // 5. Update AuditLogs to set incidentId to null to preserve immutable log integrity
    const auditLogs = await db.orm.public.AuditLog.where({ incidentId: id }).all();
    for (const log of auditLogs) {
      await db.orm.public.AuditLog.where({ id: log.id }).update({
        ...log,
        incidentId: null
      });
    }

    // 6. Delete incident itself
    await db.orm.public.Incident.where({ id }).delete();

    // 7. Write central audit log for the delete action
    await db.orm.public.AuditLog.create({
      id: `audit-${crypto.randomUUID()}`,
      userId: session.userId,
      action: 'DELETE_INCIDENT',
      details: `Safely deleted incident: "${incident.title}" (ID: ${id})`,
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, message: 'Incident safely deleted.' });
  } catch (error) {
    console.error('Failed to delete incident:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
