export type CallType = "audio" | "video";
export type HangupReason = "ended" | "rejected";

export interface SignalingMessage {
  type: "offer" | "answer" | "ice-candidate" | "hangup";
  to: string;
  from?: string;
  callType?: CallType;
  reason?: HangupReason;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}
