import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';

import { apiService } from '../../../services/api.service';
import { useAuthStore } from '../../../stores/authStore';
import { useRoomCallStore } from '../../../stores/roomCallStore';
import type { CallHistoryStatus } from '../../../types/callHistory';
import type {
  RoomAnswerMessage,
  RoomIceMessage,
  RoomJoinedMessage,
  RoomOfferMessage,
  RoomUserJoinedMessage,
  RoomUserLeftMessage,
  SocketMessage,
} from '../../../types/signaling';
import { useRtcConfiguration } from './useRtcConfiguration';
import { useSocket } from './useSocket';

export type RoomCallStatus = 'idle' | 'joining' | 'joined';

export const useRoomCallManager = () => {
  const { sendMessage, socket } = useSocket();
  const userId = useAuthStore((state) => state.user?.id);
  const accessToken = useAuthStore((state) => state.session?.access_token);
  const { getRtcConfiguration } = useRtcConfiguration();
  const queryClient = useQueryClient();

  const status = useRoomCallStore((state) => state.status);
  const roomId = useRoomCallStore((state) => state.roomId);
  const members = useRoomCallStore((state) => state.members);
  const error = useRoomCallStore((state) => state.error);
  const isMicMuted = useRoomCallStore((state) => state.isMicMuted);
  const peerVolumes = useRoomCallStore((state) => state.peerVolumes);
  const setRoomState = useRoomCallStore((state) => state.setState);
  const setRoomActions = useRoomCallStore((state) => state.setActions);
  const resetRoomStore = useRoomCallStore((state) => state.reset);

  const setStatus = useCallback(
    (next: RoomCallStatus) => {
      setRoomState({ status: next });
    },
    [setRoomState]
  );

  const setRoomId = useCallback(
    (next: string | null) => {
      setRoomState({ roomId: next });
    },
    [setRoomState]
  );

  const setMembers = useCallback(
    (next: string[] | ((prev: string[]) => string[])) => {
      if (typeof next === 'function') {
        setRoomState((state) => ({ members: next(state.members) }));
        return;
      }
      setRoomState({ members: next });
    },
    [setRoomState]
  );

  const setError = useCallback(
    (next: string | null) => {
      setRoomState({ error: next });
    },
    [setRoomState]
  );

  const setIsMicMuted = useCallback(
    (next: boolean) => {
      setRoomState({ isMicMuted: next });
    },
    [setRoomState]
  );

  const setPeerVolumes = useCallback(
    (next: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)) => {
      if (typeof next === 'function') {
        setRoomState((state) => ({ peerVolumes: next(state.peerVolumes) }));
        return;
      }
      setRoomState({ peerVolumes: next });
    },
    [setRoomState]
  );

  const roomIdRef = useRef<string | null>(null);
  const isMicMutedRef = useRef(false);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef(new Map<string, RTCPeerConnection>());
  const pendingCandidatesRef = useRef(new Map<string, RTCIceCandidateInit[]>());
  const remoteAudioRef = useRef(new Map<string, HTMLAudioElement>());
  const peerVolumesRef = useRef(new Map<string, number>());
  const roomStartedAtRef = useRef<number | null>(null);
  const roomLoggedRef = useRef(false);

  useEffect(() => {
    roomIdRef.current = roomId;
  }, [roomId]);

  const applyMuteState = useCallback((stream: MediaStream | null, muted: boolean) => {
    if (!stream) return;
    for (const track of stream.getAudioTracks()) {
      track.enabled = !muted;
    }
  }, []);

  const toggleMicMute = useCallback(() => {
    const nextMuted = !isMicMutedRef.current;
    isMicMutedRef.current = nextMuted;
    setIsMicMuted(nextMuted);
    applyMuteState(localStreamRef.current, nextMuted);
  }, [applyMuteState, setIsMicMuted]);

  const ensureRemoteAudio = useCallback((peerId: string) => {
    const existing = remoteAudioRef.current.get(peerId);
    if (existing) return existing;
    const audio = new Audio();
    audio.autoplay = true;
    audio.muted = false;
    const storedVolume = peerVolumesRef.current.get(peerId);
    audio.volume = typeof storedVolume === 'number' ? storedVolume : 1;
    audio.setAttribute('playsinline', 'true');
    document.body.appendChild(audio);
    remoteAudioRef.current.set(peerId, audio);
    return audio;
  }, []);

  const cleanupRemoteAudio = useCallback((peerId: string) => {
    const audio = remoteAudioRef.current.get(peerId);
    if (!audio) return;
    audio.srcObject = null;
    audio.remove();
    remoteAudioRef.current.delete(peerId);
  }, []);

  const applyLowLatencySender = useCallback(async (peer: RTCPeerConnection) => {
    const sender = peer.getSenders().find((s) => s.track?.kind === 'audio');
    if (!sender) return;

    const p = sender.getParameters();
    p.encodings = p.encodings?.length ? p.encodings : [{}];
    p.encodings[0].priority = 'high';
    p.encodings[0].networkPriority = 'high';

    try {
      await sender.setParameters(p);
    } catch {
      // ignore
    }
  }, []);

  const ensureLocalStream = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: false,
      },
    });
    localStreamRef.current = stream;
    applyMuteState(stream, isMicMutedRef.current);
    return stream;
  }, [applyMuteState]);

  const attachLocalAudio = useCallback(async (peer: RTCPeerConnection) => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const track = stream.getAudioTracks()[0];
    if (!track) return;
    const existing = peer.getSenders().find((s) => s.track?.kind === 'audio');
    if (existing) {
      await existing.replaceTrack(track);
      return;
    }
    peer.addTrack(track, stream);
  }, []);

  const createPeerConnection = useCallback(
    async (peerId: string) => {
      const existing = peerConnectionsRef.current.get(peerId);
      if (existing) return existing;

      const config = await getRtcConfiguration();
      const existingAfter = peerConnectionsRef.current.get(peerId);
      if (existingAfter) return existingAfter;

      const peer = new RTCPeerConnection(config);
      peerConnectionsRef.current.set(peerId, peer);

      peer.onicecandidate = (event) => {
        if (!event.candidate) return;
        const currentRoomId = roomIdRef.current;
        if (!currentRoomId) return;
        sendMessage({
          type: 'room-ice',
          roomId: currentRoomId,
          to: peerId,
          candidate: event.candidate,
        });
      };

      peer.ontrack = (event) => {
        const audio = ensureRemoteAudio(peerId);
        const [stream] = event.streams || [];
        audio.srcObject = stream ?? new MediaStream([event.track]);
        audio.play().catch(() => {});
      };

      return peer;
    },
    [ensureRemoteAudio, sendMessage, getRtcConfiguration]
  );

  const cleanupPeer = useCallback(
    (peerId: string) => {
      const peer = peerConnectionsRef.current.get(peerId);
      if (peer) {
        peer.close();
        peerConnectionsRef.current.delete(peerId);
      }
      pendingCandidatesRef.current.delete(peerId);
      cleanupRemoteAudio(peerId);
      peerVolumesRef.current.delete(peerId);
      setPeerVolumes((prev) => {
        if (!(peerId in prev)) return prev;
        const next = { ...prev };
        delete next[peerId];
        return next;
      });
    },
    [cleanupRemoteAudio, setPeerVolumes]
  );

  const releaseResources = useCallback(() => {
    for (const peerId of peerConnectionsRef.current.keys()) {
      cleanupPeer(peerId);
    }
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
  }, [cleanupPeer]);

  const cleanupRoom = useCallback(() => {
    releaseResources();
    roomIdRef.current = null;
    setRoomId(null);
    setMembers([]);
    setStatus('idle');
    setError(null);
    isMicMutedRef.current = false;
    setIsMicMuted(false);
    roomStartedAtRef.current = null;
    roomLoggedRef.current = false;
    peerVolumesRef.current.clear();
    setPeerVolumes({});
  }, [releaseResources, setRoomId, setMembers, setStatus, setError, setIsMicMuted, setPeerVolumes]);

  const setPeerVolume = useCallback(
    (peerId: string, volume: number) => {
      const next = Math.min(1, Math.max(0, volume));
      peerVolumesRef.current.set(peerId, next);
      setPeerVolumes((prev) => (prev[peerId] === next ? prev : { ...prev, [peerId]: next }));
      const audio = remoteAudioRef.current.get(peerId);
      if (audio) audio.volume = next;
    },
    [setPeerVolumes]
  );

  const persistRoomHistory = useCallback(
    (status: CallHistoryStatus = 'completed') => {
      if (roomLoggedRef.current) return;
      const currentRoomId = roomIdRef.current;
      const startedAt = roomStartedAtRef.current;
      if (!currentRoomId || !startedAt) return;
      if (!accessToken) return;

      const endedAtMs = Date.now();
      const durationSeconds = Math.max(0, Math.floor((endedAtMs - startedAt) / 1000));
      const startedAtIso = new Date(startedAt).toISOString();
      const endedAtIso = new Date(endedAtMs).toISOString();

      roomLoggedRef.current = true;

      void apiService
        .createCallHistory(accessToken, {
          roomId: currentRoomId,
          direction: 'outgoing',
          status,
          durationSeconds,
          callType: 'audio',
          startedAt: startedAtIso,
          endedAt: endedAtIso,
        })
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['call-history'] });
        })
        .catch((error) => {
          roomLoggedRef.current = false;
          console.error('Failed to save room call history:', error);
        });
    },
    [accessToken, queryClient]
  );

  const sendOfferToPeer = useCallback(
    async (peerId: string, currentRoomId: string) => {
      const peer = await createPeerConnection(peerId);
      await ensureLocalStream();
      await attachLocalAudio(peer);
      await applyLowLatencySender(peer);

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);

      sendMessage({
        type: 'room-offer',
        roomId: currentRoomId,
        to: peerId,
        offer,
        callType: 'audio',
      });
    },
    [createPeerConnection, ensureLocalStream, attachLocalAudio, applyLowLatencySender, sendMessage]
  );

  const handleRoomOffer = useCallback(
    async (msg: RoomOfferMessage) => {
      if (!msg.from) return;
      const peer = await createPeerConnection(msg.from);

      await peer.setRemoteDescription(msg.offer);
      await ensureLocalStream();
      await attachLocalAudio(peer);
      await applyLowLatencySender(peer);

      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);

      sendMessage({
        type: 'room-answer',
        roomId: msg.roomId,
        to: msg.from,
        answer,
      });

      const pending = pendingCandidatesRef.current.get(msg.from) || [];
      for (const candidate of pending) {
        await peer.addIceCandidate(candidate);
      }
      pendingCandidatesRef.current.delete(msg.from);
    },
    [createPeerConnection, ensureLocalStream, attachLocalAudio, applyLowLatencySender, sendMessage]
  );

  const handleRoomAnswer = useCallback(async (msg: RoomAnswerMessage) => {
    if (!msg.from) return;
    const peer = peerConnectionsRef.current.get(msg.from);
    if (!peer) return;
    await peer.setRemoteDescription(msg.answer);

    const pending = pendingCandidatesRef.current.get(msg.from) || [];
    for (const candidate of pending) {
      await peer.addIceCandidate(candidate);
    }
    pendingCandidatesRef.current.delete(msg.from);
  }, []);

  const handleRoomIceCandidate = useCallback(async (msg: RoomIceMessage) => {
    if (!msg.from) return;
    const peer = peerConnectionsRef.current.get(msg.from);
    if (peer?.remoteDescription) {
      await peer.addIceCandidate(msg.candidate);
      return;
    }
    const pending = pendingCandidatesRef.current.get(msg.from) || [];
    pending.push(msg.candidate);
    pendingCandidatesRef.current.set(msg.from, pending);
  }, []);

  const joinRoom = useCallback(
    (nextRoomId: string, options?: { password?: string }) => {
      const trimmed = nextRoomId.trim();
      if (!trimmed) {
        setError('rooms.errors.roomIdRequired');
        return;
      }
      if (roomIdRef.current || status === 'joining') return;
      setError(null);
      setStatus('joining');
      sendMessage({
        type: 'join-room',
        roomId: trimmed,
        password: options?.password,
      });
    },
    [sendMessage, setError, setStatus, status]
  );

  const createRoom = useCallback(
    (nextRoomId: string, options: { name: string; isPrivate?: boolean; password?: string }) => {
      const trimmed = nextRoomId.trim();
      if (!trimmed) {
        setError('rooms.errors.roomIdRequired');
        return;
      }
      if (roomIdRef.current || status === 'joining') return;
      setError(null);
      setStatus('joining');
      sendMessage({
        type: 'join-room',
        roomId: trimmed,
        create: true,
        name: options.name,
        isPrivate: options.isPrivate,
        password: options.password,
      });
    },
    [sendMessage, setError, setStatus, status]
  );

  const leaveRoom = useCallback(
    (historyStatus: CallHistoryStatus = 'completed') => {
      if (status === 'idle' && !roomIdRef.current) return;
      persistRoomHistory(historyStatus);
      sendMessage({ type: 'leave-room' });
      cleanupRoom();
    },
    [cleanupRoom, persistRoomHistory, sendMessage, status]
  );

  useEffect(() => {
    if (!socket) return;

    const handleMessage = async (event: MessageEvent) => {
      let msg: SocketMessage;
      try {
        msg = JSON.parse(event.data) as SocketMessage;
      } catch {
        return;
      }

      switch (msg.type) {
        case 'room-joined': {
          const payload = msg as RoomJoinedMessage;
          if (!payload.roomId || !Array.isArray(payload.users)) return;
          setError(null);
          roomIdRef.current = payload.roomId;
          setRoomId(payload.roomId);
          setStatus('joined');
          setMembers(payload.users);
          roomStartedAtRef.current = Date.now();
          roomLoggedRef.current = false;

          if (!userId) {
            sendMessage({ type: 'leave-room' });
            cleanupRoom();
            setError('rooms.errors.server');
            return;
          }

          const peers = payload.users.filter((id) => id !== userId);
          if (peers.length > 0) {
            try {
              await ensureLocalStream();
            } catch (err) {
              console.error('Failed to access microphone:', err);
              leaveRoom('failed');
              setError('rooms.errors.micDenied');
              return;
            }

            for (const peerId of peers) {
              try {
                await sendOfferToPeer(peerId, payload.roomId);
              } catch (err) {
                console.error('Failed to send offer:', err);
              }
            }
          }
          break;
        }
        case 'room-user-joined': {
          const payload = msg as RoomUserJoinedMessage;
          if (!payload.roomId || payload.roomId !== roomIdRef.current) return;
          if (!payload.userId) return;
          setMembers((prev) => (prev.includes(payload.userId) ? prev : [...prev, payload.userId]));
          break;
        }
        case 'room-user-left': {
          const payload = msg as RoomUserLeftMessage;
          if (!payload.roomId || payload.roomId !== roomIdRef.current) return;
          if (!payload.userId) return;
          setMembers((prev) => prev.filter((id) => id !== payload.userId));
          cleanupPeer(payload.userId);
          break;
        }
        case 'room-offer': {
          const payload = msg as RoomOfferMessage;
          if (payload.roomId !== roomIdRef.current) return;
          try {
            await handleRoomOffer(payload);
          } catch (err) {
            console.error('Room offer error:', err);
          }
          break;
        }
        case 'room-answer': {
          const payload = msg as RoomAnswerMessage;
          if (payload.roomId !== roomIdRef.current) return;
          try {
            await handleRoomAnswer(payload);
          } catch (err) {
            console.error('Room answer error:', err);
          }
          break;
        }
        case 'room-ice': {
          const payload = msg as RoomIceMessage;
          if (payload.roomId !== roomIdRef.current) return;
          try {
            await handleRoomIceCandidate(payload);
          } catch (err) {
            console.error('Room ICE error:', err);
          }
          break;
        }
        case 'error': {
          switch (msg.message) {
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
            case 'Room name required':
              setError('rooms.errors.nameRequired');
              break;
            case 'Room privacy unsupported':
              setError('rooms.errors.privacyUnsupported');
              break;
            default:
              setError('rooms.errors.server');
          }
          if (status === 'joining') setStatus('idle');
          break;
        }
      }
    };

    const handleClose = () => {
      if (!roomIdRef.current) return;
      persistRoomHistory('failed');
      cleanupRoom();
    };

    socket.addEventListener('message', handleMessage);
    socket.addEventListener('close', handleClose);
    socket.addEventListener('error', handleClose);
    return () => {
      socket.removeEventListener('message', handleMessage);
      socket.removeEventListener('close', handleClose);
      socket.removeEventListener('error', handleClose);
    };
  }, [
    socket,
    userId,
    ensureLocalStream,
    sendOfferToPeer,
    handleRoomOffer,
    handleRoomAnswer,
    handleRoomIceCandidate,
    sendMessage,
    cleanupPeer,
    cleanupRoom,
    leaveRoom,
    persistRoomHistory,
    setError,
    setMembers,
    setRoomId,
    setStatus,
    status,
  ]);

  useEffect(() => {
    setRoomActions({
      joinRoom,
      createRoom,
      leaveRoom,
      toggleMicMute,
      setPeerVolume,
    });
  }, [setRoomActions, joinRoom, createRoom, leaveRoom, toggleMicMute, setPeerVolume]);

  useEffect(() => {
    return () => {
      resetRoomStore();
    };
  }, [resetRoomStore]);

  useEffect(() => {
    return () => {
      releaseResources();
    };
  }, [releaseResources]);

  return {
    status,
    roomId,
    members,
    error,
    isMicMuted,
    peerVolumes,
    setPeerVolume,
    toggleMicMute,
    joinRoom,
    createRoom,
    leaveRoom,
  };
};
