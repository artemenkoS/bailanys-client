export type CallDirection = 'incoming' | 'outgoing';
export type CallHistoryStatus = 'completed' | 'missed' | 'rejected' | 'failed';
export type CallType = 'audio' | 'video';

export interface CallHistoryPeer {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface CallHistoryItem {
  id: string;
  peer_id: string;
  direction: CallDirection;
  status: CallHistoryStatus;
  duration_seconds: number;
  call_type: CallType;
  started_at: string;
  ended_at: string | null;
  peer: CallHistoryPeer | null;
}

export interface CreateCallHistoryRequest {
  peerId: string;
  direction: CallDirection;
  status: CallHistoryStatus;
  durationSeconds: number;
  callType?: CallType;
  startedAt?: string;
  endedAt?: string;
}
