import { createServer, IncomingMessage, ServerResponse } from 'http'
import { io as ioClient, Socket } from 'socket.io-client'

// ============ Types ============

interface TwitchConfig {
  username: string
  oauth: string
  channel: string
}

interface GoodGameConfig {
  channelId: string
}

interface ActiveSession {
  id: string
  postId: string
  voters: Map<string, 1 | 2> // "platform:platformId" -> vote (1=FOR, 2=AGAINST)
}

interface VoteMessage {
  sessionId: string
  platformId: string
  platform: 'TWITCH' | 'GOODGAME'
  vote: 1 | 2
}

// ============ State ============

const PORT = 3004
const REALTIME_PORT = 3003

// Twitch state
let twitchClient: any = null
let twitchConfig: TwitchConfig | null = null
let twitchConnected = false

// GoodGame state
let ggWs: any = null
let ggConfig: GoodGameConfig | null = null
let ggConnected = false
let ggReconnectTimer: ReturnType<typeof setTimeout> | null = null

// Active vote sessions
const activeSessions = new Map<string, ActiveSession>()

// Socket.io client to realtime service
let realtimeSocket: Socket | null = null

// ============ Logging ============

function log(prefix: string, message: string) {
  const timestamp = new Date().toISOString().substring(11, 19)
  console.log(`[${timestamp}] [${prefix}] ${message}`)
}

// ============ Vote Parsing ============

/**
 * Parse a chat message to detect a vote.
 * Supports: "1", "2", "+1", "-1", "за", "против"
 * Returns 1 (FOR) or 2 (AGAINST) or null if not a vote message.
 */
function parseVote(text: string): 1 | 2 | null {
  const trimmed = text.trim().toLowerCase()

  // Exact match for "1" or "2"
  if (trimmed === '1' || trimmed === '+1') return 1
  if (trimmed === '2' || trimmed === '-1') return 2

  // Russian words
  if (trimmed === 'за') return 1
  if (trimmed === 'против') return 2

  return null
}

// ============ Vote Relay ============

function relayVote(data: VoteMessage) {
  const session = activeSessions.get(data.sessionId)
  if (!session) {
    log('ChatService', `Vote ignored — no active session ${data.sessionId}`)
    return
  }

  // Local dedup: check if user already voted with same value
  const voterKey = `${data.platform}:${data.platformId}`
  const existingVote = session.voters.get(voterKey)

  if (existingVote === data.vote) {
    // Same vote, ignore silently
    return
  }

  // Update local tracking (support vote change)
  session.voters.set(voterKey, data.vote)

  // Send to realtime service via Socket.io
  if (realtimeSocket && realtimeSocket.connected) {
    realtimeSocket.emit('vote:cast', data)
    log('ChatService', `Vote relayed: ${data.platform}:${data.platformId} -> ${data.vote === 1 ? 'FOR' : 'AGAINST'} (session ${data.sessionId})`)
  } else {
    log('ChatService', `Vote DROPPED — realtime service not connected (session ${data.sessionId})`)
  }
}

// ============ Realtime Service Connection ============

function connectToRealtime() {
  if (realtimeSocket) return

  log('ChatService', `Connecting to realtime service on port ${REALTIME_PORT}...`)

  realtimeSocket = ioClient(`http://localhost:${REALTIME_PORT}`, {
    path: '/',
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
  })

  realtimeSocket.on('connect', () => {
    log('ChatService', `Connected to realtime service (socket: ${realtimeSocket!.id})`)
  })

  realtimeSocket.on('disconnect', (reason) => {
    log('ChatService', `Disconnected from realtime service: ${reason}`)
  })

  realtimeSocket.on('connect_error', (err) => {
    log('ChatService', `Realtime service connection error: ${err.message}`)
  })

  // Listen for vote:start events from the realtime service
  // This allows the chat service to automatically know about new sessions
  realtimeSocket.on('vote:start', (data: { sessionId: string; postId: string; durationSec: number }) => {
    log('ChatService', `Vote session started via realtime: ${data.sessionId} (post: ${data.postId}, ${data.durationSec}s)`)
    activeSessions.set(data.sessionId, {
      id: data.sessionId,
      postId: data.postId,
      voters: new Map(),
    })
  })

  realtimeSocket.on('vote:end', (data: { sessionId: string }) => {
    log('ChatService', `Vote session ended via realtime: ${data.sessionId}`)
    activeSessions.delete(data.sessionId)
  })
}

