'use client';

import { useState, useMemo } from 'react';
import { Save, RotateCcw, Eye, EyeOff, Bell, Volume2, Bot, ExternalLink, Info, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useSettings, useUpdateSettings } from '@/lib/streampost-hooks';
import { ChatIntegration } from '@/components/streampost/chat-integration';

const DEFAULT_SETTINGS: Record<string, string> = {
  voteDuration: '30',
  voteThreshold: '3',
  autoPostThreshold: '70',
  voteMessageTemplate: '🎬 Голосование начинается! Напиши + ЗА или - ПРОТИВ в чате!',
  postPrefix: '📢',
  postSuffix: '',
  overlayVotingLabel: 'Голосование чата',
  overlayWinText: 'ЧАТ РЕШИЛ!',
  overlayLoseText: 'МЕЧТА ЧАТА УБИТА',
  overlayApprovedText: 'ПРИНЯТО!',
  overlayRejectedText: 'ОТКЛОНЕНО',
  twitchBotUsername: '',
  twitchOAuthToken: '',
  twitchChannel: '',
  goodgameChannelId: '',
  notifyNewPosts: 'true',
  notifyVotes: 'true',
  notifyVoteResults: 'true',
  soundVolume: '70',
  telegramBotWebhook: '',
  telegramBotStatus: 'disconnected',
};

