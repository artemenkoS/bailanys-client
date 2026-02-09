import { useCallback, useRef, useState } from 'react';

import type { SignalingMessage } from '../../../types/signaling';

const RTC_CONFIGURATION: RTCConfiguration = {
  iceServers: [
    {
      urls: ['turns:194.32.140.234.sslip.io:5349?transport=tcp', 'turn:194.32.140.234:3478?transport=udp'],
      username: 'bailanys',
      credential: 'Astana20206!',
    },
  ],
  iceTransportPolicy: 'relay',
};

export const useWebRTC = (sendMessage: (msg: SignalingMessage) => void) => {
  const [isCalling, setIsCalling] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);

  const pc = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const remoteAudio = useRef<HTMLAudioElement | null>(null);
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);
  const audioTransceiver = useRef<RTCRtpTransceiver | null>(null);
  const isMicMutedRef = useRef(false);

  const ensureRemoteAudio = useCallback(() => {
    if (!remoteAudio.current) {
      const a = new Audio();
      a.autoplay = true;
      a.muted = false;
      a.setAttribute('playsinline', 'true');
      document.body.appendChild(a);
      remoteAudio.current = a;
    }
    return remoteAudio.current!;
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

  const getMicStream = useCallback(async () => {
    return navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });
  }, []);

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
    applyMuteState(localStream.current, nextMuted);
  }, [applyMuteState]);

  const cleanup = useCallback(() => {
    pc.current?.close();
    localStream.current?.getTracks().forEach((t) => t.stop());
    pc.current = null;
    localStream.current = null;
    audioTransceiver.current = null;
    pendingCandidates.current = [];
    setIsCalling(false);
    isMicMutedRef.current = false;
    setIsMicMuted(false);
  }, []);

  const initPeerConnection = useCallback(
    (targetId: string, createLocalAudioTransceiver = false) => {
      const peer = new RTCPeerConnection(RTC_CONFIGURATION);
      pc.current = peer;

      if (createLocalAudioTransceiver) {
        audioTransceiver.current = peer.addTransceiver('audio', {
          direction: 'sendrecv',
        });
      }

      peer.onicecandidate = (e) => {
        if (e.candidate) {
          sendMessage({
            type: 'ice-candidate',
            to: targetId,
            candidate: e.candidate,
          });
        }
      };

      peer.ontrack = (e) => {
        const a = ensureRemoteAudio();
        const [stream] = e.streams || [];
        a.srcObject = stream ?? new MediaStream([e.track]);
        a.play().catch(() => {});
      };

      return peer;
    },
    [sendMessage, ensureRemoteAudio]
  );

  const attachLocalAudio = useCallback(async (peer: RTCPeerConnection, stream: MediaStream) => {
    const track = stream.getAudioTracks()[0];
    if (!track) return;

    const transceiver = audioTransceiver.current;
    if (transceiver) {
      if (transceiver.direction !== 'sendrecv') {
        transceiver.direction = 'sendrecv';
      }
      await transceiver.sender.replaceTrack(track);
      return;
    }

    peer.addTrack(track, stream);
  }, []);

  const startAudioCall = useCallback(
    async (targetId: string) => {
      setIsCalling(true);
      const peer = initPeerConnection(targetId, true);

      localStream.current = await getMicStream();
      applyMuteState(localStream.current, isMicMutedRef.current);

      await attachLocalAudio(peer, localStream.current);

      await applyLowLatencySender(peer);

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);

      sendMessage({
        type: 'offer',
        to: targetId,
        callType: 'audio',
        offer,
      });
    },
    [initPeerConnection, sendMessage, getMicStream, applyLowLatencySender, attachLocalAudio, applyMuteState]
  );

  const handleRemoteOffer = useCallback(
    async (from: string, offer: RTCSessionDescriptionInit) => {
      const peer = initPeerConnection(from);

      await peer.setRemoteDescription(offer);
      const remoteAudio = peer.getTransceivers().find((t) => t.receiver?.track?.kind === 'audio');
      if (remoteAudio) {
        remoteAudio.direction = 'sendrecv';
        audioTransceiver.current = remoteAudio;
      }

      localStream.current = await getMicStream();
      applyMuteState(localStream.current, isMicMutedRef.current);

      await attachLocalAudio(peer, localStream.current);

      await applyLowLatencySender(peer);

      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);

      sendMessage({
        type: 'answer',
        to: from,
        answer,
      });

      for (const c of pendingCandidates.current) {
        await peer.addIceCandidate(c);
      }
      pendingCandidates.current = [];
    },
    [initPeerConnection, sendMessage, getMicStream, applyLowLatencySender, attachLocalAudio, applyMuteState]
  );

  const handleRemoteAnswer = useCallback(async (answer: RTCSessionDescriptionInit) => {
    if (!pc.current) return;
    await pc.current.setRemoteDescription(answer);
    for (const c of pendingCandidates.current) {
      await pc.current.addIceCandidate(c);
    }
    pendingCandidates.current = [];
  }, []);

  const handleRemoteIceCandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    if (pc.current?.remoteDescription) {
      await pc.current.addIceCandidate(candidate);
    } else {
      pendingCandidates.current.push(candidate);
    }
  }, []);

  return {
    startAudioCall,
    handleRemoteOffer,
    handleRemoteAnswer,
    handleRemoteIceCandidate,
    cleanup,
    pc,
    localStream,
    isCalling,
    isMicMuted,
    toggleMicMute,
  };
};
