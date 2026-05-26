import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, unauthorizedResponse } from '@/lib/auth';

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_CONTENT_PREFIXES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'image/svg+xml', 'image/avif', 'image/bmp', 'image/x-icon',
  'video/mp4', 'video/webm', 'video/ogg',
];

/**
 * GET /api/proxy/image?url=... — Proxy external images through our server.
 *
 * Benefits:
 * - Avoids CORS issues in OBS overlay and browser extensions
 * - Hides referrer information from external servers
 * - Validates content type before serving
 * - Enforces size limits
 * - Adds caching headers for performance
 */
export async function GET(request: NextRequest) {
  // Auth check — only authenticated users or overlay can use the proxy
  const auth = await requireAuth(request);
  if (!auth.authorized) {
    return unauthorizedResponse();
  }

  const url = request.nextUrl.searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'Параметр url обязателен' }, { status: 400 });
  }

  // Validate URL format and protocol
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return NextResponse.json({ error: 'Неподдерживаемый протокол URL' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Некорректный URL' }, { status: 400 });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'StreamPost/1.0 ImageProxy',
        'Accept': 'image/*,video/*',
      },
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Не удалось загрузить изображение', upstreamStatus: response.status },
        { status: 502 }
      );
    }

    const contentType = response.headers.get('content-type') || '';

    // Block non-image/non-video content to prevent serving malicious files
    const isAllowedType = ALLOWED_CONTENT_PREFIXES.some(
      (prefix) => contentType.startsWith(prefix) || contentType.startsWith(prefix.split('/')[0])
    );

    // If we can't verify content type, check the URL extension as fallback
    if (!isAllowedType && contentType === 'application/octet-stream') {
      const urlPath = new URL(url).pathname.toLowerCase();
      const hasImageExt = /\.(jpg|jpeg|png|gif|webp|svg|avif|bmp|mp4|webm|ogg)$/i.test(urlPath);
      if (!hasImageExt) {
        return NextResponse.json({ error: 'Тип контента не разрешён' }, { status: 400 });
      }
    } else if (!isAllowedType) {
      return NextResponse.json({ error: 'Тип контента не разрешён' }, { status: 400 });
    }

    const buffer = await response.arrayBuffer();

    // Size limit
    if (buffer.byteLength > MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: 'Файл слишком большой (макс. 10МБ)' }, { status: 413 });
    }

    // Return with proper caching and security headers
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType || 'application/octet-stream',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, immutable',
        'X-Content-Type-Options': 'nosniff',
        'Content-Length': buffer.byteLength.toString(),
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('[ImageProxy] Error fetching:', url, error);
    return NextResponse.json({ error: 'Не удалось загрузить изображение' }, { status: 500 });
  }
}
