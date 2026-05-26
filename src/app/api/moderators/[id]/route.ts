import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, unauthorizedResponse } from '@/lib/auth';
import { sanitizeObject, UpdateModeratorSchema } from '@/lib/sanitization';

// PATCH /api/moderators/[id] - Update moderator role — auth required (ADMIN only)
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

    const validation = UpdateModeratorSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Ошибка валидации', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { role } = validation.data;

    const moderator = await db.moderator.update({
      where: { id },
      data: { role },
      include: { user: true },
    });

    return NextResponse.json(moderator);
  } catch (error) {
    console.error('Error updating moderator:', error);
    return NextResponse.json({ error: 'Failed to update moderator' }, { status: 500 });
  }
}

// DELETE /api/moderators/[id] — auth required (ADMIN only)
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
    await db.moderator.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting moderator:', error);
    return NextResponse.json({ error: 'Failed to delete moderator' }, { status: 500 });
  }
}
