import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type {
  RoomAnswerMessage,
  RoomIceMessage,
  RoomJoinedMessage,
  RoomOfferMessage,
  RoomUserJoinedMessage,
  RoomUserLeftMessage,
  SocketMessage,
} from '../../../types/signaling';
import { useRoomPeerMesh } from '../../calls/webrtc/useRoomPeerMesh';
import { useGuestRtcConfiguration } from './useGuestRtcConfiguration';

export type GuestRoomStatus = 'connecting' | 'joining' | 'joined' | 'error' | 'left';

type GuestTokenPayload = {
  roomId?: string;
  guestId?: string;
  exp?: number;
};

const decodeGuestToken = (token: string | null): GuestTokenPayload | null => {
  if (!token) return null;
  const [payload] = token.split('.');
  if (!payload) return null;
  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = atob(padded);
    return JSON.parse(json) as GuestTokenPayload;
  } catch {
    return null;
  }
};

export const useGuestRoomCall = (guestToken: string | null) => {
  const decoded = useMemo(() => decodeGuestToken(guestToken), [guestToken]);
  const decodedRoomId = decoded?.roomId ?? null;
  const decodedGuestId = decoded?.guestId ?? null;
  const tokenError = useMemo(() => {
    if (!guestToken) return 'guest.errors.invalidLink';
    if (!decodedRoomId || !decodedGuestId) return 'guest.errors.invalidLink';
    return null;
  }, [guestToken, decodedGuestId, decodedRoomId]);

  const [status, setStatusState] = useState<GuestRoomStatus>('connecting');
  const [roomId, setRoomId] = useState<string | null>(() => decodedRoomId);
  const [members, setMembers] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isMicMuted, setIsMicMuted] = useState(false);

  const statusRef = useRef<GuestRoomStatus>('connecting');
  const socketRef = useRef<WebSocket | null>(null);
  const selfIdRef = useRef<string | null>(decodedGuestId);
  const roomIdRef = useRef<string | null>(decodedRoomId);
  const isMicMutedRef = useRef(false);

  const { getRtcConfiguration } = useGuestRtcConfiguration(guestToken);
  const mesh = useRoomPeerMesh({
    getRtcConfiguration,
    sendMessage: (message) => {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify(message));
      }
    },
    roomIdRef,
  });
  const {
    ensureLocalStream: ensureMeshLocalStream,
    setMuted: setMeshMuted,
    sendOfferToPeer: sendMeshOffer,
    handleRoomOffer: handleMeshOffer,
    handleRoomAnswer: handleMeshAnswer,
    handleRoomIce: handleMeshIce,
    cleanupPeer: cleanupMeshPeer,
    cleanupAll: cleanupMeshAll,
  } = mesh;

  const setStatus = useCallback((next: GuestRoomStatus) => {
    statusRef.current = next;
    setStatusState(next);
  }, []);

  useEffect(() => {
    roomIdRef.current = roomId;
  }, [roomId]);

  useEffect(() => {
    if (decodedRoomId && roomIdRef.current !== decodedRoomId) {
      roomIdRef.current = decodedRoomId;
    }
    if (decodedGuestId && selfIdRef.current !== decodedGuestId) {
      selfIdRef.current = decodedGuestId;
    }
  }, [decodedGuestId, decodedRoomId]);

  const toggleMicMute = useCallback(() => {
    const nextMuted = !isMicMutedRef.current;
    isMicMutedRef.current = nextMuted;
    setIsMicMuted(nextMuted);
    setMeshMuted(nextMuted);
  }, [setMeshMuted]);

  const cleanupPeer = useCallback(
    (peerId: string) => {
      cleanupMeshPeer(peerId);
    },
    [cleanupMeshPeer]
  );

  const releaseResources = useCallback(() => {
    cleanupMeshAll();
  }, [cleanupMeshAll]);

  const sendMessage = useCallback((message: SocketMessage | object) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
    }
  }, []);

  const sendOfferToPeer = useCallback(
    async (peerId: string) => {
      await sendMeshOffer(peerId);
    },
    [sendMeshOffer]
  );

  const handleRoomOffer = useCallback(
    async (msg: RoomOfferMessage) => {
      await handleMeshOffer(msg);
    },
    [handleMeshOffer]
  );

  const handleRoomAnswer = useCallback(
    async (msg: RoomAnswerMessage) => {
      await handleMeshAnswer(msg);
    },
    [handleMeshAnswer]
  );

  const handleRoomIceCandidate = useCallback(
    async (msg: RoomIceMessage) => {
      await handleMeshIce(msg);
    },
    [handleMeshIce]
  );

  const leaveRoom = useCallback(() => {
    if (statusRef.current === 'left') return;
    setStatus('left');
    sendMessage({ type: 'leave-room' });
    releaseResources();
    socketRef.current?.close(1000, 'Guest left');
  }, [releaseResources, sendMessage, setStatus]);

  useEffect(() => {
    if (tokenError || !guestToken) {
      statusRef.current = 'error';
      return;
    }

    const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8080/ws';
    const socket = new WebSocket(`${WS_URL}?guest=${encodeURIComponent(guestToken)}`);
    socketRef.current = socket;

    socket.onopen = () => {
      setStatus('joining');
    };

    socket.onmessage = async (event) => {
      let data: unknown;
      try {
        data = JSON.parse(event.data) as unknown;
      } catch {
        return;
      }

      if (!data || typeof data !== 'object' || !('type' in data)) return;
      const msg = data as { type: string; [key: string]: unknown };

      if (msg.type === 'presence-check') {
        socket.send(JSON.stringify({ type: 'presence-pong' }));
        return;
      }

      const typedMsg = msg as SocketMessage;
      switch (typedMsg.type) {
        case 'room-joined': {
          const payload = typedMsg as RoomJoinedMessage;
          if (!payload.roomId || !Array.isArray(payload.users)) return;
          setStatus('joined');
          setError(null);
          setRoomId(payload.roomId);
          roomIdRef.current = payload.roomId;
          if (payload.selfId) selfIdRef.current = payload.selfId;
          setMembers(payload.users);

          const selfId = selfIdRef.current;
          const peers = payload.users.filter((id) => !selfId || id !== selfId);
          if (peers.length > 0) {
            try {
              await ensureMeshLocalStream();
            } catch (err) {
              console.error('Failed to access microphone:', err);
              setError('rooms.errors.micDenied');
              setStatus('error');
              sendMessage({ type: 'leave-room' });
              releaseResources();
              socketRef.current?.close(1000, 'Mic denied');
              return;
            }

            for (const peerId of peers) {
              try {
                await sendOfferToPeer(peerId);
              } catch (err) {
                console.error('Failed to send offer:', err);
              }
            }
          }
          break;
        }
        case 'room-user-joined': {
          const payload = typedMsg as RoomUserJoinedMessage;
          if (!payload.roomId || payload.roomId !== roomIdRef.current) return;
          if (!payload.userId) return;
          setMembers((prev) => (prev.includes(payload.userId) ? prev : [...prev, payload.userId]));

          const selfId = selfIdRef.current;
          if (selfId && payload.userId === selfId) return;
          try {
            await ensureMeshLocalStream();
            await sendOfferToPeer(payload.userId);
          } catch (err) {
            console.error('Failed to handle peer join:', err);
            setError('rooms.errors.micDenied');
            setStatus('error');
            sendMessage({ type: 'leave-room' });
            releaseResources();
            socketRef.current?.close(1000, 'Mic denied');
          }
          break;
        }
        case 'room-user-left': {
          const payload = typedMsg as RoomUserLeftMessage;
          if (!payload.roomId || payload.roomId !== roomIdRef.current) return;
          if (!payload.userId) return;
          setMembers((prev) => prev.filter((id) => id !== payload.userId));
          cleanupPeer(payload.userId);
          break;
        }
        case 'room-offer': {
          const payload = typedMsg as RoomOfferMessage;
          if (payload.roomId !== roomIdRef.current) return;
          try {
            await handleRoomOffer(payload);
          } catch (err) {
            console.error('Room offer error:', err);
          }
          break;
        }
        case 'room-answer': {
          const payload = typedMsg as RoomAnswerMessage;
          if (payload.roomId !== roomIdRef.current) return;
          try {
            await handleRoomAnswer(payload);
          } catch (err) {
            console.error('Room answer error:', err);
          }
          break;
        }
        case 'room-ice': {
          const payload = typedMsg as RoomIceMessage;
          if (payload.roomId !== roomIdRef.current) return;
          try {
            await handleRoomIceCandidate(payload);
          } catch (err) {
            console.error('Room ICE error:', err);
          }
          break;
        }
        case 'error': {
          const errorMessage = (typedMsg as { message?: string }).message ?? '';
          switch (errorMessage) {
            case 'Room not found':
              setError('rooms.errors.notFound');
              break;
            case 'Room password required':
              setError('rooms.errors.passwordRequired');
              break;
            case 'Invalid room password':
              setError('rooms.errors.invalidPassword');
              break;
            case 'Room is full':
              setError('rooms.errors.roomFull');
              break;
            case 'Room inactive':
              setError('rooms.errors.inactive');
              break;
            default:
              setError('rooms.errors.server');
          }
          setStatus('error');
          break;
        }
      }
    };

    socket.onerror = () => {
      if (statusRef.current !== 'left') {
        setStatus('error');
        setError('guest.errors.connection');
      }
    };

    socket.onclose = () => {
      socketRef.current = null;
      if (statusRef.current !== 'left' && statusRef.current !== 'error') {
        setStatus('error');
        setError('guest.errors.connection');
      }
      releaseResources();
    };

    return () => {
      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close(1000, 'Unmount');
      }
      socketRef.current = null;
      releaseResources();
    };
  }, [
    guestToken,
    tokenError,
    ensureMeshLocalStream,
    sendOfferToPeer,
    handleRoomOffer,
    handleRoomAnswer,
    handleRoomIceCandidate,
    cleanupPeer,
    leaveRoom,
    releaseResources,
    sendMessage,
    setStatus,
  ]);

  useEffect(() => {
    return () => {
      releaseResources();
    };
  }, [releaseResources]);

  const effectiveStatus = tokenError ? 'error' : status;
  const effectiveError = tokenError ?? error;

  return {
    status: effectiveStatus,
    roomId,
    members,
    error: effectiveError,
    isMicMuted,
    toggleMicMute,
    leaveRoom,
  };
};
