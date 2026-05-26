'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Play,
  Square,
  RotateCcw,
  Monitor,
  ExternalLink,
  Copy,
  Settings2,
  ImageIcon,
  Youtube,
  FileText,
  User,
  GripVertical,
  RotateCcwIcon,
  Maximize2,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { useStreamPostStore, type Post, type OverlayPanelPositions, type PanelRect } from '@/lib/streampost-store';
import { getProxiedImageUrl } from '@/lib/sanitization';

type OverlayState = 'idle' | 'voting' | 'result';

type ColorTheme = 'emerald' | 'red' | 'purple' | 'amber' | 'teal';
type BarThickness = 'thin' | 'medium' | 'thick';
type AnimationSpeed = 'slow' | 'normal' | 'fast';

const COLOR_THEMES: Record<ColorTheme, { forFrom: string; forTo: string; againstFrom: string; againstTo: string; accent: string; accentBg: string; glow: string }> = {
  emerald: { forFrom: 'from-emerald-600', forTo: 'to-emerald-400', againstFrom: 'from-red-600', againstTo: 'to-red-400', accent: 'text-emerald-400', accentBg: 'bg-emerald-500/20', glow: 'shadow-emerald-500/30' },
  red: { forFrom: 'from-rose-600', forTo: 'to-rose-400', againstFrom: 'from-slate-600', againstTo: 'to-slate-400', accent: 'text-rose-400', accentBg: 'bg-rose-500/20', glow: 'shadow-rose-500/30' },
  purple: { forFrom: 'from-purple-600', forTo: 'to-purple-400', againstFrom: 'from-amber-600', againstTo: 'to-amber-400', accent: 'text-purple-400', accentBg: 'bg-purple-500/20', glow: 'shadow-purple-500/30' },
  amber: { forFrom: 'from-amber-600', forTo: 'to-amber-400', againstFrom: 'from-violet-600', againstTo: 'to-violet-400', accent: 'text-amber-400', accentBg: 'bg-amber-500/20', glow: 'shadow-amber-500/30' },
  teal: { forFrom: 'from-teal-600', forTo: 'to-teal-400', againstFrom: 'from-pink-600', againstTo: 'to-pink-400', accent: 'text-teal-400', accentBg: 'bg-teal-500/20', glow: 'shadow-teal-500/30' },
};

const BAR_THICKNESS_MAP: Record<BarThickness, string> = {
  thin: 'h-6',
  medium: 'h-8',
  thick: 'h-10',
};

const ANIMATION_SPEED_MAP: Record<AnimationSpeed, { stiffness: number; damping: number }> = {
  slow: { stiffness: 60, damping: 25 },
  normal: { stiffness: 100, damping: 20 },
  fast: { stiffness: 200, damping: 15 },
};

const DEFAULT_PANEL_POSITIONS: OverlayPanelPositions = {
  postContent: { x: 20, y: 680, width: 500, height: 400 },
  voteBar: { x: 20, y: 900, width: 1880, height: 160 },
};

// Twitch emote helpers
interface TwitchEmote {
  code: string;
  url: string;
}

function getEmoteUrl(url: string, size: '1.0' | '2.0' | '3.0' = '1.0'): string {
  return url.replace(/\/3\.0$/, `/${size}`);
}

// ============ Post Content Preview Component ============

