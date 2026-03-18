import { useEffect } from "react";

import { useQueryClient } from "@tanstack/react-query";

import { getAccessToken, getApiBaseUrl } from "@/services/http";

function toWebSocketUrl(apiBaseUrl: string): string {
  const url = new URL(apiBaseUrl);
  const wsProtocol = url.protocol === "https:" ? "wss:" : "ws:";
  return `${wsProtocol}//${url.host}/ws/user`;
}

export function useAdminRealtime(enabled = true): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const token = getAccessToken();
    if (!token) {
      return;
    }

    const wsUrl = `${toWebSocketUrl(getApiBaseUrl())}?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as { scope?: string; type?: string };
        if (payload.scope === "admin" || payload.type?.startsWith("admin.")) {
          queryClient.invalidateQueries({ queryKey: ["admin"] });
        }
      } catch {
        queryClient.invalidateQueries({ queryKey: ["admin"] });
      }
    };

    return () => {
      ws.close();
    };
  }, [enabled, queryClient]);
}
