import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, unauthorizedResponse } from '@/lib/auth';
import { sanitizeObject, CreatePostSchema } from '@/lib/sanitization';

// GET /api/posts - List posts with filters (public — used by Telegram bot)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 200);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);

    const where: Record<string, string> = {};
    if (status) where.status = status;
    if (type) where.type = type;

    const posts = await db.post.findMany({
      where,
      include: {
        author: true,
        channel: true,
        voteSessions: { include: { votes: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await db.post.count({ where });

    return NextResponse.json({ posts, total });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
  }
}

// POST /api/posts - Create a new post (called by Telegram bot — public)
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();
    const body = sanitizeObject(rawBody);

    const validation = CreatePostSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Ошибка валидации', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { type, text, mediaUrl, mediaFileId, youtubeUrl, youtubeTitle, youtubeThumbnail, authorTelegramId, channelId } = validation.data;

    // Find or create the telegram user
    let author = await db.telegramUser.findUnique({
      where: { telegramId: String(authorTelegramId) },
    });

    if (!author) {
      author = await db.telegramUser.create({
        data: {
          telegramId: String(authorTelegramId),
          username: validation.data.authorUsername,
          firstName: validation.data.authorFirstName,
          lastName: validation.data.authorLastName,
        },
      });
    }

    // Increment posts count
    await db.telegramUser.update({
      where: { id: author.id },
      data: { postsCount: { increment: 1 } },
    });

    // Determine channel
    let channelData: { channelId?: string } = {};
    if (channelId) {
      channelData = { channelId };
    } else {
      // Use default channel
      const defaultChannel = await db.channel.findFirst({ where: { isDefault: true } });
      if (defaultChannel) {
        channelData = { channelId: defaultChannel.id };
      }
    }

    const post = await db.post.create({
      data: {
        type,
        text: text || null,
        mediaUrl: mediaUrl || null,
        mediaFileId: mediaFileId || null,
        youtubeUrl: youtubeUrl || null,
        youtubeTitle: youtubeTitle || null,
        youtubeThumbnail: youtubeThumbnail || null,
        authorId: author.id,
        ...channelData,
      },
      include: {
        author: true,
        channel: true,
      },
    });

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
  }
}