export function SettingsPanel() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();

  const mergedDefaults = useMemo(
    () => ({ ...DEFAULT_SETTINGS, ...(settings || {}) }),
    [settings]
  );

  const [form, setForm] = useState<Record<string, string>>(mergedDefaults);
  const [saved, setSaved] = useState(false);
  const [showOAuth, setShowOAuth] = useState(false);

  // Re-merge when settings load
  const currentForm = useMemo(() => {
    if (settings) {
      return { ...DEFAULT_SETTINGS, ...settings, ...form };
    }
    return { ...DEFAULT_SETTINGS, ...form };
  }, [settings, form]);

  const handleSave = async () => {
    await updateSettings.mutateAsync(currentForm);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setForm(DEFAULT_SETTINGS);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const soundVolume = parseInt(currentForm.soundVolume || '70');

  return (
    <div className="space-y-6">
      {/* Vote Settings */}
      <div className="rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] backdrop-blur-sm p-5 space-y-5">
        <h3 className="text-base font-semibold text-white/80">🗳️ Настройки голосования</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-sm text-white/60">Длительность голосования</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3.5 h-3.5 text-white/20 hover:text-white/40 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  Как долго зрители могут голосовать в чате
                </TooltipContent>
              </Tooltip>
            </div>
            <Select
              value={currentForm.voteDuration}
              onValueChange={(v) => setForm({ ...currentForm, voteDuration: v })}
            >
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 секунд</SelectItem>
                <SelectItem value="30">30 секунд</SelectItem>
                <SelectItem value="60">60 секунд</SelectItem>
                <SelectItem value="90">90 секунд</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-white/30">Как долго длится голосование в чате</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-sm text-white/60">Минимальный порог голосов</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3.5 h-3.5 text-white/20 hover:text-white/40 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  Если общее число голосов меньше порога, результат считается недействительным
                </TooltipContent>
              </Tooltip>
            </div>
            <Input
              type="number"
              min={1}
              value={currentForm.voteThreshold}
              onChange={(e) => setForm({ ...currentForm, voteThreshold: e.target.value })}
              className="bg-white/5 border-white/10 text-white"
            />
            <p className="text-xs text-white/30">Минимальное количество голосов для действительного результата</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-sm text-white/60">Порог автопубликации (%)</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3.5 h-3.5 text-white/20 hover:text-white/40 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  Если % голосов ЗА превышает этот порог, пост публикуется автоматически
                </TooltipContent>
              </Tooltip>
            </div>
            <Input
              type="number"
              min={50}
              max={100}
              value={currentForm.autoPostThreshold}
              onChange={(e) => setForm({ ...currentForm, autoPostThreshold: e.target.value })}
              className="bg-white/5 border-white/10 text-white"
            />
            <p className="text-xs text-white/30">
              Если голосов ЗА больше этого %, опубликовать автоматически
            </p>
          </div>
        </div>
      </div>

      {/* Message Templates */}
      <div className="rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] backdrop-blur-sm p-5 space-y-5">
        <h3 className="text-base font-semibold text-white/80">💬 Шаблоны сообщений</h3>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-sm text-white/60">Сообщение о начале голосования</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3.5 h-3.5 text-white/20 hover:text-white/40 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  Отправляется в чат при запуске голосования
                </TooltipContent>
              </Tooltip>
            </div>
            <Textarea
              value={currentForm.voteMessageTemplate}
              onChange={(e) => setForm({ ...currentForm, voteMessageTemplate: e.target.value })}
              className="bg-white/5 border-white/10 text-white min-h-20"
              placeholder="Сообщение при запуске голосования..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm text-white/60">Префикс поста</Label>
              <Input
                value={currentForm.postPrefix}
                onChange={(e) => setForm({ ...currentForm, postPrefix: e.target.value })}
                className="bg-white/5 border-white/10 text-white"
                placeholder="например 📢"
              />
              <p className="text-xs text-white/30">Добавляется перед текстом опубликованного поста</p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-white/60">Суффикс поста</Label>
              <Input
                value={currentForm.postSuffix}
                onChange={(e) => setForm({ ...currentForm, postSuffix: e.target.value })}
                className="bg-white/5 border-white/10 text-white"
                placeholder="например #стрим"
              />
              <p className="text-xs text-white/30">Добавляется после текста опубликованного поста</p>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay Text Settings */}
      <div className="rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] backdrop-blur-sm p-5 space-y-5">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-white/80 flex items-center gap-2">
            <Palette className="w-4 h-4 text-purple-400" />
            🎨 Настройки оверлея
          </h3>
          <p className="text-xs text-white/30">Настройте текст, отображаемый на стрим-оверлее во время голосования</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label className="text-sm text-white/60">Заголовок голосования</Label>
            <Input
              value={currentForm.overlayVotingLabel}
              onChange={(e) => setForm({ ...currentForm, overlayVotingLabel: e.target.value })}
              className="bg-white/5 border-white/10 text-white"
              placeholder="Голосование чата"
            />
            <p className="text-xs text-white/30">Текст, отображаемый при активном голосовании в оверлее</p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-white/60">Текст победы чата</Label>
            <Input
              value={currentForm.overlayWinText}
              onChange={(e) => setForm({ ...currentForm, overlayWinText: e.target.value })}
              className="bg-white/5 border-white/10 text-white"
              placeholder="ЧАТ РЕШИЛ!"
            />
            <p className="text-xs text-white/30">Текст, когда чат одобряет пост</p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-white/60">Текст поражения чата</Label>
            <Input
              value={currentForm.overlayLoseText}
              onChange={(e) => setForm({ ...currentForm, overlayLoseText: e.target.value })}
              className="bg-white/5 border-white/10 text-white"
              placeholder="МЕЧТА ЧАТА УБИТА"
            />
            <p className="text-xs text-white/30">Текст, когда чат отклоняет пост</p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-white/60">Текст «Принято»</Label>
            <Input
              value={currentForm.overlayApprovedText}
              onChange={(e) => setForm({ ...currentForm, overlayApprovedText: e.target.value })}
              className="bg-white/5 border-white/10 text-white"
              placeholder="ПРИНЯТО!"
            />
            <p className="text-xs text-white/30">Краткий текст при одобрении поста</p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-white/60">Текст «Отклонено»</Label>
            <Input
              value={currentForm.overlayRejectedText}
              onChange={(e) => setForm({ ...currentForm, overlayRejectedText: e.target.value })}
              className="bg-white/5 border-white/10 text-white"
              placeholder="ОТКЛОНЕНО"
            />
            <p className="text-xs text-white/30">Краткий текст при отклонении поста</p>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] backdrop-blur-sm p-5 space-y-5">
        <h3 className="text-base font-semibold text-white/80 flex items-center gap-2">
          <Bell className="w-4 h-4 text-amber-400" />
          Уведомления
        </h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Label className="text-sm text-white/60">Уведомлять о новых постах</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-white/20 hover:text-white/40 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    Показывать уведомление при поступлении нового поста от Telegram бота
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-xs text-white/25">Получать уведомления о новых постах на модерации</p>
            </div>
            <Switch
              checked={currentForm.notifyNewPosts === 'true'}
              onCheckedChange={(v) => setForm({ ...currentForm, notifyNewPosts: v ? 'true' : 'false' })}
            />
          </div>

          <div className="h-px bg-white/5" />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Label className="text-sm text-white/60">Уведомлять о голосованиях</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-white/20 hover:text-white/40 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    Показывать уведомление при запуске нового голосования
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-xs text-white/25">Получать уведомления о начале голосований</p>
            </div>
            <Switch
              checked={currentForm.notifyVotes === 'true'}
              onCheckedChange={(v) => setForm({ ...currentForm, notifyVotes: v ? 'true' : 'false' })}
            />
          </div>

          <div className="h-px bg-white/5" />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Label className="text-sm text-white/60">Уведомлять о результатах</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-white/20 hover:text-white/40 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    Показывать уведомление при завершении голосования и оглашении результата
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-xs text-white/25">Получать уведомления о результатах голосований</p>
            </div>
            <Switch
              checked={currentForm.notifyVoteResults === 'true'}
              onCheckedChange={(v) => setForm({ ...currentForm, notifyVoteResults: v ? 'true' : 'false' })}
            />
          </div>

          <div className="h-px bg-white/5" />

          {/* Sound Volume */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Label className="text-sm text-white/60 flex items-center gap-2">
                <Volume2 className="w-3.5 h-3.5" />
                Громкость звуков
              </Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3.5 h-3.5 text-white/20 hover:text-white/40 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  Громкость звуковых уведомлений (принятие, отклонение, публикация и т.д.)
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex items-center gap-4">
              <Slider
                value={[soundVolume]}
                min={0}
                max={100}
                step={5}
                onValueChange={(v) => setForm({ ...currentForm, soundVolume: String(v[0]) })}
                className="flex-1"
              />
              <span className="text-sm text-white/50 w-10 text-right font-mono">{soundVolume}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Connections — Integrated from removed Chats tab */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-white/80">📺 Подключения к чатам</h3>
        </div>
        <ChatIntegration />
      </div>

      {/* Telegram Bot */}
      <div className="rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] backdrop-blur-sm p-5 space-y-5">
        <h3 className="text-base font-semibold text-white/80 flex items-center gap-2">
          <Bot className="w-4 h-4 text-cyan-400" />
          Telegram Бот
        </h3>

        <div className="space-y-4">
          {/* Webhook URL */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-sm text-white/60">Webhook URL</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3.5 h-3.5 text-white/20 hover:text-white/40 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  URL, на который Telegram отправляет обновления. Укажите его в настройках бота через @BotFather
                </TooltipContent>
              </Tooltip>
            </div>
            <Input
              value={currentForm.telegramBotWebhook}
              onChange={(e) => setForm({ ...currentForm, telegramBotWebhook: e.target.value })}
              className="bg-white/5 border-white/10 text-white text-sm h-9 font-mono"
              placeholder="https://your-domain.com/api/telegram/webhook"
            />
          </div>

          {/* Bot status */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm text-white/60">Статус бота</Label>
              <p className="text-xs text-white/25">Текущее состояние подключения к Telegram API</p>
            </div>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${
              currentForm.telegramBotStatus === 'connected'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'bg-red-500/15 text-red-400 border border-red-500/30'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                currentForm.telegramBotStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
              }`} />
              {currentForm.telegramBotStatus === 'connected' ? 'Подключён' : 'Отключён'}
            </div>
          </div>

          {/* Guide link */}
          <div className="p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/10">
            <p className="text-xs text-white/40 flex items-center gap-1.5">
              <ExternalLink className="w-3 h-3 text-cyan-400/60" />
              <span>Руководство по настройке бота: </span>
              <a
                href="https://core.telegram.org/bots#how-do-i-create-a-bot"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400/70 hover:text-cyan-400 underline"
              >
                Как создать Telegram бота
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 justify-end">
        <Button
          variant="ghost"
          onClick={handleReset}
          className="text-white/50 hover:text-white/80 hover:bg-white/5"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Сбросить
        </Button>
        <Button
          onClick={handleSave}
          disabled={updateSettings.isPending}
          className={`${
            saved
              ? 'bg-emerald-600 hover:bg-emerald-500'
              : 'bg-purple-600 hover:bg-purple-500'
          } text-white`}
        >
          <Save className="w-4 h-4 mr-2" />
          {saved ? 'Сохранено!' : 'Сохранить настройки'}
        </Button>
      </div>
    </div>
  );
}
