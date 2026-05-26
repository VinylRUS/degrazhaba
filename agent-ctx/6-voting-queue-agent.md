# Task 6: Voting Queue System for StreamPost

## Task Description
Add a voting queue system to the StreamPost application. The streamer should be able to queue multiple posts for voting, and after one vote ends, the next one should automatically start after 5 seconds.

## Work Log

### 1. Updated Zustand Store (`src/lib/streampost-store.ts`)

Added the following state and actions:
- `voteQueue: string[]` — Array of post IDs queued for voting
- `addToVoteQueue(postId)` — Add a post to the queue (with duplicate prevention)
- `removeFromVoteQueue(postId)` — Remove a specific post from the queue
- `clearVoteQueue()` — Clear the entire queue
- `reorderVoteQueue(postIds)` — Reorder the queue with a new array of IDs
- `queueCountdown: number | null` — Current countdown value for auto-advance display
- `setQueueCountdown(value)` — Set the countdown value directly
- `decrementQueueCountdown()` — Decrement the countdown by 1, auto-clear at 0

### 2. Updated Streamer Panel (`src/components/streampost/streamer-panel.tsx`)

**New Props:**
- `onAddToQueue: (postId: string) => void` — Callback when adding to queue
- `voteQueue: string[]` — Current queue state
- `removeFromVoteQueue: (postId: string) => void` — Remove from queue
- `clearVoteQueue: () => void` — Clear queue
- `reorderVoteQueue: (postIds: string[]) => void` — Reorder queue
- `queueCountdown: number | null` — Current countdown value

**UI Changes:**
- Added "В очередь" button on each expanded post row (alongside Голосование, Опубликовать, Отклонить)
- Button shows "В очереди" (disabled) when post is already in queue
- Posts in queue have a purple border/background tint
- Posts in queue show a "📋 В очереди" badge
- Added Queue Section at the top of the panel with:
  - "Очередь голосований" header with queue count badge
  - "Запустить всё" (Start all) button that starts the first vote
  - "Очистить очередь" (Clear queue) button
  - Countdown indicator showing "Следующее голосование через X сек..." with progress bar
  - List of queued items with:
    - Order number
    - Up/down reorder buttons
    - Type badge, author username, content preview
    - "Убрать" (Remove) trash icon button per item
  - Posts currently being voted on have purple highlight in queue

### 3. Updated page.tsx (`src/app/page.tsx`)

**New Store Subscriptions:**
- `voteQueue`, `addToVoteQueue`, `removeFromVoteQueue`, `clearVoteQueue`, `reorderVoteQueue`, `queueCountdown`, `setQueueCountdown`, `decrementQueueCountdown`

**New Handler:**
- `handleAddToQueue(postId)` — Adds post to queue with toast notification and activity log entry

**Auto-Advance Logic:**
- Uses `prevActiveVoteCountRef` to detect when active votes go from >0 to 0
- When a vote ends and queue has items, starts a 5-second countdown
- Countdown is displayed via `queueCountdown` in the store (avoids React lint issue with setState in effects)
- After countdown reaches 0, removes first item from queue and starts vote for it
- Uses `useStreamPostStore.getState()` for reading current queue state inside interval callbacks

**Socket.io Handler Update:**
- `vote:end` handler now calls `useStreamPostStore.getState().removeFromVoteQueue(data.postId)` to clean up queue when a vote completes

**StreamerPanel Props:**
- Added all new props: `onAddToQueue`, `voteQueue`, `removeFromVoteQueue`, `clearVoteQueue`, `reorderVoteQueue`, `queueCountdown`

## Files Modified
- `src/lib/streampost-store.ts` — Added voteQueue state, actions, and queueCountdown
- `src/components/streampost/streamer-panel.tsx` — Complete rewrite with queue UI
- `src/app/page.tsx` — Added handleAddToQueue, auto-advance useEffect, updated StreamerPanel props

## Stage Summary
- **Voting queue system** fully functional with add, remove, reorder, clear
- **Auto-advance** after vote ends with 5-second countdown and progress bar
- **"В очередь" button** on each post row in streamer panel
- **Queue section** with ordered list, reorder buttons, start all, clear all
- **Countdown indicator** shows time until next vote starts
- **Zero lint errors**
