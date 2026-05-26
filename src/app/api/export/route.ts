import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, unauthorizedResponse } from '@/lib/auth';

// GET /api/export — auth required
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authorized) return unauthorizedResponse();

  const searchParams = request.nextUrl.searchParams;
  const format = searchParams.get('format') || 'json';
  const statusParam = searchParams.get('status') || undefined;
  const typeParam = searchParams.get('type') || 'posts'; // posts, users, votes
  const fromParam = searchParams.get('from') || undefined;
  const toParam = searchParams.get('to') || undefined;

  // Validate status filter — supports comma-separated statuses
  const validStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'POSTED', 'DEFERRED'];
  const statusList = statusParam
    ? statusParam.split(',').map((s) => s.trim().toUpperCase()).filter((s) => validStatuses.includes(s))
    : [];
  const statusFilter = statusList.length > 0 ? statusList : undefined;

  // Date range filter
  const dateFrom = fromParam ? new Date(fromParam) : undefined;
  const dateTo = toParam ? new Date(toParam + 'T23:59:59.999Z') : undefined;

  try {
    let data: unknown;
    let filename: string;

    switch (typeParam) {
      case 'posts': {
        const whereClause: Record<string, unknown> = {};
        if (statusFilter) {
          whereClause.status = { in: statusFilter };
        } else if (statusParam && !statusFilter.length) {
          const s = statusParam.toUpperCase();
          if (validStatuses.includes(s)) {
            whereClause.status = s;
          }
        }
        if (dateFrom || dateTo) {
          whereClause.createdAt = {
            ...(dateFrom && { gte: dateFrom }),
            ...(dateTo && { lte: dateTo }),
          };
        }
        const posts = await db.post.findMany({
          where: whereClause,
          include: {
            author: { select: { username: true, telegramId: true, firstName: true } },
            channel: { select: { name: true, telegramId: true } },
            votes: {
              select: {
                id: true,
                status: true,
                votesFor: true,
                votesAgainst: true,
                totalVoters: true,
                finalDecision: true,
                startedAt: true,
                closedAt: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        });
        data = posts;
        const statusSuffix = statusFilter ? `-${statusFilter.join(',').toLowerCase()}` : '';
        const dateSuffix = (dateFrom || dateTo) ? `-${(dateFrom || dateTo)!.toISOString().split('T')[0]}` : '';
        filename = `streampost-posts${statusSuffix}${dateSuffix}-${new Date().toISOString().split('T')[0]}`;
        break;
      }
      case 'votes': {
        const whereClause: Record<string, unknown> = {};
        if (dateFrom || dateTo) {
          whereClause.startedAt = {
            ...(dateFrom && { gte: dateFrom }),
            ...(dateTo && { lte: dateTo }),
          };
        }
        const votes = await db.voteSession.findMany({
          where: whereClause,
          include: {
            post: { select: { id: true, type: true, text: true, status: true } },
          },
          orderBy: { startedAt: 'desc' },
        });
        data = votes;
        filename = `streampost-votes-${new Date().toISOString().split('T')[0]}`;
        break;
      }
      case 'users': {
        const users = await db.telegramUser.findMany({
          orderBy: { createdAt: 'desc' },
        });
        data = users;
        filename = `streampost-users-${new Date().toISOString().split('T')[0]}`;
        break;
      }
      default:
        return NextResponse.json(
          { error: 'Неверный тип. Используйте: posts, users, votes' },
          { status: 400 }
        );
    }

    // CSV format
    if (format === 'csv') {
      if (typeParam === 'posts') {
        const posts = data as Record<string, unknown>[];
        const csvHeaders = 'ID,Type,Status,Text,Author,Channel,Created At,Votes For,Votes Against,Final Decision';
        const csvRows = posts.map((post) => {
          const author = post.author as Record<string, unknown> | null;
          const channel = post.channel as Record<string, unknown> | null;
          const votes = post.votes as Record<string, unknown>[] | null;
          const lastVote = votes && votes.length > 0 ? votes[votes.length - 1] : null;
          return [
            csvEscape(String(post.id || '')),
            csvEscape(String(post.type || '')),
            csvEscape(String(post.status || '')),
            csvEscape(String(post.text || '')),
            csvEscape(author ? String(author.username || author.firstName || author.telegramId || '') : ''),
            csvEscape(channel ? String(channel.name || channel.telegramId || '') : ''),
            csvEscape(String(post.createdAt || '')),
            csvEscape(String(lastVote?.votesFor ?? '')),
            csvEscape(String(lastVote?.votesAgainst ?? '')),
            csvEscape(String(lastVote?.finalDecision ?? '')),
          ].join(',');
        });
        const csv = [csvHeaders, ...csvRows].join('\n');

        return new NextResponse(csv, {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="${filename}.csv"`,
          },
        });
      }

      if (typeParam === 'votes') {
        const votes = data as Record<string, unknown>[];
        const csvHeaders = 'ID,Post ID,Post Type,Status,Votes For,Votes Against,Total Voters,Final Decision,Started At,Closed At';
        const csvRows = votes.map((vote) => {
          const post = vote.post as Record<string, unknown> | null;
          return [
            csvEscape(String(vote.id || '')),
            csvEscape(String(vote.postId || '')),
            csvEscape(String(post?.type || '')),
            csvEscape(String(vote.status || '')),
            csvEscape(String(vote.votesFor ?? '')),
            csvEscape(String(vote.votesAgainst ?? '')),
            csvEscape(String(vote.totalVoters ?? '')),
            csvEscape(String(vote.finalDecision ?? '')),
            csvEscape(String(vote.startedAt || '')),
            csvEscape(String(vote.closedAt ?? '')),
          ].join(',');
        });
        const csv = [csvHeaders, ...csvRows].join('\n');

        return new NextResponse(csv, {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="${filename}.csv"`,
          },
        });
      }

      // Generic CSV
      const items = data as Record<string, unknown>[];
      if (items.length === 0) {
        return new NextResponse('', {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="${filename}.csv"`,
          },
        });
      }

      const flatten = (
        obj: Record<string, unknown>,
        prefix = ''
      ): Record<string, string> => {
        const result: Record<string, string> = {};
        for (const [key, value] of Object.entries(obj)) {
          const newKey = prefix ? `${prefix}.${key}` : key;
          if (value && typeof value === 'object' && !Array.isArray(value)) {
            Object.assign(
              result,
              flatten(value as Record<string, unknown>, newKey)
            );
          } else {
            result[newKey] = String(value ?? '');
          }
        }
        return result;
      };

      const flatItems = items.map((item) => flatten(item));
      const headers = Object.keys(flatItems[0]);
      const csvRows = [
        headers.join(','),
        ...flatItems.map((item) =>
          headers
            .map((h) => csvEscape(item[h] || ''))
            .join(',')
        ),
      ];
      const csv = csvRows.join('\n');

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}.csv"`,
        },
      });
    }

    // Votes-only format
    if (format === 'votes') {
      const posts = data as Record<string, unknown>[];
      const voteData = posts
        .filter((post) => {
          const votes = post.votes as Record<string, unknown>[] | null;
          return votes && votes.length > 0;
        })
        .map((post) => {
          const votes = post.votes as Record<string, unknown>[];
          const lastVote = votes[votes.length - 1];
          return {
            postId: post.id,
            postType: post.type,
            postStatus: post.status,
            postText: post.text,
            sessionId: lastVote.id,
            votesFor: lastVote.votesFor,
            votesAgainst: lastVote.votesAgainst,
            totalVoters: lastVote.totalVoters,
            finalDecision: lastVote.finalDecision,
            startedAt: lastVote.startedAt,
            closedAt: lastVote.closedAt,
          };
        });

      return new NextResponse(JSON.stringify(voteData, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="streampost-vote-data-${new Date().toISOString().split('T')[0]}.json"`,
        },
      });
    }

    // JSON format
    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}.json"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Ошибка экспорта' }, { status: 500 });
  }
}

// Proper CSV escaping
function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
