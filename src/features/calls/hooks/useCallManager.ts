import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocket } from './useSocket';
import { useWebRTC } from './useWebRTC';
import { apiService } from '../../../services/api.service';
import { useAuthStore } from '../../../stores/authStore';
import type { CallDirection, CallHistoryStatus, CallType } from '../../../types/callHistory';
import type { DirectSignalingMessage, HangupReason, SocketMessage } from '../../../types/signaling';

export type CallStatus = 'idle' | 'calling' | 'connected' | 'ended' | 'rejected';

type HangupActor = 'local' | 'remote';

const resolveHistoryStatus = (
  direction: CallDirection,
  reason: HangupReason,
  connected: boolean,
  by: HangupActor
): CallHistoryStatus => {
  if (connected) return 'completed';

  if (direction === 'incoming') {
    if (by === 'local' && reason === 'rejected') return 'rejected';
    return 'missed';
  }

  if (reason === 'rejected') return 'rejected';
  if (by === 'local') return 'failed';
  return 'missed';
};

interface CallManagerOptions {
  isCallBlocked?: boolean;
  onBlockedCall?: (from?: string) => void;
}

export const useCallManager = (options: CallManagerOptions = {}) => {
  const [incomingCall, setIncomingCall] = useState<DirectSignalingMessage | null>(null);
  const [activeCallTarget, setActiveCallTarget] = useState<string | null>(null);
  const [status, setStatus] = useState<CallStatus>('idle');
  const [callDurationSeconds, setCallDurationSeconds] = useState(0);

  const queryClient = useQueryClient();
  const accessToken = useAuthStore((state) => state.session?.access_token);
  const cleanupTimerRef = useRef<number | null>(null);
  const ringIntervalRef = useRef<number | null>(null);
  const ringTimeoutRef = useRef<number | null>(null);
  const ringContextRef = useRef<AudioContext | null>(null);
  const ringOscillatorRef = useRef<OscillatorNode | null>(null);
  const ringGainRef = useRef<GainNode | null>(null);
  const durationIntervalRef = useRef<number | null>(null);
  const historyRefreshTimersRef = useRef<number[]>([]);

  const incomingCallRef = useRef<DirectSignalingMessage | null>(null);
  const activeCallTargetRef = useRef<string | null>(null);

  const callDirectionRef = useRef<CallDirection | null>(null);
  const callStartedAtRef = useRef<number | null>(null);
  const callConnectedAtRef = useRef<number | null>(null);
  const callTypeRef = useRef<CallType>('audio');
  const loggedRef = useRef(false);
  const statusRef = useRef<CallStatus>('idle');

  const { sendMessage, socket } = useSocket();

  const {
    startAudioCall,
    handleRemoteOffer,
    handleRemoteAnswer,
    handleRemoteIceCandidate,
    cleanup,
    isMicMuted,
    toggleMicMute,
  } = useWebRTC(sendMessage);

  const getConnectedDuration = useCallback(() => {
    if (!callConnectedAtRef.current) return 0;
    return Math.max(0, Math.floor((Date.now() - callConnectedAtRef.current) / 1000));
  }, []);

  const stopDurationTimer = useCallback(() => {
    if (durationIntervalRef.current) {
      window.clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  }, []);

  const startDurationTimer = useCallback(() => {
    if (!callConnectedAtRef.current) {
      callConnectedAtRef.current = Date.now();
    }
    stopDurationTimer();
    setCallDurationSeconds(0);
    durationIntervalRef.current = window.setInterval(() => {
      setCallDurationSeconds(getConnectedDuration());
    }, 1000);
  }, [getConnectedDuration, stopDurationTimer]);

  const resetCallTracking = useCallback(() => {
    stopDurationTimer();
    callDirectionRef.current = null;
    callStartedAtRef.current = null;
    callConnectedAtRef.current = null;
    callTypeRef.current = 'audio';
    loggedRef.current = false;
    setCallDurationSeconds(0);
  }, [stopDurationTimer]);

  const clearHistoryRefreshTimers = useCallback(() => {
    for (const timerId of historyRefreshTimersRef.current) {
      window.clearTimeout(timerId);
    }
    historyRefreshTimersRef.current = [];
  }, []);

  const scheduleCallHistoryRefresh = useCallback(() => {
    clearHistoryRefreshTimers();
    for (const delay of [0, 800, 1800]) {
      const timerId = window.setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['call-history'] });
      }, delay);
      historyRefreshTimersRef.current.push(timerId);
    }
  }, [clearHistoryRefreshTimers, queryClient]);

  const persistCallHistory = useCallback(
    (reason: HangupReason, by: HangupActor) => {
      if (loggedRef.current) return;

      const peerId = activeCallTargetRef.current || incomingCallRef.current?.from;
      const direction = callDirectionRef.current;
      if (!peerId || !direction) return;

      // call_history is a shared record for caller/receiver,
      // so we persist only from the outgoing side to avoid duplicates.
      if (direction !== 'outgoing') {
        loggedRef.current = true;
        scheduleCallHistoryRefresh();
        return;
      }

      const endedAtMs = Date.now();
      const durationSeconds = getConnectedDuration();
      const startedAtIso = new Date(callStartedAtRef.current ?? endedAtMs).toISOString();
      const endedAtIso = new Date(endedAtMs).toISOString();
      const historyStatus = resolveHistoryStatus(direction, reason, !!callConnectedAtRef.current, by);

      setCallDurationSeconds(durationSeconds);
      loggedRef.current = true;

      if (!accessToken) return;

      void apiService
        .createCallHistory(accessToken, {
          peerId,
          direction,
          status: historyStatus,
          durationSeconds,
          callType: callTypeRef.current,
          startedAt: startedAtIso,
          endedAt: endedAtIso,
        })
        .then(() => scheduleCallHistoryRefresh())
        .catch((error) => {
          loggedRef.current = false;
          console.error('Failed to save call history:', error);
        });
    },
    [accessToken, getConnectedDuration, scheduleCallHistoryRefresh]
  );

  const clearCallUI = useCallback(() => {
    setActiveCallTarget(null);
    setIncomingCall(null);
    setStatus('idle');
    resetCallTracking();
    if (cleanupTimerRef.current) {
      window.clearTimeout(cleanupTimerRef.current);
      cleanupTimerRef.current = null;
    }
  }, [resetCallTracking]);

  const stopRingback = useCallback(() => {
    if (ringIntervalRef.current) {
      window.clearInterval(ringIntervalRef.current);
      ringIntervalRef.current = null;
    }
    if (ringTimeoutRef.current) {
      window.clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = null;
    }
    if (ringGainRef.current && ringContextRef.current) {
      ringGainRef.current.gain.setValueAtTime(0, ringContextRef.current.currentTime);
    }
    ringOscillatorRef.current?.stop();
    ringOscillatorRef.current?.disconnect();
    ringGainRef.current?.disconnect();
    ringOscillatorRef.current = null;
    ringGainRef.current = null;
  }, []);

  const startRingback = useCallback(async () => {
    if (ringIntervalRef.current) return;

    const ctx = ringContextRef.current || new AudioContext();
    ringContextRef.current = ctx;

    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {
        // ignore
      }
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 440;
    gain.gain.value = 0;
    osc.connect(gain).connect(ctx.destination);
    osc.start();

    ringOscillatorRef.current = osc;
    ringGainRef.current = gain;

    const ringOnce = () => {
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      ringTimeoutRef.current = window.setTimeout(() => {
        gain.gain.setValueAtTime(0, ctx.currentTime);
      }, 1000);
    };

    ringOnce();
    ringIntervalRef.current = window.setInterval(ringOnce, 3000);
  }, []);

  const stopCall = useCallback(
    (reason: HangupReason = 'ended') => {
      const targetId = activeCallTargetRef.current || incomingCallRef.current?.from;
      if (targetId) sendMessage({ type: 'hangup', to: targetId, reason });

      stopRingback();
      stopDurationTimer();
      cleanup();
      persistCallHistory(reason, 'local');
      setStatus(reason);

      if (cleanupTimerRef.current) window.clearTimeout(cleanupTimerRef.current);
      cleanupTimerRef.current = window.setTimeout(() => {
        clearCallUI();
      }, 250);
    },
    [sendMessage, cleanup, clearCallUI, stopRingback, persistCallHistory, stopDurationTimer]
  );

  const startCall = useCallback(
    async (targetId: string, callType: CallType = 'audio') => {
      if (statusRef.current !== 'idle' || activeCallTargetRef.current) {
        console.warn('Call already in progress');
        return;
      }
      if (options.isCallBlocked) {
        options.onBlockedCall?.(targetId);
        return;
      }
      callDirectionRef.current = 'outgoing';
      callStartedAtRef.current = Date.now();
      callConnectedAtRef.current = null;
      callTypeRef.current = callType;
      loggedRef.current = false;
      setCallDurationSeconds(0);
      setIncomingCall(null);
      setStatus('calling');
      setActiveCallTarget(targetId);
      try {
        await startRingback();
        await startAudioCall(targetId);
      } catch (e) {
        console.error('Start call error:', e);
        stopCall('ended');
      }
    },
    [startAudioCall, stopCall, startRingback, options]
  );

  const acceptCall = useCallback(async () => {
    const pendingCall = incomingCallRef.current;
    if (!pendingCall?.from || !pendingCall.offer) return;

    const targetId = pendingCall.from;
    callDirectionRef.current = 'incoming';
    callStartedAtRef.current = callStartedAtRef.current ?? Date.now();
    callConnectedAtRef.current = Date.now();
    callTypeRef.current = pendingCall.callType || 'audio';
    loggedRef.current = false;
    setActiveCallTarget(targetId);

    try {
      await handleRemoteOffer(targetId, pendingCall.offer);
      setIncomingCall(null);
      setStatus('connected');
      startDurationTimer();
    } catch (e) {
      console.error('Accept call error:', e);
      stopCall('ended');
    }
  }, [handleRemoteOffer, startDurationTimer, stopCall]);

  useEffect(() => {
    incomingCallRef.current = incomingCall;
  }, [incomingCall]);

  useEffect(() => {
    activeCallTargetRef.current = activeCallTarget;
  }, [activeCallTarget]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    if (!socket) return;

    const handleMessage = async (event: MessageEvent) => {
      const msg: SocketMessage = JSON.parse(event.data);

      switch (msg.type) {
        case 'offer':
          if (options.isCallBlocked) {
            if (msg.from) {
              sendMessage({ type: 'hangup', to: msg.from, reason: 'rejected' });
            }
            options.onBlockedCall?.(msg.from);
            break;
          }
          if (statusRef.current !== 'idle' || activeCallTargetRef.current || incomingCallRef.current) {
            if (msg.from) {
              sendMessage({ type: 'hangup', to: msg.from, reason: 'rejected' });
            }
            break;
          }
          incomingCallRef.current = msg;
          setIncomingCall(msg);
          callDirectionRef.current = 'incoming';
          callStartedAtRef.current = Date.now();
          callConnectedAtRef.current = null;
          callTypeRef.current = msg.callType || 'audio';
          loggedRef.current = false;
          setCallDurationSeconds(0);
          break;

        case 'answer':
          if (msg.answer) {
            stopRingback();
            await handleRemoteAnswer(msg.answer);
            callConnectedAtRef.current = Date.now();
            setStatus('connected');
            startDurationTimer();
          }
          break;

        case 'ice-candidate':
          if (msg.candidate) {
            try {
              await handleRemoteIceCandidate(msg.candidate as RTCIceCandidateInit);
            } catch (e) {
              console.error('Error adding ice candidate:', e);
            }
          }
          break;

        case 'hangup': {
          stopDurationTimer();
          stopRingback();
          cleanup();
          const remoteReason: HangupReason = msg.reason === 'rejected' ? 'rejected' : 'ended';
          persistCallHistory(remoteReason, 'remote');
          setStatus(remoteReason);
          if (cleanupTimerRef.current) window.clearTimeout(cleanupTimerRef.current);
          cleanupTimerRef.current = window.setTimeout(() => {
            clearCallUI();
          }, 2500);
          break;
        }
      }
    };

    socket.addEventListener('message', handleMessage);
    return () => {
      socket.removeEventListener('message', handleMessage);
      stopRingback();
      stopDurationTimer();
      clearHistoryRefreshTimers();
      if (cleanupTimerRef.current) window.clearTimeout(cleanupTimerRef.current);
    };
  }, [
    socket,
    sendMessage,
    handleRemoteAnswer,
    handleRemoteIceCandidate,
    cleanup,
    clearCallUI,
    stopRingback,
    persistCallHistory,
    startDurationTimer,
    stopDurationTimer,
    clearHistoryRefreshTimers,
    options,
  ]);

  useEffect(() => {
    if (status !== 'calling') stopRingback();
  }, [status, stopRingback]);

  return {
    incomingCall,
    activeCallTarget,
    status,
    startCall,
    acceptCall,
    stopCall,
    setIncomingCall,
    cleanup,
    callDurationSeconds,
    isMicMuted,
    toggleMicMute,
  };
};
