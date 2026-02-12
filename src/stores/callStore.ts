import { create } from 'zustand';

import type { CallStatus } from '../features/calls/hooks/useCallManager';
import type { DirectSignalingMessage, HangupReason } from '../types/signaling';

export interface CallState {
  incomingCall: DirectSignalingMessage | null;
  activeCallTarget: string | null;
  status: CallStatus;
  durationSeconds: number;
  isMicMuted: boolean;
  isScreenSharing: boolean;
  isRemoteScreenSharing: boolean;
  localScreenStream: MediaStream | null;
  remoteScreenStream: MediaStream | null;
}

export interface CallActions {
  startCall: (targetId: string, callType?: 'audio' | 'video') => void;
  acceptCall: () => void;
  stopCall: (reason?: HangupReason) => void;
  toggleMicMute: () => void;
  toggleScreenShare: () => void;
  cleanup: () => void;
}

type CallStateUpdate = Partial<CallState> | ((state: CallState) => Partial<CallState>);

interface CallStore extends CallState, CallActions {
  setState: (next: CallStateUpdate) => void;
  setActions: (next: Partial<CallActions>) => void;
  reset: () => void;
}

const initialState: CallState = {
  incomingCall: null,
  activeCallTarget: null,
  status: 'idle',
  durationSeconds: 0,
  isMicMuted: false,
  isScreenSharing: false,
  isRemoteScreenSharing: false,
  localScreenStream: null,
  remoteScreenStream: null,
};

const noopActions: CallActions = {
  startCall: () => {},
  acceptCall: () => {},
  stopCall: () => {},
  toggleMicMute: () => {},
  toggleScreenShare: () => {},
  cleanup: () => {},
};

export const useCallStore = create<CallStore>((set) => ({
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
