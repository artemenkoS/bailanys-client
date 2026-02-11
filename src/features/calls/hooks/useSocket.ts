import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';

import { useAuthStore } from '../../../stores/authStore';
import type { SocketMessage } from '../../../types/signaling';

type SocketSubscriber = (socket: WebSocket | null) => void;
type SocketMessageSubscriber = (data: unknown) => void;

let sharedSocket: WebSocket | null = null;
let sharedAccessToken: string | null = null;
let sharedUserId: string | null = null;
let sharedQueryClient: ReturnType<typeof useQueryClient> | null = null;
let reconnectTimeout: number | null = null;
let consumerCount = 0;
const subscribers = new Set<SocketSubscriber>();
const messageSubscribers = new Set<SocketMessageSubscriber>();

const notifySubscribers = () => {
  for (const subscriber of subscribers) {
    subscriber(sharedSocket);
  }
};

const notifyMessageSubscribers = (data: unknown) => {
  for (const subscriber of messageSubscribers) {
    subscriber(data);
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const clearReconnectTimeout = () => {
  if (reconnectTimeout) {
    window.clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
};

const handleBeforeUnload = () => {
  if (sharedSocket?.readyState === WebSocket.OPEN) {
    sharedSocket.close(1000, 'Tab closed');
  }
};

const disconnectShared = () => {
  clearReconnectTimeout();

  if (sharedSocket) {
    sharedSocket.onopen = null;
    sharedSocket.onclose = null;
    sharedSocket.onerror = null;
    sharedSocket.onmessage = null;

    if (sharedSocket.readyState === WebSocket.OPEN || sharedSocket.readyState === WebSocket.CONNECTING) {
      sharedSocket.close(1000);
    }
    sharedSocket = null;
    notifySubscribers();
  }
};

const connectShared = () => {
  if (
    !sharedAccessToken ||
    (sharedSocket && (sharedSocket.readyState === WebSocket.OPEN || sharedSocket.readyState === WebSocket.CONNECTING))
  ) {
    return;
  }

  const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8080/ws';
  const socket = new WebSocket(`${WS_URL}?token=${sharedAccessToken}`);
  sharedSocket = socket;

  socket.onopen = () => {
    console.log('WS Connected');
    notifySubscribers();
    sharedQueryClient?.invalidateQueries({ queryKey: ['online-users'] });
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data) as unknown;
      if (!isRecord(data) || typeof data.type !== 'string') {
        notifyMessageSubscribers(data);
        return;
      }
      if (data.type === 'presence-check') {
        if (sharedSocket?.readyState === WebSocket.OPEN) {
          sharedSocket.send(JSON.stringify({ type: 'presence-pong' }));
        }
        return;
      }
      if (data.type === 'user-connected' || data.type === 'user-disconnected') {
        sharedQueryClient?.invalidateQueries({ queryKey: ['online-users'] });
      }
      if (data.type === 'user-status') {
        sharedQueryClient?.invalidateQueries({ queryKey: ['online-users'] });
        const userIdValue = typeof data.userId === 'string' ? data.userId : null;
        if (userIdValue && userIdValue === sharedUserId) {
          sharedQueryClient?.invalidateQueries({
            queryKey: ['profile', sharedAccessToken],
          });
        }
      }
      notifyMessageSubscribers(data);
    } catch (err) {
      console.error('WS Message Error:', err);
    }
  };

  socket.onclose = (event) => {
    console.log(`WS Closed: ${event.reason}`);
    sharedSocket = null;
    notifySubscribers();
    sharedQueryClient?.invalidateQueries({ queryKey: ['online-users'] });

    if (event.code !== 1000 && sharedAccessToken && consumerCount > 0) {
      if (!reconnectTimeout) {
        reconnectTimeout = window.setTimeout(() => {
          reconnectTimeout = null;
          connectShared();
        }, 3000);
      }
    }
  };

  socket.onerror = (error) => {
    console.error('WS Socket Error:', error);
  };
};

export const useSocket = () => {
  const { session, user } = useAuthStore();
  const queryClient = useQueryClient();
  const accessToken = session?.access_token;
  const userId = user?.id;

  const [socketInstance, setSocketInstance] = useState<WebSocket | null>(sharedSocket);

  const disconnect = useCallback(() => {
    disconnectShared();
  }, []);

  useEffect(() => {
    const subscriber: SocketSubscriber = (socket) => {
      setSocketInstance(socket);
    };
    subscribers.add(subscriber);
    return () => {
      subscribers.delete(subscriber);
    };
  }, []);

  useEffect(() => {
    const previousToken = sharedAccessToken;
    sharedAccessToken = accessToken ?? null;
    sharedUserId = userId ?? null;
    sharedQueryClient = queryClient;

    if (!sharedAccessToken) {
      disconnectShared();
      return;
    }

    if (previousToken && previousToken !== sharedAccessToken) {
      disconnectShared();
    }

    if (consumerCount > 0) {
      connectShared();
    }
  }, [accessToken, queryClient, userId]);

  const sendMessage = useCallback((message: SocketMessage | object) => {
    if (sharedSocket?.readyState === WebSocket.OPEN) {
      sharedSocket.send(JSON.stringify(message));
    } else {
      console.warn('WS: Cannot send message, socket is not open');
    }
  }, []);

  useEffect(() => {
    consumerCount += 1;
    if (consumerCount === 1) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    if (sharedAccessToken) {
      connectShared();
    }

    return () => {
      consumerCount = Math.max(0, consumerCount - 1);
      if (consumerCount === 0) {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        disconnectShared();
      }
    };
  }, [disconnect]);

  return {
    sendMessage,
    disconnect,
    socket: socketInstance,
  };
};

export const useSocketMessages = (subscriber: SocketMessageSubscriber) => {
  useEffect(() => {
    messageSubscribers.add(subscriber);
    return () => {
      messageSubscribers.delete(subscriber);
    };
  }, [subscriber]);
};
