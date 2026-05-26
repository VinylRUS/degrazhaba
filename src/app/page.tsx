'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession, signIn, signOut } from 'next-auth/react';
import {
  Shield,
  Radio,
  Users,
  Settings,
  Monitor,
  CheckCircle2,
  XCircle,
  Clock,
  Dices,
  Zap,
  Wifi,
  WifiOff,
  ChevronLeft,
  ChevronRight,
  Inbox,
  History,
  Send,
  Keyboard,
  Volume2,
  VolumeX,
  PanelRightOpen,
  PanelRightClose,
  Plus,
  Sun,
  Moon,
  Bell,
  HelpCircle,
  Crown,
  LogOut,
  Lock,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useTheme } from 'next-themes';
import { useMounted } from '@/hooks/use-mounted';
import { useStreamPostStore, type ActiveVote, type TabType, type TelegramUser, type VoteSession } from '@/lib/streampost-store';
import { usePendingPosts, useApprovedPosts, usePosts, useUpdatePost, useStartVote, useCloseVote, useSettings, useCreatePost } from '@/lib/streampost-hooks';
import { ModerationCard } from '@/components/streampost/moderation-card';
import { VoteBar } from '@/components/streampost/vote-bar';
import { StreamOverlay } from '@/components/streampost/stream-overlay';
import { ChannelManager } from '@/components/streampost/channel-manager';
import { ModeratorManager } from '@/components/streampost/moderator-manager';
import { SettingsPanel } from '@/components/streampost/settings-panel';

import { PostHistory } from '@/components/streampost/post-history';
import { ActivityFeed } from '@/components/streampost/activity-feed';

import { Confetti } from '@/components/streampost/confetti';
import { playSound } from '@/lib/sound-utils';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

import { StreamerPanel } from '@/components/streampost/streamer-panel';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      retry: 1,
    },
  },
});

const TABS: { id: TabType; label: string; labelRu: string; icon: React.ElementType }[] = [
  { id: 'moderation', label: 'Moderation', labelRu: 'Премодерация', icon: Shield },
  { id: 'streamer', label: 'Streamer', labelRu: 'Стример', icon: Crown },
  { id: 'channels', label: 'Channels', labelRu: 'Каналы', icon: Radio },
  { id: 'moderators', label: 'Moderators', labelRu: 'Модераторы', icon: Users },
  { id: 'settings', label: 'Settings', labelRu: 'Настройки', icon: Settings },
  { id: 'history', label: 'History', labelRu: 'История', icon: History },
  { id: 'overlay', label: 'Overlay', labelRu: 'Оверлей', icon: Monitor },
];

// ============ Theme Toggle ============

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-white/40 hover:text-white/80 hover:bg-white/5"
      >
        <Sun className="w-4 h-4" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-white/40 hover:text-white/80 hover:bg-white/5 dark:text-white/40 dark:hover:text-white/80 dark:hover:bg-white/5 light:text-gray-500 light:hover:text-gray-800 light:hover:bg-gray-100"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
    >
      {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </Button>
  );
}

// ============ Login Form ============

function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        username,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Неверное имя пользователя или пароль');
      }
    } catch {
      setError('Ошибка подключения к серверу');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] -top-64 -left-64 animate-pulse" />
        <div className="absolute w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[120px] -bottom-64 -right-64 animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute w-80 h-80 bg-teal-500/8 rounded-full blur-[100px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" style={{ animationDelay: '4s' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur-xl shadow-2xl shadow-black/20">
          {/* Header */}
          <div className="pt-8 pb-4 px-8 text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-purple-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 mb-4"
            >
              <Zap className="w-8 h-8 text-white" />
            </motion.div>
            <h1 className="text-2xl font-black">
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-purple-400 bg-clip-text text-transparent">StreamPost</span>
            </h1>
            <p className="text-sm text-white/40 mt-1">Система модерации контента</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-8 pb-8 space-y-4">
            {/* Error message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium text-white/60">
                Имя пользователя
              </Label>
              <div className="relative">
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  autoComplete="username"
                  required
                  disabled={isLoading}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-emerald-500/50 focus:ring-emerald-500/20 h-11 pl-10"
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30">
                  <Shield className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-white/60">
                Пароль
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  disabled={isLoading}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-emerald-500/50 focus:ring-emerald-500/20 h-11 pl-10 pr-10"
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30">
                  <Lock className="w-4 h-4" />
                </div>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit button */}
            <Button
              type="submit"
              disabled={isLoading || !username || !password}
              className="w-full h-11 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-semibold shadow-lg shadow-emerald-500/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Вход...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span>Войти</span>
                  <Zap className="w-4 h-4" />
                </div>
              )}
            </Button>

            {/* Info */}
            <div className="pt-2 text-center">
              <p className="text-xs text-white/20">
                Доступ только для авторизованных пользователей
              </p>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

// ============ Auth Gate ============

function AuthGate({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-500 to-purple-600 flex items-center justify-center animate-pulse">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div className="flex items-center gap-2 text-white/40">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Загрузка...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return <LoginForm />;
  }

  return <>{children}</>;
}

