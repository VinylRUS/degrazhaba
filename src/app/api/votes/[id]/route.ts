import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, unauthorizedResponse } from '@/lib/auth';
import { sanitizeObject, CloseVoteSchema } from '@/lib/sanitization';

// GET /api/votes/[id] - Get vote session details (public)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await db.voteSession.findUnique({
      where: { id },
      include: {
        post: { include: { author: true } },
        votes: true,
      },
    });

    if (!session) {
      return NextResponse.json({ error: 'Vote session not found' }, { status: 404 });
    }

    return NextResponse.json(session);
  } catch (error) {
    console.error('Error fetching vote session:', error);
    return NextResponse.json({ error: 'Failed to fetch vote session' }, { status: 500 });
  }
}

// PATCH /api/votes/[id] - Close a vote session — auth required
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

    const validation = CloseVoteSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Ошибка валидации', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { finalDecision, streamerFollowedChat } = validation.data;

    const session = await db.voteSession.update({
      where: { id },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        finalDecision,
        ...(streamerFollowedChat !== undefined && { streamerFollowedChat }),
      },
      include: {
        post: { include: { author: true } },
        votes: true,
      },
    });

    // If decision is to post, update the post status
    if (finalDecision === 'POSTED') {
      await db.post.update({
        where: { id: session.postId },
        data: { status: 'POSTED', postedAt: new Date() },
      });
    } else if (finalDecision === 'SKIPPED') {
      await db.post.update({
        where: { id: session.postId },
        data: { status: 'REJECTED', reviewedAt: new Date() },
      });
    }

    return NextResponse.json(session);
  } catch (error) {
    console.error('Error closing vote session:', error);
    return NextResponse.json({ error: 'Failed to close vote session' }, { status: 500 });
  }
}
