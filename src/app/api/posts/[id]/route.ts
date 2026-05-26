import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, unauthorizedResponse } from '@/lib/auth';
import { sanitizeObject, UpdatePostSchema } from '@/lib/sanitization';

// GET /api/posts/[id] - Get single post (public)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const post = await db.post.findUnique({
      where: { id },
      include: {
        author: true,
        channel: true,
        voteSessions: { include: { votes: true } },
      },
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    return NextResponse.json(post);
  } catch (error) {
    console.error('Error fetching post:', error);
    return NextResponse.json({ error: 'Failed to fetch post' }, { status: 500 });
  }
}

// PATCH /api/posts/[id] - Update post (approve/reject/post/defer) — auth required
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (!auth.authorized) return unauthorizedResponse();

  try {
    const { id } = await params;
    const rawBody = await request.json();
    const body = sanitizeObject(rawBody);

    const validation = UpdatePostSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Ошибка валидации', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { status, reviewerId } = validation.data;

    const existing = await db.post.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = { status };
    if (reviewerId) updateData.reviewerId = reviewerId;

    if (status === 'APPROVED' || status === 'REJECTED') {
      updateData.reviewedAt = new Date();
    }

    if (status === 'POSTED') {
      updateData.postedAt = new Date();
    }

    const post = await db.post.update({
      where: { id },
      data: updateData,
      include: {
        author: true,
        channel: true,
      },
    });

    // Update author stats
    if (status === 'APPROVED' || status === 'POSTED') {
      await db.telegramUser.update({
        where: { id: post.authorId },
        data: { acceptedCount: { increment: 1 } },
      });
    } else if (status === 'REJECTED') {
      await db.telegramUser.update({
        where: { id: post.authorId },
        data: { rejectedCount: { increment: 1 } },
      });
    }

    return NextResponse.json(post);
  } catch (error) {
    console.error('Error updating post:', error);
    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
  }
}

// DELETE /api/posts/[id] - Delete a post — auth required (ADMIN only)
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
    await db.post.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting post:', error);
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
  }
}
