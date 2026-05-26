'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dices,
  Rocket,
  XCircle,
  ImageIcon,
  Youtube,
  FileText,
  Clock,
  User,
  Radio,
  PlayCircle,
  ChevronDown,
  ChevronUp,
  Inbox,
  ListOrdered,
  ArrowUp,
  ArrowDown,
  Trash2,
  Play,
  Timer,
  GripVertical,
  CheckCircle2,
  ClipboardList,
  ListPlus,
  Sparkles,
  Hash,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useApprovedPosts } from '@/lib/streampost-hooks';
import { useStreamPostStore, type ActiveVote, type Post } from '@/lib/streampost-store';
import { VoteBar } from '@/components/streampost/vote-bar';
import { toast } from 'sonner';

// ============ Types ============

interface StreamerPanelProps {
  onStartVote: (postId: string) => void;
  onPublish: (postId: string) => void;
  onReject: (postId: string) => void;
  onAddToQueue: (postId: string) => void;
  activeVotes: Record<string, ActiveVote>;
  voteQueue: string[];
  removeFromVoteQueue: (postId: string) => void;
  clearVoteQueue: () => void;
  reorderVoteQueue: (postIds: string[]) => void;
  queueCountdown: number | null;
}

// ============ Helpers ============

const typeConfig = {
  PHOTO: {
    icon: ImageIcon,
    label: 'ФОТО',
    emoji: '📸',
    color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    accent: 'from-emerald-500/20 to-teal-500/10',
    dot: 'bg-emerald-400',
    glowColor: 'shadow-emerald-500/20',
    solidBg: 'bg-emerald-500',
  },
  YOUTUBE: {
    icon: PlayCircle,
    label: 'YOUTUBE',
    emoji: '🎥',
    color: 'bg-red-500/20 text-red-400 border-red-500/30',
    accent: 'from-red-500/20 to-rose-500/10',
    dot: 'bg-red-400',
    glowColor: 'shadow-red-500/20',
    solidBg: 'bg-red-500',
  },
  TEXT: {
    icon: FileText,
    label: 'ТЕКСТ',
    emoji: '📝',
    color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    accent: 'from-amber-500/20 to-orange-500/10',
    dot: 'bg-amber-400',
    glowColor: 'shadow-amber-500/20',
    solidBg: 'bg-amber-500',
  },
};

function formatTimeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'только что';
  if (mins < 60) return `${mins} мин. назад`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ч. назад`;
  return `${Math.floor(hours / 24)} дн. назад`;
}

// ============ Circular Progress Ring ============

function CircularCountdown({ value, max }: { value: number; max: number }) {
  const radius = 14;
  const circumference = 2 * Math.PI * radius;
  const progress = max > 0 ? value / max : 0;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className="relative w-9 h-9 flex items-center justify-center flex-shrink-0">
      <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
        {/* Background ring */}
        <circle
          cx="18"
          cy="18"
          r={radius}
          fill="none"
          stroke="rgba(168, 85, 247, 0.15)"
          strokeWidth="3"
        />
        {/* Progress ring */}
        <motion.circle
          cx="18"
          cy="18"
          r={radius}
          fill="none"
          stroke="url(#countdownGradient)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animate={{ strokeDashoffset }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
        <defs>
          <linearGradient id="countdownGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#d946ef" />
          </linearGradient>
        </defs>
      </svg>
      <span className="absolute text-[10px] font-bold text-purple-300">
        {value}
      </span>
    </div>
  );
}

// ============ Mini Vote Bar (inline for post rows) ============

function MiniVoteBar({ activeVote }: { activeVote: ActiveVote }) {
  const totalVotes = activeVote.votesFor + activeVote.votesAgainst;
  const forPercent = totalVotes > 0 ? Math.round((activeVote.votesFor / totalVotes) * 100) : 50;

  return (
    <div className="mt-2 space-y-1">
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-emerald-400/70 font-semibold">✅ {activeVote.votesFor}</span>
        <span className="text-purple-400/80 font-bold flex items-center gap-1">
          <motion.span
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 1 }}
          >
            🎲
          </motion.span>
          0:{activeVote.timeRemaining.toString().padStart(2, '0')}
        </span>
        <span className="text-red-400/70 font-semibold">{activeVote.votesAgainst} ❌</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden bg-white/5 relative">
        {totalVotes > 0 ? (
          <>
            <motion.div
              className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full"
              initial={{ width: '50%' }}
              animate={{ width: `${forPercent}%` }}
              transition={{ type: 'spring', stiffness: 80, damping: 20 }}
            />
            <motion.div
              className="absolute right-0 top-0 bottom-0 bg-gradient-to-l from-red-600 to-red-400 rounded-full"
              initial={{ width: '50%' }}
              animate={{ width: `${100 - forPercent}%` }}
              transition={{ type: 'spring', stiffness: 80, damping: 20 }}
            />
          </>
        ) : (
          <div className="absolute inset-0 bg-white/[0.03]" />
        )}
      </div>
    </div>
  );
}

// ============ Post Row (compact list item) ============

interface PostRowProps {
  post: Post;
  isSelected: boolean;
  isVoting: boolean;
  isInQueue: boolean;
  onSelect: () => void;
  onStartVote: () => void;
  onPublish: () => void;
  onReject: () => void;
  onAddToQueue: () => void;
  activeVote?: ActiveVote;
  onFinalDecision: (decision: 'POSTED' | 'SKIPPED') => void;
}

function PostRow({
  post,
  isSelected,
  isVoting,
  isInQueue,
  onSelect,
  onStartVote,
  onPublish,
  onReject,
  onAddToQueue,
  activeVote,
  onFinalDecision,
}: PostRowProps) {
  const config = typeConfig[post.type];
  const TypeIcon = config.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -40, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="relative"
    >
      {/* Purple glow border for active voting */}
      {isVoting && (
        <motion.div
          className="absolute -inset-[2px] rounded-xl pointer-events-none"
          animate={{
            boxShadow: [
              '0 0 8px 2px rgba(168, 85, 247, 0.3), inset 0 0 8px 2px rgba(168, 85, 247, 0.05)',
              '0 0 16px 4px rgba(168, 85, 247, 0.5), inset 0 0 16px 4px rgba(168, 85, 247, 0.1)',
              '0 0 8px 2px rgba(168, 85, 247, 0.3), inset 0 0 8px 2px rgba(168, 85, 247, 0.05)',
            ],
          }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          style={{ borderRadius: '12px' }}
        />
      )}

      <motion.button
        onClick={onSelect}
        className={`w-full text-left rounded-xl border transition-all duration-200 group ${
          isVoting
            ? 'border-purple-500/50 bg-gradient-to-br from-purple-500/[0.10] to-violet-500/[0.06] shadow-lg shadow-purple-500/10'
            : isSelected
              ? 'border-emerald-500/40 bg-gradient-to-br from-emerald-500/[0.08] to-teal-500/[0.04] shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/20'
              : isInQueue
                ? 'border-purple-500/30 bg-gradient-to-br from-purple-500/[0.06] to-violet-500/[0.03]'
                : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.12]'
        } backdrop-blur-xl`}
        whileHover={{ scale: 1.005 }}
        whileTap={{ scale: 0.995 }}
      >
        {/* Main row content */}
        <div className="flex items-center gap-3 p-3">
          {/* Avatar */}
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg flex-shrink-0 ${
              isVoting
                ? 'bg-gradient-to-br from-purple-500 via-violet-500 to-fuchsia-500 shadow-purple-500/30'
                : isSelected
                  ? 'bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 shadow-emerald-500/30'
                  : isInQueue
                    ? 'bg-gradient-to-br from-purple-500 via-violet-500 to-fuchsia-500 shadow-purple-500/20'
                    : 'bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500 shadow-purple-500/20'
            } ring-2 ring-white/10`}
          >
            {post.author.username?.charAt(0).toUpperCase() || <User className="w-4 h-4" />}
          </div>

          {/* Content preview */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-sm font-semibold text-white/80 truncate">
                @{post.author.username || 'anonymous'}
              </span>
              {/* Enhanced type badge with color-coded icon */}
              <Badge
                variant="outline"
                className={`${config.color} text-[10px] font-bold px-1.5 py-0 h-4 gap-0.5`}
              >
                <TypeIcon className="w-2.5 h-2.5" />
                {config.label}
              </Badge>
              {isVoting && (
                <motion.span
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 1.2 }}
                  className="text-[10px] font-bold text-purple-400 bg-purple-500/20 border border-purple-500/30 px-1.5 py-0 rounded-full flex items-center gap-0.5"
                >
                  <Dices className="w-2.5 h-2.5" />
                  ГОЛОСОВАНИЕ
                </motion.span>
              )}
              {isInQueue && !isVoting && (
                <span className="text-[10px] font-bold text-purple-300/80 bg-purple-500/15 border border-purple-500/25 px-1.5 py-0 rounded-full flex items-center gap-0.5">
                  <ClipboardList className="w-2.5 h-2.5" />
                  В очереди
                </span>
              )}
              {/* Timer countdown badge when voting */}
              {isVoting && activeVote && (
                <span className="text-[10px] font-bold text-purple-300 bg-purple-500/20 border border-purple-500/30 px-1.5 py-0 rounded-full flex items-center gap-0.5">
                  <Timer className="w-2.5 h-2.5" />
                  0:{activeVote.timeRemaining.toString().padStart(2, '0')}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-white/30">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTimeAgo(post.createdAt)}
              </span>
              {post.channel && (
                <span className="flex items-center gap-1">
                  <Radio className="w-3 h-3" />
                  <span className="text-white/50">{post.channel.name}</span>
                </span>
              )}
            </div>
            {/* Inline content preview */}
            <div className="mt-1.5">
              {post.type === 'TEXT' && post.text && (
                <p className="text-xs text-white/40 truncate leading-relaxed">{post.text}</p>
              )}
              {post.type === 'YOUTUBE' && (
                <div className="flex items-center gap-1.5">
                  {post.youtubeThumbnail ? (
                    <div className="w-14 h-8 rounded overflow-hidden flex-shrink-0 border border-white/10">
                      <img
                        src={post.youtubeThumbnail}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-14 h-8 rounded bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                      <Youtube className="w-4 h-4 text-red-400/50" />
                    </div>
                  )}
                  <p className="text-xs text-white/40 truncate">
                    {post.youtubeTitle || post.youtubeUrl || 'YouTube видео'}
                  </p>
                </div>
              )}
              {post.type === 'PHOTO' && (
                <div className="flex items-center gap-1.5">
                  {post.mediaUrl ? (
                    <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0 border border-white/10">
                      <img
                        src={post.mediaUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <ImageIcon className="w-4 h-4 text-emerald-400/50" />
                    </div>
                  )}
                  <p className="text-xs text-white/40 truncate">
                    {post.text || 'Фотография'}
                  </p>
                </div>
              )}
            </div>

            {/* Mini vote bar inline when voting */}
            {isVoting && activeVote && !isSelected && (
              <MiniVoteBar activeVote={activeVote} />
            )}
          </div>

          {/* Expand chevron */}
          <div className="flex-shrink-0 text-white/20 group-hover:text-white/40 transition-colors">
            {isSelected ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </motion.button>

      {/* Expanded detail view */}
      <AnimatePresence>
        {isSelected && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className="overflow-hidden"
          >
            <div className="mx-1 px-3 pb-4 pt-3 border-t border-white/[0.04] bg-gradient-to-b from-white/[0.03] to-transparent rounded-b-xl">
              {/* Content preview area */}
              <div className="mb-4 rounded-lg overflow-hidden border border-white/[0.06] bg-black/30 shadow-xl shadow-black/30">
                {post.type === 'PHOTO' && (
                  <div className="relative">
                    {post.mediaUrl ? (
                      <>
                        <div
                          className="absolute inset-0 bg-cover bg-center blur-2xl scale-125 opacity-40"
                          style={{ backgroundImage: `url(${post.mediaUrl})` }}
                        />
                        <div className="relative flex items-center justify-center p-4 max-h-64">
                          <img
                            src={post.mediaUrl}
                            alt="Submitted photo"
                            className="max-h-60 max-w-full object-contain rounded-lg shadow-xl ring-1 ring-white/10"
                          />
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-center p-8 bg-gradient-to-br from-emerald-900/20 to-teal-900/20">
                        <div className="text-center">
                          <ImageIcon className="w-12 h-12 text-emerald-500/30 mx-auto mb-2" />
                          <p className="text-white/25 text-xs">Фото (файл в Telegram)</p>
                        </div>
                      </div>
                    )}
                    {post.text && (
                      <div className="px-3 py-2 bg-black/40 border-t border-white/[0.06]">
                        <p className="text-white/70 text-xs leading-relaxed">{post.text}</p>
                      </div>
                    )}
                  </div>
                )}

                {post.type === 'YOUTUBE' && (
                  <div className="relative">
                    {post.youtubeThumbnail ? (
                      <div className="relative">
                        <img
                          src={post.youtubeThumbnail}
                          alt={post.youtubeTitle || 'YouTube video'}
                          className="w-full h-40 object-cover"
                        />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <div className="w-14 h-14 rounded-full bg-red-600/90 flex items-center justify-center shadow-2xl shadow-red-600/40 backdrop-blur-sm border-2 border-white/20">
                            <PlayCircle className="w-8 h-8 text-white" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center p-8 bg-gradient-to-br from-red-900/20 to-rose-900/20">
                        <div className="text-center">
                          <Youtube className="w-12 h-12 text-red-500/30 mx-auto mb-2" />
                          <p className="text-white/25 text-xs">YouTube видео</p>
                        </div>
                      </div>
                    )}
                    {(post.youtubeTitle || post.youtubeUrl) && (
                      <div className="px-3 py-2 bg-black/40 border-t border-white/[0.06]">
                        {post.youtubeTitle && (
                          <p className="text-white/70 text-xs font-medium leading-relaxed">
                            {post.youtubeTitle}
                          </p>
                        )}
                        {post.youtubeUrl && (
                          <p className="text-red-400/40 text-[10px] mt-1 truncate">
                            {post.youtubeUrl}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {post.type === 'TEXT' && (
                  <div className="flex items-center justify-center p-6 bg-gradient-to-br from-amber-900/10 via-orange-900/5 to-yellow-900/10">
                    <p className="text-white/70 text-sm leading-relaxed max-w-md text-center">
                      &ldquo;{post.text || 'Пустой пост'}&rdquo;
                    </p>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              {!isVoting && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      onStartVote();
                    }}
                    className="flex-1 min-w-[120px] bg-purple-600/90 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/20 border border-purple-500/30 transition-all duration-200 hover:scale-[1.03] hover:shadow-purple-500/30 active:scale-95 text-xs h-9"
                  >
                    <Dices className="w-3.5 h-3.5 mr-1.5" />
                    Голосование
                  </Button>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddToQueue();
                    }}
                    disabled={isInQueue}
                    className={`flex-1 min-w-[120px] text-white shadow-lg border transition-all duration-200 hover:scale-[1.03] active:scale-95 text-xs h-9 ${
                      isInQueue
                        ? 'bg-emerald-500/15 border-emerald-500/20 text-emerald-400/70 cursor-not-allowed shadow-none hover:scale-100'
                        : 'bg-violet-600/90 hover:bg-violet-500 shadow-violet-600/20 border-violet-500/30 hover:shadow-violet-500/30'
                    }`}
                  >
                    {isInQueue ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                        В очереди
                      </>
                    ) : (
                      <>
                        <ListPlus className="w-3.5 h-3.5 mr-1.5" />
                        В очередь
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPublish();
                    }}
                    className="flex-1 min-w-[120px] bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-lg shadow-emerald-600/20 border border-emerald-400/30 transition-all duration-200 hover:scale-[1.03] hover:shadow-emerald-500/30 active:scale-95 text-xs h-9"
                  >
                    <Rocket className="w-3.5 h-3.5 mr-1.5" />
                    Опубликовать
                  </Button>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      onReject();
                    }}
                    variant="outline"
                    className="border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/40 transition-all duration-200 hover:scale-[1.03] active:scale-95 text-xs h-9 px-3"
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1.5" />
                    Отклонить
                  </Button>
                </div>
              )}
            </div>

            {/* Vote bar overlay on expanded post */}
            {isVoting && activeVote && (
              <div className="px-3 pb-3">
                <VoteBar
                  postId={post.id}
                  activeVote={activeVote}
                  onFinalDecision={onFinalDecision}
                />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============ Loading Skeleton ============

function StreamerPanelSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 backdrop-blur-xl"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="w-9 h-9 rounded-full bg-white/10" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-3 w-24 bg-white/10" />
                <Skeleton className="h-4 w-14 rounded-full bg-white/10" />
              </div>
              <Skeleton className="h-2 w-32 bg-white/10" />
              <Skeleton className="h-2 w-full bg-white/10" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============ Empty State ============

function EmptyStreamerPanel() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <motion.div
        animate={{ y: [0, -8, 0], opacity: [0.4, 0.7, 0.4] }}
        transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
        className="text-6xl mb-5"
      >
        📋
      </motion.div>
      <h3 className="text-xl font-black bg-gradient-to-r from-white/60 to-white/40 bg-clip-text text-transparent mb-2">
        Нет утверждённых постов
      </h3>
      <p className="text-white/25 text-sm max-w-sm leading-relaxed">
        Модераторы ещё не проверили предложку. Утверждённые посты появятся здесь автоматически.
      </p>
    </motion.div>
  );
}

// ============ Queue Empty State Hint ============

function QueueEmptyHint() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-2.5 py-4 px-3 text-center justify-center"
    >
      <ClipboardList className="w-4 h-4 text-white/15 flex-shrink-0" />
      <p className="text-xs text-white/20 leading-relaxed">
        Добавьте посты в очередь для автоматического голосования
      </p>
    </motion.div>
  );
}

// ============ Queue Item ============

interface QueueItemProps {
  postId: string;
  post: Post | undefined;
  index: number;
  total: number;
  isVoting: boolean;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function QueueItem({ postId, post, index, total, isVoting, onRemove, onMoveUp, onMoveDown }: QueueItemProps) {
  if (!post) return null;
  const config = typeConfig[post.type];
  const TypeIcon = config.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={`flex items-center gap-2 p-2 rounded-lg border transition-all duration-200 ${
        isVoting
          ? 'border-purple-500/40 bg-purple-500/10 shadow-md shadow-purple-500/10'
          : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.10]'
      }`}
    >
      {/* Drag handle */}
      <div className="text-white/15 flex-shrink-0 cursor-grab active:cursor-grabbing">
        <GripVertical className="w-3.5 h-3.5" />
      </div>

      {/* Order number - more prominent */}
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black flex-shrink-0 ring-1 ${
        isVoting
          ? 'bg-purple-500/30 text-purple-200 ring-purple-500/40 shadow-md shadow-purple-500/20'
          : 'bg-gradient-to-br from-white/[0.08] to-white/[0.04] text-white/40 ring-white/10'
      }`}>
        {index + 1}
      </div>

      {/* Reorder buttons */}
      <div className="flex flex-col gap-0.5 flex-shrink-0">
        <button
          onClick={onMoveUp}
          disabled={index === 0 || isVoting}
          className="p-0.5 rounded text-white/20 hover:text-white/60 hover:bg-white/5 disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-150"
        >
          <ArrowUp className="w-3 h-3" />
        </button>
        <button
          onClick={onMoveDown}
          disabled={index === total - 1 || isVoting}
          className="p-0.5 rounded text-white/20 hover:text-white/60 hover:bg-white/5 disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-150"
        >
          <ArrowDown className="w-3 h-3" />
        </button>
      </div>

      {/* Type badge + author + preview */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <Badge variant="outline" className={`${config.color} text-[9px] font-bold px-1 py-0 h-3.5 gap-0.5`}>
            <TypeIcon className="w-2 h-2" />
            {config.label}
          </Badge>
          <span className="text-xs text-white/50 font-medium truncate">
            @{post.author.username || 'anon'}
          </span>
          {isVoting && (
            <motion.span
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ repeat: Infinity, duration: 1 }}
              className="text-[9px] text-purple-400 font-bold"
            >
              🎲
            </motion.span>
          )}
        </div>
        <p className="text-[10px] text-white/25 truncate">
          {post.type === 'TEXT' ? post.text : post.type === 'YOUTUBE' ? (post.youtubeTitle || post.youtubeUrl) : (post.text || 'Фото')}
        </p>
      </div>

      {/* Remove button */}
      {!isVoting && (
        <button
          onClick={onRemove}
          className="p-1.5 rounded-md text-red-400/40 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150 flex-shrink-0 hover:scale-110 active:scale-90"
          title="Убрать из очереди"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </motion.div>
  );
}

// ============ Main StreamerPanel ============

export function StreamerPanel({
  onStartVote,
  onPublish,
  onReject,
  onAddToQueue,
  activeVotes,
  voteQueue,
  removeFromVoteQueue,
  clearVoteQueue,
  reorderVoteQueue,
  queueCountdown,
}: StreamerPanelProps) {
  const { data, isLoading } = useApprovedPosts();
  const { setOverlayPost } = useStreamPostStore();
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  const posts = data?.posts || [];

  const handleSelectPost = (postId: string) => {
    setSelectedPostId((prev) => (prev === postId ? null : postId));
  };

  const handleFinalDecision = (postId: string, decision: 'POSTED' | 'SKIPPED') => {
    const activeVote = activeVotes[postId];
    if (!activeVote) return;

    if (decision === 'POSTED') {
      onPublish(postId);
    } else {
      onReject(postId);
    }
  };

  const handleStartAll = () => {
    if (voteQueue.length === 0) return;
    const firstPostId = voteQueue[0];
    // Check if there's already an active vote
    const hasActiveVote = Object.keys(activeVotes).length > 0;
    if (hasActiveVote) {
      toast('Дождитесь завершения текущего голосования', { icon: '⏳' });
      return;
    }
    onStartVote(firstPostId);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newQueue = [...voteQueue];
    [newQueue[index - 1], newQueue[index]] = [newQueue[index], newQueue[index - 1]];
    reorderVoteQueue(newQueue);
  };

  const handleMoveDown = (index: number) => {
    if (index >= voteQueue.length - 1) return;
    const newQueue = [...voteQueue];
    [newQueue[index], newQueue[index + 1]] = [newQueue[index + 1], newQueue[index]];
    reorderVoteQueue(newQueue);
  };

  const hasActiveVotes = Object.keys(activeVotes).length > 0;

  return (
    <div className="space-y-4">
      {/* Header with improved layout */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 via-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-purple-500/25 ring-1 ring-white/10">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white/90 tracking-tight">Панель стримера</h2>
            <p className="text-[10px] text-white/25 uppercase tracking-wider font-medium">
              Управление утверждённым контентом
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasActiveVotes && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1.5 text-xs bg-purple-500/20 text-purple-400 border border-purple-500/30 px-2.5 py-1.5 rounded-full shadow-md shadow-purple-500/10"
            >
              <motion.span
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 1 }}
              >
                🎲
              </motion.span>
              {Object.keys(activeVotes).length} голос.
            </motion.div>
          )}
          <Badge
            variant="outline"
            className="text-xs bg-gradient-to-r from-white/[0.06] to-white/[0.03] text-white/60 border-white/10 shadow-sm h-7 px-2.5 font-semibold"
          >
            <Inbox className="w-3.5 h-3.5 mr-1.5 text-white/40" />
            Постов: <span className="text-white/80 ml-1 font-bold">{posts.length}</span>
          </Badge>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* Vote Queue Section — Always visible with gradient glow */}
      <div className="rounded-xl border border-purple-500/20 bg-gradient-to-br from-purple-500/[0.08] via-violet-500/[0.04] to-fuchsia-500/[0.02] backdrop-blur-xl shadow-lg shadow-purple-500/5 relative overflow-hidden">
        {/* Subtle purple glow border effect */}
        <div className="absolute inset-0 rounded-xl ring-1 ring-purple-500/10 pointer-events-none" />

        <div className="p-4 relative">
          {/* Queue header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ListOrdered className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-bold text-white/80">Очередь голосований</h3>
              {/* More prominent queue number badge */}
              <div className={`flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-md text-[11px] font-black shadow-md transition-all duration-300 ${
                voteQueue.length > 0
                  ? 'bg-gradient-to-br from-purple-500 to-violet-600 text-white shadow-purple-500/30 ring-1 ring-purple-400/30'
                  : 'bg-white/5 text-white/25 ring-1 ring-white/10'
              }`}>
                {voteQueue.length}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {voteQueue.length > 0 && (
                <>
                  <Button
                    onClick={handleStartAll}
                    disabled={hasActiveVotes}
                    size="sm"
                    className="h-7 text-[11px] bg-purple-600/90 hover:bg-purple-500 text-white border border-purple-500/30 shadow-md shadow-purple-600/20 transition-all duration-200 hover:scale-[1.03] hover:shadow-purple-500/30 active:scale-95 disabled:opacity-40 disabled:hover:scale-100"
                  >
                    <Play className="w-3 h-3 mr-1" />
                    Запустить всё
                    {/* Pulsing dot when queue has items */}
                    <motion.span
                      animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                      className="inline-block w-1.5 h-1.5 rounded-full bg-white ml-1.5"
                    />
                  </Button>
                  <Button
                    onClick={clearVoteQueue}
                    size="sm"
                    variant="outline"
                    className="h-7 text-[11px] border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/40 transition-all duration-200 hover:scale-[1.03] active:scale-95"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Очистить
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Countdown indicator — circular progress ring */}
          {queueCountdown !== null && queueCountdown > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-3 flex items-center gap-3 px-3 py-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20"
            >
              <CircularCountdown value={queueCountdown} max={5} />
              <span className="text-xs text-purple-300 font-medium flex-1">
                Следующее голосование через {queueCountdown} сек...
              </span>
              {/* Thin linear progress bar as secondary indicator */}
              <div className="w-20 h-1 bg-purple-500/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-full"
                  initial={{ width: '100%' }}
                  animate={{ width: `${(queueCountdown / 5) * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </motion.div>
          )}

          {/* Queue items */}
          {voteQueue.length > 0 && (
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              <AnimatePresence initial={false}>
                {voteQueue.map((queuedPostId, index) => {
                  const post = posts.find((p) => p.id === queuedPostId);
                  const isVoting = !!activeVotes[queuedPostId];
                  return (
                    <QueueItem
                      key={queuedPostId}
                      postId={queuedPostId}
                      post={post}
                      index={index}
                      total={voteQueue.length}
                      isVoting={isVoting}
                      onRemove={() => removeFromVoteQueue(queuedPostId)}
                      onMoveUp={() => handleMoveUp(index)}
                      onMoveDown={() => handleMoveDown(index)}
                    />
                  );
                })}
              </AnimatePresence>
            </div>
          )}

          {/* Queue empty state with inline hint */}
          {voteQueue.length === 0 && queueCountdown === null && (
            <QueueEmptyHint />
          )}

          {/* Empty queue with countdown */}
          {voteQueue.length === 0 && queueCountdown !== null && (
            <p className="text-xs text-white/25 text-center py-2">
              Очередь пуста, запускается последнее голосование...
            </p>
          )}
        </div>
      </div>

      {/* Section divider */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
        <span className="text-[10px] text-white/15 uppercase tracking-wider font-medium flex items-center gap-1.5">
          <Hash className="w-3 h-3" />
          Утверждённые посты
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      </div>

      {/* Post list */}
      {isLoading ? (
        <StreamerPanelSkeleton />
      ) : posts.length === 0 ? (
        <EmptyStreamerPanel />
      ) : (
        <div className="max-h-[calc(100vh-440px)] overflow-y-auto pr-1 space-y-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          <AnimatePresence initial={false}>
            {posts.map((post) => {
              const isSelected = selectedPostId === post.id;
              const isVoting = !!activeVotes[post.id];
              const isInQueue = voteQueue.includes(post.id);

              return (
                <PostRow
                  key={post.id}
                  post={post}
                  isSelected={isSelected}
                  isVoting={isVoting}
                  isInQueue={isInQueue}
                  onSelect={() => handleSelectPost(post.id)}
                  onStartVote={() => onStartVote(post.id)}
                  onPublish={() => onPublish(post.id)}
                  onReject={() => onReject(post.id)}
                  onAddToQueue={() => onAddToQueue(post.id)}
                  activeVote={activeVotes[post.id]}
                  onFinalDecision={(decision) => handleFinalDecision(post.id, decision)}
                />
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
