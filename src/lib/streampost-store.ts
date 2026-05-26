import { create } from 'zustand';

export type PostType = 'PHOTO' | 'YOUTUBE' | 'TEXT';
export type PostStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'POSTED' | 'DEFERRED' | 'SCHEDULED';
export type ModeratorRole = 'ADMIN' | 'MODERATOR';
export type VoteDecision = 'POSTED' | 'SKIPPED';
export type VotePlatform = 'TWITCH' | 'GOODGAME';

export interface TelegramUser {
  id: string;
  telegramId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  trustLevel: number;
  postsCount: number;
  acceptedCount: number;
  rejectedCount: number;
}

export interface Post {
  id: string;
  type: PostType;
  status: PostStatus;
  text: string | null;
  mediaUrl: string | null;
  mediaFileId: string | null;
  youtubeUrl: string | null;
  youtubeTitle: string | null;
  youtubeThumbnail: string | null;
  authorId: string;
  author: TelegramUser;
  channelId: string | null;
  channel: { id: string; telegramId: string; name: string; isDefault: boolean } | null;
  scheduledAt: string | null;
  reviewedAt: string | null;
  reviewerId: string | null;
  postedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Channel {
  id: string;
  telegramId: string;
  name: string;
  isDefault: boolean;
  _count?: { posts: number };
  createdAt: string;
  updatedAt: string;
}

export interface Moderator {
  id: string;
  userId: string;
  role: ModeratorRole;
  addedById: string | null;
  user: TelegramUser;
  createdAt: string;
  updatedAt: string;
}

export interface VoteSession {
  id: string;
  postId: string;
  status: 'ACTIVE' | 'CLOSED';
  startedAt: string;
  closedAt: string | null;
  durationSec: number;
  votesFor: number;
  votesAgainst: number;
  finalDecision: VoteDecision | null;
  streamerFollowedChat: boolean | null;
  totalVoters: number;
  post?: Post;
}

export interface ActiveVote {
  sessionId: string;
  postId: string;
  durationSec: number;
  votesFor: number;
  votesAgainst: number;
  totalVoters: number;
  timeRemaining: number;
  finalDecision?: VoteDecision;
}

export type TabType = 'moderation' | 'streamer' | 'channels' | 'moderators' | 'settings' | 'history' | 'overlay';

export interface ActivityItem {
  id: string;
  type: 'accept' | 'reject' | 'defer' | 'vote_start' | 'publish' | 'vote_end';
  message: string;
  timestamp: number;
}

export interface PanelRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OverlayPanelPositions {
  postContent: PanelRect;
  voteBar: PanelRect;
}

export interface ChatMessage {
  id: string;
  platform: 'TWITCH' | 'GOODGAME';
  username: string;
  text: string;
  isVote: boolean;
  voteValue: 1 | 2 | null;
  timestamp: number;
}

interface StreamPostState {
  // Navigation
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;

  // Moderation
  currentPostIndex: number;
  setCurrentPostIndex: (index: number) => void;
  nextPost: () => void;
  prevPost: () => void;

  // Active vote tracking (real-time from socket)
  activeVotes: Record<string, ActiveVote>;
  setActiveVote: (postId: string, vote: ActiveVote) => void;
  updateActiveVote: (sessionId: string, data: Partial<ActiveVote>) => void;
  removeActiveVote: (postId: string) => void;
  clearActiveVotes: () => void;

  // Vote result animation
  voteResults: Record<string, { decision: VoteDecision; forPercent: number; againstPercent: number }>;
  setVoteResult: (postId: string, result: { decision: VoteDecision; forPercent: number; againstPercent: number }) => void;
  removeVoteResult: (postId: string) => void;

  // Socket connection
  socketConnected: boolean;
  setSocketConnected: (connected: boolean) => void;

  // Activity log
  activityLog: ActivityItem[];
  addActivity: (item: Omit<ActivityItem, 'id' | 'timestamp'>) => void;
  clearOldActivities: () => void;

  // Sound toggle
  soundEnabled: boolean;
  toggleSound: () => void;

  // Confetti
  showConfetti: boolean;
  triggerConfetti: () => void;
  hideConfetti: () => void;

  // Chat messages
  chatMessages: ChatMessage[];
  addChatMessage: (msg: Omit<ChatMessage, 'id'>) => void;
  clearChatMessages: () => void;

  // Streamer overlay post (currently shown on stream)
  overlayPost: Post | null;
  setOverlayPost: (post: Post | null) => void;

  // Twitch emotes
  twitchEmotes: Array<{ code: string; url: string; id: string }>;
  setTwitchEmotes: (emotes: Array<{ code: string; url: string; id: string }>) => void;

  // Overlay panel positions
  overlayPanelPositions: OverlayPanelPositions;
  setOverlayPanelPositions: (positions: OverlayPanelPositions) => void;

