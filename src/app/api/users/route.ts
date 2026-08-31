import { NextResponse } from 'next/server';
import { db } from '@/prisma/db';
import { getSession } from '@/lib/auth/session';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const users = await db.orm.public.User.all();
    
    // Return sanitized user list with only necessary fields
    const sanitizedUsers = users.map(u => ({
      id: u.id,
      name: u.name,
      role: u.role,
      username: u.username,
    }));

    // Sort by name
    sanitizedUsers.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ users: sanitizedUsers });
  } catch (error) {
    console.error('Failed to retrieve users:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
