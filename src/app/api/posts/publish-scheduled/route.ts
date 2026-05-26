import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/posts/publish-scheduled — Check and publish all scheduled posts whose scheduledAt <= now
export async function POST() {
  try {
    const now = new Date();

    const scheduledPosts = await db.post.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: { lte: now },
      },
    });

    let publishedCount = 0;

    for (const post of scheduledPosts) {
      await db.post.update({
        where: { id: post.id },
        data: {
          status: 'POSTED',
          postedAt: now,
          scheduledAt: null,
        },
      });

      // Update author stats
      await db.telegramUser.update({
        where: { id: post.authorId },
        data: { acceptedCount: { increment: 1 } },
      });

      publishedCount++;
    }

    return NextResponse.json({
      published: publishedCount,
      message: publishedCount > 0
        ? `Опубликовано ${publishedCount} запланированных постов`
        : 'Нет постов для публикации',
    });
  } catch (error) {
    console.error('Error publishing scheduled posts:', error);
    return NextResponse.json(
      { error: 'Failed to publish scheduled posts' },
      { status: 500 }
    );
  }
}
