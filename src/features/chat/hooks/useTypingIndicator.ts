import { useCallback, useEffect, useRef, useState } from 'react';

import { useSocket, useSocketMessages } from '../../calls/hooks/useSocket';

type TypingPayload = {
  type: 'typing';
  from?: string;
  isTyping?: boolean;
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

export const useTypingIndicator = (peerId: string | null) => {
  const { sendMessage } = useSocket();
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const typingTimeoutRef = useRef<number | null>(null);
  const typingClearRef = useRef<number | null>(null);
  const lastTypingSentRef = useRef<number>(0);

  const sendTyping = useCallback(
    (isTyping: boolean) => {
      if (!peerId) return;
      sendMessage({ type: 'typing', to: peerId, isTyping });
    },
    [peerId, sendMessage]
  );

  const scheduleStopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = window.setTimeout(() => {
      sendTyping(false);
    }, 1200);
  }, [sendTyping]);

  const onInputActivity = useCallback(() => {
    if (!peerId) return;
    const now = Date.now();
    if (now - lastTypingSentRef.current > 900) {
      sendTyping(true);
      lastTypingSentRef.current = now;
    }
    scheduleStopTyping();
  }, [peerId, scheduleStopTyping, sendTyping]);

  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    sendTyping(false);
  }, [sendTyping]);

  const handleTypingSignal = useCallback(
    (data: unknown) => {
      if (!peerId || !data || !isRecord(data)) return;
      const payload = data as TypingPayload & Record<string, unknown>;
      if (payload.type !== 'typing') return;
      if (typeof payload.from !== 'string' || payload.from !== peerId) return;
      const isTyping = Boolean(payload.isTyping);
      setIsPeerTyping(isTyping);
      if (typingClearRef.current) window.clearTimeout(typingClearRef.current);
      if (isTyping) {
        typingClearRef.current = window.setTimeout(() => setIsPeerTyping(false), 3000);
      }
    },
    [peerId]
  );

  useSocketMessages(handleTypingSignal);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
      if (typingClearRef.current) window.clearTimeout(typingClearRef.current);
      sendTyping(false);
    };
  }, [sendTyping]);

  return {
    isPeerTyping,
    onInputActivity,
    stopTyping,
  };
};
