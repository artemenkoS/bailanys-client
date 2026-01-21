import { useState, useEffect, useCallback, useRef } from "react";
import { useSocket } from "./useSocket";
import { useWebRTC } from "./useWebRTC";
import type { SignalingMessage } from "../types/signaling";

export type CallStatus =
  | "idle"
  | "calling"
  | "connected"
  | "ended"
  | "rejected";

export const useCallManager = () => {
  const [incomingCall, setIncomingCall] = useState<SignalingMessage | null>(
    null,
  );
  const [activeCallTarget, setActiveCallTarget] = useState<string | null>(null);
  const [status, setStatus] = useState<CallStatus>("idle");

  const cleanupTimerRef = useRef<number | null>(null);

  const { sendMessage, socket } = useSocket();

  const { initPeerConnection, pc, cleanup } = useWebRTC(sendMessage);

  const clearCallUI = useCallback(() => {
    setActiveCallTarget(null);
    setIncomingCall(null);
    setStatus("idle");
    if (cleanupTimerRef.current) {
      window.clearTimeout(cleanupTimerRef.current);
      cleanupTimerRef.current = null;
    }
  }, []);

  const stopCall = useCallback(
    (reason: "ended" | "rejected" = "ended") => {
      const targetId = activeCallTarget || incomingCall?.from;
      if (targetId) {
        sendMessage({ type: "hangup", to: targetId });
      }

      cleanup();
      setStatus(reason);

      if (cleanupTimerRef.current) window.clearTimeout(cleanupTimerRef.current);
      cleanupTimerRef.current = window.setTimeout(() => {
        clearCallUI();
      }, 2500);
    },
    [activeCallTarget, incomingCall, sendMessage, cleanup, clearCallUI],
  );

  const startCall = async (targetId: string) => {
    setStatus("calling");
    setActiveCallTarget(targetId);

    const peer = initPeerConnection(targetId);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      sendMessage({ type: "offer", to: targetId, offer });
    } catch (error) {
      console.error("Start call error:", error);
      stopCall("ended");
    }
  };

  const acceptCall = async () => {
    if (!incomingCall?.from || !incomingCall.offer || !pc.current) return;

    const targetId = incomingCall.from;
    const peer = pc.current;

    setActiveCallTarget(targetId);
    setStatus("connected");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));

      await peer.setRemoteDescription(
        new RTCSessionDescription(incomingCall.offer),
      );

      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);

      sendMessage({ type: "answer", to: targetId, answer });
      setIncomingCall(null);
    } catch (error) {
      console.error("Accept call error:", error);
      stopCall("ended");
    }
  };

  useEffect(() => {
    if (!socket) return;

    const handleMessage = async (event: MessageEvent) => {
      const msg: SignalingMessage = JSON.parse(event.data);

      switch (msg.type) {
        case "offer":
          if (msg.from) {
            initPeerConnection(msg.from);
          }
          setIncomingCall(msg);
          break;

        case "answer":
          if (pc.current && msg.answer) {
            await pc.current.setRemoteDescription(
              new RTCSessionDescription(msg.answer),
            );
            setStatus("connected");
          }
          break;

        case "ice-candidate":
          if (msg.candidate && pc.current) {
            try {
              await pc.current.addIceCandidate(
                new RTCIceCandidate(msg.candidate),
              );
              console.log("Remote ICE candidate added successfully");
            } catch (e) {
              console.error("Error adding ice candidate:", e);
            }
          }
          break;

        case "hangup":
          cleanup();
          setStatus("ended");
          if (cleanupTimerRef.current)
            window.clearTimeout(cleanupTimerRef.current);
          cleanupTimerRef.current = window.setTimeout(() => {
            clearCallUI();
          }, 2500);
          break;
      }
    };

    socket.addEventListener("message", handleMessage);
    return () => {
      socket.removeEventListener("message", handleMessage);
      if (cleanupTimerRef.current) window.clearTimeout(cleanupTimerRef.current);
    };
  }, [socket, pc, initPeerConnection, cleanup, clearCallUI]);

  return {
    incomingCall,
    activeCallTarget,
    status,
    startCall,
    acceptCall,
    stopCall,
    setIncomingCall,
    cleanup,
  };
};
