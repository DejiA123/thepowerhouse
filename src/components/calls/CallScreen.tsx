import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronDown, Maximize2, Mic, MicOff, MonitorUp, PhoneOff, RefreshCcw, Users, Video, VideoOff, WifiOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCall } from '@/contexts/CallContext';
import { useAuth } from '@/contexts/AuthContext';
import UserAvatar from '@/components/common/UserAvatar';
import type { CallParticipant } from '@/lib/calls/callEngine';

const formatDuration = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(h ? 2 : 1, '0');
  return h ? `${h}:${mm}:${String(s).padStart(2, '0')}` : `${mm}:${String(s).padStart(2, '0')}`;
};

const useNow = (active: boolean) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);
  return now;
};

const hasLiveVideo = (stream: MediaStream | null) =>
  !!stream?.getVideoTracks().some((t) => t.readyState === 'live' && !t.muted);

/** Plays a participant's audio (kept separate so audio continues when video is hidden). */
const RemoteAudio = ({ stream }: { stream: MediaStream | null }) => {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream;
      ref.current.play().catch(() => undefined);
    }
  }, [stream]);
  return <audio ref={ref} autoPlay playsInline />;
};

const VideoElement = ({ stream, mirror, className }: { stream: MediaStream; mirror?: boolean; className?: string }) => {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.srcObject = stream;
      ref.current.play().catch(() => undefined);
    }
  }, [stream]);
  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted
      className={cn('h-full w-full object-cover', mirror && '-scale-x-100', className)}
    />
  );
};

const Tile = ({ participant, compact }: { participant: CallParticipant; compact?: boolean }) => {
  const showVideo = !participant.videoOff && hasLiveVideo(participant.stream);
  return (
    <div
      className={cn(
        'relative flex min-h-0 items-center justify-center overflow-hidden rounded-3xl bg-slate-800/80 transition-shadow duration-200',
        participant.speaking && 'ring-4 ring-emerald-400/80',
      )}
    >
      {showVideo && participant.stream ? (
        <VideoElement stream={participant.stream} />
      ) : (
        <div className="flex flex-col items-center gap-3 p-4">
          <UserAvatar
            name={participant.name}
            src={participant.avatar}
            seed={participant.userId}
            className={cn(compact ? 'h-16 w-16' : 'h-24 w-24', participant.speaking && 'scale-105 transition-transform')}
          />
        </div>
      )}
      {participant.connection !== 'connected' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/60 text-sm text-white/80 backdrop-blur-sm">
          {participant.connection === 'reconnecting' ? <WifiOff className="h-5 w-5" /> : (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          )}
          {participant.connection === 'reconnecting' ? 'Reconnecting…' : 'Connecting…'}
        </div>
      )}
      <div className="absolute bottom-3 left-3 flex max-w-[80%] items-center gap-1.5 rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white backdrop-blur">
        {participant.muted && <MicOff className="h-3.5 w-3.5 text-red-400" />}
        <span className="truncate">{participant.name}</span>
      </div>
    </div>
  );
};

const ControlButton = ({
  onClick, active, danger, label, children, className,
}: { onClick: () => void; active?: boolean; danger?: boolean; label: string; children: React.ReactNode; className?: string }) => (
  <div className="flex flex-col items-center gap-1.5">
    <button
      onClick={onClick}
      aria-label={label}
      className={cn(
        'flex h-14 w-14 items-center justify-center rounded-full transition active:scale-90',
        danger ? 'bg-red-500 text-white hover:bg-red-600' : active ? 'bg-white text-slate-900' : 'bg-white/15 text-white hover:bg-white/25',
        className,
      )}
    >
      {children}
    </button>
    <span className="text-[11px] text-white/70">{label}</span>
  </div>
);

