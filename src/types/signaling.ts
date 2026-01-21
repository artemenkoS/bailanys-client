export type CallType = "audio" | "video";

export interface SignalingMessage {
  type: "offer" | "answer" | "ice-candidate" | "hangup";
  to: string;
  from?: string;
  callType?: CallType;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}
