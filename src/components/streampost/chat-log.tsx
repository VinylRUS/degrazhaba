'use client';

import { useEffect, useRef } from 'react';
import { useStreamPostStore } from '@/lib/streampost-store';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tv, Gamepad2, MessageSquare, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ChatLog() {
  const { chatMessages, clearChatMessages } = useStreamPostStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to newest message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [chatMessages.length]);

  if (chatMessages.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] backdrop-blur-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-semibold text-white/80">Лог чата</h3>
          <Badge variant="outline" className="bg-white/5 text-white/20 border-white/10 text-[10px]">
            0
          </Badge>
        </div>
        <div className="text-center py-8 text-white/20">
          <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Нет сообщений</p>
          <p className="text-xs mt-1 text-white/15">Сообщения из чата появятся здесь во время голосования</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] backdrop-blur-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-semibold text-white/80">Лог чата</h3>
          <Badge variant="outline" className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-[10px]">
            {chatMessages.length}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-white/20 hover:text-red-400 hover:bg-red-500/10"
          onClick={clearChatMessages}
          title="Очистить лог"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div
        ref={scrollRef}
        className="max-h-96 overflow-y-auto space-y-1 pr-1"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255,255,255,0.1) transparent',
        }}
      >
        {chatMessages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-2 p-2 rounded-lg transition-colors ${
              msg.isVote
                ? msg.voteValue === 1
                  ? 'bg-emerald-500/10 border border-emerald-500/20'
                  : msg.voteValue === 2
                    ? 'bg-red-500/10 border border-red-500/20'
                    : 'bg-white/[0.03]'
                : 'bg-white/[0.02] hover:bg-white/[0.04]'
            }`}
          >
            {/* Platform icon */}
            <div className="flex-shrink-0 mt-0.5">
              {msg.platform === 'TWITCH' ? (
                <div className="w-5 h-5 rounded-md bg-purple-500/20 flex items-center justify-center">
                  <Tv className="w-3 h-3 text-purple-400" />
                </div>
              ) : (
                <div className="w-5 h-5 rounded-md bg-amber-500/20 flex items-center justify-center">
                  <Gamepad2 className="w-3 h-3 text-amber-400" />
                </div>
              )}
            </div>

            {/* Message content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold ${
                  msg.platform === 'TWITCH' ? 'text-purple-300' : 'text-amber-300'
                }`}>
                  {msg.username}
                </span>
                {msg.isVote && msg.voteValue && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    msg.voteValue === 1
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {msg.voteValue === 1 ? 'ЗА' : 'ПРОТИВ'}
                  </span>
                )}
                <span className="text-[10px] text-white/20 ml-auto flex-shrink-0">
                  {new Date(msg.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
              <p className="text-xs text-white/50 mt-0.5 break-words">{msg.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