const CallScreen = () => {
  const { user } = useAuth();
  const {
    call, minimized, setMinimized, endCall, toggleMute, toggleVideo, flipCamera, toggleScreenShare,
  } = useCall();
  const [canFlip, setCanFlip] = useState(false);
  const now = useNow(!!call);

  useEffect(() => {
    navigator.mediaDevices?.enumerateDevices?.().then((devices) => {
      setCanFlip(devices.filter((d) => d.kind === 'videoinput').length > 1);
    }).catch(() => undefined);
  }, [call?.localStream]);

  if (!call) return null;

  const isVideo = call.callType === 'video';
  const connected = call.participants.filter((p) => p.connection === 'connected').length;
  const statusText =
    call.status === 'starting' ? 'Starting…'
      : call.status === 'waiting' ? (call.isInitiator ? 'Ringing…' : 'Waiting for others…')
        : call.startedAt ? formatDuration(now - call.startedAt) : 'Connecting…';
  const canShare = isVideo && typeof (navigator.mediaDevices as any)?.getDisplayMedia === 'function' && !/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  const localHasVideo = isVideo && !call.videoOff && hasLiveVideo(call.localStream);
  const myName = (user?.user_metadata as any)?.full_name || 'You';

  // Audio keeps playing whether the call is minimised or not
  const audio = call.participants.map((p) => <RemoteAudio key={`a-${p.userId}`} stream={p.stream} />);

  if (minimized) {
    return createPortal(
      <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+6rem)] right-4 z-[9000] md:bottom-6">
        {audio}
        <div className="flex items-center gap-2 rounded-full bg-slate-900/95 p-1.5 pl-2 text-white shadow-2xl ring-1 ring-white/10 backdrop-blur animate-in slide-in-from-bottom-4">
          <button onClick={() => setMinimized(false)} className="flex items-center gap-2 pr-1" aria-label="Open call">
            <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500">
              {isVideo ? <Video className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              {call.participants.some((p) => p.speaking) && <span className="absolute inset-0 rounded-full ring-2 ring-emerald-300 animate-ping" />}
            </span>
            <span className="text-left leading-tight">
              <span className="block max-w-[140px] truncate text-sm font-semibold">{call.chatName}</span>
              <span className="block text-xs text-white/60">{statusText}</span>
            </span>
            <Maximize2 className="h-4 w-4 text-white/60" />
          </button>
          <button onClick={toggleMute} className={cn('flex h-9 w-9 items-center justify-center rounded-full', call.muted ? 'bg-white text-slate-900' : 'bg-white/15')} aria-label={call.muted ? 'Unmute' : 'Mute'}>
            {call.muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>
          <button onClick={endCall} className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500" aria-label="Leave call">
            <PhoneOff className="h-4 w-4" />
          </button>
        </div>
      </div>,
      document.body,
    );
  }

  const others = call.participants;
  const gridCols = others.length <= 1 ? 'grid-cols-1' : others.length <= 4 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2 lg:grid-cols-3';

  return createPortal(
    <div className="fixed inset-0 z-[9000] flex flex-col bg-slate-950 text-white animate-in fade-in duration-200">
      {audio}

      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
        <button
          onClick={() => setMinimized(true)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
          aria-label="Minimise call"
        >
          <ChevronDown className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-base font-semibold">{call.chatName}</p>
          <p className="text-xs text-white/60">
            {statusText}
            {connected > 0 && ` · ${connected + 1} in call`}
          </p>
        </div>
        <div className="flex h-10 min-w-10 items-center justify-center gap-1 rounded-full bg-white/10 px-3 text-sm">
          <Users className="h-4 w-4" /> {others.length + 1}
        </div>
      </div>

      {call.error && (
        <div className="mx-4 mb-2 rounded-2xl bg-amber-500/15 px-4 py-2 text-center text-sm text-amber-200">{call.error}</div>
      )}

      {/* Stage */}
      <div className="relative min-h-0 flex-1 px-3 pb-3">
        {others.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
            {localHasVideo && call.localStream ? (
              <div className="absolute inset-3 overflow-hidden rounded-3xl">
                <VideoElement stream={call.localStream} mirror={call.facingMode === 'user' && !call.screenSharing} />
                <div className="absolute inset-0 bg-slate-950/40" />
              </div>
            ) : null}
            <div className="relative">
              <span className="absolute inset-0 animate-ping rounded-full bg-blue-500/30" />
              <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-blue-600 text-4xl font-semibold shadow-2xl">
                {isVideo ? <Video className="h-12 w-12" /> : <Users className="h-12 w-12" />}
              </div>
            </div>
            <div className="relative">
              <p className="text-2xl font-semibold">{call.isInitiator ? `Calling ${call.chatName}` : 'Joining call…'}</p>
              <p className="mt-1 text-white/60">{call.isInitiator ? 'Members will join as they pick up' : 'Connecting you to the others'}</p>
            </div>
          </div>
        ) : (
          <div className={cn('grid h-full auto-rows-fr gap-3', gridCols)}>
            {others.map((p) => <Tile key={p.userId} participant={p} compact={others.length > 2} />)}
          </div>
        )}

        {/* Self view */}
        {others.length > 0 && (
          <div
            className={cn(
              'absolute bottom-6 right-6 overflow-hidden rounded-2xl bg-slate-800 shadow-2xl ring-2 transition-all',
              call.selfSpeaking ? 'ring-emerald-400' : 'ring-white/15',
              localHasVideo ? 'h-40 w-28 sm:h-48 sm:w-36' : 'h-20 w-20 rounded-full',
            )}
          >
            {localHasVideo && call.localStream ? (
              <VideoElement stream={call.localStream} mirror={call.facingMode === 'user' && !call.screenSharing} />
            ) : (
              <UserAvatar name={myName} seed={user?.id} className="h-full w-full" />
            )}
            {call.muted && (
              <div className="absolute right-1.5 top-1.5 rounded-full bg-red-500 p-1">
                <MicOff className="h-3 w-3" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-start justify-center gap-4 px-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-3 sm:gap-6">
        <ControlButton onClick={toggleMute} active={call.muted} label={call.muted ? 'Unmute' : 'Mute'}>
          {call.muted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
        </ControlButton>
        {isVideo && (
          <ControlButton onClick={toggleVideo} active={call.videoOff} label={call.videoOff ? 'Camera on' : 'Camera off'}>
            {call.videoOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
          </ControlButton>
        )}
        {isVideo && canFlip && !call.videoOff && (
          <ControlButton onClick={flipCamera} label="Flip">
            <RefreshCcw className="h-6 w-6" />
          </ControlButton>
        )}
        {canShare && (
          <ControlButton onClick={toggleScreenShare} active={call.screenSharing} label={call.screenSharing ? 'Stop share' : 'Share'}>
            <MonitorUp className="h-6 w-6" />
          </ControlButton>
        )}
        <ControlButton onClick={endCall} danger label="Leave" className="w-16">
          <PhoneOff className="h-6 w-6" />
        </ControlButton>
      </div>
    </div>,
    document.body,
  );
};

export default CallScreen;
