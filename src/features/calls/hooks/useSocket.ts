import { useEffect, useRef, useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../../stores/authStore";
import type { SocketMessage } from "../../../types/signaling";

export const useSocket = () => {
  const { session, user } = useAuthStore();
  const queryClient = useQueryClient();
  const accessToken = session?.access_token;
  const userId = user?.id;

  const [socketInstance, setSocketInstance] = useState<WebSocket | null>(null);

  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const connectRef = useRef<() => void>(() => {});

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      window.clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (ws.current) {
      ws.current.onopen = null;
      ws.current.onclose = null;
      ws.current.onerror = null;
      ws.current.onmessage = null;

      if (
        ws.current.readyState === WebSocket.OPEN ||
        ws.current.readyState === WebSocket.CONNECTING
      ) {
        ws.current.close(1000);
      }
      ws.current = null;
      setSocketInstance(null);
    }
  }, []);

  const connect = useCallback(() => {
    if (
      !accessToken ||
      (ws.current &&
        (ws.current.readyState === WebSocket.OPEN ||
          ws.current.readyState === WebSocket.CONNECTING))
    ) {
      return;
    }

    const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8080/ws";
    const socket = new WebSocket(`${WS_URL}?token=${accessToken}`);
    ws.current = socket;

    socket.onopen = () => {
      console.log("WS Connected");
      setSocketInstance(socket);
      queryClient.invalidateQueries({ queryKey: ["online-users"] });
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "presence-check") {
          if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ type: "presence-pong" }));
          }
          return;
        }
        if (
          data.type === "user-connected" ||
          data.type === "user-disconnected"
        ) {
          queryClient.invalidateQueries({ queryKey: ["online-users"] });
        }
        if (data.type === "user-status") {
          queryClient.invalidateQueries({ queryKey: ["online-users"] });
          if (data.userId && data.userId === userId) {
            queryClient.invalidateQueries({
              queryKey: ["profile", accessToken],
            });
          }
        }
      } catch (err) {
        console.error("WS Message Error:", err);
      }
    };

    socket.onclose = (event) => {
      console.log(`❌ WS Closed: ${event.reason}`);
      setSocketInstance(null);
      queryClient.invalidateQueries({ queryKey: ["online-users"] });

      if (event.code !== 1000 && accessToken) {
        if (!reconnectTimeoutRef.current) {
          reconnectTimeoutRef.current = window.setTimeout(() => {
            reconnectTimeoutRef.current = null;
            connectRef.current();
          }, 3000);
        }
      }
    };

    socket.onerror = (error) => {
      console.error("WS Socket Error:", error);
    };
  }, [accessToken, queryClient, userId]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  const sendMessage = useCallback((message: SocketMessage | object) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    } else {
      console.warn("WS: Cannot send message, socket is not open");
    }
  }, []);

  useEffect(() => {
    if (accessToken) {
      connect();
    }

    const handleBeforeUnload = () => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.close(1000, "Tab closed");
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      disconnect();
    };
  }, [connect, disconnect, accessToken]);

  return {
    sendMessage,
    disconnect,
    socket: socketInstance,
  };
};
