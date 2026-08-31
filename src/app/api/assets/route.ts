import { NextResponse } from 'next/server';
import { db } from '@/prisma/db';
import { getSession } from '@/lib/auth/session';
import { createAssetSchema } from '@/schemas/asset';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const assets = await db.orm.public.Asset.all();
    assets.sort((a, b) => a.hostname.localeCompare(b.hostname));

    return NextResponse.json({ assets });
  } catch (error) {
    console.error('Failed to retrieve assets:', error);
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
    const validation = createAssetSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input', details: validation.error.format() }, { status: 400 });
    }

    const data = validation.data;
    const assetId = `asset-${crypto.randomUUID()}`;

    // Create asset
    const newAsset = await db.orm.public.Asset.create({
      id: assetId,
      hostname: data.hostname,
      ipAddress: data.ipAddress,
      assetType: data.assetType,
      owner: data.owner,
      criticality: data.criticality,
      os: data.os,
      location: data.location,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Create audit log
    await db.orm.public.AuditLog.create({
      id: `audit-${crypto.randomUUID()}`,
      userId: session.userId,
      action: 'CREATE_ASSET',
      details: `Created asset: ${data.hostname} (${data.ipAddress})`,
      ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, asset: newAsset });
  } catch (error) {
    console.error('Failed to create asset:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
