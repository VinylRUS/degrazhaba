import { z } from 'zod';

// ============ HTML Stripping ============

/**
 * Remove all HTML tags from user input to prevent XSS.
 */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '').trim();
}

/**
 * Sanitize a string: strip HTML, trim whitespace, enforce max length.
 */
export function sanitizeString(input: unknown, maxLength: number = 2000): string {
  if (typeof input !== 'string') return '';
  return stripHtml(input).slice(0, maxLength);
}

/**
 * Validate that a value is one of the allowed enum values.
 */
export function validateEnum<T extends string>(value: unknown, allowed: T[]): T | null {
  if (typeof value !== 'string') return null;
  return allowed.includes(value as T) ? (value as T) : null;
}

/**
 * Check if a URL is valid and uses HTTP/HTTPS protocol.
 */
export function isValidUrl(url: unknown): boolean {
  if (typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Basic ID validation (accepts cuids and other reasonable IDs).
 */
export function isValidId(id: unknown): boolean {
  if (typeof id !== 'string') return false;
  return id.length >= 5 && id.length <= 100 && /^[a-zA-Z0-9_-]+$/.test(id);
}

/**
 * Recursively strip HTML from all string values in an object.
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = stripHtml(value).trim();
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = sanitizeObject(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result as T;
}

/**
 * Get a proxied image URL to avoid CORS issues in overlay.
 */
export function getProxiedImageUrl(originalUrl: string | null): string | null {
  if (!originalUrl) return null;
  if (originalUrl.startsWith('/')) return originalUrl;
  if (originalUrl.startsWith('data:')) return originalUrl;
  return `/api/proxy/image?url=${encodeURIComponent(originalUrl)}`;
}

// ============ Zod Schemas ============

export const PostTypeSchema = z.enum(['PHOTO', 'YOUTUBE', 'TEXT']);
export const PostStatusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED', 'POSTED', 'DEFERRED', 'SCHEDULED']);
export const ModeratorRoleSchema = z.enum(['ADMIN', 'MODERATOR']);
export const VoteDecisionSchema = z.enum(['POSTED', 'SKIPPED']);

export const CreatePostSchema = z.object({
  type: PostTypeSchema,
  text: z.string().max(4000).optional().nullable(),
  mediaUrl: z.string().url().max(2000).optional().nullable(),
  mediaFileId: z.string().max(500).optional().nullable(),
  youtubeUrl: z.string().url().max(2000).optional().nullable(),
  youtubeTitle: z.string().max(500).optional().nullable(),
  youtubeThumbnail: z.string().url().max(2000).optional().nullable(),
  authorTelegramId: z.string().min(1).max(200),
  authorUsername: z.string().max(200).optional(),
  authorFirstName: z.string().max(200).optional(),
  authorLastName: z.string().max(200).optional(),
  channelId: z.string().optional(),
});

export const UpdatePostSchema = z.object({
  status: PostStatusSchema,
  reviewerId: z.string().optional(),
});

export const CreateChannelSchema = z.object({
  telegramId: z.string().min(1).max(200),
  name: z.string().min(1).max(200),
  isDefault: z.boolean().optional(),
});

export const UpdateChannelSchema = z.object({
  telegramId: z.string().max(200).optional(),
  name: z.string().max(200).optional(),
  isDefault: z.boolean().optional(),
});

export const CreateModeratorSchema = z.object({
  telegramId: z.string().min(1).max(200),
  username: z.string().max(200).optional(),
  firstName: z.string().max(200).optional(),
  lastName: z.string().max(200).optional(),
  role: ModeratorRoleSchema.optional(),
  addedById: z.string().optional(),
});

export const UpdateModeratorSchema = z.object({
  role: ModeratorRoleSchema,
});

export const StartVoteSchema = z.object({
  postId: z.string().min(1),
  durationSec: z.number().int().min(5).max(300).optional(),
});

export const CloseVoteSchema = z.object({
  finalDecision: VoteDecisionSchema,
  streamerFollowedChat: z.boolean().optional(),
});

export const UpdateSettingsSchema = z.record(z.string().max(100), z.string().max(5000));

export const ChatActionSchema = z.object({
  action: z.enum(['connect/twitch', 'connect/goodgame', 'disconnect/twitch', 'disconnect/goodgame', 'vote-session']),
  sessionId: z.string().optional(),
  postId: z.string().optional(),
});