function StreamPostApp() {
  const { data: session } = useSession();
  const {
    activeTab,
    setActiveTab,
    currentPostIndex,
    setCurrentPostIndex,
    activeVotes,
    setActiveVote,
    updateActiveVote,
    removeActiveVote,
    setVoteResult,
    socketConnected,
    setSocketConnected,
    soundEnabled,
    toggleSound,
    triggerConfetti,
    addActivity,
    activityLog,
    setOverlayPost,
    voteQueue,
    addToVoteQueue,
    removeFromVoteQueue,
    clearVoteQueue,
    reorderVoteQueue,
    queueCountdown,
    setQueueCountdown,
    decrementQueueCountdown,
  } = useStreamPostStore();

  const [showActivityPanel, setShowActivityPanel] = useState(true);
  const [dismissedPostIds, setDismissedPostIds] = useState<Set<string>>(new Set());
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const { data: pendingData, isLoading: postsLoading } = usePendingPosts();
  const { data: approvedData } = useApprovedPosts();
  const { data: allPostsData } = usePosts();
  const { data: settings } = useSettings();
  const updatePost = useUpdatePost();
  const startVoteMutation = useStartVote();
  const closeVoteMutation = useCloseVote();

  const posts = pendingData?.posts || [];
  // BUG-1 FIX: Filter out dismissed posts so the card immediately advances
  const visiblePosts = posts.filter((p) => !dismissedPostIds.has(p.id));
  const approvedPosts = approvedData?.posts || [];
  const totalPostsCount = allPostsData?.total || 0;

  // Socket.io connection
  useEffect(() => {
    const socket = io('/?XTransformPort=3003', {
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('[StreamPost] Connected to realtime service');
      setSocketConnected(true);
      socket.emit('moderation:join');
    });

    socket.on('disconnect', () => {
      console.log('[StreamPost] Disconnected from realtime service');
      setSocketConnected(false);
    });

    socket.on('post:new', (postData) => {
      console.log('[StreamPost] New post received:', postData.id);
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast.info('Новый пост от @' + (postData.author?.username || 'anonymous'), {
        description: postData.type === 'PHOTO' ? '📸 Фото' : postData.type === 'YOUTUBE' ? '🎥 YouTube' : '📝 Текст',
      });
    });

    socket.on('post:status', (data: { postId: string; status: string }) => {
      console.log('[StreamPost] Post status changed:', data);
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    });

    socket.on('vote:start', (data: { sessionId: string; postId: string; durationSec: number }) => {
      console.log('[StreamPost] Vote started:', data.sessionId);
      setActiveVote(data.postId, {
        sessionId: data.sessionId,
        postId: data.postId,
        durationSec: data.durationSec,
        votesFor: 0,
        votesAgainst: 0,
        totalVoters: 0,
        timeRemaining: data.durationSec,
      });
    });

    socket.on(
      'vote:update',
      (data: { sessionId: string; votesFor: number; votesAgainst: number; totalVoters: number; timeRemaining: number }) => {
        updateActiveVote(data.sessionId, {
          votesFor: data.votesFor,
          votesAgainst: data.votesAgainst,
          totalVoters: data.totalVoters,
          timeRemaining: data.timeRemaining,
        });
      }
    );

    socket.on(
      'vote:end',
      (data: { sessionId: string; postId: string; votesFor: number; votesAgainst: number; totalVoters: number; finalDecision: string }) => {
        console.log('[StreamPost] Vote ended:', data);
        const total = data.votesFor + data.votesAgainst;
        const forPercent = total > 0 ? Math.round((data.votesFor / total) * 100) : 50;
        const againstPercent = 100 - forPercent;
        setVoteResult(data.postId, {
          decision: data.finalDecision as 'POSTED' | 'SKIPPED',
          forPercent,
          againstPercent,
        });

        addActivity({
          type: 'vote_end',
          message: data.finalDecision === 'POSTED'
            ? '🎉 Чат решил: опубликовать!'
            : '💀 Чат решил: отклонить',
        });

        setTimeout(() => {
          removeActiveVote(data.postId);
          // Remove from queue if present
          useStreamPostStore.getState().removeFromVoteQueue(data.postId);
          if (data.finalDecision === 'POSTED') {
            setDismissedPostIds((prev) => new Set([...prev, data.postId]));
            updatePost.mutate({ id: data.postId, status: 'POSTED' });
            toast.success('Пост опубликован по результатам голосования!');
            triggerConfetti();
          } else {
            setDismissedPostIds((prev) => new Set([...prev, data.postId]));
            updatePost.mutate({ id: data.postId, status: 'REJECTED' });
            toast('Пост отклонён по результатам голосования', { icon: '❌' });
          }
        }, 3500);
      }
    );

    socketRef.current = socket;

    return () => {
      socket.emit('moderation:leave');
      socket.disconnect();
    };
  }, []);

  // Reset currentPostIndex if it exceeds the visible posts array
  useEffect(() => {
    if (visiblePosts.length > 0 && currentPostIndex >= visiblePosts.length) {
      setCurrentPostIndex(Math.max(0, visiblePosts.length - 1));
    }
  }, [visiblePosts.length, currentPostIndex, setCurrentPostIndex]);

  // Handle moderation actions with auto-advance and activity logging
  const handleAccept = useCallback(
    (postId: string) => {
      const post = posts.find((p) => p.id === postId);
      setDismissedPostIds((prev) => new Set([...prev, postId]));
      updatePost.mutate({ id: postId, status: 'APPROVED' });
      if (soundEnabled) playSound('accept');
      toast.success('Пост принят!', { icon: '✅' });
      addActivity({
        type: 'accept',
        message: `✅ Принят пост от @${post?.author?.username || 'anonymous'}`,
      });
    },
    [updatePost, posts, addActivity, soundEnabled]
  );

  const handleReject = useCallback(
    (postId: string) => {
      const post = posts.find((p) => p.id === postId);
      setDismissedPostIds((prev) => new Set([...prev, postId]));
      updatePost.mutate({ id: postId, status: 'REJECTED' });
      if (soundEnabled) playSound('reject');
      toast('Пост отклонён', { icon: '❌' });
      addActivity({
        type: 'reject',
        message: `❌ Отклонён пост от @${post?.author?.username || 'anonymous'}`,
      });
    },
    [updatePost, posts, addActivity, soundEnabled]
  );

  const handleDefer = useCallback(
    (postId: string) => {
      const post = posts.find((p) => p.id === postId);
      setDismissedPostIds((prev) => new Set([...prev, postId]));
      updatePost.mutate({ id: postId, status: 'DEFERRED' });
      toast('Пост отложен', { icon: '⏳' });
      addActivity({
        type: 'defer',
        message: `⏳ Отложен пост от @${post?.author?.username || 'anonymous'}`,
      });
    },
    [updatePost, posts, addActivity]
  );

  const handlePostAndPublish = useCallback(
    (postId: string) => {
      const post = posts.find((p) => p.id === postId);
      setDismissedPostIds((prev) => new Set([...prev, postId]));
      updatePost.mutate({ id: postId, status: 'POSTED' });
      if (soundEnabled) playSound('publish');
      toast.success('Пост опубликован в канал!', { icon: '🚀' });
      triggerConfetti();
      addActivity({
        type: 'publish',
        message: `🚀 Опубликован пост от @${post?.author?.username || 'anonymous'}${post?.channel ? ` в #${post.channel.name}` : ''}`,
      });
    },
    [updatePost, posts, addActivity, triggerConfetti, soundEnabled]
  );

  // BUG-3 FIX: Added local fallback for setActiveVote when socket.io is not connected
  const handleStartVote = useCallback(
    async (postId: string) => {
      const post = posts.find((p) => p.id === postId);
      const duration = parseInt(settings?.voteDuration || '30');
      try {
        const session = await startVoteMutation.mutateAsync({ postId, durationSec: duration });

        // LOCAL FALLBACK: Set active vote directly in case socket is not connected
        setActiveVote(postId, {
          sessionId: session.id,
          postId,
          durationSec: duration,
          votesFor: 0,
          votesAgainst: 0,
          totalVoters: 0,
          timeRemaining: duration,
        });

        // Also emit to socket if connected
        if (socketRef.current) {
          socketRef.current.emit('vote:start', {
            sessionId: session.id,
            postId,
            durationSec: duration,
          });
        }

        // Notify chat service about the vote session so it can collect votes
        try {
          await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'vote-session',
              sessionId: session.id,
              postId,
            }),
            credentials: 'include',
          });
        } catch {
          // Non-critical — the chat service may not be running
        }
        if (soundEnabled) playSound('vote');
        toast('Голосование запущено!', { icon: '🎲', description: `${duration} секунд на голосование` });
        addActivity({
          type: 'vote_start',
          message: `🎲 Голосование началось для поста от @${post?.author?.username || 'anonymous'}`,
        });
      } catch (err) {
        console.error('Failed to start vote:', err);
        toast.error('Не удалось запустить голосование');
      }
    },
    [settings, startVoteMutation, posts, addActivity, setActiveVote, soundEnabled]
  );

  const handleFinalDecision = useCallback(
    (postId: string, decision: 'POSTED' | 'SKIPPED') => {
      const activeVote = activeVotes[postId];
      if (!activeVote) return;

      closeVoteMutation.mutate({
        id: activeVote.sessionId,
        finalDecision: decision,
        streamerFollowedChat: decision === 'POSTED' ? activeVote.votesFor >= activeVote.votesAgainst : activeVote.votesAgainst > activeVote.votesFor,
      });

      if (socketRef.current) {
        socketRef.current.emit('vote:close', {
          sessionId: activeVote.sessionId,
          finalDecision: decision,
        });
      }
    },
    [activeVotes, closeVoteMutation]
  );

  // ============ Streamer Panel Handlers ============

  const handleStreamerStartVote = useCallback(
    async (postId: string) => {
      const post = approvedPosts.find((p) => p.id === postId);
      const duration = parseInt(settings?.voteDuration || '30');
      try {
        const session = await startVoteMutation.mutateAsync({ postId, durationSec: duration });

        // Set active vote locally
        setActiveVote(postId, {
          sessionId: session.id,
          postId,
          durationSec: duration,
          votesFor: 0,
          votesAgainst: 0,
          totalVoters: 0,
          timeRemaining: duration,
        });

        // Set overlay post so it shows on stream
        setOverlayPost(post || null);

        // Emit to socket
        if (socketRef.current) {
          socketRef.current.emit('vote:start', {
            sessionId: session.id,
            postId,
            durationSec: duration,
          });
          // Also emit overlay post data
          socketRef.current.emit('overlay:post', post);
        }

        // Notify chat service
        try {
          await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'vote-session',
              sessionId: session.id,
              postId,
            }),
            credentials: 'include',
          });
        } catch {
          // Non-critical
        }
        if (soundEnabled) playSound('vote');
        toast('Голосование запущено!', { icon: '🎲', description: `${duration} секунд на голосование` });
        addActivity({
          type: 'vote_start',
          message: `🎲 Стример запустил голосование для поста от @${post?.author?.username || 'anonymous'}`,
        });
      } catch (err) {
        console.error('Failed to start vote:', err);
        toast.error('Не удалось запустить голосование');
      }
    },
    [approvedPosts, settings, startVoteMutation, setActiveVote, setOverlayPost, addActivity, soundEnabled]
  );

  const handleStreamerPublish = useCallback(
    (postId: string) => {
      const post = approvedPosts.find((p) => p.id === postId);
      updatePost.mutate({ id: postId, status: 'POSTED' });
      if (soundEnabled) playSound('publish');
      toast.success('Пост опубликован в канал!', { icon: '🚀' });
      triggerConfetti();
      addActivity({
        type: 'publish',
        message: `🚀 Стример опубликовал пост от @${post?.author?.username || 'anonymous'}${post?.channel ? ` в #${post.channel.name}` : ''}`,
      });
      // Clear overlay post
      setOverlayPost(null);
      if (socketRef.current) {
        socketRef.current.emit('overlay:clear');
      }
    },
    [approvedPosts, updatePost, addActivity, triggerConfetti, soundEnabled, setOverlayPost]
  );

  const handleStreamerReject = useCallback(
    (postId: string) => {
      const post = approvedPosts.find((p) => p.id === postId);
      updatePost.mutate({ id: postId, status: 'REJECTED' });
      if (soundEnabled) playSound('reject');
      toast('Пост отклонён стримером', { icon: '❌' });
      addActivity({
        type: 'reject',
        message: `❌ Стример отклонил пост от @${post?.author?.username || 'anonymous'}`,
      });
      // Clear overlay post
      setOverlayPost(null);
      if (socketRef.current) {
        socketRef.current.emit('overlay:clear');
      }
    },
    [approvedPosts, updatePost, addActivity, soundEnabled, setOverlayPost]
  );

  // ============ Vote Queue Handlers ============

  const handleAddToQueue = useCallback(
    (postId: string) => {
      addToVoteQueue(postId);
      const post = approvedPosts.find((p) => p.id === postId);
      toast('Пост добавлен в очередь', { icon: '📋', description: `@${post?.author?.username || 'anonymous'}` });
      addActivity({
        type: 'vote_start',
        message: `📋 Пост от @${post?.author?.username || 'anonymous'} добавлен в очередь голосований`,
      });
    },
    [addToVoteQueue, approvedPosts, addActivity]
  );

  // Auto-advance queue: when a vote ends and queue has items, wait 5 seconds then start next
  const prevActiveVoteCountRef = useRef(0);
  const queueTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    const currentVoteCount = Object.keys(activeVotes).length;

    // Detect vote ending: was >0, now 0, and queue has items
    if (prevActiveVoteCountRef.current > 0 && currentVoteCount === 0 && voteQueue.length > 0) {
      // Start 5-second countdown
      setQueueCountdown(5);

      queueTimerRef.current = setInterval(() => {
        const current = useStreamPostStore.getState().queueCountdown;
        if (current === null || current <= 1) {
          // Countdown finished — start the next vote
          if (queueTimerRef.current) {
            clearInterval(queueTimerRef.current);
            queueTimerRef.current = null;
          }
          setQueueCountdown(null);

          const currentQueue = useStreamPostStore.getState().voteQueue;
          const nextPostId = currentQueue[0];
          if (nextPostId) {
            removeFromVoteQueue(nextPostId);
            handleStreamerStartVote(nextPostId);
          }
        } else {
          decrementQueueCountdown();
        }
      }, 1000);

      return () => {
        if (queueTimerRef.current) {
          clearInterval(queueTimerRef.current);
          queueTimerRef.current = null;
        }
        setQueueCountdown(null);
      };
    }

    // If there are active votes or no queue, clear countdown
    if (currentVoteCount > 0 || voteQueue.length === 0) {
      if (queueTimerRef.current) {
        clearInterval(queueTimerRef.current);
        queueTimerRef.current = null;
      }
      if (queueCountdown !== null) {
        setQueueCountdown(null);
      }
    }

    prevActiveVoteCountRef.current = currentVoteCount;
  }, [activeVotes, voteQueue.length, handleStreamerStartVote, removeFromVoteQueue, queueCountdown, setQueueCountdown, decrementQueueCountdown]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input or a dialog is open
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if (e.target instanceof HTMLElement && e.target.closest('[data-slot="dialog-content"]')) return;

      // Global shortcut: ? opens keyboard help
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setShowKeyboardHelp((prev) => !prev);
        return;
      }

      if (activeTab !== 'moderation') return;

      const currentPost = visiblePosts[currentPostIndex];
      if (!currentPost) return;

      const activeVote = activeVotes[currentPost.id];

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          setCurrentPostIndex(Math.max(0, currentPostIndex - 1));
          break;
        case 'ArrowRight':
          e.preventDefault();
          setCurrentPostIndex(Math.min(visiblePosts.length - 1, currentPostIndex + 1));
          break;
        case 'Enter':
          e.preventDefault();
          if (!activeVote) handleAccept(currentPost.id);
          break;
        case 'Delete':
        case 'Backspace':
          e.preventDefault();
          if (!activeVote) handleReject(currentPost.id);
          break;
        case 'd':
        case 'D':
          e.preventDefault();
          if (!activeVote) handleDefer(currentPost.id);
          break;
        case 'v':
        case 'V':
          e.preventDefault();
          if (!activeVote) handleStartVote(currentPost.id);
          break;
        case 'p':
        case 'P':
          e.preventDefault();
          if (!activeVote) handlePostAndPublish(currentPost.id);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, visiblePosts, currentPostIndex, activeVotes, setCurrentPostIndex, handleAccept, handleReject, handleDefer, handleStartVote, handlePostAndPublish]);

  const currentPost = visiblePosts[currentPostIndex];
  const nextPost = visiblePosts[currentPostIndex + 1];

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Confetti />
      <QuickSubmitFAB />
      <KeyboardHelpDialog open={showKeyboardHelp} onOpenChange={setShowKeyboardHelp} activeTab={activeTab} />

      {/* Animated background particles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl -top-48 -left-48 animate-pulse" />
        <div className="absolute w-96 h-96 bg-purple-500/5 rounded-full blur-3xl -bottom-48 -right-48 animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute w-64 h-64 bg-red-500/5 rounded-full blur-3xl top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" style={{ animationDelay: '4s' }} />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-500 to-purple-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-gray-950 animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight">
                <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-purple-400 bg-clip-text text-transparent">StreamPost</span>
              </h1>
              <p className="text-[10px] text-white/30 -mt-0.5 tracking-wider uppercase">СИСТЕМА МОДЕРАЦИИ КОНТЕНТА</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* User info */}
            <Badge
              variant="outline"
              className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hidden sm:flex items-center gap-1"
            >
              <Crown className="w-3 h-3" />
              {session?.user?.name || 'Пользователь'}
            </Badge>

            {/* Sign out */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white/40 hover:text-red-400 hover:bg-red-500/10"
              onClick={() => signOut({ callbackUrl: '/' })}
              title="Выйти"
            >
              <LogOut className="w-4 h-4" />
            </Button>

            {/* Theme toggle */}
            <ThemeToggle />

            {/* Sound toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white/40 hover:text-white/80 hover:bg-white/5 dark:text-white/40 dark:hover:text-white/80 dark:hover:bg-white/5"
              onClick={toggleSound}
              title={soundEnabled ? 'Выключить звук' : 'Включить звук'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </Button>

            {/* Notification Bell */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white/40 hover:text-white/80 hover:bg-white/5 dark:text-white/40 dark:hover:text-white/80 dark:hover:bg-white/5 relative"
              onClick={() => setActiveTab('moderation')}
              title={`Постов на модерации: ${visiblePosts.length}`}
            >
              <Bell className={`w-4 h-4 ${visiblePosts.length > 0 ? 'animate-ring text-amber-400' : ''}`} style={visiblePosts.length > 0 ? { animation: 'ring 0.6s ease-in-out 0s 3' } : undefined} />
              {visiblePosts.length > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 bg-amber-500 rounded-full text-[10px] font-bold flex items-center justify-center text-white px-1">
                  {visiblePosts.length > 99 ? '99+' : visiblePosts.length}
                </span>
              )}
            </Button>

            <Badge
              variant="outline"
              className={`text-xs transition-all duration-300 ${
                socketConnected
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-sm shadow-emerald-500/20'
                  : 'bg-red-500/20 text-red-400 border-red-500/30'
              }`}
              title={socketConnected ? 'Подключено к realtime-сервису' : 'Нет подключения к realtime-сервису. Голосования и обновления могут работать с задержкой.'}
            >
              {socketConnected ? (
                <Wifi className="w-3 h-3 mr-1" />
              ) : (
                <WifiOff className="w-3 h-3 mr-1" />
              )}
              {socketConnected ? 'Live' : 'Offline'}
            </Badge>
            {/* Improvement 2: Always show inbox badge, styled differently when 0 */}
            <motion.div
              key={visiblePosts.length}
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <Badge
                variant="outline"
                className={`text-xs ${
                  visiblePosts.length > 0
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    : 'bg-white/5 text-white/20 border-white/10'
                }`}
              >
                <Inbox className="w-3 h-3 mr-1" />
                {visiblePosts.length}
              </Badge>
            </motion.div>

            {/* Activity panel toggle (only in moderation tab) */}
            {activeTab === 'moderation' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white/40 hover:text-white/80 hover:bg-white/5 relative hidden sm:flex"
                onClick={() => setShowActivityPanel(!showActivityPanel)}
                title={showActivityPanel ? 'Скрыть активность' : 'Показать активность'}
              >
                {showActivityPanel ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
                {activityLog.length > 0 && !showActivityPanel && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full text-[9px] font-bold flex items-center justify-center text-white">
                    {activityLog.length > 9 ? '9+' : activityLog.length}
                  </span>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Tab navigation */}
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex gap-0.5 overflow-x-auto pb-0 -mb-px scrollbar-none" role="tablist">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const badgeCount = tab.id === 'moderation' ? visiblePosts.length : tab.id === 'streamer' ? approvedPosts.length : tab.id === 'history' ? totalPostsCount : 0;
              const showBadge = badgeCount > 0;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-all duration-200 border-b-2 ${
                    isActive
                      ? 'text-emerald-400 border-emerald-400'
                      : 'text-white/30 border-transparent hover:text-white/50 hover:border-white/10'
                  }`}
                >
                  <Icon className={`w-4 h-4 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
                  <span className="hidden sm:inline">{tab.labelRu}</span>
                  {showBadge && (
                    <span className={`text-[10px] h-4 min-w-4 rounded-full px-1 flex items-center justify-center font-bold ${
                      tab.id === 'moderation'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-white/10 text-white/40 border border-white/10'
                    }`}>
                      {badgeCount > 99 ? '99+' : badgeCount}
                    </span>
                  )}
                  {isActive && (
                    <motion.div
                      layoutId="tab-glow"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400/50 blur-sm"
                      transition={{ type: 'spring', stiffness: 200, damping: 25, mass: 0.8 }}
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 relative z-10">
        <AnimatePresence mode="wait">
          {activeTab === 'moderation' && (
            <motion.div
              key="moderation"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <ModerationView
                posts={visiblePosts}
                currentPostIndex={currentPostIndex}
                setCurrentPostIndex={setCurrentPostIndex}
                currentPost={currentPost}
                nextPost={nextPost}
                isLoading={postsLoading}
                onAccept={handleAccept}
                onReject={handleReject}
                onDefer={handleDefer}
                showActivityPanel={showActivityPanel}
              />
            </motion.div>
          )}

          {activeTab === 'streamer' && (
            <motion.div
              key="streamer"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <StreamerPanel
                onStartVote={handleStreamerStartVote}
                onPublish={handleStreamerPublish}
                onReject={handleStreamerReject}
                onAddToQueue={handleAddToQueue}
                activeVotes={activeVotes}
                voteQueue={voteQueue}
                removeFromVoteQueue={removeFromVoteQueue}
                clearVoteQueue={clearVoteQueue}
                reorderVoteQueue={reorderVoteQueue}
                queueCountdown={queueCountdown}
              />
            </motion.div>
          )}

          {activeTab === 'channels' && (
            <motion.div key="channels" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              <ChannelManager />
            </motion.div>
          )}

          {activeTab === 'moderators' && (
            <motion.div key="moderators" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              <ModeratorManager />
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              <SettingsPanel />
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              <PostHistory />
            </motion.div>
          )}

          {activeTab === 'overlay' && (
            <motion.div key="overlay" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              <StreamOverlay />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer — context-aware opacity for keyboard shortcuts */}
      <footer className="mt-auto bg-muted/40 backdrop-blur-sm">
        {/* Subtle gradient line above footer */}
        <div className="h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
        <div className="py-4">
          <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              StreamPost v1.0 — Система модерации и голосования
            </p>
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 text-xs ${activeTab === 'moderation' ? 'text-muted-foreground' : 'text-muted-foreground/40'}`}>
                <Keyboard className="w-3.5 h-3.5" />
                <span className="font-medium">←→ Навигация</span>
                <span className="mx-1 opacity-50">·</span>
                <span className="font-medium">Enter Принять</span>
                <span className="mx-1 opacity-50">·</span>
                <span className="font-medium">Del Отклонить</span>
                <span className="mx-1 opacity-50">·</span>
                <span className="font-medium">V Голосование</span>
                <span className="mx-1 opacity-50">·</span>
                <span className="font-medium">P Опубликовать</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted"
                onClick={() => setShowKeyboardHelp(true)}
                title="Горячие клавиши (?)"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ============ Moderation View ============

interface ModerationViewProps {
  posts: ReturnType<typeof usePendingPosts>['data'] extends { posts: infer P } ? P : never;
  currentPostIndex: number;
  setCurrentPostIndex: (i: number) => void;
  currentPost: (typeof posts)[number] | undefined;
  nextPost: (typeof posts)[number] | undefined;
  isLoading: boolean;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onDefer: (id: string) => void;
  showActivityPanel: boolean;
}

function ModerationView({
  posts,
  currentPostIndex,
  setCurrentPostIndex,
  currentPost,
  nextPost,
  isLoading,
  onAccept,
  onReject,
  onDefer,
  showActivityPanel,
}: ModerationViewProps) {

  if (isLoading) {
    return (
      <div className="flex gap-4 h-full">
        <div className="flex-1 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32 bg-white/10" />
              <div className="flex gap-1">
                <Skeleton className="h-8 w-8 rounded-md bg-white/10" />
                <Skeleton className="h-8 w-8 rounded-md bg-white/10" />
              </div>
            </div>
            <Skeleton className="h-1 w-full rounded-full bg-white/10" />
          </div>
          <div className="relative w-full max-w-lg mx-auto" style={{ aspectRatio: '3/4', maxHeight: '60vh' }}>
            <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] backdrop-blur-sm p-6 space-y-4 h-full">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-full bg-white/10" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-3 w-24 bg-white/10" />
                  <Skeleton className="h-2 w-16 bg-white/10" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full bg-white/10" />
              </div>
              <Skeleton className="h-40 w-full rounded-lg bg-white/10" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-full bg-white/10" />
                <Skeleton className="h-3 w-3/4 bg-white/10" />
                <Skeleton className="h-3 w-1/2 bg-white/10" />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <Skeleton className="h-9 w-28 rounded-md bg-white/10" />
            <Skeleton className="h-9 w-20 rounded-md bg-white/10" />
            <Skeleton className="h-9 w-28 rounded-md bg-white/10" />
            <Skeleton className="h-9 w-24 rounded-md bg-white/10" />
            <Skeleton className="h-9 w-32 rounded-md bg-white/10" />
          </div>
        </div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex gap-4 h-full">
        {/* Empty state — centered message */}
        <div className="flex-1 flex flex-col items-center justify-center py-24 text-center">
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
            className="text-7xl mb-6"
          >
            🎉
          </motion.div>
          <h2 className="text-3xl font-black bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent mb-3">
            Всё проверено!
          </h2>
          <p className="text-white/40 max-w-md px-6 break-words leading-relaxed">
            Нет постов на премодерации. Новые посты из Telegram бота появятся здесь автоматически.
          </p>
        </div>

        {/* Activity Feed Sidebar — visible even when empty */}
        <AnimatePresence>
          {showActivityPanel && (
            <motion.aside
              initial={{ opacity: 0, x: 40, width: 0 }}
              animate={{ opacity: 1, x: 0, width: 300 }}
              exit={{ opacity: 0, x: 40, width: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="hidden sm:flex flex-col border-l border-white/10 bg-black/20 backdrop-blur-sm rounded-xl overflow-hidden flex-shrink-0"
            >
              <ActivityFeed className="h-full" />
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Mobile activity feed */}
        <div className="sm:hidden">
          <MobileActivityFeed />
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-4 h-full">
      {/* Main card area */}
      <div className="flex-1 space-y-4">
        {/* Card counter with progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-white/40">
              Пост <span className="text-emerald-400 font-bold">{currentPostIndex + 1}</span> из{' '}
              <span className="text-white/60 font-semibold">{posts.length}</span>
            </p>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white/30 hover:text-white/80 hover:bg-white/5"
                onClick={() => setCurrentPostIndex(Math.max(0, currentPostIndex - 1))}
                disabled={currentPostIndex === 0}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white/30 hover:text-white/80 hover:bg-white/5"
                onClick={() => setCurrentPostIndex(Math.min(posts.length - 1, currentPostIndex + 1))}
                disabled={currentPostIndex === posts.length - 1}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
          {/* Progress bar */}
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
              animate={{ width: `${((currentPostIndex + 1) / posts.length) * 100}%` }}
              transition={{ type: 'spring', stiffness: 200, damping: 25 }}
            />
          </div>
        </div>

        {/* Card stack */}
        <div className="relative w-full max-w-lg mx-auto" style={{ aspectRatio: '3/4', maxHeight: '60vh' }}>
          {/* Stack background cards */}
          {nextPost && (
            <ModerationCard post={nextPost} isTop={false} />
          )}

          {/* Current card */}
          <AnimatePresence mode="popLayout">
            {currentPost && (
              <motion.div
                key={currentPost.id}
                className="relative w-full h-full"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, x: 100 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              >
                <ModerationCard
                  post={currentPost}
                  isTop={true}
                  onSwipeLeft={() => onReject(currentPost.id)}
                  onSwipeRight={() => onAccept(currentPost.id)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Action buttons — Pre-moderation: only Accept/Reject/Defer */}
        <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
          <Button
            onClick={() => currentPost && onReject(currentPost.id)}
            disabled={!currentPost}
            className="bg-red-600/90 hover:bg-red-500 text-white px-4 shadow-lg shadow-red-600/20 border border-red-500/30 transition-transform hover:scale-105 active:scale-95"
          >
            <XCircle className="w-4 h-4 mr-1.5" />
            Отклонить
          </Button>

          <Button
            onClick={() => currentPost && onDefer(currentPost.id)}
            disabled={!currentPost}
            variant="outline"
            className="border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 px-4 transition-transform hover:scale-105 active:scale-95"
          >
            <Clock className="w-4 h-4 mr-1.5" />
            Позже
          </Button>

          <Button
            onClick={() => currentPost && onAccept(currentPost.id)}
            disabled={!currentPost}
            className="bg-emerald-600/90 hover:bg-emerald-500 text-white px-5 shadow-lg shadow-emerald-600/20 border border-emerald-500/30 transition-transform hover:scale-105 active:scale-95"
          >
            <CheckCircle2 className="w-4 h-4 mr-1.5" />
            Принять
          </Button>
        </div>
      </div>

      {/* Activity Feed Sidebar */}
      <AnimatePresence>
        {showActivityPanel && (
          <motion.aside
            initial={{ opacity: 0, x: 40, width: 0 }}
            animate={{ opacity: 1, x: 0, width: 300 }}
            exit={{ opacity: 0, x: 40, width: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="hidden sm:flex flex-col border-l border-white/10 bg-black/20 backdrop-blur-sm rounded-xl overflow-hidden flex-shrink-0"
          >
            <ActivityFeed className="h-full" />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Mobile activity feed - shown below on mobile */}
      <div className="sm:hidden">
        <MobileActivityFeed />
      </div>
    </div>
  );
}

// ============ Mobile Activity Feed (collapsible) ============

function MobileActivityFeed() {
  const [isOpen, setIsOpen] = useState(false);
  const { activityLog } = useStreamPostStore();

  return (
    <div className="mt-4">
      <Button
        variant="outline"
        size="sm"
        className="w-full border-white/10 bg-white/5 text-white/60 hover:text-white/90 hover:bg-white/10"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="flex items-center gap-2">
          {isOpen ? 'Скрыть активность' : 'Показать активность'}
          {activityLog.length > 0 && (
            <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] h-5 px-1.5">
              {activityLog.length}
            </Badge>
          )}
        </span>
      </Button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden mt-2"
          >
            <div className="border border-white/10 bg-black/20 backdrop-blur-sm rounded-xl overflow-hidden">
              <ActivityFeed />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============ Quick Submit FAB (Improvement 3) ============

function QuickSubmitFAB() {
  const [open, setOpen] = useState(false);
  const [postType, setPostType] = useState<'PHOTO' | 'YOUTUBE' | 'TEXT'>('TEXT');
  const [text, setText] = useState('');
  const [authorTelegramId, setAuthorTelegramId] = useState('');
  const createPost = useCreatePost();
  const { data: pendingData } = usePendingPosts();
  const hasPendingPosts = (pendingData?.posts?.length || 0) > 0;

  const { data: usersData } = useQuery<{ users: TelegramUser[]; total: number }>({
    queryKey: ['telegram-users'],
    queryFn: async () => {
      const res = await fetch('/api/users/telegram', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    },
    enabled: open,
  });

  const users = usersData?.users || [];

  const handleSubmit = useCallback(() => {
    if (!authorTelegramId || !text) return;
    const author = users.find((u) => u.telegramId === authorTelegramId);
    createPost.mutate(
      {
        type: postType,
        text,
        authorTelegramId,
        authorUsername: author?.username || 'test_user',
        authorFirstName: author?.firstName || 'Test',
      },
      {
        onSuccess: () => {
          toast.success('Тестовый пост создан!', { icon: '📝' });
          setOpen(false);
          setText('');
          setAuthorTelegramId('');
        },
        onError: () => {
          toast.error('Не удалось создать пост');
        },
      }
    );
  }, [authorTelegramId, text, postType, users, createPost]);

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setOpen(true)}
        className={`fixed bottom-20 right-6 z-40 w-12 h-12 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30 flex items-center justify-center border border-emerald-400/30 hover:shadow-emerald-500/50 transition-shadow ${hasPendingPosts ? 'animate-[pulse_2s_ease-in-out_infinite]' : ''}`}
        title="Быстрое создание поста"
      >
        <Plus className="w-5 h-5" />
      </motion.button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-gray-900 border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Быстрое создание поста</DialogTitle>
            <DialogDescription className="text-white/40">
              Создайте тестовый пост для проверки модерации
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white/60 text-xs">Тип поста</Label>
              <Select value={postType} onValueChange={(v) => setPostType(v as 'PHOTO' | 'YOUTUBE' | 'TEXT')}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-white/10">
                  <SelectItem value="TEXT">📝 Текст</SelectItem>
                  <SelectItem value="PHOTO">📸 Фото</SelectItem>
                  <SelectItem value="YOUTUBE">🎥 YouTube</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-white/60 text-xs">Текст поста</Label>
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Введите текст поста..."
                className="bg-white/5 border-white/10 text-white placeholder:text-white/20"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white/60 text-xs">Автор</Label>
              <Select value={authorTelegramId} onValueChange={setAuthorTelegramId}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white w-full">
                  <SelectValue placeholder="Выберите автора" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-white/10">
                  {users.map((user) => (
                    <SelectItem key={user.telegramId} value={user.telegramId}>
                      @{user.username || user.firstName || user.telegramId}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="border-white/10 text-white/60 hover:text-white hover:bg-white/5"
            >
              Отмена
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!text || !authorTelegramId || createPost.isPending}
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              {createPost.isPending ? 'Создание...' : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ============ Keyboard Help Dialog ============

function KeyboardHelpDialog({ open, onOpenChange, activeTab }: { open: boolean; onOpenChange: (open: boolean) => void; activeTab: TabType }) {
  const shortcuts = [
    { key: '← →', action: 'Навигация между постами', tab: 'Модерация' },
    { key: 'Enter', action: 'Принять пост', tab: 'Модерация' },
    { key: 'Del / Backspace', action: 'Отклонить пост', tab: 'Модерация' },
    { key: 'D', action: 'Отложить пост', tab: 'Модерация' },
    { key: 'V', action: 'Начать голосование', tab: 'Модерация' },
    { key: 'P', action: 'Опубликовать пост', tab: 'Модерация' },
    { key: '?', action: 'Показать/скрыть эту справку', tab: 'Любая' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-white/10 text-white sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-emerald-400" />
            Горячие клавиши
          </DialogTitle>
          <DialogDescription className="text-white/40">
            Быстрые клавиши для управления модерацей
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-white/50">Клавиша</TableHead>
                <TableHead className="text-white/50">Действие</TableHead>
                <TableHead className="text-white/50">Вкладка</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shortcuts.map((s) => {
                const isActive = s.tab === 'Любая' || s.tab === (activeTab === 'moderation' ? 'Модерация' : '');
                return (
                  <TableRow
                    key={s.key}
                    className={`border-white/5 transition-colors ${isActive ? 'bg-white/[0.03]' : 'opacity-40'}`}
                  >
                    <TableCell className="font-mono text-sm">
                      <kbd className="px-2 py-1 rounded bg-white/10 border border-white/20 text-emerald-400 text-xs">
                        {s.key}
                      </kbd>
                    </TableCell>
                    <TableCell className="text-sm text-white/80">{s.action}</TableCell>
                    <TableCell className="text-xs text-white/40">{s.tab}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <Bell className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <p className="text-xs text-amber-200/80">
              Подсказка: нажмите <kbd className="px-1 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px]">?</kbd> в любой момент, чтобы открыть эту справку
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============ Root Page with Providers ============

export default function Home() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthGate>
        <StreamPostApp />
      </AuthGate>
    </QueryClientProvider>
  );
}