// ============ Twitch IRC Integration ============

async function connectTwitch(config: TwitchConfig): Promise<void> {
  // Disconnect existing if any
  if (twitchClient) {
    await disconnectTwitch()
  }

  twitchConfig = config

  return new Promise((resolve, reject) => {
    try {
      // Dynamic import for tmi.js (ESM/CJS compat)
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const tmi = require('tmi.js')

      twitchClient = new tmi.Client({
        options: { debug: false },
        connection: {
          reconnect: true,
          secure: true,
          reconnectDecay: 1.4,
          reconnectInterval: 1000,
          maxReconnectAttempts: Infinity,
        },
        identity: {
          username: config.username,
          password: config.oauth,
        },
        channels: [config.channel],
      })

      twitchClient.on('connected', (addr: string, port: number) => {
        twitchConnected = true
        log('Twitch', `Connected to ${addr}:${port} as ${config.username} in #${config.channel}`)
        resolve()
      })

      twitchClient.on('disconnected', (reason: string) => {
        twitchConnected = false
        log('Twitch', `Disconnected: ${reason}`)
      })

      twitchClient.on('reconnect', () => {
        log('Twitch', 'Reconnecting...')
      })

      twitchClient.on('join', (channel: string, username: string, self: boolean) => {
        if (self) {
          log('Twitch', `Joined channel ${channel}`)
        }
      })

      twitchClient.on('message', (channel: string, userstate: any, message: string, self: boolean) => {
        // Ignore messages from the bot itself
        if (self) return

        const vote = parseVote(message)
        if (vote === null) return

        const platformId = userstate['user-id'] || userstate.username
        if (!platformId) return

        // Relay vote for all active sessions
        for (const [sessionId, session] of activeSessions) {
          relayVote({
            sessionId,
            platformId: String(platformId),
            platform: 'TWITCH',
            vote,
          })
        }
      })

      twitchClient.on('error', (err: Error) => {
        log('Twitch', `Error: ${err.message}`)
      })

      twitchClient.connect().catch((err: Error) => {
        twitchConnected = false
        log('Twitch', `Connection failed: ${err.message}`)
        reject(err)
      })
    } catch (err: any) {
      log('Twitch', `Failed to initialize: ${err.message}`)
      reject(err)
    }
  })
}

async function disconnectTwitch(): Promise<void> {
  if (twitchClient) {
    try {
      await twitchClient.disconnect()
    } catch (e) {
      // Ignore disconnect errors
    }
    twitchClient = null
    twitchConnected = false
    twitchConfig = null
    log('Twitch', 'Disconnected and cleaned up')
  }
}

// ============ GoodGame WebSocket Integration ============

