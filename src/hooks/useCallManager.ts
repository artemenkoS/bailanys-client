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
  const ringIntervalRef = useRef<number | null>(null);
  const ringTimeoutRef = useRef<number | null>(null);
  const ringContextRef = useRef<AudioContext | null>(null);
  const ringOscillatorRef = useRef<OscillatorNode | null>(null);
  const ringGainRef = useRef<GainNode | null>(null);

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
      ringGainRef.current.gain.setValueAtTime(
        0,
        ringContextRef.current.currentTime,
      );
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

    if (ctx.state === "suspended") {
      try {
        await ctx.resume();
      } catch {
        // ignore
      }
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
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
    (reason: "ended" | "rejected" = "ended") => {
      const targetId = activeCallTarget || incomingCall?.from;
      if (targetId) sendMessage({ type: "hangup", to: targetId });

      stopRingback();
      cleanup();
      setStatus(reason);

      if (cleanupTimerRef.current) window.clearTimeout(cleanupTimerRef.current);
      cleanupTimerRef.current = window.setTimeout(() => {
        clearCallUI();
      }, 250);
    },
    [activeCallTarget, incomingCall, sendMessage, cleanup, clearCallUI, stopRingback],
  );

  const startCall = useCallback(
    async (targetId: string) => {
      setStatus("calling");
      setActiveCallTarget(targetId);
      try {
        await startRingback();
        await startAudioCall(targetId);
      } catch (e) {
        console.error("Start call error:", e);
        stopCall("ended");
      }
    },
    [startAudioCall, stopCall, startRingback],
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
            stopRingback();
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
          stopRingback();
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
      stopRingback();
      if (cleanupTimerRef.current) window.clearTimeout(cleanupTimerRef.current);
    };
  }, [
    socket,
    handleRemoteAnswer,
    handleRemoteIceCandidate,
    cleanup,
    clearCallUI,
    stopRingback,
  ]);

  useEffect(() => {
    if (status !== "calling") stopRingback();
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
  };
};
