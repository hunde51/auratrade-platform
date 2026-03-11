const wsUrl = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000/ws";

export function createWebSocketConnection(onMessage: (event: MessageEvent) => void): WebSocket {
  const ws = new WebSocket(wsUrl);
  ws.onmessage = onMessage;
  return ws;
}
