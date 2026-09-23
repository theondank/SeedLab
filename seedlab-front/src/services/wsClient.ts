export type WsMessage = {
  type: string
  data: unknown
}

type Handler = (data: never) => void

const listeners = new Map<string, Set<Handler>>()

let socket: WebSocket | null = null
let retryTimer: ReturnType<typeof setTimeout> | null = null
let retryDelay = 2000

const getUrl = (): string => {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${proto}://${window.location.host}/ws`
}

const connect = (): void => {
  if (socket && socket.readyState !== WebSocket.CLOSED) return

  socket = new WebSocket(getUrl())

  socket.onopen = () => {
    retryDelay = 2000
  }

  socket.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data as string) as WsMessage
      const handlers = listeners.get(message.type)
      if (!handlers) return
      handlers.forEach((handler) => handler(message.data as never))
    } catch {
      // message illisible : ignoré
    }
  }

  socket.onclose = () => {
    socket = null
    if (retryTimer) return
    retryTimer = setTimeout(() => {
      retryTimer = null
      connect()
    }, retryDelay)
    retryDelay = Math.min(retryDelay * 2, 15_000)
  }

  socket.onerror = () => socket?.close()
}

export function subscribeWs<T>(type: string, handler: (data: T) => void): () => void {
  if (!listeners.has(type)) listeners.set(type, new Set())
  listeners.get(type)!.add(handler as Handler)
  connect()
  return () => {
    listeners.get(type)?.delete(handler as Handler)
  }
}