  // Vote queue
  voteQueue: string[];
  addToVoteQueue: (postId: string) => void;
  removeFromVoteQueue: (postId: string) => void;
  clearVoteQueue: () => void;
  reorderVoteQueue: (postIds: string[]) => void;

  // Queue countdown
  queueCountdown: number | null;
  setQueueCountdown: (value: number | null) => void;
  decrementQueueCountdown: () => void;
}

export const useStreamPostStore = create<StreamPostState>((set) => ({
  // Navigation
  activeTab: 'moderation',
  setActiveTab: (tab) => set({ activeTab: tab }),

  // Moderation
  currentPostIndex: 0,
  setCurrentPostIndex: (index) => set({ currentPostIndex: index }),
  nextPost: () => set((state) => ({ currentPostIndex: state.currentPostIndex + 1 })),
  prevPost: () => set((state) => ({ currentPostIndex: Math.max(0, state.currentPostIndex - 1) })),

  // Active vote tracking — using Record instead of Map for guaranteed React reactivity
  activeVotes: {},
  setActiveVote: (postId, vote) =>
    set((state) => ({
      activeVotes: { ...state.activeVotes, [postId]: vote },
    })),
  updateActiveVote: (sessionId, data) =>
    set((state) => {
      // Find the vote by sessionId
      const updated = { ...state.activeVotes };
      for (const [postId, vote] of Object.entries(updated)) {
        if (vote.sessionId === sessionId) {
          updated[postId] = { ...vote, ...data };
          break;
        }
      }
      return { activeVotes: updated };
    }),
  removeActiveVote: (postId) =>
    set((state) => {
      const { [postId]: _, ...rest } = state.activeVotes;
      return { activeVotes: rest };
    }),
  clearActiveVotes: () => set({ activeVotes: {} }),

  // Vote results — using Record instead of Map for guaranteed React reactivity
  voteResults: {},
  setVoteResult: (postId, result) =>
    set((state) => ({
      voteResults: { ...state.voteResults, [postId]: result },
    })),
  removeVoteResult: (postId) =>
    set((state) => {
      const { [postId]: _, ...rest } = state.voteResults;
      return { voteResults: rest };
    }),

  // Socket
  socketConnected: false,
  setSocketConnected: (connected) => set({ socketConnected: connected }),

  // Activity log
  activityLog: [],
  addActivity: (item) =>
    set((state) => {
      const newItem: ActivityItem = {
        ...item,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: Date.now(),
      };
      // Keep max 50 items, add new item at the beginning
      const newLog = [newItem, ...state.activityLog].slice(0, 50);
      return { activityLog: newLog };
    }),
  clearOldActivities: () =>
    set((state) => {
      const thirtyMinAgo = Date.now() - 30 * 60 * 1000;
      return { activityLog: state.activityLog.filter((item) => item.timestamp > thirtyMinAgo) };
    }),

  // Sound toggle
  soundEnabled: true,
  toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),

  // Confetti
  showConfetti: false,
  triggerConfetti: () => set({ showConfetti: true }),
  hideConfetti: () => set({ showConfetti: false }),

  // Chat messages
  chatMessages: [],
  addChatMessage: (msg) =>
    set((state) => {
      const newMsg: ChatMessage = {
        ...msg,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      };
      // Keep max 100 items, add new item at the beginning
      const newMessages = [newMsg, ...state.chatMessages].slice(0, 100);
      return { chatMessages: newMessages };
    }),
  clearChatMessages: () => set({ chatMessages: [] }),

  // Streamer overlay post
  overlayPost: null,
  setOverlayPost: (post) => set({ overlayPost: post }),

  // Twitch emotes
  twitchEmotes: [],
  setTwitchEmotes: (emotes) => set({ twitchEmotes: emotes }),

  // Overlay panel positions
  overlayPanelPositions: {
    postContent: { x: 20, y: 680, width: 500, height: 400 },
    voteBar: { x: 20, y: 900, width: 1880, height: 160 },
  },
  setOverlayPanelPositions: (positions) => set({ overlayPanelPositions: positions }),

  // Vote queue
  voteQueue: [],
  addToVoteQueue: (postId) =>
    set((state) => {
      if (state.voteQueue.includes(postId)) return state;
      return { voteQueue: [...state.voteQueue, postId] };
    }),
  removeFromVoteQueue: (postId) =>
    set((state) => ({
      voteQueue: state.voteQueue.filter((id) => id !== postId),
    })),
  clearVoteQueue: () => set({ voteQueue: [] }),
  reorderVoteQueue: (postIds) => set({ voteQueue: postIds }),

  // Queue countdown
  queueCountdown: null,
  setQueueCountdown: (value) => set({ queueCountdown: value }),
  decrementQueueCountdown: () =>
    set((state) => {
      if (state.queueCountdown === null) return state;
      const next = state.queueCountdown - 1;
      return { queueCountdown: next < 0 ? null : next };
    }),
}));