function PostContentPreview({ post, compact = false }: { post: Post; compact?: boolean }) {
  const typeConfig = {
    PHOTO: { emoji: '📸', label: 'ФОТО', dotColor: 'bg-emerald-400', gradient: 'from-emerald-900/40 to-teal-900/20' },
    YOUTUBE: { emoji: '🎥', label: 'YOUTUBE', dotColor: 'bg-red-400', gradient: 'from-red-900/40 to-rose-900/20' },
    TEXT: { emoji: '📝', label: 'ТЕКСТ', dotColor: 'bg-amber-400', gradient: 'from-amber-900/30 to-orange-900/15' },
  };

  const config = typeConfig[post.type];

  const proxiedMediaUrl = getProxiedImageUrl(post.mediaUrl);
  const proxiedThumbnail = getProxiedImageUrl(post.youtubeThumbnail);

  return (
    <div className={`relative overflow-hidden ${compact ? 'rounded-t-xl' : 'rounded-xl'}`}>
      {post.type === 'PHOTO' && (
        <div className={`relative ${compact ? 'h-[60%]' : 'h-48'} bg-gradient-to-br ${config.gradient}`}>
          {proxiedMediaUrl ? (
            <>
              <div
                className="absolute inset-0 bg-cover bg-center blur-2xl scale-125 opacity-50"
                style={{ backgroundImage: `url(${proxiedMediaUrl})` }}
              />
              <div className="absolute inset-0 bg-black/30" />
              <div className="absolute inset-0 flex items-center justify-center p-3">
                <img
                  src={proxiedMediaUrl}
                  alt="Submitted photo"
                  className="max-h-full max-w-full object-contain rounded-lg shadow-2xl ring-1 ring-white/10"
                />
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <ImageIcon className="w-12 h-12 text-emerald-500/30 mx-auto mb-2" />
                <p className="text-white/25 text-xs">Фото (файл в Telegram)</p>
              </div>
            </div>
          )}
          {post.text && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent px-4 py-3">
              <p className="text-white/80 text-xs leading-relaxed line-clamp-2">{post.text}</p>
            </div>
          )}
        </div>
      )}

      {post.type === 'YOUTUBE' && (
        <div className={`relative ${compact ? 'h-[60%]' : 'h-48'} bg-gradient-to-br ${config.gradient}`}>
          {proxiedThumbnail ? (
            <>
              <img
                src={proxiedThumbnail}
                alt={post.youtubeTitle || 'YouTube video'}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-red-600/90 flex items-center justify-center shadow-2xl shadow-red-600/40 backdrop-blur-sm border-2 border-white/20">
                  <Youtube className="w-7 h-7 text-white ml-0.5" />
                </div>
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Youtube className="w-12 h-12 text-red-500/30 mx-auto mb-2" />
                <p className="text-white/25 text-xs">YouTube видео</p>
              </div>
            </div>
          )}
          {post.youtubeTitle && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent px-4 py-3">
              <p className="text-white/90 text-xs font-medium leading-relaxed line-clamp-2">{post.youtubeTitle}</p>
            </div>
          )}
        </div>
      )}

      {post.type === 'TEXT' && (
        <div className={`relative ${compact ? 'h-[60%]' : 'h-48'} bg-gradient-to-br ${config.gradient} flex items-center justify-center p-6`}>
          <div className="max-w-sm text-center space-y-3">
            <div className="w-10 h-10 mx-auto rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center border border-amber-500/10">
              <FileText className="w-5 h-5 text-amber-400/50" />
            </div>
            <p className="text-white/80 text-sm leading-relaxed font-medium">
              &ldquo;{post.text || 'Пустой пост'}&rdquo;
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 px-4 py-2 bg-black/50 border-t border-white/5">
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500 flex items-center justify-center text-white text-[10px] font-bold shadow-md ring-1 ring-white/10 flex-shrink-0">
          {post.author.username?.charAt(0).toUpperCase() || <User className="w-3 h-3" />}
        </div>
        <span className="text-white/60 text-xs font-medium">@{post.author.username || 'anonymous'}</span>
        <span className="text-white/20 text-xs">·</span>
        <span className="text-white/40 text-xs flex items-center gap-1">
          <span>{config.emoji}</span>
          <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} />
          {config.label}
        </span>
      </div>
    </div>
  );
}

// ============ Draggable Panel Component ============

interface DraggablePanelProps {
  panelKey: 'postContent' | 'voteBar';
  rect: PanelRect;
  onRectChange: (rect: PanelRect) => void;
  canvasScale: number;
  isDraggingAny: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  children: React.ReactNode;
  label: string;
}

function DraggablePanel({
  panelKey,
  rect,
  onRectChange,
  canvasScale,
  isDraggingAny,
  onDragStart,
  onDragEnd,
  children,
  label,
}: DraggablePanelProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; panelX: number; panelY: number } | null>(null);
  const resizeStartRef = useRef<{ mouseX: number; mouseY: number; panelW: number; panelH: number } | null>(null);

  const isActive = isDragging || isResizing;

  const handleMouseDownDrag = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
      onDragStart();
      dragStartRef.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        panelX: rect.x,
        panelY: rect.y,
      };
    },
    [rect.x, rect.y, onDragStart]
  );

  const handleMouseDownResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(true);
      onDragStart();
      resizeStartRef.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        panelW: rect.width,
        panelH: rect.height,
      };
    },
    [rect.width, rect.height, onDragStart]
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current) return;
      const dx = (e.clientX - dragStartRef.current.mouseX) / canvasScale;
      const dy = (e.clientY - dragStartRef.current.mouseY) / canvasScale;
      const newX = Math.max(0, Math.min(1920 - rect.width, dragStartRef.current.panelX + dx));
      const newY = Math.max(0, Math.min(1080 - rect.height, dragStartRef.current.panelY + dy));
      onRectChange({ ...rect, x: Math.round(newX), y: Math.round(newY) });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragStartRef.current = null;
      onDragEnd();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, rect, canvasScale, onRectChange, onDragEnd]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeStartRef.current) return;
      const dx = (e.clientX - resizeStartRef.current.mouseX) / canvasScale;
      const dy = (e.clientY - resizeStartRef.current.mouseY) / canvasScale;
      const newW = Math.max(100, Math.min(1920 - rect.x, resizeStartRef.current.panelW + dx));
      const newH = Math.max(60, Math.min(1080 - rect.y, resizeStartRef.current.panelH + dy));
      onRectChange({ ...rect, width: Math.round(newW), height: Math.round(newH) });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      resizeStartRef.current = null;
      onDragEnd();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, rect, canvasScale, onRectChange, onDragEnd]);

  return (
    <div
      style={{
        position: 'absolute',
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
      }}
      className={`group/panel transition-shadow duration-150 ${isActive ? 'z-30' : 'z-20'}`}
    >
      {/* Drag handle */}
      <div
        onMouseDown={handleMouseDownDrag}
        className={`absolute top-0 left-0 right-0 h-7 flex items-center justify-center cursor-move select-none transition-colors duration-150 z-10 ${
          isActive
            ? 'bg-blue-500/30'
            : 'bg-white/5 opacity-0 group-hover/panel:opacity-100'
        }`}
        style={{ borderRadius: '8px 8px 0 0' }}
      >
        <GripVertical className="w-4 h-4 text-white/50" />
        <span className="text-[9px] text-white/40 font-medium ml-1 uppercase tracking-wider">{label}</span>
      </div>

      {/* Blue outline when active */}
      {isActive && (
        <div className="absolute inset-0 border-2 border-blue-400/70 rounded-lg pointer-events-none z-40" />
      )}

      {/* Panel content */}
      <div
        className="w-full h-full overflow-hidden rounded-lg"
        style={{ paddingTop: 28 }}
      >
        {children}
      </div>

      {/* Resize handle */}
      <div
        onMouseDown={handleMouseDownResize}
        className={`absolute bottom-0 right-0 w-5 h-5 cursor-se-resize z-10 flex items-end justify-end transition-colors duration-150 ${
          isActive
            ? 'text-blue-400'
            : 'text-white/20 opacity-0 group-hover/panel:opacity-100'
        }`}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
          <circle cx="8" cy="2" r="1.2" />
          <circle cx="8" cy="5" r="1.2" />
          <circle cx="5" cy="5" r="1.2" />
          <circle cx="8" cy="8" r="1.2" />
          <circle cx="5" cy="8" r="1.2" />
          <circle cx="2" cy="8" r="1.2" />
        </svg>
      </div>
    </div>
  );
}