function connectGoodGame(config: GoodGameConfig): void {
  // Disconnect existing if any
  disconnectGoodGame()

  ggConfig = config

  const wsUrl = 'wss://chat.goodgame.ru/chat/websocket'
  log('GG', `Connecting to ${wsUrl} (channel: ${config.channelId})...`)

  ggWs = new WebSocket(wsUrl)

  ggWs.on('open', () => {
    log('GG', 'WebSocket connected, joining channel...')
    // Send join message
    const joinMsg = JSON.stringify({
      type: 'join',
      data: {
        channel_id: config.channelId,
        hidden: false,
      },
    })
    ggWs!.send(joinMsg)
  })

  ggWs.on('message', (raw: any) => {
    try {
      const msg = JSON.parse(raw.toString())

      if (msg.type === 'welcome') {
        log('GG', 'Received welcome from GoodGame chat')
      }

      if (msg.type === 'join') {
        ggConnected = true
        log('GG', `Joined channel ${config.channelId}`)
      }

      if (msg.type === 'message') {
        const { user_name, text, user_id } = msg.data || {}
        if (!user_name || !text) return

        const vote = parseVote(text)
        if (vote === null) return

        const platformId = String(user_id || user_name)

        // Relay vote for all active sessions
        for (const [sessionId, session] of activeSessions) {
          relayVote({
            sessionId,
            platformId,
            platform: 'GOODGAME',
            vote,
          })
        }
      }

      if (msg.type === 'error') {
        log('GG', `Error from server: ${JSON.stringify(msg.data)}`)
      }
    } catch (e) {
      // Not JSON or parse error, ignore
    }
  })

  ggWs.on('close', (code: number, reason: string) => {
    ggConnected = false
    log('GG', `WebSocket closed (code: ${code}, reason: ${reason || 'none'})`)

    // Auto-reconnect after delay
    if (ggConfig) {
      log('GG', 'Will attempt reconnect in 5 seconds...')
      ggReconnectTimer = setTimeout(() => {
        if (ggConfig) {
          connectGoodGame(ggConfig)
        }
      }, 5000)
    }
  })

  ggWs.on('error', (err: Error) => {
    log('GG', `WebSocket error: ${err.message}`)
  })
}

function disconnectGoodGame(): void {
  if (ggReconnectTimer) {
    clearTimeout(ggReconnectTimer)
    ggReconnectTimer = null
  }

  if (ggWs) {
    // Prevent reconnect on intentional disconnect
    ggConfig = null
    try {
      ggWs.close()
    } catch (e) {
      // Ignore
    }
    ggWs = null
    ggConnected = false
    log('GG', 'Disconnected and cleaned up')
  }
}

// ============ HTTP API ============

function parseBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => {
      try {
        const body = Buffer.concat(chunks).toString()
        if (!body) return resolve({})
        resolve(JSON.parse(body))
      } catch (e) {
        reject(new Error('Invalid JSON'))
      }
    })
    req.on('error', reject)
  })
}

function sendJSON(res: ServerResponse, status: number, data: any) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  })
  res.end(JSON.stringify(data))
}

