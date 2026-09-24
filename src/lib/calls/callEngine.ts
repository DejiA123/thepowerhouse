import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { getIceServers } from './iceServers';

export type CallType = 'audio' | 'video';

export type CallStatus =
  | 'starting'    // getting camera/mic, joining the room
  | 'waiting'     // in the room, nobody else has joined yet (caller hears ringback)
  | 'active'      // at least one other person is connected
  | 'ended';

export type PeerConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'failed';

export interface CallParticipant {
  userId: string;
  name: string;
  avatar?: string | null;
  stream: MediaStream | null;
  connection: PeerConnectionState;
  muted: boolean;
  videoOff: boolean;
  speaking: boolean;
}

export interface CallSnapshot {
  status: CallStatus;
  callId: string;
  chatId: string;
  chatName: string;
  callType: CallType;
  isInitiator: boolean;
  localStream: MediaStream | null;
  participants: CallParticipant[];
  muted: boolean;
  videoOff: boolean;
  screenSharing: boolean;
  facingMode: 'user' | 'environment';
  startedAt: number | null;
  selfSpeaking: boolean;
  error: string | null;
  endedReason: 'hangup' | 'no-answer' | 'error' | null;
}

export interface CallMe {
  id: string;
  name: string;
  avatar?: string | null;
}

interface PeerEntry {
  pc: RTCPeerConnection;
  polite: boolean;
  makingOffer: boolean;
  ignoreOffer: boolean;
  pendingCandidates: RTCIceCandidateInit[];
  disconnectTimer?: ReturnType<typeof setTimeout>;
  analyser?: { ctx: AudioContext; node: AnalyserNode; data: Uint8Array };
}

interface PresenceMeta {
  userId: string;
  name: string;
  avatar?: string | null;
  muted: boolean;
  videoOff: boolean;
}

type Listener = () => void;

const MAX_PARTICIPANTS = 8;

/**
 * Mesh group call over WebRTC with Supabase Realtime for signalling.
 *  - Presence on `call-room:<callId>` tells everyone who is in the call.
 *  - Every pair connects directly ("perfect negotiation" handles offer races).
 *  - ICE restarts recover calls when a phone switches between Wi-Fi and data.
 */
export class CallEngine {
  private snapshot: CallSnapshot;
  private listeners = new Set<Listener>();
  private channel: RealtimeChannel | null = null;
  private peers = new Map<string, PeerEntry>();
  private presence = new Map<string, PresenceMeta>();
  private iceServers: RTCIceServer[] = [];
  private cameraTrack: MediaStreamTrack | null = null;
  private speakingTimer?: ReturnType<typeof setInterval>;
  private localAnalyser?: { ctx: AudioContext; node: AnalyserNode; data: Uint8Array };
  private destroyed = false;

  constructor(
    private readonly me: CallMe,
    opts: { callId: string; chatId: string; chatName: string; callType: CallType; isInitiator: boolean },
  ) {
    this.snapshot = {
      status: 'starting',
      callId: opts.callId,
      chatId: opts.chatId,
      chatName: opts.chatName,
      callType: opts.callType,
      isInitiator: opts.isInitiator,
      localStream: null,
      participants: [],
      muted: false,
      videoOff: opts.callType === 'audio',
      screenSharing: false,
      facingMode: 'user',
      startedAt: null,
      selfSpeaking: false,
      error: null,
      endedReason: null,
    };
  }

  // ── Store interface for React (useSyncExternalStore) ──────────────
  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.snapshot;

  private set(patch: Partial<CallSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach((l) => l());
  }

  private updateParticipant(userId: string, patch: Partial<CallParticipant>) {
    const exists = this.snapshot.participants.some((p) => p.userId === userId);
    const meta = this.presence.get(userId);
    const participants = exists
      ? this.snapshot.participants.map((p) => (p.userId === userId ? { ...p, ...patch } : p))
      : [
          ...this.snapshot.participants,
          {
            userId,
            name: meta?.name ?? 'Member',
            avatar: meta?.avatar ?? null,
            stream: null,
            connection: 'connecting' as PeerConnectionState,
            muted: meta?.muted ?? false,
            videoOff: meta?.videoOff ?? this.snapshot.callType === 'audio',
            speaking: false,
            ...patch,
          },
        ];
    const anyConnected = participants.some((p) => p.connection === 'connected');
    this.set({
      participants,
      ...(anyConnected && this.snapshot.status !== 'active' && this.snapshot.status !== 'ended'
        ? { status: 'active' as CallStatus, startedAt: this.snapshot.startedAt ?? Date.now() }
        : {}),
    });
  }

