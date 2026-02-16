import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useGuestRoomCall } from './useGuestRoomCall';

let meshFns: {
  ensureLocalStream: ReturnType<typeof vi.fn>;
  setMuted: ReturnType<typeof vi.fn>;
  sendOfferToPeer: ReturnType<typeof vi.fn>;
  handleRoomOffer: ReturnType<typeof vi.fn>;
  handleRoomAnswer: ReturnType<typeof vi.fn>;
  handleRoomIce: ReturnType<typeof vi.fn>;
  cleanupPeer: ReturnType<typeof vi.fn>;
  cleanupAll: ReturnType<typeof vi.fn>;
};

vi.mock('../../calls/webrtc/useRoomPeerMesh', () => ({
  useRoomPeerMesh: () => meshFns,
}));

vi.mock('./useGuestRtcConfiguration', () => ({
  useGuestRtcConfiguration: () => ({
    getRtcConfiguration: vi.fn().mockResolvedValue({}),
  }),
}));

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  static OPEN = 1;
  static CONNECTING = 0;
  static CLOSING = 2;
  static CLOSED = 3;

  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  readyState = FakeWebSocket.CONNECTING;
  sent: string[] = [];
  closeArgs: { code?: number; reason?: string } | null = null;
  url: string;

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  send(data: string) {
    this.sent.push(data);
  }

  open() {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.(new Event('open'));
  }

  message(payload: unknown) {
    this.onmessage?.({ data: JSON.stringify(payload) } as MessageEvent);
  }

  close(code?: number, reason?: string) {
    this.closeArgs = { code, reason };
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.({ code: code ?? 1000, reason: reason ?? '' } as CloseEvent);
  }

  error() {
    this.onerror?.(new Event('error'));
  }
}

describe('useGuestRoomCall', () => {
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
    };

    FakeWebSocket.instances = [];
    vi.stubGlobal('WebSocket', FakeWebSocket as unknown as typeof WebSocket);
  });

  const toBase64Url = (value: string) => {
    const base64 = btoa(unescape(encodeURIComponent(value)));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  };

  const buildToken = (payload: Record<string, unknown>) => {
    return `${toBase64Url(JSON.stringify(payload))}.sig`;
  };

  it('returns error for invalid token', () => {
    const { result } = renderHook(() => useGuestRoomCall('bad-token'));

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('guest.errors.invalidLink');
    expect(FakeWebSocket.instances).toHaveLength(0);
  });

  it('joins room and sends offers to peers', async () => {
    const token = buildToken({ roomId: 'room-1', guestId: 'guest-1' });
    const { result } = renderHook(() => useGuestRoomCall(token));

    const socket = FakeWebSocket.instances[0];
    act(() => {
      socket.open();
    });

    await act(async () => {
      socket.message({
        type: 'room-joined',
        roomId: 'room-1',
        users: ['guest-1', 'user-2'],
        selfId: 'guest-1',
      });
    });

    expect(result.current.status).toBe('joined');
    expect(result.current.members).toEqual(['guest-1', 'user-2']);
    expect(meshFns.ensureLocalStream).toHaveBeenCalled();
    expect(meshFns.sendOfferToPeer).toHaveBeenCalledWith('user-2');
  });

  it('responds to presence checks', async () => {
    const token = buildToken({ roomId: 'room-1', guestId: 'guest-1' });
    renderHook(() => useGuestRoomCall(token));

    const socket = FakeWebSocket.instances[0];
    act(() => {
      socket.open();
    });

    await act(async () => {
      socket.message({ type: 'presence-check' });
    });

    expect(socket.sent.some((msg) => msg.includes('presence-pong'))).toBe(true);
  });

  it('cleans up when a member leaves', async () => {
    const token = buildToken({ roomId: 'room-1', guestId: 'guest-1' });
    const { result } = renderHook(() => useGuestRoomCall(token));

    const socket = FakeWebSocket.instances[0];
    act(() => {
      socket.open();
    });

    await act(async () => {
      socket.message({
        type: 'room-joined',
        roomId: 'room-1',
        users: ['guest-1', 'user-2'],
        selfId: 'guest-1',
      });
    });

    await act(async () => {
      socket.message({ type: 'room-user-left', roomId: 'room-1', userId: 'user-2' });
    });

    expect(result.current.members).toEqual(['guest-1']);
    expect(meshFns.cleanupPeer).toHaveBeenCalledWith('user-2');
  });

  it('maps server errors and leaves on request', async () => {
    const token = buildToken({ roomId: 'room-1', guestId: 'guest-1' });
    const { result } = renderHook(() => useGuestRoomCall(token));

    const socket = FakeWebSocket.instances[0];
    act(() => {
      socket.open();
    });

    await act(async () => {
      socket.message({ type: 'error', message: 'Room is full' });
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('rooms.errors.roomFull');

    act(() => {
      result.current.leaveRoom();
    });

    expect(socket.sent.some((msg) => msg.includes('leave-room'))).toBe(true);
    expect(socket.closeArgs?.code).toBe(1000);
    expect(result.current.status).toBe('left');
  });

  it('handles mic denied on join', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    meshFns.ensureLocalStream.mockRejectedValueOnce(new Error('denied'));
    const token = buildToken({ roomId: 'room-1', guestId: 'guest-1' });
    const { result } = renderHook(() => useGuestRoomCall(token));

    const socket = FakeWebSocket.instances[0];
    act(() => {
      socket.open();
    });

    await act(async () => {
      socket.message({
        type: 'room-joined',
        roomId: 'room-1',
        users: ['guest-1', 'user-2'],
        selfId: 'guest-1',
      });
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('rooms.errors.micDenied');
    expect(socket.sent.some((msg) => msg.includes('leave-room'))).toBe(true);
    expect(socket.closeArgs?.code).toBe(1000);
    errorSpy.mockRestore();
  });
});
