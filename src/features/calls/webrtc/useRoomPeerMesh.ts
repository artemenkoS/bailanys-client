import { useCallback, useRef } from 'react';

import type { RoomAnswerMessage, RoomIceMessage, RoomOfferMessage } from '../../../types/signaling';
import {
  applyLowLatencySender,
  applyMuteState,
  attachLocalAudio,
  createPendingIceManager,
  createRemoteAudioManager,
  getMicStream,
} from './webrtcUtils';

type RoomPeerMeshOptions = {
  getRtcConfiguration: () => Promise<RTCConfiguration>;
  sendMessage: (msg: RoomOfferMessage | RoomAnswerMessage | RoomIceMessage) => void;
  roomIdRef: React.MutableRefObject<string | null>;
  getInitialVolume?: (peerId: string) => number | null | undefined;
};

export const useRoomPeerMesh = (options: RoomPeerMeshOptions) => {
  const { getRtcConfiguration, sendMessage, roomIdRef, getInitialVolume } = options;
  const localStreamRef = useRef<MediaStream | null>(null);
  const isMutedRef = useRef(false);
  const peerConnectionsRef = useRef(new Map<string, RTCPeerConnection>());
  const pendingIceRef = useRef(createPendingIceManager());
  const audioManagerRef = useRef(createRemoteAudioManager());

  const ensureRemoteAudio = useCallback(
    (peerId: string) => {
      const audio = audioManagerRef.current.ensure(peerId);
      const initialVolume = getInitialVolume?.(peerId);
      if (typeof initialVolume === 'number') {
        audio.volume = initialVolume;
      }
      return audio;
    },
    [getInitialVolume]
  );

  const ensureLocalStream = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current;
    const stream = await getMicStream();
    localStreamRef.current = stream;
    applyMuteState(stream, isMutedRef.current);
    return stream;
  }, []);

  const setMuted = useCallback((muted: boolean) => {
    isMutedRef.current = muted;
    applyMuteState(localStreamRef.current, muted);
  }, []);

  const attachLocalAudioToPeer = useCallback(async (peer: RTCPeerConnection) => {
    const stream = localStreamRef.current;
    if (!stream) return;
    await attachLocalAudio(peer, stream);
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
    [ensureRemoteAudio, getRtcConfiguration, roomIdRef, sendMessage]
  );

  const sendOfferToPeer = useCallback(
    async (peerId: string) => {
      const currentRoomId = roomIdRef.current;
      if (!currentRoomId) return;
      const peer = await createPeerConnection(peerId);
      await ensureLocalStream();
      await attachLocalAudioToPeer(peer);
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
    [attachLocalAudioToPeer, createPeerConnection, ensureLocalStream, roomIdRef, sendMessage]
  );

  const handleRoomOffer = useCallback(
    async (msg: RoomOfferMessage) => {
      if (!msg.from) return;
      const peer = await createPeerConnection(msg.from);

      await peer.setRemoteDescription(msg.offer);
      await ensureLocalStream();
      await attachLocalAudioToPeer(peer);
      await applyLowLatencySender(peer);

      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);

      sendMessage({
        type: 'room-answer',
        roomId: msg.roomId,
        to: msg.from,
        answer,
      });

      const pending = pendingIceRef.current.drain(msg.from);
      for (const candidate of pending) {
        await peer.addIceCandidate(candidate);
      }
    },
    [attachLocalAudioToPeer, createPeerConnection, ensureLocalStream, sendMessage]
  );

  const handleRoomAnswer = useCallback(async (msg: RoomAnswerMessage) => {
    if (!msg.from) return;
    const peer = peerConnectionsRef.current.get(msg.from);
    if (!peer) return;
    await peer.setRemoteDescription(msg.answer);

    const pending = pendingIceRef.current.drain(msg.from);
    for (const candidate of pending) {
      await peer.addIceCandidate(candidate);
    }
  }, []);

  const handleRoomIce = useCallback(async (msg: RoomIceMessage) => {
    if (!msg.from) return;
    const peer = peerConnectionsRef.current.get(msg.from);
    if (peer?.remoteDescription) {
      await peer.addIceCandidate(msg.candidate);
      return;
    }
    pendingIceRef.current.push(msg.from, msg.candidate);
  }, []);

  const cleanupPeer = useCallback((peerId: string) => {
    const peer = peerConnectionsRef.current.get(peerId);
    if (peer) {
      peer.close();
      peerConnectionsRef.current.delete(peerId);
    }
    pendingIceRef.current.clear(peerId);
    audioManagerRef.current.cleanup(peerId);
  }, []);

  const cleanupAll = useCallback(() => {
    for (const peerId of peerConnectionsRef.current.keys()) {
      cleanupPeer(peerId);
    }
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    pendingIceRef.current.clearAll();
    audioManagerRef.current.cleanupAll();
  }, [cleanupPeer]);

  const setPeerVolume = useCallback((peerId: string, volume: number) => {
    audioManagerRef.current.setVolume(peerId, volume);
  }, []);

  return {
    ensureLocalStream,
    setMuted,
    sendOfferToPeer,
    handleRoomOffer,
    handleRoomAnswer,
    handleRoomIce,
    cleanupPeer,
    cleanupAll,
    setPeerVolume,
  };
};
