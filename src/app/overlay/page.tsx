'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

/* ─── Types ─── */

interface VoteData {
  sessionId: string;
  postId: string;
  durationSec: number;
  votesFor: number;
  votesAgainst: number;
  totalVoters: number;
  timeRemaining: number;
}

interface PostData {
  id: string;
  type: 'PHOTO' | 'YOUTUBE' | 'TEXT';
  text: string | null;
  mediaUrl: string | null;
  youtubeUrl: string | null;
  youtubeTitle: string | null;
  youtubeThumbnail: string | null;
  author?: {
    username: string | null;
    firstName: string | null;
  };
}

interface OverlaySettings {
  overlayVotingLabel: string;
  overlayWinText: string;
  overlayLoseText: string;
  overlayApprovedText: string;
  overlayRejectedText: string;
}

interface PanelRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PanelPositions {
  postContent: PanelRect;
  voteBar: PanelRect;
}

type OverlayState = 'idle' | 'voting' | 'result';

/* ─── Defaults ─── */

const DEFAULT_SETTINGS: OverlaySettings = {
  overlayVotingLabel: 'Голосование чата',
  overlayWinText: 'ЧАТ РЕШИЛ!',
  overlayLoseText: 'МЕЧТА ЧАТА УБИТА',
  overlayApprovedText: 'ПРИНЯТО!',
  overlayRejectedText: 'ОТКЛОНЕНО',
};

const DEFAULT_PANEL_POSITIONS: PanelPositions = {
  postContent: { x: 20, y: 680, width: 500, height: 400 },
  voteBar: { x: 20, y: 900, width: 1880, height: 160 },
};

/* Helper to safely parse panel position JSON */
function parsePanelRect(json: string | undefined, fallback: PanelRect): PanelRect {
  if (!json) return fallback;
  try {
    const parsed = JSON.parse(json);
    if (parsed && typeof parsed.x === 'number' && typeof parsed.y === 'number' && typeof parsed.width === 'number' && typeof parsed.height === 'number') {
      return parsed;
    }
  } catch {
    // Fallback
  }
  return fallback;
}

/* ─── Component ─── */

