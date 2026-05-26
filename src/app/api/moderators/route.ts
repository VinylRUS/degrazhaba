import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, unauthorizedResponse } from '@/lib/auth';
import { sanitizeObject, CreateModeratorSchema } from '@/lib/sanitization';

// GET /api/moderators (public for dashboard)
export async function GET() {
  try {
    const moderators = await db.moderator.findMany({
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(moderators);
  } catch (error) {
    console.error('Error fetching moderators:', error);
    return NextResponse.json({ error: 'Failed to fetch moderators' }, { status: 500 });
  }
}

// POST /api/moderators — auth required (ADMIN only)
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authorized) return unauthorizedResponse();
  if (auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
  }

  try {
    const rawBody = await request.json();
    const body = sanitizeObject(rawBody);

    const validation = CreateModeratorSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Ошибка валидации', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { telegramId, username, firstName, lastName, role, addedById } = validation.data;

    // Find or create the telegram user
    let user = await db.telegramUser.findUnique({
      where: { telegramId: String(telegramId) },
    });

    if (!user) {
      user = await db.telegramUser.create({
        data: {
          telegramId: String(telegramId),
          username,
          firstName,
          lastName,
        },
      });
    }

    // Check if already a moderator
    const existing = await db.moderator.findUnique({
      where: { userId: user.id },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Пользователь уже является модератором' },
        { status: 409 }
      );
    }

    const moderator = await db.moderator.create({
      data: {
        userId: user.id,
        role: role || 'MODERATOR',
        addedById,
      },
      include: { user: true },
    });

    return NextResponse.json(moderator, { status: 201 });
  } catch (error) {
    console.error('Error creating moderator:', error);
    return NextResponse.json({ error: 'Failed to create moderator' }, { status: 500 });
  }
}
