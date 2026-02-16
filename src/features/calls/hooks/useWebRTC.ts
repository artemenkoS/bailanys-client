import { useCallback, useRef, useState } from 'react';

import type { SignalingMessage } from '../../../types/signaling';
import { applyLowLatencySender, applyMuteState, getMicStream } from '../webrtc/webrtcUtils';
import { useRtcConfiguration } from './useRtcConfiguration';

export const useWebRTC = (sendMessage: (msg: SignalingMessage) => void) => {
  const [isCalling, setIsCalling] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [localScreenStream, setLocalScreenStream] = useState<MediaStream | null>(null);
  const [remoteScreenStream, setRemoteScreenStream] = useState<MediaStream | null>(null);

  const { getRtcConfiguration } = useRtcConfiguration();
  const pc = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const screenStream = useRef<MediaStream | null>(null);
  const targetIdRef = useRef<string | null>(null);
  const placeholderCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const placeholderStreamRef = useRef<MediaStream | null>(null);
  const placeholderTrackRef = useRef<MediaStreamTrack | null>(null);
  const remoteAudio = useRef<HTMLAudioElement | null>(null);
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);
  const audioTransceiver = useRef<RTCRtpTransceiver | null>(null);
  const videoTransceiver = useRef<RTCRtpTransceiver | null>(null);
  const isMicMutedRef = useRef(false);
  const isScreenSharingRef = useRef(false);
  const remoteVideoTrackRef = useRef<MediaStreamTrack | null>(null);
  const remoteScreenSharePendingRef = useRef(false);
  const remoteScreenShareActiveRef = useRef(false);

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

  const clearRemoteScreen = useCallback(() => {
    remoteVideoTrackRef.current = null;
    setRemoteScreenStream(null);
  }, []);

  const handleRemoteScreenShare = useCallback((action: 'started' | 'stopped') => {
    if (action === 'started') {
      remoteScreenShareActiveRef.current = true;
      remoteScreenSharePendingRef.current = true;
      const track = remoteVideoTrackRef.current;
      if (track && track.readyState !== 'ended') {
        setRemoteScreenStream(new MediaStream([track]));
        remoteScreenSharePendingRef.current = false;
      }
      return;
    }
    remoteScreenShareActiveRef.current = false;
    remoteScreenSharePendingRef.current = false;
    setRemoteScreenStream(null);
  }, []);

  const sendScreenShareSignal = useCallback(
    (action: 'started' | 'stopped') => {
      const targetId = targetIdRef.current;
      if (!targetId) return;
      sendMessage({ type: 'screen-share', to: targetId, action });
    },
    [sendMessage]
  );

  const ensurePlaceholderTrack = useCallback(() => {
    const existing = placeholderTrackRef.current;
    if (existing && existing.readyState === 'live') return existing;

    const canvas = placeholderCanvasRef.current ?? document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    const stream = canvas.captureStream(1);
    const track = stream.getVideoTracks()[0];
    if (track) {
      track.enabled = false;
    }

    placeholderCanvasRef.current = canvas;
    placeholderStreamRef.current = stream;
    placeholderTrackRef.current = track ?? null;

    return track ?? null;
  }, []);

  const toggleMicMute = useCallback(() => {
    const nextMuted = !isMicMutedRef.current;
    isMicMutedRef.current = nextMuted;
    setIsMicMuted(nextMuted);
    applyMuteState(localStream.current, nextMuted);
  }, []);

  const stopScreenShare = useCallback(() => {
    isScreenSharingRef.current = false;
    setIsScreenSharing(false);
    if (screenStream.current) {
      screenStream.current.getTracks().forEach((track) => track.stop());
    }
    screenStream.current = null;
    setLocalScreenStream(null);

    try {
      if (videoTransceiver.current) {
        const placeholder = ensurePlaceholderTrack();
        void videoTransceiver.current.sender.replaceTrack(placeholder);
      }
    } catch {
      // ignore
    }
    if (pc.current && pc.current.connectionState !== 'closed') {
      sendScreenShareSignal('stopped');
    }
  }, [ensurePlaceholderTrack, sendScreenShareSignal]);

  const cleanup = useCallback(() => {
    stopScreenShare();
    pc.current?.close();
    localStream.current?.getTracks().forEach((t) => t.stop());
    pc.current = null;
    localStream.current = null;
    audioTransceiver.current = null;
    videoTransceiver.current = null;
    pendingCandidates.current = [];
    setIsCalling(false);
    isMicMutedRef.current = false;
    setIsMicMuted(false);
    clearRemoteScreen();
    placeholderStreamRef.current?.getTracks().forEach((track) => track.stop());
    placeholderStreamRef.current = null;
    placeholderTrackRef.current = null;
    placeholderCanvasRef.current = null;
    targetIdRef.current = null;
  }, [clearRemoteScreen, stopScreenShare]);

  const initPeerConnection = useCallback(
    async (
      targetId: string,
      {
        createLocalAudioTransceiver = false,
        createLocalVideoTransceiver = false,
      }: { createLocalAudioTransceiver?: boolean; createLocalVideoTransceiver?: boolean } = {}
    ) => {
      const config = await getRtcConfiguration();
      const peer = new RTCPeerConnection(config);
      pc.current = peer;

      if (createLocalAudioTransceiver) {
        audioTransceiver.current = peer.addTransceiver('audio', {
          direction: 'sendrecv',
        });
      }

      if (createLocalVideoTransceiver) {
        videoTransceiver.current = peer.addTransceiver('video', {
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
        if (e.track.kind === 'audio') {
          const a = ensureRemoteAudio();
          const [stream] = e.streams || [];
          a.srcObject = stream ?? new MediaStream([e.track]);
          a.play().catch(() => {});
          return;
        }

        if (e.track.kind === 'video') {
          remoteVideoTrackRef.current = e.track;
          const [stream] = e.streams || [];
          const nextStream = stream ?? new MediaStream([e.track]);
          if (remoteScreenShareActiveRef.current || remoteScreenSharePendingRef.current || !e.track.muted) {
            setRemoteScreenStream(nextStream);
            remoteScreenSharePendingRef.current = false;
          }
          e.track.onended = () => {
            if (remoteVideoTrackRef.current === e.track) clearRemoteScreen();
          };
        }
      };

      return peer;
    },
    [sendMessage, ensureRemoteAudio, getRtcConfiguration, clearRemoteScreen]
  );

  const ensureVideoTransceiver = useCallback(() => {
    if (videoTransceiver.current) return videoTransceiver.current;
    if (!pc.current) return null;
    const existing =
      pc.current
        .getTransceivers()
        .find((t) => t.sender?.track?.kind === 'video' || t.receiver?.track?.kind === 'video') ?? null;
    videoTransceiver.current = existing;
    return existing;
  }, []);

  const attachPlaceholderVideo = useCallback(async () => {
    const transceiver = ensureVideoTransceiver();
    if (!transceiver) return;
    const placeholder = ensurePlaceholderTrack();
    if (!placeholder) return;
    if (transceiver.sender.track !== placeholder) {
      await transceiver.sender.replaceTrack(placeholder);
    }
  }, [ensurePlaceholderTrack, ensureVideoTransceiver]);

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
      targetIdRef.current = targetId;
      const peer = await initPeerConnection(targetId, {
        createLocalAudioTransceiver: true,
        createLocalVideoTransceiver: true,
      });

      localStream.current = await getMicStream();
      applyMuteState(localStream.current, isMicMutedRef.current);

      await attachLocalAudio(peer, localStream.current);
      await attachPlaceholderVideo();

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
    [
      initPeerConnection,
      sendMessage,
      attachLocalAudio,
      attachPlaceholderVideo,
    ]
  );

  const handleRemoteOffer = useCallback(
    async (from: string, offer: RTCSessionDescriptionInit) => {
      targetIdRef.current = from;
      const peer = await initPeerConnection(from);

      await peer.setRemoteDescription(offer);
      const remoteAudio = peer.getTransceivers().find((t) => t.receiver?.track?.kind === 'audio');
      if (remoteAudio) {
        remoteAudio.direction = 'sendrecv';
        audioTransceiver.current = remoteAudio;
      }
      const remoteVideo = peer.getTransceivers().find((t) => t.receiver?.track?.kind === 'video');
      if (remoteVideo) {
        remoteVideo.direction = 'sendrecv';
        videoTransceiver.current = remoteVideo;
      }

      localStream.current = await getMicStream();
      applyMuteState(localStream.current, isMicMutedRef.current);

      await attachLocalAudio(peer, localStream.current);
      await attachPlaceholderVideo();

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
    [
      initPeerConnection,
      sendMessage,
      attachLocalAudio,
      attachPlaceholderVideo,
    ]
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

  const startScreenShare = useCallback(async () => {
    if (isScreenSharingRef.current) return;
    if (!pc.current) return;

    const transceiver = ensureVideoTransceiver();

    if (!transceiver) {
      console.warn('Screen sharing is not available for this call.');
      return;
    }
    if (transceiver.direction !== 'sendrecv') {
      transceiver.direction = 'sendrecv';
    }

    if (!navigator.mediaDevices?.getDisplayMedia) {
      console.warn('Screen sharing is not supported in this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          frameRate: 30,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      const track = stream.getVideoTracks()[0];
      if (!track) return;

      screenStream.current = stream;
      isScreenSharingRef.current = true;
      setIsScreenSharing(true);
      setLocalScreenStream(stream);

      track.onended = () => {
        stopScreenShare();
      };

      await transceiver.sender.replaceTrack(track);
      sendScreenShareSignal('started');
    } catch (error) {
      console.error('Failed to start screen share:', error);
    }
  }, [ensureVideoTransceiver, sendScreenShareSignal, stopScreenShare]);

  const toggleScreenShare = useCallback(() => {
    if (isScreenSharingRef.current) {
      stopScreenShare();
    } else {
      void startScreenShare();
    }
  }, [startScreenShare, stopScreenShare]);

  return {
    startAudioCall,
    handleRemoteOffer,
    handleRemoteAnswer,
    handleRemoteIceCandidate,
    handleRemoteScreenShare,
    cleanup,
    pc,
    localStream,
    isCalling,
    isMicMuted,
    toggleMicMute,
    isScreenSharing,
    localScreenStream,
    remoteScreenStream,
    startScreenShare,
    stopScreenShare,
    toggleScreenShare,
  };
};
