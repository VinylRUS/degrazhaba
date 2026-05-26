import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, unauthorizedResponse } from '@/lib/auth';
import { sanitizeObject, ChatActionSchema } from '@/lib/sanitization';

const CHAT_SERVICE_URL = 'http://localhost:3004';

// GET /api/chat?type=status — Get chat service status (public)
export async function GET(request: NextRequest) {
  try {
    const res = await fetch(`${CHAT_SERVICE_URL}/api/status`);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      {
        twitch: { connected: false, config: null },
        goodgame: { connected: false, config: null },
        realtimeService: { connected: false },
        activeSessions: [],
        _error: 'Чат-сервис недоступен',
      },
      { status: 200 }
    );
  }
}

// POST /api/chat — Proxy actions to chat service — auth required
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authorized) return unauthorizedResponse();

  try {
    const rawBody = await request.json();
    const body = sanitizeObject(rawBody);

    const validation = ChatActionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Ошибка валидации', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { action } = validation.data;

    const validActions: Record<string, string> = {
      'connect/twitch': '/api/connect/twitch',
      'connect/goodgame': '/api/connect/goodgame',
      'disconnect/twitch': '/api/disconnect/twitch',
      'disconnect/goodgame': '/api/disconnect/goodgame',
      'vote-session': '/api/vote-session',
    };

    const targetPath = validActions[action];
    if (!targetPath) {
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    const res = await fetch(`${CHAT_SERVICE_URL}${targetPath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const result = await res.json();
    return NextResponse.json(result, { status: res.status });
  } catch {
    return NextResponse.json(
      { error: 'Чат-сервис недоступен. Убедитесь, что сервис запущен.' },
      { status: 503 }
    );
  }
}

// DELETE /api/chat — Proxy delete actions — auth required
export async function DELETE(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authorized) return unauthorizedResponse();

  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    const res = await fetch(`${CHAT_SERVICE_URL}/api/vote-session/${sessionId}`, {
      method: 'DELETE',
    });

    const result = await res.json();
    return NextResponse.json(result, { status: res.status });
  } catch {
    return NextResponse.json(
      { error: 'Чат-сервис недоступен' },
      { status: 503 }
    );
  }
}
