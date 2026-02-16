import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useWebRTC } from './useWebRTC';

class FakeMediaStreamTrack {
  kind: string;
  enabled = true;
  muted = false;
  readyState: 'live' | 'ended' = 'live';
  onended: (() => void) | null = null;

  constructor(kind: string) {
    this.kind = kind;
  }

  stop = vi.fn(() => {
    if (this.readyState === 'ended') return;
    this.readyState = 'ended';
    if (this.onended) this.onended();
  });
}

class FakeMediaStream {
  private tracks: FakeMediaStreamTrack[];

  constructor(tracks: FakeMediaStreamTrack[] = []) {
    this.tracks = tracks;
  }

  getAudioTracks() {
    return this.tracks.filter((track) => track.kind === 'audio');
  }

  getVideoTracks() {
    return this.tracks.filter((track) => track.kind === 'video');
  }

  getTracks() {
    return [...this.tracks];
  }
}

class FakeRTCRtpSender {
  track: FakeMediaStreamTrack | null = null;
  kind: string;
  replaceTrack = vi.fn(async (track: FakeMediaStreamTrack | null) => {
    this.track = track;
  });
  getParameters = vi.fn(() => ({ encodings: [] }));
  setParameters = vi.fn(async () => {});

  constructor(kind: string) {
    this.kind = kind;
  }
}

class FakeRTCRtpReceiver {
  track: FakeMediaStreamTrack;

  constructor(kind: string) {
    this.track = new FakeMediaStreamTrack(kind);
  }
}

class FakeRTCRtpTransceiver {
  sender: FakeRTCRtpSender;
  receiver?: FakeRTCRtpReceiver;
  direction: RTCRtpTransceiverDirection = 'sendrecv';

  constructor(kind: string, withReceiver = false) {
    this.sender = new FakeRTCRtpSender(kind);
    if (withReceiver) {
      this.receiver = new FakeRTCRtpReceiver(kind);
    }
  }
}

class FakeRTCPeerConnection {
  static instances: FakeRTCPeerConnection[] = [];
  onicecandidate: ((event: { candidate: RTCIceCandidateInit | null }) => void) | null = null;
  ontrack: ((event: { streams?: MediaStream[]; track: MediaStreamTrack }) => void) | null = null;
  localDescription: RTCSessionDescriptionInit | null = null;
  remoteDescription: RTCSessionDescriptionInit | null = null;
  connectionState: RTCPeerConnectionState = 'connected';
  transceivers: FakeRTCRtpTransceiver[] = [
    new FakeRTCRtpTransceiver('audio', true),
    new FakeRTCRtpTransceiver('video', true),
  ];

  addIceCandidate = vi.fn(async () => {});
  createOffer = vi.fn(async () => ({ type: 'offer', sdp: 'offer-sdp' }));
  createAnswer = vi.fn(async () => ({ type: 'answer', sdp: 'answer-sdp' }));
  setLocalDescription = vi.fn(async (desc: RTCSessionDescriptionInit) => {
    this.localDescription = desc;
  });
  setRemoteDescription = vi.fn(async (desc: RTCSessionDescriptionInit) => {
    this.remoteDescription = desc;
  });
  addTrack = vi.fn();
  close = vi.fn(() => {
    this.connectionState = 'closed';
  });

  constructor() {
    FakeRTCPeerConnection.instances.push(this);
  }

  addTransceiver(kind: string) {
    const transceiver = new FakeRTCRtpTransceiver(kind);
    this.transceivers.push(transceiver);
    return transceiver as unknown as RTCRtpTransceiver;
  }

  getTransceivers() {
    return this.transceivers as unknown as RTCRtpTransceiver[];
  }

  getSenders() {
    return this.transceivers.map((t) => t.sender) as unknown as RTCRtpSender[];
  }
}

