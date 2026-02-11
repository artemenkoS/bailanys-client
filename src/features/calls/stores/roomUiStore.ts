import { create } from 'zustand';

import type { RoomSummary } from '../../../types/rooms';

interface RoomUiState {
  passwordModalOpen: boolean;
  passwordRoom: RoomSummary | null;
  passwordInput: string;
  passwordError: string | null;
}

interface RoomUiActions {
  openPasswordModal: (room: RoomSummary) => void;
  closePasswordModal: () => void;
  setPasswordInput: (value: string) => void;
  setPasswordError: (errorKey: string | null) => void;
}

const initialState: RoomUiState = {
  passwordModalOpen: false,
  passwordRoom: null,
  passwordInput: '',
  passwordError: null,
};

export const useRoomUiStore = create<RoomUiState & RoomUiActions>((set) => ({
  ...initialState,
  openPasswordModal: (room) =>
    set(() => ({
      passwordModalOpen: true,
      passwordRoom: room,
      passwordInput: '',
      passwordError: null,
    })),
  closePasswordModal: () =>
    set(() => ({
      passwordModalOpen: false,
      passwordRoom: null,
      passwordInput: '',
      passwordError: null,
    })),
  setPasswordInput: (value) => set(() => ({ passwordInput: value })),
  setPasswordError: (errorKey) => set(() => ({ passwordError: errorKey })),
}));