// ============ Overlay URL Section ============

function OverlayUrlSection() {
  const [copied, setCopied] = useState(false);
  const overlayUrl = typeof window !== 'undefined' ? `${window.location.origin}/overlay` : 'http://localhost:3000/overlay';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(overlayUrl);
      setCopied(true);
      toast.success('URL оверлея скопирован!', { icon: '📋' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Не удалось скопировать URL');
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] backdrop-blur-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-white/70 flex items-center gap-2">
          <ExternalLink className="w-4 h-4 text-emerald-400" />
          Подключение к OBS
        </h4>
        <Button
          variant="outline"
          size="sm"
          className={`border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300 text-xs h-7 ${
            copied ? 'bg-emerald-500/20' : 'bg-emerald-500/10'
          }`}
          onClick={handleCopy}
        >
          <Copy className="w-3 h-3 mr-1.5" />
          {copied ? 'Скопировано!' : 'Копировать URL'}
        </Button>
      </div>
      <div className="bg-black/40 rounded-lg p-3 border border-white/5">
        <code className="text-xs text-emerald-400/90 break-all select-all">{overlayUrl}</code>
      </div>
      <div className="text-xs text-white/30 space-y-1">
        <p className="flex items-center gap-1.5"><Info className="w-3 h-3 text-white/20" /> Рекомендуемые настройки OBS:</p>
        <p>1. Добавьте Browser Source</p>
        <p>2. Укажите URL выше</p>
        <p>3. Разрешение: <code className="text-white/50">1920 × 1080</code></p>
        <p>4. Пользовательский CSS: <code className="text-white/50">body {'{'} background: transparent; {'}'}</code></p>
      </div>
    </div>
  );
}

// ============ Customization Sidebar ============

interface CustomizationSidebarProps {
  colorTheme: ColorTheme;
  setColorTheme: (t: ColorTheme) => void;
  barThickness: BarThickness;
  setBarThickness: (t: BarThickness) => void;
  animationSpeed: AnimationSpeed;
  setAnimationSpeed: (s: AnimationSpeed) => void;
  showTimer: boolean;
  setShowTimer: (v: boolean) => void;
  showPercentages: boolean;
  setShowPercentages: (v: boolean) => void;
  panelPositions: OverlayPanelPositions;
  onPanelPositionChange: (key: 'postContent' | 'voteBar', field: keyof PanelRect, value: number) => void;
  onResetPositions: () => void;
}

