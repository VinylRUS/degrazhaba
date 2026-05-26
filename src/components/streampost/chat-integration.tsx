'use client';

import { useState, useEffect, useCallback } from 'react';
// No framer-motion needed in this component
import {
  Tv,
  Gamepad2,
  Wifi,
  WifiOff,
  Plug,
  Unplug,
  RefreshCw,
  Eye,
  EyeOff,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Info,
  Dices,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface ChatStatus {
  twitch: {
    connected: boolean;
    config: { username: string; channel: string } | null;
  };
  goodgame: {
    connected: boolean;
    config: { channelId: string } | null;
  };
  realtimeService: {
    connected: boolean;
  };
  activeSessions: { id: string; postId: string; voterCount: number }[];
  _error?: string;
}

export function ChatIntegration() {
  const [status, setStatus] = useState<ChatStatus | null>(null);

  // Twitch form
  const [twitchUsername, setTwitchUsername] = useState('');
  const [twitchOAuth, setTwitchOAuth] = useState('');
  const [twitchChannel, setTwitchChannel] = useState('');
  const [showOAuth, setShowOAuth] = useState(false);

  // GoodGame form
  const [ggChannelId, setGgChannelId] = useState('');

  // Connection actions
  const [connectingTwitch, setConnectingTwitch] = useState(false);
  const [connectingGG, setConnectingGG] = useState(false);

  // Fetch status
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/chat');
      const data = await res.json();
      setStatus(data);

      // Pre-fill form from existing config
      if (data.twitch?.config) {
        setTwitchUsername(data.twitch.config.username || '');
        setTwitchChannel(data.twitch.config.channel || '');
      }
      if (data.goodgame?.config) {
        setGgChannelId(data.goodgame.config.channelId || '');
      }
    } catch {
      setStatus(null);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Connect to Twitch
  const handleConnectTwitch = async () => {
    if (!twitchUsername || !twitchOAuth || !twitchChannel) {
      toast.error('Заполните все поля Twitch');
      return;
    }
    setConnectingTwitch(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'connect/twitch',
          username: twitchUsername,
          oauth: twitchOAuth,
          channel: twitchChannel,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Twitch подключён: #${twitchChannel}`, { icon: '📺' });
      } else {
        toast.error(data.error || 'Ошибка подключения к Twitch');
      }
      fetchStatus();
    } catch {
      toast.error('Чат-сервис недоступен');
    } finally {
      setConnectingTwitch(false);
    }
  };

  // Disconnect Twitch
  const handleDisconnectTwitch = async () => {
    try {
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disconnect/twitch' }),
      });
      toast('Twitch отключён', { icon: '📺' });
      fetchStatus();
    } catch {
      toast.error('Ошибка отключения');
    }
  };

  // Connect to GoodGame
  const handleConnectGG = async () => {
    if (!ggChannelId) {
      toast.error('Укажите ID канала GoodGame');
      return;
    }
    setConnectingGG(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'connect/goodgame',
          channelId: ggChannelId,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`GoodGame подключён: канал ${ggChannelId}`, { icon: '🎮' });
      } else {
        toast.error(data.error || 'Ошибка подключения к GoodGame');
      }
      fetchStatus();
    } catch {
      toast.error('Чат-сервис недоступен');
    } finally {
      setConnectingGG(false);
    }
  };

  // Disconnect GoodGame
  const handleDisconnectGG = async () => {
    try {
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disconnect/goodgame' }),
      });
      toast('GoodGame отключён', { icon: '🎮' });
      fetchStatus();
    } catch {
      toast.error('Ошибка отключения');
    }
  };

  const isServiceDown = !!status?._error;
  const isLoading = status === null;

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Skeleton status banner */}
        <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 flex items-center gap-3">
          <Skeleton className="w-5 h-5 rounded-full bg-white/10" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-4 w-40 rounded bg-white/10" />
            <Skeleton className="h-3 w-64 rounded bg-white/10" />
          </div>
          <Skeleton className="h-8 w-8 rounded-md bg-white/10" />
        </div>
        {/* Skeleton Twitch card */}
        <div className="rounded-xl border border-white/10 border-l-4 border-l-purple-500/50 bg-gradient-to-b from-white/[0.06] to-white/[0.02] backdrop-blur-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-xl bg-white/10" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-24 rounded bg-white/10" />
                <Skeleton className="h-3 w-36 rounded bg-white/10" />
              </div>
            </div>
            <Skeleton className="h-6 w-20 rounded-full bg-white/10" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-9 w-full rounded-md bg-white/10" />
            <Skeleton className="h-9 w-full rounded-md bg-white/10" />
          </div>
          <Skeleton className="h-9 w-full rounded-md bg-white/10" />
          <Skeleton className="h-9 w-28 rounded-md bg-white/10" />
        </div>
        {/* Skeleton GG card */}
        <div className="rounded-xl border border-white/10 border-l-4 border-l-amber-500/50 bg-gradient-to-b from-white/[0.06] to-white/[0.02] backdrop-blur-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-xl bg-white/10" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-28 rounded bg-white/10" />
                <Skeleton className="h-3 w-36 rounded bg-white/10" />
              </div>
            </div>
            <Skeleton className="h-6 w-20 rounded-full bg-white/10" />
          </div>
          <Skeleton className="h-9 w-full rounded-md bg-white/10" />
          <Skeleton className="h-9 w-28 rounded-md bg-white/10" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Service Status Banner */}
      <div
        className={`rounded-xl border backdrop-blur-sm p-4 flex items-center gap-3 ${
          isServiceDown
            ? 'border-red-500/50 bg-red-500/15 border-l-4 border-l-red-500'
            : status?.realtimeService?.connected
            ? 'border-emerald-500/30 bg-emerald-500/10'
            : 'border-amber-500/30 bg-amber-500/10'
        }`}
      >
        {isServiceDown ? (
          <>
            <div className="relative flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            </div>
            <div>
              <p className="text-sm font-semibold text-red-300">Чат-сервис недоступен</p>
              <p className="text-xs text-red-400/60">
                Запустите чат-сервис: <code className="bg-red-500/20 px-1.5 py-0.5 rounded text-red-300">cd mini-services/chat-service && bun run dev</code>
              </p>
            </div>
          </>
        ) : status?.realtimeService?.connected ? (
          <>
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-300">Чат-сервис работает</p>
              <p className="text-xs text-emerald-400/60">
                Подключён к realtime-сервису • {status.activeSessions?.length || 0} активных сессий
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="relative flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-300">Чат-сервис запущен, но нет связи с realtime</p>
              <p className="text-xs text-amber-400/60">
                Убедитесь, что realtime-сервис работает на порту 3003
              </p>
            </div>
          </>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto h-8 w-8 text-white/40 hover:text-white/80 hover:bg-white/5"
          onClick={fetchStatus}
          title="Обновить статус"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Twitch IRC */}
      <div className="rounded-xl border border-white/10 border-l-4 border-l-purple-500/50 bg-gradient-to-b from-white/[0.06] to-white/[0.02] backdrop-blur-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
              <Tv className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white/90">Twitch IRC</h3>
              <p className="text-xs text-white/40">Чат-голосование через Twitch</p>
            </div>
          </div>
          {status?.twitch && (
            <Badge
              variant="outline"
              className={`text-xs ${
                status.twitch.connected
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-sm shadow-emerald-500/20'
                  : 'bg-white/5 text-white/30 border-white/10'
              }`}
            >
              {status.twitch.connected ? (
                <Wifi className="w-3 h-3 mr-1" />
              ) : (
                <WifiOff className="w-3 h-3 mr-1" />
              )}
              {status.twitch.connected ? 'Подключён' : 'Отключён'}
            </Badge>
          )}
        </div>

        {status?.twitch?.connected && status.twitch.config && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-sm text-purple-200">
              Подключён как <strong className="text-purple-100">@{status.twitch.config.username}</strong> к каналу{' '}
              <strong className="text-purple-100">#{status.twitch.config.channel}</strong>
            </span>
          </div>
        )}

        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm text-white/50">Имя бота</Label>
              <Input
                value={twitchUsername}
                onChange={(e) => setTwitchUsername(e.target.value)}
                placeholder="streampost_bot"
                className="bg-white/5 border-white/10 text-white text-sm h-9"
                disabled={status?.twitch?.connected}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-white/50">Канал</Label>
              <Input
                value={twitchChannel}
                onChange={(e) => setTwitchChannel(e.target.value)}
                placeholder="streamer_name"
                className="bg-white/5 border-white/10 text-white text-sm h-9"
                disabled={status?.twitch?.connected}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-sm text-white/50">OAuth токен</Label>
              <button
                onClick={() => setShowOAuth(!showOAuth)}
                className="text-[10px] text-white/30 hover:text-white/50 flex items-center gap-1"
              >
                {showOAuth ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                {showOAuth ? 'Скрыть' : 'Показать'}
              </button>
            </div>
            <Input
              type={showOAuth ? 'text' : 'password'}
              value={twitchOAuth}
              onChange={(e) => setTwitchOAuth(e.target.value)}
              placeholder="oauth:abcdef123456"
              className="bg-white/5 border-white/10 text-white text-sm h-9 font-mono"
              disabled={status?.twitch?.connected}
            />
            <p className="text-[10px] text-white/25">
              Получите токен на{' '}
              <a href="https://twitchapps.com/tmi/" target="_blank" rel="noopener noreferrer" className="text-purple-400/50 hover:text-purple-400/80 underline">
                twitchapps.com/tmi
              </a>
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {status?.twitch?.connected ? (
            <Button
              onClick={handleDisconnectTwitch}
              variant="outline"
              className="border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 text-sm"
            >
              <Unplug className="w-4 h-4 mr-1.5" />
              Отключить
            </Button>
          ) : (
            <Button
              onClick={handleConnectTwitch}
              disabled={connectingTwitch || isServiceDown}
              className="bg-purple-600 hover:bg-purple-500 text-white text-sm"
            >
              {connectingTwitch ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <Plug className="w-4 h-4 mr-1.5" />
              )}
              {connectingTwitch ? 'Подключение...' : 'Подключить'}
            </Button>
          )}
        </div>
      </div>

      {/* GoodGame WebSocket */}
      <div className="rounded-xl border border-white/10 border-l-4 border-l-amber-500/50 bg-gradient-to-b from-white/[0.06] to-white/[0.02] backdrop-blur-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
              <Gamepad2 className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white/90">GoodGame Chat</h3>
              <p className="text-xs text-white/40">Чат-голосование через GoodGame</p>
            </div>
          </div>
          {status?.goodgame && (
            <Badge
              variant="outline"
              className={`text-xs ${
                status.goodgame.connected
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-sm shadow-emerald-500/20'
                  : 'bg-white/5 text-white/30 border-white/10'
              }`}
            >
              {status.goodgame.connected ? (
                <Wifi className="w-3 h-3 mr-1" />
              ) : (
                <WifiOff className="w-3 h-3 mr-1" />
              )}
              {status.goodgame.connected ? 'Подключён' : 'Отключён'}
            </Badge>
          )}
        </div>

        {status?.goodgame?.connected && status.goodgame.config && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-sm text-amber-200">
              Подключён к каналу <strong className="text-amber-100">#{status.goodgame.config.channelId}</strong>
            </span>
          </div>
        )}

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-sm text-white/50">ID канала GoodGame</Label>
            <Input
              value={ggChannelId}
              onChange={(e) => setGgChannelId(e.target.value)}
              placeholder="12345"
              className="bg-white/5 border-white/10 text-white text-sm h-9"
              disabled={status?.goodgame?.connected}
            />
            <p className="text-[10px] text-white/25">
              Числовой ID канала. Найдите его в URL страницы канала на goodgame.ru
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {status?.goodgame?.connected ? (
            <Button
              onClick={handleDisconnectGG}
              variant="outline"
              className="border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 text-sm"
            >
              <Unplug className="w-4 h-4 mr-1.5" />
              Отключить
            </Button>
          ) : (
            <Button
              onClick={handleConnectGG}
              disabled={connectingGG || isServiceDown}
              className="bg-amber-600 hover:bg-amber-500 text-white text-sm"
            >
              {connectingGG ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <Plug className="w-4 h-4 mr-1.5" />
              )}
              {connectingGG ? 'Подключение...' : 'Подключить'}
            </Button>
          )}
        </div>
      </div>

      {/* Active Vote Sessions */}
      {status?.activeSessions && status.activeSessions.length > 0 && (
        <div className="rounded-xl border border-white/10 border-l-4 border-l-emerald-500/50 bg-gradient-to-b from-white/[0.06] to-white/[0.02] backdrop-blur-sm p-6 space-y-3">
          <div className="flex items-center gap-2">
            <Dices className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white/80">Активные голосования</h3>
            <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
              {status.activeSessions.length}
            </Badge>
          </div>
          <div className="space-y-2">
            {status.activeSessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/5"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                  <span className="text-xs text-white/60 font-mono">{session.id.slice(0, 8)}...</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/40">
                    {session.voterCount} голосов
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vote Commands Info */}
      <div className="rounded-xl border border-white/10 border-l-4 border-l-blue-500/50 bg-gradient-to-b from-white/[0.06] to-white/[0.02] backdrop-blur-sm p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-semibold text-white/80">Как работает голосование в чате</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-white/[0.03] border border-white/5 space-y-2">
            <p className="text-xs font-semibold text-purple-300 flex items-center gap-1.5">
              <Tv className="w-3 h-3" /> Twitch
            </p>
            <p className="text-xs text-white/40 leading-relaxed">
              Зрители пишут <code className="bg-white/10 px-1 py-0.5 rounded text-white/60">1</code> или{' '}
              <code className="bg-white/10 px-1 py-0.5 rounded text-white/60">2</code> в чат.
              Также принимаются: <code className="bg-white/10 px-1 py-0.5 rounded text-white/60">+1</code>,{' '}
              <code className="bg-white/10 px-1 py-0.5 rounded text-white/60">-1</code>,{' '}
              <code className="bg-white/10 px-1 py-0.5 rounded text-white/60">за</code>,{' '}
              <code className="bg-white/10 px-1 py-0.5 rounded text-white/60">против</code>
            </p>
          </div>
          <div className="p-3 rounded-lg bg-white/[0.03] border border-white/5 space-y-2">
            <p className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
              <Gamepad2 className="w-3 h-3" /> GoodGame
            </p>
            <p className="text-xs text-white/40 leading-relaxed">
              Аналогичные команды. Зрители могут менять голос —
              засчитывается последний вариант от каждого зрителя.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
