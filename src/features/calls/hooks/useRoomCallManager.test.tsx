import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore } from '../../../stores/authStore';
import { useRoomCallStore } from '../../../stores/roomCallStore';
import { useRoomCallManager } from './useRoomCallManager';

let meshFns: {
  ensureLocalStream: ReturnType<typeof vi.fn>;
  setMuted: ReturnType<typeof vi.fn>;
  sendOfferToPeer: ReturnType<typeof vi.fn>;
  handleRoomOffer: ReturnType<typeof vi.fn>;
  handleRoomAnswer: ReturnType<typeof vi.fn>;
  handleRoomIce: ReturnType<typeof vi.fn>;
  cleanupPeer: ReturnType<typeof vi.fn>;
  cleanupAll: ReturnType<typeof vi.fn>;
  setPeerVolume: ReturnType<typeof vi.fn>;
};

let sendMessageMock: ReturnType<typeof vi.fn>;
let socketMock: FakeSocket | null = null;

vi.mock('../webrtc/useRoomPeerMesh', () => ({
  useRoomPeerMesh: () => meshFns,
}));

vi.mock('./useRtcConfiguration', () => ({
  useRtcConfiguration: () => ({
    getRtcConfiguration: vi.fn().mockResolvedValue({}),
  }),
}));

vi.mock('./useSocket', () => ({
  useSocket: () => ({
    sendMessage: sendMessageMock,
    socket: socketMock,
  }),
}));

vi.mock('../../../services/api.service', () => ({
  apiService: {
    createCallHistory: vi.fn().mockResolvedValue({ ok: true }),
  },
}));

class FakeSocket {
  private listeners = new Map<string, Set<(event: MessageEvent | CloseEvent | Event) => void>>();

  addEventListener(type: string, handler: (event: MessageEvent | CloseEvent | Event) => void) {
    const set = this.listeners.get(type) ?? new Set();
    set.add(handler);
    this.listeners.set(type, set);
  }

  removeEventListener(type: string, handler: (event: MessageEvent | CloseEvent | Event) => void) {
    const set = this.listeners.get(type);
    if (!set) return;
    set.delete(handler);
  }

  emit(type: 'message' | 'close' | 'error', event: MessageEvent | CloseEvent | Event) {
    const set = this.listeners.get(type);
    if (!set) return;
    for (const handler of set) {
      handler(event);
    }
  }
}

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useRoomCallManager', () => {
  beforeEach(() => {
    meshFns = {
      ensureLocalStream: vi.fn().mockResolvedValue(undefined),
      setMuted: vi.fn(),
      sendOfferToPeer: vi.fn().mockResolvedValue(undefined),
      handleRoomOffer: vi.fn().mockResolvedValue(undefined),
      handleRoomAnswer: vi.fn().mockResolvedValue(undefined),
      handleRoomIce: vi.fn().mockResolvedValue(undefined),
      cleanupPeer: vi.fn(),
      cleanupAll: vi.fn(),
      setPeerVolume: vi.fn(),
    };

    sendMessageMock = vi.fn();
    socketMock = new FakeSocket();

    useRoomCallStore.getState().reset();
    useAuthStore.setState({
      user: {
        id: 'user-1',
        email: 'user@example.com',
        user_metadata: {
          username: 'user',
          display_name: 'User',
        },
      },
      session: {
        access_token: 'token',
        refresh_token: 'refresh',
        expires_in: 3600,
        user: {
          id: 'user-1',
          email: 'user@example.com',
          user_metadata: {
            username: 'user',
            display_name: 'User',
          },
        },
      },
      isAuthenticated: true,
    });
  });

  it('validates room id before joining', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useRoomCallManager(), { wrapper });

    act(() => {
      result.current.joinRoom(' ');
    });

    expect(result.current.error).toBe('rooms.errors.roomIdRequired');
    expect(sendMessageMock).not.toHaveBeenCalled();
  });

  it('sends join-room for trimmed ids', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useRoomCallManager(), { wrapper });

    act(() => {
      result.current.joinRoom(' room-1 ');
    });

    expect(sendMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'join-room',
        roomId: 'room-1',
      })
    );
    expect(result.current.status).toBe('joining');
  });

  it('handles room joined and sends offers to peers', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useRoomCallManager(), { wrapper });

    await act(async () => {
      socketMock?.emit('message', {
        data: JSON.stringify({
          type: 'room-joined',
          roomId: 'room-1',
          users: ['user-1', 'user-2'],
        }),
      } as MessageEvent);
    });

    expect(result.current.status).toBe('joined');
    expect(result.current.roomId).toBe('room-1');
    expect(result.current.members).toEqual(['user-1', 'user-2']);
    expect(meshFns.ensureLocalStream).toHaveBeenCalled();
    expect(meshFns.sendOfferToPeer).toHaveBeenCalledWith('user-2');
  });

  it('cleans up peers on room-user-left', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useRoomCallManager(), { wrapper });

    await act(async () => {
      socketMock?.emit('message', {
        data: JSON.stringify({
          type: 'room-joined',
          roomId: 'room-1',
          users: ['user-1', 'user-2'],
        }),
      } as MessageEvent);
    });

    await act(async () => {
      socketMock?.emit('message', {
        data: JSON.stringify({
          type: 'room-user-left',
          roomId: 'room-1',
          userId: 'user-2',
        }),
      } as MessageEvent);
    });

    expect(result.current.members).toEqual(['user-1']);
    expect(meshFns.cleanupPeer).toHaveBeenCalledWith('user-2');
  });

  it('toggles mute and updates peer volume', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useRoomCallManager(), { wrapper });

    act(() => {
      result.current.toggleMicMute();
    });

    expect(result.current.isMicMuted).toBe(true);
    expect(meshFns.setMuted).toHaveBeenCalledWith(true);

    act(() => {
      result.current.setPeerVolume('peer-1', 2);
    });

    expect(result.current.peerVolumes['peer-1']).toBe(1);
    expect(meshFns.setPeerVolume).toHaveBeenCalledWith('peer-1', 1);
  });

  it('maps server errors and resets status', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useRoomCallManager(), { wrapper });

    act(() => {
      result.current.joinRoom('room-1');
    });

    await act(async () => {
      socketMock?.emit('message', {
        data: JSON.stringify({
          type: 'error',
          message: 'Room not found',
        }),
      } as MessageEvent);
    });

    expect(result.current.status).toBe('idle');
    expect(result.current.error).toBe('rooms.errors.notFound');
  });

  it('handles mic denied on room join', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    meshFns.ensureLocalStream.mockRejectedValueOnce(new Error('denied'));
    const wrapper = createWrapper();
    const { result } = renderHook(() => useRoomCallManager(), { wrapper });

    await act(async () => {
      socketMock?.emit('message', {
        data: JSON.stringify({
          type: 'room-joined',
          roomId: 'room-1',
          users: ['user-1', 'user-2'],
        }),
      } as MessageEvent);
    });

    expect(sendMessageMock).toHaveBeenCalledWith({ type: 'leave-room' });
    expect(result.current.status).toBe('idle');
    expect(result.current.error).toBe('rooms.errors.micDenied');
    errorSpy.mockRestore();
  });
});
