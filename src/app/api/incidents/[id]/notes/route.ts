import { NextResponse } from 'next/server';
import { db } from '@/prisma/db';
import { getSession } from '@/lib/auth/session';
import { addNoteSchema } from '@/schemas/incident';

function sanitizeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function POST(
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
    const validation = addNoteSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input', details: validation.error.format() }, { status: 400 });
    }

    // Check if incident exists
    const incident = await db.orm.public.Incident.where({ id }).first();
    if (!incident) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }

    // Enforce authorization: only ADMIN or Assigned ANALYST can add notes
    if (session.role === 'ANALYST') {
      if (incident.assignedToId !== session.userId) {
        return NextResponse.json(
          { error: 'Forbidden. You are not authorized to add notes to this incident.' },
          { status: 403 }
        );
      }
    }

    const { content } = validation.data;
    const sanitizedContent = sanitizeHtml(content);

    const noteId = `note-${crypto.randomUUID()}`;

    // Create note
    const newNote = await db.orm.public.Note.create({
      id: noteId,
      incidentId: id,
      userId: session.userId,
      content: sanitizedContent,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Create timeline event
    await db.orm.public.EventTimeline.create({
      id: `timeline-${crypto.randomUUID()}`,
      incidentId: id,
      eventTime: new Date().toISOString(),
      title: 'Analyst Note Added',
      description: `Analyst ${session.username} added an investigation note.`,
      source: 'AnalystNote',
    });

    // Create audit log
    await db.orm.public.AuditLog.create({
      id: `audit-${crypto.randomUUID()}`,
      userId: session.userId,
      incidentId: id,
      action: 'ADD_NOTE',
      details: `Added note: "${sanitizedContent.substring(0, 50)}..."`,
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      note: {
        ...newNote,
        author: {
          name: session.name,
          username: session.username,
          role: session.role
        }
      }
    });
  } catch (error) {
    console.error('Failed to add note:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
