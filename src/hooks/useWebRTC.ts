import { useCallback, useRef, useState } from "react";
import type { SignalingMessage } from "../types/signaling";

export const useWebRTC = (sendMessage: (msg: SignalingMessage) => void) => {
  const [isCalling, setIsCalling] = useState(false);

  const pc = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const remoteAudio = useRef<HTMLAudioElement | null>(null);
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);

  const configuration: RTCConfiguration = {
    iceServers: [
      {
        urls: [
          "turns:194.32.140.234.sslip.io:5349?transport=tcp",
          "turn:194.32.140.234:3478?transport=udp",
        ],
        username: "bailanys",
        credential: "Astana20206!",
      },
    ],
    iceTransportPolicy: "relay",
  };

  const ensureRemoteAudio = useCallback(() => {
    if (!remoteAudio.current) {
      const a = new Audio();
      a.autoplay = true;
      a.muted = false;
      a.setAttribute("playsinline", "true");
      document.body.appendChild(a);
      remoteAudio.current = a;
    }
    return remoteAudio.current!;
  }, []);

  const applyLowLatencySender = useCallback(async (peer: RTCPeerConnection) => {
    const sender = peer.getSenders().find((s) => s.track?.kind === "audio");
    if (!sender) return;

    const p = sender.getParameters();
    p.encodings = p.encodings?.length ? p.encodings : [{}];
    p.encodings[0].priority = "high";
    p.encodings[0].networkPriority = "high";

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

  const cleanup = useCallback(() => {
    pc.current?.close();
    localStream.current?.getTracks().forEach((t) => t.stop());
    pc.current = null;
    localStream.current = null;
    pendingCandidates.current = [];
    setIsCalling(false);
  }, []);

  const initPeerConnection = useCallback(
    (targetId: string) => {
      const peer = new RTCPeerConnection(configuration);
      pc.current = peer;

      peer.addTransceiver("audio", { direction: "sendrecv" });

      peer.onicecandidate = (e) => {
        if (e.candidate) {
          sendMessage({
            type: "ice-candidate",
            to: targetId,
            candidate: e.candidate,
          });
        }
      };

      peer.ontrack = (e) => {
        const a = ensureRemoteAudio();
        a.srcObject = e.streams[0];
        a.play().catch(() => {});
      };

      return peer;
    },
    [sendMessage, ensureRemoteAudio],
  );

  const startAudioCall = useCallback(
    async (targetId: string) => {
      setIsCalling(true);

      const peer = initPeerConnection(targetId);

      localStream.current = await getMicStream();

      localStream.current.getTracks().forEach((t) => {
        peer.addTrack(t, localStream.current!);
      });

      await applyLowLatencySender(peer);

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);

      sendMessage({
        type: "offer",
        to: targetId,
        callType: "audio",
        offer,
      });
    },
    [initPeerConnection, sendMessage, getMicStream, applyLowLatencySender],
  );

  const handleRemoteOffer = useCallback(
    async (from: string, offer: RTCSessionDescriptionInit) => {
      const peer = initPeerConnection(from);

      await peer.setRemoteDescription(offer);

      localStream.current = await getMicStream();

      localStream.current.getTracks().forEach((t) => {
        peer.addTrack(t, localStream.current!);
      });

      await applyLowLatencySender(peer);

      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);

      sendMessage({
        type: "answer",
        to: from,
        answer,
      });

      for (const c of pendingCandidates.current) {
        await peer.addIceCandidate(c);
      }
      pendingCandidates.current = [];
    },
    [initPeerConnection, sendMessage, getMicStream, applyLowLatencySender],
  );

  const handleRemoteAnswer = useCallback(
    async (answer: RTCSessionDescriptionInit) => {
      if (!pc.current) return;
      await pc.current.setRemoteDescription(answer);
      for (const c of pendingCandidates.current) {
        await pc.current.addIceCandidate(c);
      }
      pendingCandidates.current = [];
    },
    [],
  );

  const handleRemoteIceCandidate = useCallback(
    async (candidate: RTCIceCandidateInit) => {
      if (pc.current?.remoteDescription) {
        await pc.current.addIceCandidate(candidate);
      } else {
        pendingCandidates.current.push(candidate);
      }
    },
    [],
  );

  return {
    startAudioCall,
    handleRemoteOffer,
    handleRemoteAnswer,
    handleRemoteIceCandidate,
    cleanup,
    pc,
    localStream,
    isCalling,
  };
};
