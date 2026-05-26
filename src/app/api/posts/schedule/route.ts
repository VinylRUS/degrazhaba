import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/posts/schedule — Schedule a post for a specific time
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { postId, scheduledAt } = body;

    if (!postId || !scheduledAt) {
      return NextResponse.json(
        { error: 'postId and scheduledAt are required' },
        { status: 400 }
      );
    }

    const scheduledDate = new Date(scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid scheduledAt date' },
        { status: 400 }
      );
    }

    if (scheduledDate <= new Date()) {
      return NextResponse.json(
        { error: 'scheduledAt must be in the future' },
        { status: 400 }
      );
    }

    const existing = await db.post.findUnique({ where: { id: postId } });
    if (!existing) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const post = await db.post.update({
      where: { id: postId },
      data: {
        status: 'SCHEDULED',
        scheduledAt: scheduledDate,
      },
      include: {
        author: true,
        channel: true,
      },
    });

    return NextResponse.json(post);
  } catch (error) {
    console.error('Error scheduling post:', error);
    return NextResponse.json(
      { error: 'Failed to schedule post' },
      { status: 500 }
    );
  }
}

// GET /api/posts/schedule — List scheduled posts
export async function GET() {
  try {
    const posts = await db.post.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: { not: null },
      },
      include: {
        author: true,
        channel: true,
      },
      orderBy: { scheduledAt: 'asc' },
    });

    return NextResponse.json({ posts, total: posts.length });
  } catch (error) {
    console.error('Error fetching scheduled posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scheduled posts' },
      { status: 500 }
    );
  }
}