export default function OverlayPage() {
  const [state, setState] = useState<OverlayState>('idle');
  const [voteData, setVoteData] = useState<VoteData | null>(null);
  const [postData, setPostData] = useState<PostData | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [votesFor, setVotesFor] = useState(0);
  const [votesAgainst, setVotesAgainst] = useState(0);
  const [totalVoters, setTotalVoters] = useState(0);
  const [chatWon, setChatWon] = useState(true);
  const [connected, setConnected] = useState(false);
  const [settings, setSettings] = useState<OverlaySettings>(DEFAULT_SETTINGS);
  const [panelPositions, setPanelPositions] = useState<PanelPositions>(DEFAULT_PANEL_POSITIONS);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const resultTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ─── Load settings + panel positions ─── */
  useEffect(() => {
    fetch('/api/settings')
      .then((r) => (r.ok ? r.json() : {}))
      .then((data: Record<string, string>) => {
        setSettings({
          overlayVotingLabel: data.overlayVotingLabel || DEFAULT_SETTINGS.overlayVotingLabel,
          overlayWinText: data.overlayWinText || DEFAULT_SETTINGS.overlayWinText,
          overlayLoseText: data.overlayLoseText || DEFAULT_SETTINGS.overlayLoseText,
          overlayApprovedText: data.overlayApprovedText || DEFAULT_SETTINGS.overlayApprovedText,
          overlayRejectedText: data.overlayRejectedText || DEFAULT_SETTINGS.overlayRejectedText,
        });
        setPanelPositions({
          postContent: parsePanelRect(data.overlayPostContent, DEFAULT_PANEL_POSITIONS.postContent),
          voteBar: parsePanelRect(data.overlayVoteBar, DEFAULT_PANEL_POSITIONS.voteBar),
        });
      })
      .catch(() => {
        /* use defaults */
      });
  }, []);

  /* ─── Fetch post data ─── */
  const fetchPostData = useCallback(async (postId: string) => {
    try {
      const res = await fetch(`/api/posts/${postId}`);
      if (res.ok) {
        const post = await res.json();
        setPostData({
          id: post.id,
          type: post.type,
          text: post.text,
          mediaUrl: post.mediaUrl,
          youtubeUrl: post.youtubeUrl,
          youtubeTitle: post.youtubeTitle,
          youtubeThumbnail: post.youtubeThumbnail,
          author: post.author,
        });
        setImgLoaded(false);
        setImgError(false);
      }
    } catch {
      /* silently fail */
    }
  }, []);

  /* ─── Reset state for new vote ─── */
  const resetForNewVote = useCallback(() => {
    if (resultTimeoutRef.current) {
      clearTimeout(resultTimeoutRef.current);
      resultTimeoutRef.current = null;
    }
  }, []);

  /* ─── Socket.io connection ─── */
  useEffect(() => {
    const socket: Socket = io('/?XTransformPort=3003', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on('connect', () => {
      console.log('[Overlay] Connected to realtime service');
      setConnected(true);
      socket.emit('overlay:join');
    });

    socket.on('disconnect', () => {
      console.log('[Overlay] Disconnected');
      setConnected(false);
    });

    socket.on('vote:start', (data: VoteData) => {
      resetForNewVote();
      setState('voting');
      setVoteData(data);
      setTimeLeft(data.durationSec);
      setVotesFor(data.votesFor || 0);
      setVotesAgainst(data.votesAgainst || 0);
      setTotalVoters(data.totalVoters || 0);
      fetchPostData(data.postId);
    });

    socket.on(
      'vote:update',
      (data: { votesFor: number; votesAgainst: number; totalVoters: number; timeRemaining?: number }) => {
        setVotesFor(data.votesFor);
        setVotesAgainst(data.votesAgainst);
        setTotalVoters(data.totalVoters);
        if (data.timeRemaining !== undefined) {
          setTimeLeft(data.timeRemaining);
        }
      },
    );

    socket.on(
      'vote:end',
      (data: { votesFor: number; votesAgainst: number; totalVoters: number; finalDecision: string }) => {
        setVotesFor(data.votesFor);
        setVotesAgainst(data.votesAgainst);
        setTotalVoters(data.totalVoters);
        setChatWon(data.finalDecision === 'POSTED');
        setState('result');
        resultTimeoutRef.current = setTimeout(() => {
          setState('idle');
          setPostData(null);
          setVoteData(null);
        }, 6000);
      },
    );

    socketRef.current = socket;

    return () => {
      if (resultTimeoutRef.current) {
        clearTimeout(resultTimeoutRef.current);
      }
      socket.disconnect();
    };
  }, [fetchPostData, resetForNewVote]);

  /* ─── Timer countdown fallback ─── */
  useEffect(() => {
    if (state !== 'voting') return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [state]);

  /* ─── Computed values ─── */
  const total = votesFor + votesAgainst;
  const forPercent = total > 0 ? Math.round((votesFor / total) * 100) : 50;
  const againstPercent = total > 0 ? 100 - forPercent : 50;

  const authorName = postData?.author?.username
    ? `@${postData.author.username}`
    : postData?.author?.firstName || '';

  const mediaSrc =
    postData?.type === 'PHOTO'
      ? postData.mediaUrl
      : postData?.type === 'YOUTUBE'
        ? postData.youtubeThumbnail
        : null;

  /* ─── Render ─── */
  return (
    <div
      style={{
        width: 1920,
        height: 1080,
        position: 'relative',
        overflow: 'hidden',
        background: 'transparent',
        fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Inline keyframes */}
      <style>{`
        @keyframes overlay-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes overlay-pulse-glow {
          0%, 100% { box-shadow: 0 0 15px rgba(168, 85, 247, 0.25); }
          50% { box-shadow: 0 0 35px rgba(168, 85, 247, 0.55); }
        }
        @keyframes overlay-countdown-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
        @keyframes overlay-fade-in-up {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes overlay-fade-out-down {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(40px); }
        }
        @keyframes overlay-result-bounce {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.08); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes overlay-play-pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.9; }
          50% { transform: translate(-50%, -50%) scale(1.12); opacity: 1; }
        }
        @keyframes overlay-dot-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .shimmer-bar-overlay {
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%);
          background-size: 200% 100%;
          animation: overlay-shimmer 2s infinite;
        }
      `}</style>

      {/* ─── Connection indicator (top-right) ─── */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          opacity: 0.35,
          zIndex: 100,
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: connected ? '#34d399' : '#ef4444',
            boxShadow: connected ? '0 0 6px #34d399' : '0 0 6px #ef4444',
            animation: connected ? 'overlay-dot-blink 2s infinite' : 'none',
          }}
        />
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: 0.5 }}>
          {connected ? 'LIVE' : 'OFFLINE'}
        </span>
      </div>

      {/* ─── IDLE STATE ─── */}
      {state === 'idle' && (
        <div
          style={{
            position: 'absolute',
            bottom: 28,
            left: 28,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 18px',
            background: 'rgba(0,0,0,0.35)',
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.06)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
          }}
        >
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 7,
              background: 'linear-gradient(135deg, #10b981, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              color: 'white',
              fontWeight: 900,
            }}
          >
            S
          </div>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontWeight: 600, letterSpacing: 0.5 }}>
            StreamPost
          </span>
        </div>
      )}

      {/* ─── VOTING STATE ─── */}
      {state === 'voting' && (
        <>
          {/* ─── Content Card ─── */}
          {postData && (
            <div
              style={{
                position: 'absolute',
                left: panelPositions.postContent.x,
                top: panelPositions.postContent.y,
                width: panelPositions.postContent.width,
                height: panelPositions.postContent.height,
                animation: 'overlay-fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: 20,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(10, 10, 20, 0.8)',
                  backdropFilter: 'blur(24px)',
                  WebkitBackdropFilter: 'blur(24px)',
                  overflow: 'hidden',
                  boxShadow: '0 8px 40px rgba(0,0,0,0.5), 0 0 20px rgba(139, 92, 246, 0.15)',
                }}
              >
                {/* ─── PHOTO type ─── */}
                {postData.type === 'PHOTO' && mediaSrc && !imgError && (
                  <div
                    style={{
                      position: 'relative',
                      width: '100%',
                      maxHeight: 420,
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'rgba(0,0,0,0.3)',
                    }}
                  >
                    {/* Blur background */}
                    <img
                      src={mediaSrc}
                      alt=""
                      style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        filter: 'blur(30px) brightness(0.3)',
                        transform: 'scale(1.2)',
                      }}
                    />
                    {/* Main image */}
                    <img
                      src={mediaSrc}
                      alt="Post photo"
                      onLoad={() => setImgLoaded(true)}
                      onError={() => setImgError(true)}
                      style={{
                        position: 'relative',
                        maxWidth: '100%',
                        maxHeight: 400,
                        objectFit: 'contain',
                        opacity: imgLoaded ? 1 : 0,
                        transition: 'opacity 0.4s ease',
                        zIndex: 1,
                      }}
                    />
                    {!imgLoaded && (
                      <div
                        style={{
                          position: 'absolute',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 2,
                        }}
                      >
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            border: '3px solid rgba(255,255,255,0.2)',
                            borderTopColor: '#a78bfa',
                            borderRadius: '50%',
                            animation: 'overlay-countdown-pulse 1s infinite',
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* ─── YOUTUBE type ─── */}
                {postData.type === 'YOUTUBE' && (
                  <div
                    style={{
                      position: 'relative',
                      width: '100%',
                      overflow: 'hidden',
                    }}
                  >
                    {postData.youtubeThumbnail ? (
                      <div style={{ position: 'relative', width: '100%' }}>
                        <img
                          src={postData.youtubeThumbnail}
                          alt={postData.youtubeTitle || 'YouTube video'}
                          onLoad={() => setImgLoaded(true)}
                          style={{
                            width: '100%',
                            maxHeight: 380,
                            objectFit: 'cover',
                            display: 'block',
                            opacity: imgLoaded ? 1 : 0,
                            transition: 'opacity 0.4s ease',
                          }}
                        />
                        {/* Dark gradient overlay */}
                        <div
                          style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            height: '50%',
                            background: 'linear-gradient(to top, rgba(10,10,20,0.95), transparent)',
                          }}
                        />
                        {/* Play button */}
                        <div
                          style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -60%)',
                            width: 72,
                            height: 72,
                            borderRadius: '50%',
                            background: 'rgba(255, 0, 0, 0.85)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 20px rgba(255,0,0,0.4)',
                            animation: 'overlay-play-pulse 2s infinite',
                          }}
                        >
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                        {/* YouTube title */}
                        {postData.youtubeTitle && (
                          <div
                            style={{
                              position: 'absolute',
                              bottom: 12,
                              left: 16,
                              right: 16,
                              zIndex: 2,
                            }}
                          >
                            <span
                              style={{
                                fontSize: 14,
                                fontWeight: 600,
                                color: 'rgba(255,255,255,0.9)',
                                lineHeight: 1.3,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                              }}
                            >
                              {postData.youtubeTitle}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* No thumbnail fallback */
                      <div
                        style={{
                          padding: '32px 24px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 16,
                          background: 'linear-gradient(135deg, rgba(220,38,38,0.15), rgba(220,38,38,0.05))',
                        }}
                      >
                        <div
                          style={{
                            width: 56,
                            height: 56,
                            borderRadius: 14,
                            background: 'rgba(220,38,38,0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="#f87171">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                        <div>
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: '#f87171',
                              letterSpacing: 0.5,
                              display: 'block',
                              marginBottom: 4,
                            }}
                          >
                            YOUTUBE
                          </span>
                          <span style={{ fontSize: 15, color: 'rgba(255,255,255,0.8)', lineHeight: 1.4 }}>
                            {postData.youtubeTitle || postData.youtubeUrl || 'YouTube видео'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ─── TEXT type ─── */}
                {postData.type === 'TEXT' && (
                  <div
                    style={{
                      padding: '28px 28px 20px 28px',
                      position: 'relative',
                    }}
                  >
                    {/* Decorative quote mark */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 12,
                        left: 18,
                        fontSize: 52,
                        lineHeight: 1,
                        color: 'rgba(139, 92, 246, 0.2)',
                        fontWeight: 900,
                        fontFamily: 'Georgia, serif',
                      }}
                    >
                      &ldquo;
                    </div>
                    <p
                      style={{
                        fontSize: 18,
                        color: 'rgba(255,255,255,0.88)',
                        lineHeight: 1.6,
                        fontWeight: 400,
                        position: 'relative',
                        zIndex: 1,
                        maxHeight: 200,
                        overflow: 'hidden',
                        wordBreak: 'break-word',
                      }}
                    >
                      {postData.text || 'Пост без текста'}
                    </p>
                  </div>
                )}

                {/* ─── Author row ─── */}
                {authorName && (
                  <div
                    style={{
                      padding: postData.type === 'TEXT' ? '0 28px 20px 28px' : postData.type === 'YOUTUBE' && postData.youtubeThumbnail ? '8px 16 14px 16px' : '12px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 10,
                        color: 'white',
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {authorName.charAt(0).toUpperCase()}
                    </div>
                    <span
                      style={{
                        fontSize: 13,
                        color: 'rgba(255,255,255,0.5)',
                        fontWeight: 500,
                      }}
                    >
                      {authorName}
                    </span>
                    {/* Post type badge */}
                    <span
                      style={{
                        marginLeft: 'auto',
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: 0.8,
                        padding: '3px 8px',
                        borderRadius: 4,
                        background:
                          postData.type === 'PHOTO'
                            ? 'rgba(16,185,129,0.15)'
                            : postData.type === 'YOUTUBE'
                              ? 'rgba(220,38,38,0.15)'
                              : 'rgba(245,158,11,0.15)',
                        color:
                          postData.type === 'PHOTO'
                            ? '#34d399'
                            : postData.type === 'YOUTUBE'
                              ? '#f87171'
                              : '#fbbf24',
                      }}
                    >
                      {postData.type === 'PHOTO' ? 'ФОТО' : postData.type === 'YOUTUBE' ? 'YOUTUBE' : 'ТЕКСТ'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── Voting Bar ─── */}
          <div
            style={{
              position: 'absolute',
              left: panelPositions.voteBar.x,
              top: panelPositions.voteBar.y,
              width: panelPositions.voteBar.width,
              height: panelPositions.voteBar.height,
              animation: 'overlay-fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                borderRadius: 18,
                border: '1px solid rgba(139, 92, 246, 0.3)',
                background: 'rgba(5, 5, 15, 0.85)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                padding: '18px 22px',
                animation: 'overlay-pulse-glow 2s infinite',
                overflow: 'hidden',
                boxSizing: 'border-box',
              }}
            >
            {/* Header row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 14,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: '#a855f7',
                    boxShadow: '0 0 10px rgba(168,85,247,0.5)',
                    animation: 'overlay-dot-blink 1.2s infinite',
                  }}
                />
                <span
                  style={{
                    color: 'white',
                    fontWeight: 700,
                    fontSize: 15,
                    letterSpacing: 1.5,
                    textTransform: 'uppercase',
                  }}
                >
                  {settings.overlayVotingLabel}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span
                  style={{
                    fontSize: 11,
                    color: 'rgba(255,255,255,0.4)',
                    background: 'rgba(255,255,255,0.08)',
                    padding: '3px 10px',
                    borderRadius: 5,
                    fontWeight: 500,
                  }}
                >
                  1 = ЗА &middot; 2 = ПРОТИВ
                </span>
                <span
                  style={{
                    fontSize: 18,
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    fontWeight: 800,
                    color: timeLeft <= 5 ? '#f87171' : '#a78bfa',
                    animation: timeLeft <= 5 ? 'overlay-countdown-pulse 0.8s infinite' : 'none',
                    minWidth: 48,
                    textAlign: 'right',
                  }}
                >
                  0:{timeLeft.toString().padStart(2, '0')}
                </span>
              </div>
            </div>

            {/* Vote bar */}
            <div
              style={{
                position: 'relative',
                height: 36,
                borderRadius: 10,
                overflow: 'hidden',
                background: 'rgba(255,255,255,0.05)',
              }}
            >
              {total > 0 ? (
                <>
                  <div
                    className="shimmer-bar-overlay"
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: `${forPercent}%`,
                      background: 'linear-gradient(90deg, #059669, #34d399)',
                      minWidth: '6%',
                      transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 0,
                      bottom: 0,
                      width: `${againstPercent}%`,
                      background: 'linear-gradient(270deg, #dc2626, #f87171)',
                      minWidth: '6%',
                      transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  />
                </>
              ) : (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to right, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>Ожидание голосов...</span>
                </div>
              )}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 16px',
                  zIndex: 10,
                }}
              >
                <span
                  style={{
                    color: 'white',
                    fontSize: 14,
                    fontWeight: 800,
                    textShadow: '0 1px 4px rgba(0,0,0,0.6)',
                  }}
                >
                  ✅ {total > 0 ? `${forPercent}% ЗА` : 'ЗА'}
                </span>
                <span
                  style={{
                    color: 'white',
                    fontSize: 14,
                    fontWeight: 800,
                    textShadow: '0 1px 4px rgba(0,0,0,0.6)',
                  }}
                >
                  {total > 0 ? `ПРОТИВ ${againstPercent}%` : 'ПРОТИВ'} ❌
                </span>
              </div>
            </div>

            {/* Vote counts */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: 10,
                opacity: 0.55,
              }}
            >
              <span style={{ fontSize: 11, color: '#34d399' }}>{votesFor} голос(ов)</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Всего: {totalVoters}</span>
              <span style={{ fontSize: 11, color: '#f87171' }}>{votesAgainst} голос(ов)</span>
            </div>
            </div>
          </div>
        </>
      )}

      {/* ─── RESULT STATE ─── */}
      {state === 'result' && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '0 40px 32px 40px',
            animation: 'overlay-fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          }}
        >
          {/* ─── Dimmed Content Card ─── */}
          {postData && (
            <div
              style={{
                marginBottom: 16,
                display: 'flex',
                justifyContent: 'center',
                opacity: 0.4,
                filter: 'grayscale(0.3) brightness(0.7)',
                transition: 'opacity 1.5s ease, filter 1.5s ease',
                pointerEvents: 'none',
              }}
            >
              <div
                style={{
                  maxWidth: 680,
                  width: '100%',
                  borderRadius: 20,
                  border: '1px solid rgba(255,255,255,0.06)',
                  background: 'rgba(10, 10, 20, 0.6)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  overflow: 'hidden',
                }}
              >
                {/* PHOTO result */}
                {postData.type === 'PHOTO' && mediaSrc && !imgError && (
                  <div
                    style={{
                      position: 'relative',
                      width: '100%',
                      maxHeight: 280,
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'rgba(0,0,0,0.3)',
                    }}
                  >
                    <img
                      src={mediaSrc}
                      alt=""
                      style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        filter: 'blur(30px) brightness(0.2)',
                        transform: 'scale(1.2)',
                      }}
                    />
                    <img
                      src={mediaSrc}
                      alt="Post photo"
                      style={{
                        position: 'relative',
                        maxWidth: '100%',
                        maxHeight: 260,
                        objectFit: 'contain',
                        zIndex: 1,
                      }}
                    />
                  </div>
                )}

                {/* YOUTUBE result */}
                {postData.type === 'YOUTUBE' && postData.youtubeThumbnail && (
                  <div style={{ position: 'relative', width: '100%' }}>
                    <img
                      src={postData.youtubeThumbnail}
                      alt={postData.youtubeTitle || 'YouTube video'}
                      style={{
                        width: '100%',
                        maxHeight: 240,
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: chatWon
                          ? 'linear-gradient(to top, rgba(5,150,105,0.3), transparent)'
                          : 'linear-gradient(to top, rgba(220,38,38,0.3), transparent)',
                      }}
                    />
                  </div>
                )}

                {/* TEXT result */}
                {postData.type === 'TEXT' && (
                  <div style={{ padding: '20px 24px 14px 24px' }}>
                    <p
                      style={{
                        fontSize: 16,
                        color: 'rgba(255,255,255,0.6)',
                        lineHeight: 1.5,
                        maxHeight: 120,
                        overflow: 'hidden',
                      }}
                    >
                      {postData.text || 'Пост без текста'}
                    </p>
                  </div>
                )}

                {/* Author row */}
                {authorName && (
                  <div style={{ padding: '8px 20px 14px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 8,
                        color: 'white',
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {authorName.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>
                      {authorName}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── Result Panel ─── */}
          <div
            style={{
              borderRadius: 18,
              border: `1px solid ${chatWon ? 'rgba(52,211,153,0.35)' : 'rgba(248,113,113,0.35)'}`,
              background: 'rgba(5, 5, 15, 0.88)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              padding: '28px 32px',
              textAlign: 'center',
              boxShadow: chatWon
                ? '0 0 40px rgba(52,211,153,0.2), 0 8px 32px rgba(0,0,0,0.4)'
                : '0 0 40px rgba(248,113,113,0.2), 0 8px 32px rgba(0,0,0,0.4)',
            }}
          >
            {/* Win / Lose result */}
            <div style={{ animation: 'overlay-result-bounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}>
              {chatWon ? (
                <>
                  <div style={{ fontSize: 56, marginBottom: 8 }}>🎉</div>
                  <h2
                    style={{
                      fontSize: 34,
                      fontWeight: 900,
                      background: 'linear-gradient(to right, #34d399, #2dd4bf)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      margin: 0,
                      marginBottom: 4,
                      letterSpacing: 1,
                    }}
                  >
                    {settings.overlayApprovedText}
                  </h2>
                  <p
                    style={{
                      fontSize: 15,
                      color: 'rgba(52,211,153,0.65)',
                      margin: 0,
                      fontWeight: 600,
                    }}
                  >
                    {settings.overlayWinText}
                  </p>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 56, marginBottom: 8 }}>💀</div>
                  <h2
                    style={{
                      fontSize: 34,
                      fontWeight: 900,
                      background: 'linear-gradient(to right, #f87171, #fb923c)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      margin: 0,
                      marginBottom: 4,
                      letterSpacing: 1,
                    }}
                  >
                    {settings.overlayRejectedText}
                  </h2>
                  <p
                    style={{
                      fontSize: 15,
                      color: 'rgba(248,113,113,0.65)',
                      margin: 0,
                      fontWeight: 600,
                    }}
                  >
                    {settings.overlayLoseText}
                  </p>
                </>
              )}
            </div>

            {/* Result stats */}
            <div
              style={{
                display: 'flex',
                gap: 32,
                justifyContent: 'center',
                marginTop: 22,
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: 28, fontWeight: 900, color: '#34d399', display: 'block' }}>
                  {total > 0 ? `${forPercent}%` : '—'}
                </span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>ЗА ({votesFor})</span>
              </div>
              <div
                style={{
                  width: 1,
                  background: 'rgba(255,255,255,0.1)',
                  alignSelf: 'stretch',
                }}
              />
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: 28, fontWeight: 900, color: '#f87171', display: 'block' }}>
                  {total > 0 ? `${againstPercent}%` : '—'}
                </span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>ПРОТИВ ({votesAgainst})</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
