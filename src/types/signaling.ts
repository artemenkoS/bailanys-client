import type { RoomChatMessage } from './roomChat';

export type CallType = 'audio' | 'video';
export type HangupReason = 'ended' | 'rejected';

export interface DirectSignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'hangup';
  to: string;
  from?: string;
  callType?: CallType;
  reason?: HangupReason;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

export interface ScreenShareMessage {
  type: 'screen-share';
  to: string;
  from?: string;
  action: 'started' | 'stopped';
}

export interface RoomJoinMessage {
  type: 'join-room';
  roomId: string;
  create?: boolean;
  name?: string;
  isPrivate?: boolean;
  password?: string;
}

export interface RoomLeaveMessage {
  type: 'leave-room';
}

export interface RoomJoinedMessage {
  type: 'room-joined';
  roomId: string;
  users: string[];
  selfId?: string;
}

export interface RoomUserJoinedMessage {
  type: 'room-user-joined';
  roomId: string;
  userId: string;
}

export interface RoomUserLeftMessage {
  type: 'room-user-left';
  roomId: string;
  userId: string;
}

export interface RoomOfferMessage {
  type: 'room-offer';
  roomId: string;
  to: string;
  from?: string;
  callType?: CallType;
  offer: RTCSessionDescriptionInit;
}

export interface RoomAnswerMessage {
  type: 'room-answer';
  roomId: string;
  to: string;
  from?: string;
  answer: RTCSessionDescriptionInit;
}

export interface RoomIceMessage {
  type: 'room-ice';
  roomId: string;
  to: string;
  from?: string;
  candidate: RTCIceCandidateInit;
}

export interface RoomChatSendMessage {
  type: 'room-message';
  roomId: string;
  body: string;
}

export interface RoomChatJoinMessage {
  type: 'join-room-chat';
  roomId: string;
}

export interface RoomChatLeaveMessage {
  type: 'leave-room-chat';
  roomId: string;
}

export interface RoomChatMessageEvent {
  type: 'room-message';
  roomId: string;
  message: RoomChatMessage;
}

export interface RoomChatHistoryEvent {
  type: 'room-messages';
  roomId: string;
  messages: RoomChatMessage[];
}

export interface ErrorMessage {
  type: 'error';
  message: string;
}

export type RoomSocketMessage =
  | RoomJoinMessage
  | RoomLeaveMessage
  | RoomJoinedMessage
  | RoomUserJoinedMessage
  | RoomUserLeftMessage
  | RoomOfferMessage
  | RoomAnswerMessage
  | RoomIceMessage
  | RoomChatSendMessage
  | RoomChatJoinMessage
  | RoomChatLeaveMessage
  | RoomChatMessageEvent
  | RoomChatHistoryEvent;

export type SocketMessage = DirectSignalingMessage | ScreenShareMessage | RoomSocketMessage | ErrorMessage;

export type SignalingMessage = DirectSignalingMessage | ScreenShareMessage;