  private removeParticipant(userId: string) {
    this.set({ participants: this.snapshot.participants.filter((p) => p.userId !== userId) });
  }

  // ── Lifecycle ──────────────────────────────────────────────────────
  async start() {
    try {
      const [stream, ice] = await Promise.all([this.getMedia(), getIceServers()]);
      if (this.destroyed) {
        stream?.getTracks().forEach((t) => t.stop());
        return;
      }
      this.iceServers = ice;
      this.cameraTrack = stream?.getVideoTracks()[0] ?? null;
      this.set({ localStream: stream, videoOff: !this.cameraTrack });
      this.watchLocalSpeaking(stream);
      await this.joinRoom();
      this.set({ status: this.snapshot.participants.some((p) => p.connection === 'connected') ? 'active' : 'waiting' });
      this.speakingTimer = setInterval(() => this.pollSpeaking(), 250);
    } catch (error) {
      console.error('[call] start failed', error);
      this.set({ error: this.describeMediaError(error) });
      this.end('error');
    }
  }

  private async getMedia(): Promise<MediaStream> {
    const audio: MediaTrackConstraints = { echoCancellation: true, noiseSuppression: true, autoGainControl: true };
    if (this.snapshot.callType === 'video') {
      try {
        return await navigator.mediaDevices.getUserMedia({
          audio,
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24, max: 30 } },
        });
      } catch (error) {
        // No camera / camera blocked: continue as a voice call rather than failing
        console.warn('[call] camera unavailable, falling back to audio', error);
        this.set({ error: 'Camera unavailable — joined with audio only.' });
      }
    }
    return navigator.mediaDevices.getUserMedia({ audio, video: false });
  }

  private describeMediaError(error: unknown) {
    const name = (error as DOMException)?.name;
    if (name === 'NotAllowedError' || name === 'SecurityError') {
      return 'Microphone access is blocked. Allow microphone access for this app in your settings and try again.';
    }
    if (name === 'NotFoundError') return 'No microphone was found on this device.';
    if (name === 'NotReadableError') return 'Your microphone is being used by another app.';
    return 'Could not start the call. Check your connection and try again.';
  }

  private async joinRoom() {
    const channel = supabase.channel(`call-room:${this.snapshot.callId}`, {
      config: { broadcast: { self: false, ack: false }, presence: { key: this.me.id } },
    });
    this.channel = channel;

    channel
      .on('presence', { event: 'sync' }, () => this.onPresenceSync())
      .on('presence', { event: 'leave' }, ({ key }) => {
        if (key && key !== this.me.id) this.dropPeer(key);
      })
      .on('broadcast', { event: 'signal' }, ({ payload }) => this.onSignal(payload))
      .on('broadcast', { event: 'bye' }, ({ payload }) => {
        if (payload?.from) this.dropPeer(payload.from);
      });

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Could not reach the call server')), 12000);
      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          clearTimeout(timeout);
          await channel.track(this.presenceMeta());
          resolve();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          clearTimeout(timeout);
          reject(new Error(`Call channel ${status}`));
        }
      });
    });
  }

  private presenceMeta(): PresenceMeta {
    return {
      userId: this.me.id,
      name: this.me.name,
      avatar: this.me.avatar ?? null,
      muted: this.snapshot.muted,
      videoOff: this.snapshot.videoOff,
    };
  }

  private onPresenceSync() {
    if (!this.channel) return;
    const state = this.channel.presenceState<PresenceMeta>();
    const present = new Set<string>();

    Object.entries(state).forEach(([key, metas]) => {
      const meta = metas[metas.length - 1];
      if (!meta || key === this.me.id) return;
      present.add(key);
      this.presence.set(key, meta);
      this.updateParticipant(key, {
        name: meta.name,
        avatar: meta.avatar ?? null,
        muted: meta.muted,
        videoOff: meta.videoOff,
      });
      if (!this.peers.has(key) && this.peers.size < MAX_PARTICIPANTS - 1) this.createPeer(key);
    });

    // Anyone no longer present has left
    this.snapshot.participants.forEach((p) => {
      if (!present.has(p.userId)) this.dropPeer(p.userId);
    });
  }

  // ── Peer connections (perfect negotiation) ─────────────────────────
  private createPeer(remoteId: string): PeerEntry {
    const pc = new RTCPeerConnection({ iceServers: this.iceServers, iceCandidatePoolSize: 2 });
    const entry: PeerEntry = {
      pc,
      polite: this.me.id > remoteId,
      makingOffer: false,
      ignoreOffer: false,
      pendingCandidates: [],
    };
    this.peers.set(remoteId, entry);
    this.updateParticipant(remoteId, { connection: 'connecting' });

    this.snapshot.localStream?.getTracks().forEach((track) => pc.addTrack(track, this.snapshot.localStream!));

    pc.onnegotiationneeded = async () => {
      try {
        entry.makingOffer = true;
        await pc.setLocalDescription();
        this.signal(remoteId, { description: pc.localDescription });
      } catch (error) {
        console.warn('[call] negotiation failed', error);
      } finally {
        entry.makingOffer = false;
      }
    };

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) this.signal(remoteId, { candidate: candidate.toJSON() });
    };

    pc.ontrack = ({ track, streams }) => {
      const stream = streams[0] ?? new MediaStream([track]);
      this.updateParticipant(remoteId, { stream });
      if (track.kind === 'audio') this.watchRemoteSpeaking(remoteId, stream);
      track.onunmute = () => this.updateParticipant(remoteId, { stream });
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === 'connected') {
        clearTimeout(entry.disconnectTimer);
        this.updateParticipant(remoteId, { connection: 'connected' });
      } else if (state === 'disconnected') {
        this.updateParticipant(remoteId, { connection: 'reconnecting' });
        clearTimeout(entry.disconnectTimer);
        entry.disconnectTimer = setTimeout(() => {
          if (pc.connectionState !== 'connected') pc.restartIce();
        }, 3000);
      } else if (state === 'failed') {
        this.updateParticipant(remoteId, { connection: 'reconnecting' });
        pc.restartIce();
      }
    };

    return entry;
  }

  private signal(to: string, data: { description?: RTCSessionDescription | null; candidate?: RTCIceCandidateInit }) {
    this.channel?.send({
      type: 'broadcast',
      event: 'signal',
      payload: { from: this.me.id, to, ...data },
    });
  }

  private async onSignal(payload: any) {
    if (!payload || payload.to !== this.me.id || payload.from === this.me.id) return;
    const remoteId: string = payload.from;
    const entry = this.peers.get(remoteId) ?? this.createPeer(remoteId);
    const { pc } = entry;

    try {
      if (payload.description) {
        const description = payload.description as RTCSessionDescriptionInit;
        const offerCollision =
          description.type === 'offer' && (entry.makingOffer || pc.signalingState !== 'stable');
        entry.ignoreOffer = !entry.polite && offerCollision;
        if (entry.ignoreOffer) return;

        await pc.setRemoteDescription(description);
        // Candidates that arrived before the description can be applied now
        for (const c of entry.pendingCandidates.splice(0)) {
          await pc.addIceCandidate(c).catch(() => undefined);
        }
        if (description.type === 'offer') {
          await pc.setLocalDescription();
          this.signal(remoteId, { description: pc.localDescription });
        }
      } else if (payload.candidate) {
        if (!pc.remoteDescription) {
          entry.pendingCandidates.push(payload.candidate);
          return;
        }
        try {
          await pc.addIceCandidate(payload.candidate);
        } catch (error) {
          if (!entry.ignoreOffer) console.warn('[call] bad ICE candidate', error);
        }
      }
    } catch (error) {
      console.warn('[call] signal handling failed', error);
    }
  }

  private dropPeer(userId: string) {
    const entry = this.peers.get(userId);
    if (entry) {
      clearTimeout(entry.disconnectTimer);
      entry.analyser?.ctx.close().catch(() => undefined);
      entry.pc.close();
      this.peers.delete(userId);
    }
    this.presence.delete(userId);
    this.removeParticipant(userId);
  }

  // ── Controls ───────────────────────────────────────────────────────
  toggleMute = () => {
    const muted = !this.snapshot.muted;
    this.snapshot.localStream?.getAudioTracks().forEach((t) => (t.enabled = !muted));
    this.set({ muted });
    this.channel?.track(this.presenceMeta());
  };

  toggleVideo = async () => {
    if (this.snapshot.callType === 'audio' && !this.cameraTrack) return;
    const videoOff = !this.snapshot.videoOff;
    this.snapshot.localStream?.getVideoTracks().forEach((t) => (t.enabled = !videoOff));
    this.set({ videoOff });
    this.channel?.track(this.presenceMeta());
  };

  flipCamera = async () => {
    if (!this.cameraTrack || this.snapshot.screenSharing) return;
    const facingMode = this.snapshot.facingMode === 'user' ? 'environment' : 'user';
    try {
      const fresh = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { exact: facingMode }, width: { ideal: 640 }, height: { ideal: 480 } },
      });
      const track = fresh.getVideoTracks()[0];
      await this.replaceVideoTrack(track);
      this.cameraTrack.stop();
      this.cameraTrack = track;
      this.set({ facingMode });
    } catch (error) {
      console.warn('[call] could not switch camera', error);
    }
  };

  toggleScreenShare = async () => {
    if (!this.cameraTrack) return;
    if (this.snapshot.screenSharing) {
      await this.replaceVideoTrack(this.cameraTrack);
      this.set({ screenSharing: false });
      return;
    }
    try {
      const display = await (navigator.mediaDevices as any).getDisplayMedia({ video: true });
      const screenTrack: MediaStreamTrack = display.getVideoTracks()[0];
      screenTrack.onended = () => {
        if (this.snapshot.screenSharing && this.cameraTrack) {
          this.replaceVideoTrack(this.cameraTrack);
          this.set({ screenSharing: false });
        }
      };
      await this.replaceVideoTrack(screenTrack);
      this.set({ screenSharing: true, videoOff: false });
    } catch {
      /* user cancelled the picker */
    }
  };

  private async replaceVideoTrack(track: MediaStreamTrack) {
    const stream = this.snapshot.localStream;
    if (stream) {
      stream.getVideoTracks().forEach((t) => stream.removeTrack(t));
      stream.addTrack(track);
      this.set({ localStream: new MediaStream(stream.getTracks()) });
    }
    await Promise.all(
      Array.from(this.peers.values()).map(async ({ pc }) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) await sender.replaceTrack(track);
      }),
    );
  }

  /** Leave the call. Resolves with how many other people were still in it. */
  hangup = async (): Promise<number> => {
    const others = this.snapshot.participants.length;
    await this.channel?.send({ type: 'broadcast', event: 'bye', payload: { from: this.me.id } }).catch(() => undefined);
    this.end('hangup');
    return others;
  };

  end(reason: CallSnapshot['endedReason']) {
    if (this.destroyed) return;
    this.destroyed = true;
    clearInterval(this.speakingTimer);
    this.peers.forEach((entry) => {
      clearTimeout(entry.disconnectTimer);
      entry.analyser?.ctx.close().catch(() => undefined);
      entry.pc.close();
    });
    this.peers.clear();
    this.localAnalyser?.ctx.close().catch(() => undefined);
    this.snapshot.localStream?.getTracks().forEach((t) => t.stop());
    this.cameraTrack?.stop();
    if (this.channel) {
      this.channel.untrack().catch(() => undefined);
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
    this.set({ status: 'ended', endedReason: this.snapshot.endedReason ?? reason, localStream: null });
  }

  // ── Active speaker detection ───────────────────────────────────────
  private makeAnalyser(stream: MediaStream) {
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx: AudioContext = new Ctx();
      const node = ctx.createAnalyser();
      node.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(node);
      return { ctx, node, data: new Uint8Array(node.frequencyBinCount) };
    } catch {
      return undefined;
    }
  }

  private watchLocalSpeaking(stream: MediaStream | null) {
    if (stream?.getAudioTracks().length) this.localAnalyser = this.makeAnalyser(stream);
  }

  private watchRemoteSpeaking(userId: string, stream: MediaStream) {
    const entry = this.peers.get(userId);
    if (entry && !entry.analyser) entry.analyser = this.makeAnalyser(stream);
  }

  private level(analyser?: { node: AnalyserNode; data: Uint8Array }) {
    if (!analyser) return 0;
    analyser.node.getByteFrequencyData(analyser.data);
    let sum = 0;
    for (let i = 0; i < analyser.data.length; i++) sum += analyser.data[i];
    return sum / analyser.data.length;
  }

  private pollSpeaking() {
    let changed = false;
    const participants = this.snapshot.participants.map((p) => {
      const speaking = !p.muted && this.level(this.peers.get(p.userId)?.analyser) > 18;
      if (speaking !== p.speaking) changed = true;
      return speaking === p.speaking ? p : { ...p, speaking };
    });
    const selfSpeaking = !this.snapshot.muted && this.level(this.localAnalyser) > 18;
    if (changed || selfSpeaking !== this.snapshot.selfSpeaking) this.set({ participants, selfSpeaking });
  }
}
