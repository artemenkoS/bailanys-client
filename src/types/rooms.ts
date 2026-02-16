import type { Profile } from './auth';

export interface RoomSummary {
  id: string;
  name: string;
  isPrivate: boolean;
  participants: number;
  maxParticipants?: number | null;
  roomType?: string;
  avatarUrl?: string | null;
}

export type RoomRole = 'admin' | 'member';

export interface RoomMemberSummary extends RoomSummary {
  isActive: boolean;
  role: RoomRole;
  isCreator: boolean;
}

export interface RoomMemberEntry {
  user: Profile;
  role: RoomRole;
  isCreator: boolean;
  created_at?: string | null;
}

export interface CreateRoomPayload {
  name: string;
  isPrivate: boolean;
  password?: string;
  avatarFile?: File | null;
}