function CustomizationSidebar({
  colorTheme,
  setColorTheme,
  barThickness,
  setBarThickness,
  animationSpeed,
  setAnimationSpeed,
  showTimer,
  setShowTimer,
  showPercentages,
  setShowPercentages,
  panelPositions,
  onPanelPositionChange,
  onResetPositions,
}: CustomizationSidebarProps) {
  const theme = COLOR_THEMES[colorTheme];

  return (
    <div className="w-full lg:w-80 flex-shrink-0 space-y-4 overflow-y-auto max-h-[calc(100vh-12rem)] pr-1 custom-scrollbar">
      <div className="rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] backdrop-blur-sm p-4 space-y-4">
        <h3 className="text-sm font-semibold text-white/80 flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-purple-400" />
          Настройки оверлея
        </h3>

        {/* Color Theme */}
        <div className="space-y-2">
          <Label className="text-xs text-white/60">Цветовая тема</Label>
          <div className="flex gap-2 flex-wrap">
            <TooltipProvider delayDuration={200}>
              {(Object.keys(COLOR_THEMES) as ColorTheme[]).map((t) => (
                <Tooltip key={t}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setColorTheme(t)}
                      className={`w-7 h-7 rounded-lg border-2 transition-all duration-200 flex items-center justify-center ${
                        colorTheme === t
                          ? 'border-white/50 scale-110 shadow-lg'
                          : 'border-white/10 hover:border-white/30'
                      }`}
                      style={{
                        background:
                          t === 'emerald' ? 'linear-gradient(135deg, #059669, #34d399)'
                          : t === 'red' ? 'linear-gradient(135deg, #e11d48, #fb7185)'
                          : t === 'purple' ? 'linear-gradient(135deg, #9333ea, #c084fc)'
                          : t === 'amber' ? 'linear-gradient(135deg, #d97706, #fbbf24)'
                          : 'linear-gradient(135deg, #0d9488, #2dd4bf)',
                      }}
                    >
                      {colorTheme === t && <div className="w-2.5 h-2.5 rounded-full bg-white/80" />}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {t === 'emerald' ? 'Изумрудный' : t === 'red' ? 'Красный' : t === 'purple' ? 'Фиолетовый' : t === 'amber' ? 'Янтарный' : 'Бирюзовый'}
                  </TooltipContent>
                </Tooltip>
              ))}
            </TooltipProvider>
          </div>
        </div>

        <div className="h-px bg-white/5" />

        {/* Bar Thickness */}
        <div className="space-y-2">
          <Label className="text-xs text-white/60">Толщина полосы</Label>
          <Select value={barThickness} onValueChange={(v) => setBarThickness(v as BarThickness)}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white w-full h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="thin">Тонкая</SelectItem>
              <SelectItem value="medium">Средняя</SelectItem>
              <SelectItem value="thick">Толстая</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative rounded-lg overflow-hidden bg-white/5">
            <div className={`${barThickness === 'thin' ? 'h-1.5' : barThickness === 'medium' ? 'h-2' : 'h-3'} bg-gradient-to-r ${theme.forFrom} ${theme.forTo} rounded-lg`} style={{ width: '60%' }} />
          </div>
        </div>

        <div className="h-px bg-white/5" />

        {/* Animation Speed */}
        <div className="space-y-2">
          <Label className="text-xs text-white/60">Скорость анимации</Label>
          <Select value={animationSpeed} onValueChange={(v) => setAnimationSpeed(v as AnimationSpeed)}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white w-full h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="slow">Медленная</SelectItem>
              <SelectItem value="normal">Обычная</SelectItem>
              <SelectItem value="fast">Быстрая</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="h-px bg-white/5" />

        {/* Toggle options */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-white/60">Показывать таймер</Label>
            <Switch checked={showTimer} onCheckedChange={setShowTimer} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs text-white/60">Показывать проценты</Label>
            <Switch checked={showPercentages} onCheckedChange={setShowPercentages} />
          </div>
        </div>
      </div>

      {/* Panel Positions */}
      <div className="rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] backdrop-blur-sm p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white/80 flex items-center gap-2">
            <Maximize2 className="w-4 h-4 text-blue-400" />
            Позиции панелей
          </h3>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[10px] text-white/40 hover:text-white/70 hover:bg-white/5 px-2"
            onClick={onResetPositions}
          >
            <RotateCcwIcon className="w-3 h-3 mr-1" />
            Сбросить
          </Button>
        </div>

        {/* Post Content Panel */}
        <div className="space-y-2">
          <p className="text-xs text-white/50 font-medium">📷 Контент поста</p>
          <div className="grid grid-cols-2 gap-2">
            {(['x', 'y', 'width', 'height'] as const).map((field) => (
              <div key={`postContent-${field}`} className="space-y-0.5">
                <Label className="text-[10px] text-white/30 uppercase">{field === 'width' ? 'W' : field === 'height' ? 'H' : field}</Label>
                <Input
                  type="number"
                  value={panelPositions.postContent[field]}
                  onChange={(e) => onPanelPositionChange('postContent', field, parseInt(e.target.value) || 0)}
                  className="h-7 text-xs bg-white/5 border-white/10 text-white"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="h-px bg-white/5" />

        {/* Vote Bar Panel */}
        <div className="space-y-2">
          <p className="text-xs text-white/50 font-medium">🗳️ Панель голосования</p>
          <div className="grid grid-cols-2 gap-2">
            {(['x', 'y', 'width', 'height'] as const).map((field) => (
              <div key={`voteBar-${field}`} className="space-y-0.5">
                <Label className="text-[10px] text-white/30 uppercase">{field === 'width' ? 'W' : field === 'height' ? 'H' : field}</Label>
                <Input
                  type="number"
                  value={panelPositions.voteBar[field]}
                  onChange={(e) => onPanelPositionChange('voteBar', field, parseInt(e.target.value) || 0)}
                  className="h-7 text-xs bg-white/5 border-white/10 text-white"
                />
              </div>
            ))}
          </div>
        </div>

        <p className="text-[10px] text-white/20 leading-relaxed">
          Перетаскивайте панели на холсте или введите точные значения. Размер холста: 1920×1080.
        </p>
      </div>
    </div>
  );
}

// ============ Simulation Controls ============

interface SimulationControlsProps {
  state: OverlayState;
  onStart: () => void;
  onStop: () => void;
}

function SimulationControls({ state, onStart, onStop }: SimulationControlsProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] backdrop-blur-sm p-4 space-y-3">
      <h3 className="text-sm font-semibold text-white/80 flex items-center gap-2">
        <Monitor className="w-4 h-4 text-purple-400" />
        Симуляция
      </h3>
      <p className="text-xs text-white/40">
        Запустите симуляцию, чтобы увидеть оверлей в действии. Голоса генерируются автоматически.
      </p>
      <div className="flex gap-2">
        {state === 'idle' && (
          <Button onClick={onStart} className="bg-purple-600 hover:bg-purple-500 text-white h-8 text-xs">
            <Play className="w-3.5 h-3.5 mr-1.5" />
            Запустить
          </Button>
        )}
        {state === 'voting' && (
          <Button onClick={onStop} variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10 h-8 text-xs">
            <Square className="w-3.5 h-3.5 mr-1.5" />
            Остановить
          </Button>
        )}
        {state === 'result' && (
          <Button onClick={onStart} className="bg-purple-600 hover:bg-purple-500 text-white h-8 text-xs">
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Заново
          </Button>
        )}
      </div>
    </div>
  );
}

// ============ Main StreamOverlay Component ============

export function StreamOverlay() {
  const [state, setState] = useState<OverlayState>('idle');
  const [votesFor, setVotesFor] = useState(0);
  const [votesAgainst, setVotesAgainst] = useState(0);
  const [totalVoters, setTotalVoters] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [chatWon, setChatWon] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const voteSimRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Customization state
  const [colorTheme, setColorTheme] = useState<ColorTheme>('emerald');
  const [barThickness, setBarThickness] = useState<BarThickness>('medium');
  const [showTimer, setShowTimer] = useState(true);
  const [showPercentages, setShowPercentages] = useState(true);
  const [animationSpeed, setAnimationSpeed] = useState<AnimationSpeed>('normal');

  // Drag tracking
  const [isDraggingAny, setIsDraggingAny] = useState(false);

  // Canvas scale
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [canvasScale, setCanvasScale] = useState(0.5);

  // Store integration
  const { overlayPost, twitchEmotes, setTwitchEmotes, overlayPanelPositions, setOverlayPanelPositions } = useStreamPostStore();

  // Local panel positions (synced from store)
  const [panelPositions, setPanelPositions] = useState<OverlayPanelPositions>(overlayPanelPositions);

  // Track whether we've loaded positions from DB yet (to avoid saving defaults on first render)
  const positionsLoadedRef = useRef(false);

  // Load panel positions from /api/settings on mount
  useEffect(() => {
    fetch('/api/settings', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : {}))
      .then((data: Record<string, string>) => {
        const loaded: OverlayPanelPositions = { ...DEFAULT_PANEL_POSITIONS };
        try {
          if (data.overlayPostContent) {
            const parsed = JSON.parse(data.overlayPostContent);
            if (parsed && typeof parsed.x === 'number' && typeof parsed.y === 'number' && typeof parsed.width === 'number' && typeof parsed.height === 'number') {
              loaded.postContent = parsed;
            }
          }
        } catch {
          // Fallback to defaults
        }
        try {
          if (data.overlayVoteBar) {
            const parsed = JSON.parse(data.overlayVoteBar);
            if (parsed && typeof parsed.x === 'number' && typeof parsed.y === 'number' && typeof parsed.width === 'number' && typeof parsed.height === 'number') {
              loaded.voteBar = parsed;
            }
          }
        } catch {
          // Fallback to defaults
        }
        setPanelPositions(loaded);
        setOverlayPanelPositions(loaded);
        positionsLoadedRef.current = true;
      })
      .catch(() => {
        positionsLoadedRef.current = true;
      });
  }, []);

  // Save panel positions to /api/settings with 500ms debounce
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!positionsLoadedRef.current) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          overlayPostContent: JSON.stringify(panelPositions.postContent),
          overlayVoteBar: JSON.stringify(panelPositions.voteBar),
        }),
      }).catch(() => {
        // Silently fail
      });
    }, 500);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [panelPositions]);

  // Load Twitch emotes once
  useEffect(() => {
    if (twitchEmotes.length > 0) return;
    fetch('/twitch-emotes.json')
      .then((res) => res.json())
      .then((data: TwitchEmote[]) => {
        setTwitchEmotes(data.map((e) => ({ code: e.code, url: e.url, id: e.code })));
      })
      .catch(() => {
        // Silently fail
      });
  }, [twitchEmotes.length, setTwitchEmotes]);

  // Find relevant emotes for voting
  const pogEmote = twitchEmotes.find((e) => e.code === 'degraPog');
  const susEmote = twitchEmotes.find((e) => e.code === 'degraSUS');

  const theme = COLOR_THEMES[colorTheme];
  const thicknessClass = BAR_THICKNESS_MAP[barThickness];
  const springConfig = ANIMATION_SPEED_MAP[animationSpeed];

  // Computed values (not state)
  const forPercent = votesFor + votesAgainst > 0 ? Math.round((votesFor / (votesFor + votesAgainst)) * 100) : 50;
  const againstPercent = 100 - forPercent;

  // Determine if we should show post content
  const activePost = overlayPost;
  const showPostContent = state === 'voting' || (state !== 'idle' && activePost);

  // Demo post for preview (when no overlay post and not simulating)
  const demoPost: Post | null = useMemo(() => {
    if (activePost) return activePost;
    // Create a fake demo post for the WYSIWYG editor to show something
    return {
      id: 'demo',
      type: 'TEXT',
      status: 'APPROVED',
      text: 'Текст поста будет отображаться здесь. Запустите симуляцию, чтобы увидеть полный оверлей!',
      mediaUrl: null,
      mediaFileId: null,
      youtubeUrl: null,
      youtubeTitle: null,
      youtubeThumbnail: null,
      authorId: 'demo',
      author: { id: 'demo', telegramId: '0', username: 'demo', firstName: 'Демо', lastName: null, trustLevel: 0, postsCount: 0, acceptedCount: 0, rejectedCount: 0 },
      channelId: null,
      channel: null,
      scheduledAt: null,
      reviewedAt: null,
      reviewerId: null,
      postedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Post;
  }, [activePost]);

  // Calculate canvas scale to fit container
  useEffect(() => {
    const updateScale = () => {
      if (!canvasContainerRef.current) return;
      const containerWidth = canvasContainerRef.current.clientWidth;
      // We want the canvas to fit the container width
      const scale = Math.min(containerWidth / 1920, 0.65);
      setCanvasScale(scale);
    };
    updateScale();
    const observer = new ResizeObserver(updateScale);
    if (canvasContainerRef.current) {
      observer.observe(canvasContainerRef.current);
    }
    return () => observer.disconnect();
  }, []);

  const resetSimulation = useCallback(() => {
    setState('idle');
    setVotesFor(0);
    setVotesAgainst(0);
    setTotalVoters(0);
    setTimeLeft(30);
    if (timerRef.current) clearInterval(timerRef.current);
    if (voteSimRef.current) clearInterval(voteSimRef.current);
  }, []);

  const startVoting = useCallback(() => {
    resetSimulation();
    setState('voting');
    setTimeLeft(30);
    toast('Симуляция голосования запущена!', { icon: '🎲' });

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          if (voteSimRef.current) clearInterval(voteSimRef.current);
          setVotesFor((currentFor) => {
            setVotesAgainst((currentAgainst) => {
              setChatWon(currentFor >= currentAgainst);
              return currentAgainst;
            });
            return currentFor;
          });
          setState('result');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    voteSimRef.current = setInterval(() => {
      const isFor = Math.random() > 0.45;
      const voteCount = Math.floor(Math.random() * 3) + 1;
      if (isFor) {
        setVotesFor((prev) => prev + voteCount);
      } else {
        setVotesAgainst((prev) => prev + voteCount);
      }
      setTotalVoters((prev) => prev + voteCount);
    }, 800);
  }, [resetSimulation]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (voteSimRef.current) clearInterval(voteSimRef.current);
    };
  }, []);

  // Panel position change handlers
  const handlePanelRectChange = useCallback(
    (key: 'postContent' | 'voteBar', newRect: PanelRect) => {
      const newPositions = { ...panelPositions, [key]: newRect };
      setPanelPositions(newPositions);
      setOverlayPanelPositions(newPositions);
    },
    [panelPositions, setOverlayPanelPositions]
  );

  const handleSidebarPositionChange = useCallback(
    (key: 'postContent' | 'voteBar', field: keyof PanelRect, value: number) => {
      const clamped = Math.max(0, value);
      const newRect = { ...panelPositions[key], [field]: clamped };
      const newPositions = { ...panelPositions, [key]: newRect };
      setPanelPositions(newPositions);
      setOverlayPanelPositions(newPositions);
    },
    [panelPositions, setOverlayPanelPositions]
  );

  const handleResetPositions = useCallback(() => {
    setPanelPositions(DEFAULT_PANEL_POSITIONS);
    setOverlayPanelPositions(DEFAULT_PANEL_POSITIONS);
    toast('Позиции сброшены', { icon: '↩️' });
  }, [setOverlayPanelPositions]);

  // Render post content for the canvas panel
  const renderPostContentPanel = () => {
    const post = showPostContent ? activePost : demoPost;
    if (!post) return null;

    const proxiedMedia = getProxiedImageUrl(post.mediaUrl);
    const proxiedThumb = getProxiedImageUrl(post.youtubeThumbnail);

    return (
      <div className="w-full h-full bg-black/80 backdrop-blur-xl rounded-lg border border-white/10 overflow-hidden">
        {post.type === 'PHOTO' && (
          <div className="relative h-full bg-gradient-to-br from-emerald-900/40 to-teal-900/20">
            {proxiedMedia ? (
              <>
                <div
                  className="absolute inset-0 bg-cover bg-center blur-xl scale-110 opacity-40"
                  style={{ backgroundImage: `url(${proxiedMedia})` }}
                />
                <div className="absolute inset-0 bg-black/20" />
                <div className="absolute inset-0 flex items-center justify-center p-3">
                  <img
                    src={proxiedMedia}
                    alt="Submitted photo"
                    className="max-h-full max-w-full object-contain rounded-lg shadow-2xl ring-1 ring-white/10"
                  />
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <ImageIcon className="w-12 h-12 text-emerald-500/30" />
              </div>
            )}
            {post.text && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-2">
                <p className="text-white/80 text-[11px] leading-relaxed line-clamp-2">{post.text}</p>
              </div>
            )}
          </div>
        )}

        {post.type === 'YOUTUBE' && (
          <div className="relative h-full bg-gradient-to-br from-red-900/40 to-rose-900/20">
            {proxiedThumb ? (
              <>
                <img
                  src={proxiedThumb}
                  alt={post.youtubeTitle || 'YouTube video'}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-red-600/90 flex items-center justify-center shadow-xl border border-white/20">
                    <Youtube className="w-6 h-6 text-white ml-0.5" />
                  </div>
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Youtube className="w-12 h-12 text-red-500/30" />
              </div>
            )}
            {post.youtubeTitle && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-2">
                <p className="text-white/90 text-[11px] font-medium leading-relaxed line-clamp-2">{post.youtubeTitle}</p>
              </div>
            )}
          </div>
        )}

        {post.type === 'TEXT' && (
          <div className="relative h-full bg-gradient-to-br from-amber-900/30 to-orange-900/15 flex items-center justify-center p-4">
            <div className="max-w-full text-center space-y-2">
              <FileText className="w-6 h-6 text-amber-400/40 mx-auto" />
              <p className="text-white/80 text-sm leading-relaxed font-medium">
                &ldquo;{post.text || 'Пустой пост'}&rdquo;
              </p>
            </div>
          </div>
        )}

        {/* Author bar */}
        <div className="absolute bottom-0 left-0 right-0 flex items-center gap-2 px-3 py-1.5 bg-black/60 border-t border-white/5">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500 flex items-center justify-center text-white text-[9px] font-bold ring-1 ring-white/10 flex-shrink-0">
            {post.author.username?.charAt(0).toUpperCase() || <User className="w-2.5 h-2.5" />}
          </div>
          <span className="text-white/60 text-[10px] font-medium">@{post.author.username || 'anonymous'}</span>
        </div>
      </div>
    );
  };

  // Render vote bar for the canvas panel
  const renderVoteBarPanel = () => {
    return (
      <div className="w-full h-full bg-black/80 backdrop-blur-xl rounded-lg border border-white/10 overflow-hidden flex flex-col">
        <div className="flex-1 p-3 flex flex-col justify-center space-y-2">
          {/* Title row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {state === 'voting' && (
                <motion.div
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className={`w-2.5 h-2.5 rounded-full ${theme.accentBg.replace('/20', '/60')} shadow-lg ${theme.glow}`}
                />
              )}
              <span className="text-white font-bold text-xs uppercase tracking-wider">
                {state === 'idle' ? 'Голосование чата' : state === 'voting' ? 'Голосование чата' : 'Результат'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {pogEmote && (
                <img src={getEmoteUrl(pogEmote.url, '1.0')} alt="degraPog" className="w-5 h-5" title="1 = ЗА" />
              )}
              <Badge variant="outline" className={`${theme.accentBg} ${theme.accent} border-current/30 text-[9px] h-5`}>
                1 = ЗА · 2 = ПРОТИВ
              </Badge>
              {susEmote && (
                <img src={getEmoteUrl(susEmote.url, '1.0')} alt="degraSUS" className="w-5 h-5" title="2 = ПРОТИВ" />
              )}
              {showTimer && state === 'voting' && (
                <span className={`text-xs font-mono font-bold ${timeLeft <= 5 ? 'text-red-400' : theme.accent}`}>
                  0:{timeLeft.toString().padStart(2, '0')}
                </span>
              )}
            </div>
          </div>

          {/* Vote bar */}
          {state === 'voting' || state === 'result' ? (
            <>
              <div className={`relative ${thicknessClass} rounded-lg overflow-hidden bg-white/5`}>
                <motion.div
                  className={`absolute left-0 top-0 bottom-0 bg-gradient-to-r ${theme.forFrom} ${theme.forTo}`}
                  animate={{ width: `${forPercent}%` }}
                  transition={{ type: 'spring', ...springConfig }}
                  style={{ minWidth: '8%' }}
                />
                <motion.div
                  className={`absolute right-0 top-0 bottom-0 bg-gradient-to-l ${theme.againstFrom} ${theme.againstTo}`}
                  animate={{ width: `${againstPercent}%` }}
                  transition={{ type: 'spring', ...springConfig }}
                  style={{ minWidth: '8%' }}
                />
                {showPercentages && (
                  <div className="absolute inset-0 flex items-center justify-between px-2 z-10">
                    <span className="text-white text-[10px] font-bold drop-shadow-lg">
                      {pogEmote && <img src={getEmoteUrl(pogEmote.url, '1.0')} alt="" className="w-4 h-4 inline mr-0.5" />}
                      {forPercent}% ЗА
                    </span>
                    <span className="text-white text-[10px] font-bold drop-shadow-lg">
                      ПРОТИВ {againstPercent}%
                      {susEmote && <img src={getEmoteUrl(susEmote.url, '1.0')} alt="" className="w-4 h-4 inline ml-0.5" />}
                    </span>
                  </div>
                )}
              </div>

              {/* Voters count */}
              <div className="flex justify-between text-[10px] text-white/40">
                <span>{votesFor} ЗА</span>
                <span>{totalVoters} всего</span>
                <span>{votesAgainst} ПРОТИВ</span>
              </div>
            </>
          ) : (
            /* Idle state */
            <div className="relative h-8 rounded-lg overflow-hidden bg-white/5 flex items-center justify-center">
              <span className="text-white/20 text-[10px]">Запустите симуляцию, чтобы увидеть голосование</span>
            </div>
          )}

          {/* Result display */}
          {state === 'result' && (
            <div className="text-center py-1">
              {chatWon ? (
                <div className="flex items-center justify-center gap-2">
                  <span className="text-lg">🎉</span>
                  <span className={`text-sm font-black bg-gradient-to-r ${theme.forFrom} ${theme.forTo} bg-clip-text text-transparent`}>
                    ЧАТ РЕШИЛ!
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <span className="text-lg">💀</span>
                  <span className={`text-sm font-black bg-gradient-to-r ${theme.againstFrom} ${theme.againstTo} bg-clip-text text-transparent`}>
                    МЕЧТА ЧАТА УБИТА
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Top bar: URL + Simulation controls */}
      <OverlayUrlSection />

      {/* Two-column layout: Canvas + Sidebar */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Left: Canvas preview */}
        <div className="flex-1 min-w-0">
          <SimulationControls state={state} onStart={startVoting} onStop={resetSimulation} />

          <div
            ref={canvasContainerRef}
            className="mt-4 rounded-xl border border-white/10 bg-gradient-to-b from-gray-900 to-black overflow-hidden relative"
          >
            {/* Canvas label */}
            <div className="absolute top-2 left-3 z-10 flex items-center gap-2">
              <Badge variant="outline" className="text-[9px] text-white/30 border-white/10 bg-black/50 h-5">
                1920 × 1080
              </Badge>
              {isDraggingAny && (
                <Badge variant="outline" className="text-[9px] text-blue-400 border-blue-500/30 bg-blue-500/10 h-5">
                  Перетаскивание...
                </Badge>
              )}
            </div>

            {/* Scaled canvas */}
            <div
              className="relative overflow-hidden"
              style={{
                width: 1920 * canvasScale,
                height: 1080 * canvasScale,
              }}
            >
              <div
                style={{
                  transform: `scale(${canvasScale})`,
                  transformOrigin: 'top left',
                  width: 1920,
                  height: 1080,
                  position: 'relative',
                }}
              >
                {/* Fake stream background */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-gray-900 to-emerald-900/20">
                  {/* Grid pattern */}
                  <div
                    className="absolute inset-0 opacity-[0.03]"
                    style={{
                      backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                      backgroundSize: '100px 100px',
                    }}
                  />
                  {/* Center text */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-white/[0.04] text-6xl font-black mb-2">STREAM</div>
                      <p className="text-white/[0.03] text-lg">Область контента стрима 1920×1080</p>
                    </div>
                  </div>
                </div>

                {/* Grid guides when dragging */}
                {isDraggingAny && (
                  <div className="absolute inset-0 pointer-events-none z-10">
                    {/* Vertical center line */}
                    <div className="absolute top-0 bottom-0 left-1/2 w-px bg-blue-400/20" />
                    {/* Horizontal center line */}
                    <div className="absolute left-0 right-0 top-1/2 h-px bg-blue-400/20" />
                    {/* Thirds - vertical */}
                    <div className="absolute top-0 bottom-0 left-1/3 w-px bg-blue-400/10" />
                    <div className="absolute top-0 bottom-0 left-2/3 w-px bg-blue-400/10" />
                    {/* Thirds - horizontal */}
                    <div className="absolute left-0 right-0 top-1/3 h-px bg-blue-400/10" />
                    <div className="absolute left-0 right-0 top-2/3 h-px bg-blue-400/10" />
                  </div>
                )}

                {/* Post Content Panel - Draggable */}
                <DraggablePanel
                  panelKey="postContent"
                  rect={panelPositions.postContent}
                  onRectChange={(rect) => handlePanelRectChange('postContent', rect)}
                  canvasScale={canvasScale}
                  isDraggingAny={isDraggingAny}
                  onDragStart={() => setIsDraggingAny(true)}
                  onDragEnd={() => setIsDraggingAny(false)}
                  label="Контент"
                >
                  {renderPostContentPanel()}
                </DraggablePanel>

                {/* Vote Bar Panel - Draggable */}
                <DraggablePanel
                  panelKey="voteBar"
                  rect={panelPositions.voteBar}
                  onRectChange={(rect) => handlePanelRectChange('voteBar', rect)}
                  canvasScale={canvasScale}
                  isDraggingAny={isDraggingAny}
                  onDragStart={() => setIsDraggingAny(true)}
                  onDragEnd={() => setIsDraggingAny(false)}
                  label="Голосование"
                >
                  {renderVoteBarPanel()}
                </DraggablePanel>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Customization sidebar */}
        <CustomizationSidebar
          colorTheme={colorTheme}
          setColorTheme={setColorTheme}
          barThickness={barThickness}
          setBarThickness={setBarThickness}
          animationSpeed={animationSpeed}
          setAnimationSpeed={setAnimationSpeed}
          showTimer={showTimer}
          setShowTimer={setShowTimer}
          showPercentages={showPercentages}
          setShowPercentages={setShowPercentages}
          panelPositions={panelPositions}
          onPanelPositionChange={handleSidebarPositionChange}
          onResetPositions={handleResetPositions}
        />
      </div>
    </div>
  );
}
