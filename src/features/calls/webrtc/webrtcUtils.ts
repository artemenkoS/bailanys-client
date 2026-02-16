export const getMicStream = async () => {
  return navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: false,
    },
  });
};

export const applyMuteState = (stream: MediaStream | null, muted: boolean) => {
  if (!stream) return;
  for (const track of stream.getAudioTracks()) {
    track.enabled = !muted;
  }
};

export const applyLowLatencySender = async (peer: RTCPeerConnection) => {
  const sender = peer.getSenders().find((s) => s.track?.kind === 'audio');
  if (!sender) return;

  const p = sender.getParameters();
  p.encodings = p.encodings?.length ? p.encodings : [{}];
  p.encodings[0].priority = 'high';
  p.encodings[0].networkPriority = 'high';

  try {
    await sender.setParameters(p);
  } catch {
    // ignore
  }
};

export const attachLocalAudio = async (peer: RTCPeerConnection, stream: MediaStream) => {
  const track = stream.getAudioTracks()[0];
  if (!track) return;
  const existing = peer.getSenders().find((s) => s.track?.kind === 'audio');
  if (existing) {
    await existing.replaceTrack(track);
    return;
  }
  peer.addTrack(track, stream);
};

type RemoteAudioManagerOptions = {
  getInitialVolume?: (peerId: string) => number | null | undefined;
};

type RemoteAudioManager = {
  ensure: (peerId: string) => HTMLAudioElement;
  cleanup: (peerId: string) => void;
  cleanupAll: () => void;
  setVolume: (peerId: string, volume: number) => void;
  get: (peerId: string) => HTMLAudioElement | undefined;
};

export const createRemoteAudioManager = (options?: RemoteAudioManagerOptions): RemoteAudioManager => {
  const audioMap = new Map<string, HTMLAudioElement>();

  const resolveVolume = (peerId: string) => {
    const value = options?.getInitialVolume?.(peerId);
    return typeof value === 'number' ? value : 1;
  };

  const ensure = (peerId: string) => {
    const existing = audioMap.get(peerId);
    if (existing) return existing;
    const audio = new Audio();
    audio.autoplay = true;
    audio.muted = false;
    audio.volume = resolveVolume(peerId);
    audio.setAttribute('playsinline', 'true');
    document.body.appendChild(audio);
    audioMap.set(peerId, audio);
    return audio;
  };

  const cleanup = (peerId: string) => {
    const audio = audioMap.get(peerId);
    if (!audio) return;
    audio.srcObject = null;
    audio.remove();
    audioMap.delete(peerId);
  };

  const cleanupAll = () => {
    for (const peerId of Array.from(audioMap.keys())) {
      cleanup(peerId);
    }
  };

  const setVolume = (peerId: string, volume: number) => {
    const audio = audioMap.get(peerId);
    if (audio) audio.volume = volume;
  };

  const get = (peerId: string) => audioMap.get(peerId);

  return {
    ensure,
    cleanup,
    cleanupAll,
    setVolume,
    get,
  };
};

export const createPendingIceManager = () => {
  const pending = new Map<string, RTCIceCandidateInit[]>();

  const push = (peerId: string, candidate: RTCIceCandidateInit) => {
    const list = pending.get(peerId) ?? [];
    list.push(candidate);
    pending.set(peerId, list);
  };

  const drain = (peerId: string) => {
    const list = pending.get(peerId) ?? [];
    pending.delete(peerId);
    return list;
  };

  const clear = (peerId: string) => {
    pending.delete(peerId);
  };

  const clearAll = () => {
    pending.clear();
  };

  return {
    push,
    drain,
    clear,
    clearAll,
  };
};
