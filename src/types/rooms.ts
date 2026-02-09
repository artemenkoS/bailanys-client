export interface RoomSummary {
  id: string;
  name: string;
  isPrivate: boolean;
  participants: number;
  maxParticipants?: number | null;
  roomType?: string;
  avatarUrl?: string | null;
}

export interface RoomOwnerSummary extends RoomSummary {
  isActive: boolean;
}

export interface CreateRoomPayload {
  name: string;
  isPrivate: boolean;
  password?: string;
  avatarFile?: File | null;
}
