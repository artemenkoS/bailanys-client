import { create } from 'zustand';

import type { RoomSummary } from '../../../types/rooms';

interface RoomUiState {
  passwordModalOpen: boolean;
  passwordRoom: RoomSummary | null;
}

interface RoomUiActions {
  openPasswordModal: (room: RoomSummary) => void;
  closePasswordModal: () => void;
}

const initialState: RoomUiState = {
  passwordModalOpen: false,
  passwordRoom: null,
};

export const useRoomUiStore = create<RoomUiState & RoomUiActions>((set) => ({
  ...initialState,
  openPasswordModal: (room) =>
    set(() => ({
      passwordModalOpen: true,
      passwordRoom: room,
    })),
  closePasswordModal: () =>
    set(() => ({
      passwordModalOpen: false,
      passwordRoom: null,
    })),
}));
