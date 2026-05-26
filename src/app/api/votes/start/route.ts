import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, unauthorizedResponse } from '@/lib/auth';
import { sanitizeObject, StartVoteSchema } from '@/lib/sanitization';

// POST /api/votes/start - Start a vote session for a post — auth required
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authorized) return unauthorizedResponse();

  try {
    const rawBody = await request.json();
    const body = sanitizeObject(rawBody);

    const validation = StartVoteSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Ошибка валидации', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { postId, durationSec } = validation.data;

    const post = await db.post.findUnique({ where: { id: postId } });
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Check if there's already an active vote for this post
    const activeVote = await db.voteSession.findFirst({
      where: { postId, status: 'ACTIVE' },
    });

    if (activeVote) {
      return NextResponse.json({ error: 'Active vote session already exists for this post' }, { status: 409 });
    }

    const session = await db.voteSession.create({
      data: {
        postId,
        durationSec: durationSec || 30,
      },
      include: { post: { include: { author: true } } },
    });

    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    console.error('Error starting vote:', error);
    return NextResponse.json({ error: 'Failed to start vote' }, { status: 500 });
  }
}
