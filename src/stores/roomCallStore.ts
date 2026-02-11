import { create } from 'zustand';

import type { RoomCallStatus } from '../features/calls/hooks/useRoomCallManager';
import type { CallHistoryStatus } from '../types/callHistory';

export interface RoomCallState {
  status: RoomCallStatus;
  roomId: string | null;
  members: string[];
  error: string | null;
  isMicMuted: boolean;
  peerVolumes: Record<string, number>;
}

export interface RoomCallActions {
  joinRoom: (roomId: string, options?: { password?: string }) => void;
  createRoom: (roomId: string, options: { name: string; isPrivate?: boolean; password?: string }) => void;
  leaveRoom: (historyStatus?: CallHistoryStatus) => void;
  toggleMicMute: () => void;
  setPeerVolume: (peerId: string, volume: number) => void;
}

type RoomCallStateUpdate = Partial<RoomCallState> | ((state: RoomCallState) => Partial<RoomCallState>);

interface RoomCallStore extends RoomCallState, RoomCallActions {
  setState: (next: RoomCallStateUpdate) => void;
  setActions: (next: Partial<RoomCallActions>) => void;
  reset: () => void;
}

const initialState: RoomCallState = {
  status: 'idle',
  roomId: null,
  members: [],
  error: null,
  isMicMuted: false,
  peerVolumes: {},
};

const noopActions: RoomCallActions = {
  joinRoom: () => {},
  createRoom: () => {},
  leaveRoom: () => {},
  toggleMicMute: () => {},
  setPeerVolume: () => {},
};

export const useRoomCallStore = create<RoomCallStore>((set) => ({
  ...initialState,
  ...noopActions,
  setState: (next) =>
    set((state) => {
      const patch = typeof next === 'function' ? next(state) : next;
      return { ...patch };
    }),
  setActions: (next) => set(() => ({ ...next })),
  reset: () =>
    set(() => ({
      ...initialState,
      ...noopActions,
    })),
}));
