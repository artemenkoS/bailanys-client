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

  const {
    startAudioCall,
    handleRemoteOffer,
    handleRemoteAnswer,
    handleRemoteIceCandidate,
    cleanup,
  } = useWebRTC(sendMessage);

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
      if (targetId) sendMessage({ type: "hangup", to: targetId });

      cleanup();
      setStatus(reason);

      if (cleanupTimerRef.current) window.clearTimeout(cleanupTimerRef.current);
      cleanupTimerRef.current = window.setTimeout(() => {
        clearCallUI();
      }, 250);
    },
    [activeCallTarget, incomingCall, sendMessage, cleanup, clearCallUI],
  );

  const startCall = useCallback(
    async (targetId: string) => {
      setStatus("calling");
      setActiveCallTarget(targetId);
      try {
        await startAudioCall(targetId);
      } catch (e) {
        console.error("Start call error:", e);
        stopCall("ended");
      }
    },
    [startAudioCall, stopCall],
  );

  const acceptCall = useCallback(async () => {
    if (!incomingCall?.from || !incomingCall.offer) return;

    const targetId = incomingCall.from;
    setActiveCallTarget(targetId);
    setStatus("connected");

    try {
      await handleRemoteOffer(targetId, incomingCall.offer);
      setIncomingCall(null);
    } catch (e) {
      console.error("Accept call error:", e);
      stopCall("ended");
    }
  }, [incomingCall, handleRemoteOffer, stopCall]);

  useEffect(() => {
    if (!socket) return;

    const handleMessage = async (event: MessageEvent) => {
      const msg: SignalingMessage = JSON.parse(event.data);

      switch (msg.type) {
        case "offer":
          setIncomingCall(msg);
          break;

        case "answer":
          if (msg.answer) {
            await handleRemoteAnswer(msg.answer);
            setStatus("connected");
          }
          break;

        case "ice-candidate":
          if (msg.candidate) {
            try {
              await handleRemoteIceCandidate(
                msg.candidate as RTCIceCandidateInit,
              );
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
  }, [
    socket,
    handleRemoteAnswer,
    handleRemoteIceCandidate,
    cleanup,
    clearCallUI,
  ]);

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
