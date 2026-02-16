import type { Profile } from './auth';

export interface RoomInviteRoomSummary {
  id: string;
  name: string;
  isPrivate: boolean;
  avatarUrl?: string | null;
}

export interface RoomInviteEntry {
  id: string;
  status: 'pending' | 'accepted' | 'declined' | 'canceled';
  created_at: string | null;
  room: RoomInviteRoomSummary;
  user: Profile;
}

export interface RoomInviteRequestsResponse {
  incoming: RoomInviteEntry[];
  outgoing: RoomInviteEntry[];
}
