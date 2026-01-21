import { useCallback, useRef, useState } from "react";
import type { SignalingMessage } from "../types/signaling";

export const useWebRTC = (sendMessage: (msg: SignalingMessage) => void) => {
  const [isCalling, setIsCalling] = useState(false);
  const pc = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);

  const configuration = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  };

  const cleanup = useCallback(() => {
    pc.current?.close();
    localStream.current?.getTracks().forEach((track) => track.stop());
    pc.current = null;
    localStream.current = null;
    setIsCalling(false);
  }, []);

  const initPeerConnection = useCallback(
    (targetId: string) => {
      pc.current = new RTCPeerConnection(configuration);

      pc.current.onicecandidate = (event) => {
        if (event.candidate) {
          sendMessage({
            type: "ice-candidate",
            to: targetId,
            candidate: event.candidate,
          });
        }
      };

      pc.current.ontrack = (event) => {
        const remoteAudio = new Audio();
        remoteAudio.srcObject = event.streams[0];
        remoteAudio.play();
      };

      return pc.current;
    },
    [sendMessage],
  );

  const startAudioCall = async (targetId: string) => {
    setIsCalling(true);
    const peer = initPeerConnection(targetId);

    localStream.current = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });
    localStream.current.getTracks().forEach((track) => {
      peer.addTrack(track, localStream.current!);
    });

    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);

    sendMessage({ type: "offer", to: targetId, callType: "audio", offer });
  };

  return {
    startAudioCall,
    pc,
    initPeerConnection,
    localStream,
    isCalling,
    cleanup,
  };
};
