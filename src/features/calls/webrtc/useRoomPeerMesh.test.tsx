import { act, renderHook } from '@testing-library/react';
import type { MutableRefObject } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useRoomPeerMesh } from './useRoomPeerMesh';

class FakeRTCPeerConnection {
  static instances: FakeRTCPeerConnection[] = [];
  onicecandidate: ((event: { candidate: RTCIceCandidateInit | null }) => void) | null = null;
  ontrack: ((event: { streams?: MediaStream[]; track: MediaStreamTrack }) => void) | null = null;
  localDescription: RTCSessionDescriptionInit | null = null;
  remoteDescription: RTCSessionDescriptionInit | null = null;
  addIceCandidate = vi.fn(async () => {});
  createOffer = vi.fn(async () => ({ type: 'offer', sdp: 'offer-sdp' }));
  createAnswer = vi.fn(async () => ({ type: 'answer', sdp: 'answer-sdp' }));
  setLocalDescription = vi.fn(async (desc: RTCSessionDescriptionInit) => {
    this.localDescription = desc;
  });
  setRemoteDescription = vi.fn(async (desc: RTCSessionDescriptionInit) => {
    this.remoteDescription = desc;
  });
  getSenders = vi.fn(() => []);
  addTrack = vi.fn();
  close = vi.fn();

  constructor() {
    FakeRTCPeerConnection.instances.push(this);
  }
}

describe('useRoomPeerMesh', () => {
  let lastTrack: MediaStreamTrack | null = null;

  beforeEach(() => {
    FakeRTCPeerConnection.instances = [];
    vi.stubGlobal('RTCPeerConnection', FakeRTCPeerConnection as unknown as typeof RTCPeerConnection);
    const track = { enabled: true, stop: vi.fn() } as unknown as MediaStreamTrack;
    lastTrack = track;
    const stream = {
      getAudioTracks: () => [track],
      getTracks: () => [track],
    } as unknown as MediaStream;
    Object.assign(navigator, {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue(stream),
      },
    });
  });

  it('sends room offer with current room id', async () => {
    const sendMessage = vi.fn();
    const roomIdRef = { current: 'room-1' } as MutableRefObject<string | null>;
    const { result } = renderHook(() =>
      useRoomPeerMesh({
        getRtcConfiguration: async () => ({}),
        sendMessage,
        roomIdRef,
      })
    );

    await act(async () => {
      await result.current.sendOfferToPeer('peer-a');
    });

    expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'room-offer',
        roomId: 'room-1',
        to: 'peer-a',
        callType: 'audio',
      })
    );
  });

  it('skips sending offers without a room id', async () => {
    const sendMessage = vi.fn();
    const roomIdRef = { current: null } as MutableRefObject<string | null>;
    const { result } = renderHook(() =>
      useRoomPeerMesh({
        getRtcConfiguration: async () => ({}),
        sendMessage,
        roomIdRef,
      })
    );

    await act(async () => {
      await result.current.sendOfferToPeer('peer-a');
    });

    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('answers incoming offer', async () => {
    const sendMessage = vi.fn();
    const roomIdRef = { current: 'room-1' } as MutableRefObject<string | null>;
    const { result } = renderHook(() =>
      useRoomPeerMesh({
        getRtcConfiguration: async () => ({}),
        sendMessage,
        roomIdRef,
      })
    );

    await act(async () => {
      await result.current.handleRoomOffer({
        type: 'room-offer',
        roomId: 'room-1',
        to: 'me',
        from: 'peer-a',
        offer: { type: 'offer', sdp: 'remote-sdp' },
      });
    });

    expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'room-answer',
        roomId: 'room-1',
        to: 'peer-a',
      })
    );
  });

  it('queues ice candidates before peer is ready', async () => {
    const sendMessage = vi.fn();
    const roomIdRef = { current: 'room-1' } as MutableRefObject<string | null>;
    const { result } = renderHook(() =>
      useRoomPeerMesh({
        getRtcConfiguration: async () => ({}),
        sendMessage,
        roomIdRef,
      })
    );

    const candidate = { candidate: 'candidate-1' } as RTCIceCandidateInit;

    await act(async () => {
      await result.current.handleRoomIce({
        type: 'room-ice',
        roomId: 'room-1',
        to: 'me',
        from: 'peer-a',
        candidate,
      });
    });

    await act(async () => {
      await result.current.handleRoomOffer({
        type: 'room-offer',
        roomId: 'room-1',
        to: 'me',
        from: 'peer-a',
        offer: { type: 'offer', sdp: 'remote-sdp' },
      });
    });

    expect(FakeRTCPeerConnection.instances[0].addIceCandidate).toHaveBeenCalledWith(candidate);
  });

  it('mutes local stream tracks', async () => {
    const sendMessage = vi.fn();
    const roomIdRef = { current: 'room-1' } as MutableRefObject<string | null>;
    const { result } = renderHook(() =>
      useRoomPeerMesh({
        getRtcConfiguration: async () => ({}),
        sendMessage,
        roomIdRef,
      })
    );

    await act(async () => {
      await result.current.ensureLocalStream();
    });

    result.current.setMuted(true);

    expect(lastTrack?.enabled).toBe(false);
  });

  it('stops local tracks on cleanup', async () => {
    const sendMessage = vi.fn();
    const roomIdRef = { current: 'room-1' } as MutableRefObject<string | null>;
    const { result } = renderHook(() =>
      useRoomPeerMesh({
        getRtcConfiguration: async () => ({}),
        sendMessage,
        roomIdRef,
      })
    );

    await act(async () => {
      await result.current.ensureLocalStream();
    });

    act(() => {
      result.current.cleanupAll();
    });

    expect(lastTrack?.stop).toHaveBeenCalled();
  });
});
