import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/activity — Returns recent activity (last 20 post status changes)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');

    const posts = await db.post.findMany({
      where: {
        status: { in: ['APPROVED', 'REJECTED', 'POSTED', 'DEFERRED', 'SCHEDULED'] },
      },
      include: {
        author: true,
        channel: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });

    const activity = posts.map((post) => {
      const typeMap: Record<string, string> = {
        APPROVED: 'accept',
        REJECTED: 'reject',
        POSTED: 'publish',
        DEFERRED: 'defer',
        SCHEDULED: 'schedule',
      };

      return {
        postId: post.id,
        type: typeMap[post.status] || 'unknown',
        status: post.status,
        text: post.text
          ? post.text.slice(0, 80) + (post.text.length > 80 ? '...' : '')
          : post.youtubeTitle || (post.type === 'PHOTO' ? '📷 Фото' : '📝 Пост'),
        author: post.author?.username || 'anonymous',
        updatedAt: post.updatedAt,
      };
    });

    return NextResponse.json({ activity, total: activity.length });
  } catch (error) {
    console.error('Error fetching activity:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity' },
      { status: 500 }
    );
  }
}
