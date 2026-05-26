import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, unauthorizedResponse } from '@/lib/auth';
import { sanitizeObject, UpdateChannelSchema } from '@/lib/sanitization';

// PATCH /api/channels/[id] — auth required (ADMIN only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (!auth.authorized) return unauthorizedResponse();
  if (auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const rawBody = await request.json();
    const body = sanitizeObject(rawBody);

    const validation = UpdateChannelSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Ошибка валидации', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { telegramId, name, isDefault } = validation.data;

    if (isDefault) {
      await db.channel.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const channel = await db.channel.update({
      where: { id },
      data: {
        ...(telegramId && { telegramId }),
        ...(name && { name }),
        ...(isDefault !== undefined && { isDefault }),
      },
    });

    return NextResponse.json(channel);
  } catch (error) {
    console.error('Error updating channel:', error);
    return NextResponse.json({ error: 'Failed to update channel' }, { status: 500 });
  }
}

// DELETE /api/channels/[id] — auth required (ADMIN only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (!auth.authorized) return unauthorizedResponse();
  if (auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
  }

  try {
    const { id } = await params;
    await db.channel.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting channel:', error);
    return NextResponse.json({ error: 'Failed to delete channel' }, { status: 500 });
  }
}
