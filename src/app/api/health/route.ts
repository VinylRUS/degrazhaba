import { NextResponse } from 'next/server';

// GET /api/health — Health check endpoint for production monitoring
export async function GET() {
  const startTime = Date.now();

  try {
    // Check database connection
    const { db } = await import('@/lib/db');
    await db.$queryRaw`SELECT 1`;

    // Check realtime service (optional)
    let realtimeStatus = 'unknown';
    try {
      const res = await fetch('http://localhost:3003', {
        method: 'GET',
        signal: AbortSignal.timeout(2000),
      });
      realtimeStatus = res.ok ? 'connected' : 'error';
    } catch {
      realtimeStatus = 'disconnected';
    }

    // Check chat service (optional)
    let chatStatus = 'unknown';
    try {
      const res = await fetch('http://localhost:3004/api/status', {
        signal: AbortSignal.timeout(2000),
      });
      chatStatus = res.ok ? 'connected' : 'error';
    } catch {
      chatStatus = 'disconnected';
    }

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      responseTime: `${Date.now() - startTime}ms`,
      services: {
        database: 'connected',
        realtime: realtimeStatus,
        chat: chatStatus,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Database connection failed',
      },
      { status: 503 }
    );
  }
}
