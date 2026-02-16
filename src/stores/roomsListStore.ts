import { create } from 'zustand';

import type { RoomMemberSummary, RoomSummary } from '../types/rooms';

export type RoomsListKey = 'active' | 'mine';

export interface RoomActionsConfig {
  onInviteLink?: (room: RoomMemberSummary) => void;
  onInviteUsers?: (room: RoomMemberSummary) => void;
  onManageUsers?: (room: RoomMemberSummary) => void;
  onDelete?: (room: RoomMemberSummary) => void;
  onLeave?: (room: RoomMemberSummary) => void;
}

export interface RoomsListActions extends RoomActionsConfig {
  onJoin: (room: RoomSummary) => void;
  onChat?: (room: RoomSummary) => void;
  onAvatarChange?: (room: RoomMemberSummary, file: File) => void;
  onAvatarRemove?: (room: RoomMemberSummary) => void;
}

export interface RoomsListUi {
  isMobile: boolean;
  isActionDisabled: boolean;
  deleteRoomId?: string | null;
  avatarUpdatingRoomId?: string | null;
  showInactiveBadge?: boolean;
}

const noop = () => undefined;

const defaultUi: RoomsListUi = {
  isMobile: false,
  isActionDisabled: false,
  deleteRoomId: null,
  avatarUpdatingRoomId: null,
  showInactiveBadge: false,
};

const defaultActions: RoomsListActions = {
  onJoin: noop,
};

interface RoomsListState {
  uiByKey: Record<RoomsListKey, RoomsListUi>;
  actionsByKey: Record<RoomsListKey, RoomsListActions>;
  setUi: (key: RoomsListKey, next: Partial<RoomsListUi>) => void;
  setActions: (key: RoomsListKey, next: Partial<RoomsListActions>) => void;
  reset: (key: RoomsListKey) => void;
}

export const useRoomsListStore = create<RoomsListState>((set) => ({
  uiByKey: {
    active: { ...defaultUi },
    mine: { ...defaultUi },
  },
  actionsByKey: {
    active: { ...defaultActions },
    mine: { ...defaultActions },
  },
  setUi: (key, next) =>
    set((state) => ({
      uiByKey: {
        ...state.uiByKey,
        [key]: {
          ...state.uiByKey[key],
          ...next,
        },
      },
    })),
  setActions: (key, next) =>
    set((state) => ({
      actionsByKey: {
        ...state.actionsByKey,
        [key]: {
          ...state.actionsByKey[key],
          ...next,
        },
      },
    })),
  reset: (key) =>
    set((state) => ({
      uiByKey: {
        ...state.uiByKey,
        [key]: { ...defaultUi },
      },
      actionsByKey: {
        ...state.actionsByKey,
        [key]: { ...defaultActions },
      },
    })),
}));
