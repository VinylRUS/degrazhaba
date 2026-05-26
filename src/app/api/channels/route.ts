import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, unauthorizedResponse } from '@/lib/auth';
import { sanitizeObject, CreateChannelSchema } from '@/lib/sanitization';

// GET /api/channels (public)
export async function GET() {
  try {
    const channels = await db.channel.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { posts: true } } },
    });
    return NextResponse.json(channels);
  } catch (error) {
    console.error('Error fetching channels:', error);
    return NextResponse.json({ error: 'Failed to fetch channels' }, { status: 500 });
  }
}

// POST /api/channels — auth required (ADMIN only)
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authorized) return unauthorizedResponse();
  if (auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
  }

  try {
    const rawBody = await request.json();
    const body = sanitizeObject(rawBody);

    const validation = CreateChannelSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Ошибка валидации', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { telegramId, name, isDefault } = validation.data;

    // If setting as default, unset other defaults
    if (isDefault) {
      await db.channel.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const channel = await db.channel.create({
      data: { telegramId, name, isDefault: isDefault || false },
    });

    return NextResponse.json(channel, { status: 201 });
  } catch (error) {
    console.error('Error creating channel:', error);
    return NextResponse.json({ error: 'Failed to create channel' }, { status: 500 });
  }
}
