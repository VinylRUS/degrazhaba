import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';
// import TwitchProvider from 'next-auth/providers/twitch';
// Раскомментируйте TwitchProvider выше и настройте ниже для включения входа через Twitch

/**
 * NextAuth configuration for StreamPost.
 *
 * Currently configured with:
 * - Credentials provider (username + password for admin/streamer login)
 * - Twitch OAuth provider (commented out, ready to enable)
 *
 * Russian error messages are used throughout.
 */
export const authOptions: NextAuthOptions = {
  providers: [
    // ---- Credentials Provider (admin/streamer login) ----
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: {
          label: 'Имя пользователя',
          type: 'text',
          placeholder: 'admin',
        },
        password: {
          label: 'Пароль',
          type: 'password',
        },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error('Введите имя пользователя и пароль');
        }

        // In production, validate against a database or environment variables.
        // For now, we use env-based admin credentials.
        const adminUsername = process.env.ADMIN_USERNAME || 'admin';
        const adminPassword = process.env.ADMIN_PASSWORD || 'streampost';

        if (
          credentials.username === adminUsername &&
          credentials.password === adminPassword
        ) {
          return {
            id: '1',
            name: 'Стример',
            email: `${adminUsername}@streampost.local`,
            role: 'ADMIN',
          };
        }

        throw new Error('Неверное имя пользователя или пароль');
      },
    }),

    // ---- Twitch OAuth Provider (ready to enable) ----
    // Раскомментируйте блок ниже и добавьте TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET в .env
    // TwitchProvider({
    //   clientId: process.env.TWITCH_CLIENT_ID as string,
    //   clientSecret: process.env.TWITCH_CLIENT_SECRET as string,
    //   profile(profile) {
    //     return {
    //       id: profile.sub,
    //       name: profile.preferred_username || profile.name,
    //       email: profile.email,
    //       image: profile.picture,
    //       role: 'MODERATOR', // Модераторы входят через Twitch
    //     };
    //   },
    // }),
  ],

  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 часа
  },

  jwt: {
    maxAge: 24 * 60 * 60, // 24 часа
  },

  pages: {
    signIn: '/login',         // Кастомная страница входа (создайте при необходимости)
    error: '/login',          // Редирект ошибок на страницу входа
  },

  callbacks: {
    async jwt({ token, user }) {
      // Добавляем роль в JWT-токен при первом входе
      if (user) {
        token.role = (user as any).role || 'MODERATOR';
        token.id = user.id;
      }
      return token;
    },

    async session({ session, token }) {
      // Передаём роль и ID из токена в сессию
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
      }
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,

  debug: process.env.NODE_ENV === 'development',
};

// Типизация для сессии с расширенными полями
declare module 'next-auth' {
  interface Session {
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      id: string;
      role: 'ADMIN' | 'MODERATOR';
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: 'ADMIN' | 'MODERATOR';
    id: string;
  }
}

// ============ API Route Protection ============

export interface AuthResult {
  authorized: boolean;
  role?: string;
  userId?: string;
}

/**
 * Check if the request is authenticated via NextAuth JWT token.
 * Use this in API route handlers to protect endpoints.
 */
export async function requireAuth(request: NextRequest): Promise<AuthResult> {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token) return { authorized: false };
    return { authorized: true, role: token.role as string, userId: token.id as string };
  } catch {
    return { authorized: false };
  }
}

/**
 * Return a 401 Unauthorized response.
 */
export function unauthorizedResponse() {
  return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });
}

/**
 * Return a 403 Forbidden response.
 */
export function forbiddenResponse() {
  return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
}