async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url || '/', `http://localhost:${PORT}`)
  const pathname = url.pathname
  const method = req.method || 'GET'

  // CORS preflight
  if (method === 'OPTIONS') {
    sendJSON(res, 200, {})
    return
  }

  try {
    // ---- POST /api/connect/twitch ----
    if (method === 'POST' && pathname === '/api/connect/twitch') {
      const body = await parseBody(req)
      if (!body.username || !body.oauth || !body.channel) {
        sendJSON(res, 400, { error: 'Missing required fields: username, oauth, channel' })
        return
      }
      try {
        await connectTwitch({
          username: body.username,
          oauth: body.oauth,
          channel: body.channel,
        })
        sendJSON(res, 200, { success: true, message: `Connected to Twitch as ${body.username} in #${body.channel}` })
      } catch (err: any) {
        sendJSON(res, 500, { error: `Failed to connect to Twitch: ${err.message}` })
      }
      return
    }

    // ---- POST /api/connect/goodgame ----
    if (method === 'POST' && pathname === '/api/connect/goodgame') {
      const body = await parseBody(req)
      if (!body.channelId) {
        sendJSON(res, 400, { error: 'Missing required field: channelId' })
        return
      }
      connectGoodGame({ channelId: String(body.channelId) })
      sendJSON(res, 200, { success: true, message: `Connecting to GoodGame channel ${body.channelId}` })
      return
    }

    // ---- POST /api/disconnect/twitch ----
    if (method === 'POST' && pathname === '/api/disconnect/twitch') {
      await disconnectTwitch()
      sendJSON(res, 200, { success: true, message: 'Disconnected from Twitch' })
      return
    }

    // ---- POST /api/disconnect/goodgame ----
    if (method === 'POST' && pathname === '/api/disconnect/goodgame') {
      disconnectGoodGame()
      sendJSON(res, 200, { success: true, message: 'Disconnected from GoodGame' })
      return
    }

    // ---- GET /api/status ----
    if (method === 'GET' && pathname === '/api/status') {
      sendJSON(res, 200, {
        twitch: {
          connected: twitchConnected,
          config: twitchConfig ? { username: twitchConfig.username, channel: twitchConfig.channel } : null,
        },
        goodgame: {
          connected: ggConnected,
          config: ggConfig ? { channelId: ggConfig.channelId } : null,
        },
        realtimeService: {
          connected: realtimeSocket?.connected || false,
        },
        activeSessions: Array.from(activeSessions.keys()).map((id) => ({
          id,
          postId: activeSessions.get(id)!.postId,
          voterCount: activeSessions.get(id)!.voters.size,
        })),
      })
      return
    }

    // ---- POST /api/vote-session ----
    if (method === 'POST' && pathname === '/api/vote-session') {
      const body = await parseBody(req)
      if (!body.sessionId || !body.postId) {
        sendJSON(res, 400, { error: 'Missing required fields: sessionId, postId' })
        return
      }
      activeSessions.set(body.sessionId, {
        id: body.sessionId,
        postId: body.postId,
        voters: new Map(),
      })
      log('ChatService', `Vote session registered: ${body.sessionId} (post: ${body.postId})`)
      sendJSON(res, 200, {
        success: true,
        message: `Vote session ${body.sessionId} is now active`,
        activeSessions: activeSessions.size,
      })
      return
    }

    // ---- DELETE /api/vote-session/:id ----
    if (method === 'DELETE' && pathname.startsWith('/api/vote-session/')) {
      const sessionId = pathname.replace('/api/vote-session/', '')
      if (!sessionId) {
        sendJSON(res, 400, { error: 'Missing session ID' })
        return
      }
      const existed = activeSessions.delete(sessionId)
      if (existed) {
        log('ChatService', `Vote session ended: ${sessionId}`)
        sendJSON(res, 200, { success: true, message: `Vote session ${sessionId} removed` })
      } else {
        sendJSON(res, 404, { error: `Vote session ${sessionId} not found` })
      }
      return
    }

    // ---- 404 ----
    sendJSON(res, 404, { error: 'Not found' })
  } catch (err: any) {
    log('ChatService', `HTTP error: ${err.message}`)
    sendJSON(res, 500, { error: 'Internal server error' })
  }
}

// ============ Start Server ============

const httpServer = createServer(handleRequest)

httpServer.listen(PORT, () => {
  log('ChatService', `Chat Integration Service running on port ${PORT}`)
  log('ChatService', 'HTTP API endpoints:')
  log('ChatService', '  POST   /api/connect/twitch    — Start Twitch IRC connection')
  log('ChatService', '  POST   /api/connect/goodgame   — Start GoodGame WS connection')
  log('ChatService', '  POST   /api/disconnect/twitch  — Stop Twitch connection')
  log('ChatService', '  POST   /api/disconnect/goodgame — Stop GoodGame connection')
  log('ChatService', '  GET    /api/status             — Connection status')
  log('ChatService', '  POST   /api/vote-session       — Register active vote session')
  log('ChatService', '  DELETE /api/vote-session/:id   — Remove vote session')

  // Connect to realtime service on startup
  connectToRealtime()
})

// Graceful shutdown
function shutdown() {
  log('ChatService', 'Shutting down...')

  // Disconnect platforms
  disconnectTwitch()
  disconnectGoodGame()

  // Disconnect from realtime service
  if (realtimeSocket) {
    realtimeSocket.disconnect()
    realtimeSocket = null
  }

  // Close HTTP server
  httpServer.close(() => {
    log('ChatService', 'Server closed')
    process.exit(0)
  })

  // Force exit after 5s
  setTimeout(() => {
    process.exit(1)
  }, 5000)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

// Catch unhandled errors to prevent crashes
process.on('uncaughtException', (err) => {
  log('ChatService', `UNCAUGHT EXCEPTION: ${err.message}\n${err.stack || ''}`)
})

process.on('unhandledRejection', (reason) => {
  log('ChatService', `UNHANDLED REJECTION: ${reason}`)
})
