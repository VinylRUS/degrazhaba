# Task ID: 13-b
## Agent: Streamer Panel Enhancer
## Task: Significantly improve styling and UX of the Streamer Panel component

## Work Log

### 1. Better Queue Section Styling
- Added gradient background card with purple glow border (`from-purple-500/[0.08] via-violet-500/[0.04] to-fuchsia-500/[0.02]`) with `ring-1 ring-purple-500/10` and `shadow-lg shadow-purple-500/5`
- Each queued item now has a `GripVertical` drag handle icon
- Queue items have smooth `layout` animations with spring transitions and scale effects on enter/exit
- Replaced linear progress bar with `CircularCountdown` component — SVG circular progress ring with gradient stroke (`url(#countdownGradient)` from purple to fuchsia) and animated `strokeDashoffset`
- Added pulsing dot animation next to "Запустить всё" button: `animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}` with 1.5s cycle
- Queue number badge is now more prominent: uses `bg-gradient-to-br from-purple-500 to-violet-600` when items exist, with `font-black`, shadow, and ring styling; dimmed when empty
- Added thin linear progress bar alongside circular countdown as secondary indicator

### 2. Post Type Icon Colors
- PHOTO: emerald `bg-emerald-500/20 text-emerald-400 border-emerald-500/30` with `ImageIcon` component
- YOUTUBE: red `bg-red-500/20 text-red-400 border-red-500/30` with `PlayCircle` component (instead of `Youtube` — more distinctive play icon)
- TEXT: amber `bg-amber-500/20 text-amber-400 border-amber-500/30` with `FileText` component
- Added `solidBg` and `glowColor` properties to typeConfig for future use

### 3. Queue Empty State
- Created `QueueEmptyHint` component
- Shows "Добавьте посты в очередь для автоматического голосования" with a `ClipboardList` icon
- Subtle styling: `text-white/20` for text, `text-white/15` for icon
- Only appears when queue is empty AND countdown is null

### 4. Post Card Improvements
- "В очередь" button now uses `ListPlus` icon (clipboard with plus) and distinct violet/purple styling
- When post is already in queue: shows `CheckCircle2` icon + "В очереди" text with emerald disabled state (`bg-emerald-500/15 border-emerald-500/20 text-emerald-400/70`) — clearly different from the enabled purple state
- All action buttons have `transition-all duration-200 hover:scale-[1.03]` with enhanced shadow on hover
- "Отклонить" button now has `hover:border-red-500/40` for better hover feedback
- Expanded content area uses `bg-gradient-to-b from-white/[0.03] to-transparent` with `shadow-xl shadow-black/30` on preview area
- Better spacing: `pb-4 pt-3 mb-4` for expanded section, `min-w-[120px]` and `flex-wrap` on button row

### 5. Vote Status Enhancement
- Active voting posts get a pulsing purple glow border animation using `motion.div` with `absolute -inset-[2px]`:
  - Animated `boxShadow` cycling between subtle and intense purple glow
  - Duration: 2s, easeInOut, infinite repeat
- Inline `MiniVoteBar` component when post is not expanded but has active vote:
  - Shows FOR/votes/AGAINST counts with emerald/red colors
  - Pulsing 🎲 indicator with countdown timer
  - 1.5px height animated tug-of-war bar with spring transitions
- Timer countdown badge next to "ГОЛОСОВАНИЕ" label: `0:XX` format with `Timer` icon
- When post is selected during voting: purple avatar gradient and purple border styling

### 6. Overall Polish
- Queue section is now always visible (not conditional on having items or countdown)
- Better transition animations: queue items use `scale: 0.95 → 1` on enter, `scale: 0.9` on exit
- Improved hover states: `hover:bg-white/[0.05] hover:border-white/[0.10]` on queue items, `hover:scale-110 active:scale-90` on remove button
- Added section divider between queue and post list: `Hash` icon + "УТВЕРЖДЁННЫЕ ПОСТЫ" label flanked by gradient lines
- Header improved: `Sparkles` icon (instead of `Dices`), 10×10 icon container with `ring-1 ring-white/10`
- "Постов на рассмотрении" counter now uses gradient badge with `font-bold` count, bigger icon
- Reorder buttons have `duration-150` transitions for snappier feedback
- All new Lucide imports: `GripVertical`, `CheckCircle2`, `ClipboardList`, `ListPlus`, `Sparkles`, `Hash`

## Files Modified
- `src/components/streampost/streamer-panel.tsx` — Complete rewrite with all 6 improvement areas

## Stage Summary
- **Queue section**: gradient glow border, circular countdown ring, pulsing dot, prominent badge, drag handles
- **Type badges**: PHOTO emerald+ImageIcon, YOUTUBE red+PlayCircle, TEXT amber+FileText
- **Empty state**: QueueEmptyHint with ClipboardList icon and Russian text
- **Post cards**: ListPlus "В очередь" button, CheckCircle2 disabled state, hover animations, better shadows
- **Vote status**: pulsing purple glow border, MiniVoteBar inline, timer countdown badge
- **Overall polish**: always-visible queue, section dividers, Sparkles header, gradient badge counter
- **Zero lint errors** in streamer-panel.tsx
- **Dev server running** with no compilation errors