describe('useWebRTC', () => {
  beforeEach(() => {
    FakeRTCPeerConnection.instances = [];
    vi.stubGlobal('RTCPeerConnection', FakeRTCPeerConnection as unknown as typeof RTCPeerConnection);
    vi.stubGlobal('MediaStream', FakeMediaStream as unknown as typeof MediaStream);
    vi.stubGlobal('MediaStreamTrack', FakeMediaStreamTrack as unknown as typeof MediaStreamTrack);

    const audioTrack = new FakeMediaStreamTrack('audio');
    const audioStream = new FakeMediaStream([audioTrack]);
    const videoTrack = new FakeMediaStreamTrack('video');
    const displayStream = new FakeMediaStream([videoTrack]);

    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockResolvedValue(audioStream),
        getDisplayMedia: vi.fn().mockResolvedValue(displayStream),
      },
      configurable: true,
    });

    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      fillStyle: '#000',
      fillRect: vi.fn(),
    })) as unknown as typeof HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.captureStream = vi.fn(
      () => new FakeMediaStream([new FakeMediaStreamTrack('video')]) as unknown as MediaStream
    ) as unknown as typeof HTMLCanvasElement.prototype.captureStream;
  });

  it('starts an audio call and sends an offer', async () => {
    const sendMessage = vi.fn();
    const { result } = renderHook(() => useWebRTC(sendMessage));

    await act(async () => {
      await result.current.startAudioCall('peer-1');
    });

    expect(result.current.isCalling).toBe(true);
    expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'offer',
        to: 'peer-1',
        callType: 'audio',
      })
    );

    const peer = FakeRTCPeerConnection.instances[0];
    const hasReplaced = peer.transceivers.some((t) => t.sender.replaceTrack.mock.calls.length > 0);
    expect(hasReplaced).toBe(true);
  });

  it('handles remote offer and drains pending ICE', async () => {
    const sendMessage = vi.fn();
    const { result } = renderHook(() => useWebRTC(sendMessage));

    const candidate = { candidate: 'cand-1' } as RTCIceCandidateInit;

    await act(async () => {
      await result.current.handleRemoteIceCandidate(candidate);
    });

    await act(async () => {
      await result.current.handleRemoteOffer('peer-2', { type: 'offer', sdp: 'remote-sdp' });
    });

    expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'answer',
        to: 'peer-2',
      })
    );

    const peer = FakeRTCPeerConnection.instances[0];
    expect(peer.addIceCandidate).toHaveBeenCalledWith(candidate);
  });

  it('toggles microphone mute state', async () => {
    const sendMessage = vi.fn();
    const { result } = renderHook(() => useWebRTC(sendMessage));

    await act(async () => {
      await result.current.startAudioCall('peer-3');
    });

    const audioTrack = (result.current.localStream.current as unknown as FakeMediaStream)
      .getAudioTracks()[0] as FakeMediaStreamTrack;

    act(() => {
      result.current.toggleMicMute();
    });

    expect(result.current.isMicMuted).toBe(true);
    expect(audioTrack.enabled).toBe(false);

    act(() => {
      result.current.toggleMicMute();
    });

    expect(result.current.isMicMuted).toBe(false);
    expect(audioTrack.enabled).toBe(true);
  });

  it('starts and stops screen sharing', async () => {
    const sendMessage = vi.fn();
    const { result } = renderHook(() => useWebRTC(sendMessage));

    await act(async () => {
      await result.current.startAudioCall('peer-4');
    });

    await act(async () => {
      await result.current.startScreenShare();
    });

    expect(result.current.isScreenSharing).toBe(true);
    expect(result.current.localScreenStream).not.toBeNull();
    expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'screen-share',
        to: 'peer-4',
        action: 'started',
      })
    );

    await act(async () => {
      result.current.stopScreenShare();
    });

    expect(result.current.isScreenSharing).toBe(false);
    expect(result.current.localScreenStream).toBeNull();
    expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'screen-share',
        to: 'peer-4',
        action: 'stopped',
      })
    );
  });

  it('skips screen sharing when unsupported', async () => {
    const sendMessage = vi.fn();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { result } = renderHook(() => useWebRTC(sendMessage));

    const audioTrack = new FakeMediaStreamTrack('audio');
    const audioStream = new FakeMediaStream([audioTrack]);
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockResolvedValue(audioStream),
      },
      configurable: true,
    });

    await act(async () => {
      await result.current.startAudioCall('peer-5');
    });

    await act(async () => {
      await result.current.startScreenShare();
    });

    expect(result.current.isScreenSharing).toBe(false);
    expect(result.current.localScreenStream).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith('Screen sharing is not supported in this browser.');

    warnSpy.mockRestore();
  });
});
