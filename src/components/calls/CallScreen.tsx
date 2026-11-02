import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronDown, Maximize2, Mic, MicOff, MonitorUp, PhoneCall, PhoneOff, RefreshCcw, UserPlus, Users, Video, VideoOff, Volume2, WifiOff, X,
} from 'lucide-react';
import MemberPicker, { type PickablePerson } from '@/components/messages/MemberPicker';
import { cn } from '@/lib/utils';
import { useCall, type CallInvite } from '@/contexts/CallContext';
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

/** Someone rung into the call: "Ringing…" until they join */
const InviteTile = ({ invite, compact }: { invite: CallInvite; compact?: boolean }) => (
  <div className="relative flex min-h-0 flex-col items-center justify-center gap-3 overflow-hidden rounded-3xl bg-slate-800/60 p-4">
    <div className="relative">
      {invite.status === 'ringing' && <span className="absolute inset-0 animate-ping rounded-full bg-blue-500/30" />}
      <UserAvatar name={invite.name} src={invite.avatar} seed={invite.userId} className={cn('relative', compact ? 'h-16 w-16' : 'h-24 w-24', invite.status !== 'ringing' && 'opacity-50')} />
    </div>
    <div className="text-center">
      <p className="max-w-[12rem] truncate text-sm font-semibold">{invite.name}</p>
      <p className={cn('mt-0.5 flex items-center justify-center gap-1 text-xs', invite.status === 'ringing' ? 'text-white/70' : 'text-red-300')}>
        {invite.status === 'ringing' && <PhoneCall className="h-3 w-3" />}
        {invite.status === 'ringing' ? 'Ringing…' : invite.status === 'declined' ? 'Declined' : 'No answer'}
      </p>
    </div>
  </div>
);

/** Like WhatsApp's "Add participant": ring friends (or anyone in the app) into this call */
const MAX_IN_CALL = 8;
const AddToCall = ({ userId, inCall, onAdd, onClose }: { userId: string; inCall: string[]; onAdd: (people: PickablePerson[]) => void; onClose: () => void }) => {
  const [picked, setPicked] = useState<PickablePerson[]>([]);
  const room = Math.max(0, MAX_IN_CALL - inCall.length - 1);
  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-end bg-black/60 animate-in fade-in" onClick={onClose}>
      <div
        className="flex max-h-[80%] flex-col rounded-t-3xl bg-background pb-[calc(env(safe-area-inset-bottom)+1rem)] text-foreground animate-in slide-in-from-bottom-8"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Add people to the call"
      >
        <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
          <p className="flex-1 text-[17px] font-semibold">Add to call</p>
          <button onClick={onClose} className="rounded-full p-2 text-muted-foreground hover:bg-muted" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-3">
          {room === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">This call is full ({MAX_IN_CALL} people).</p>
          ) : (
            <MemberPicker userId={userId} selected={picked} onChange={(next) => setPicked(next.slice(0, room))} excludeIds={[userId, ...inCall]} fill />
          )}
        </div>
        <div className="flex items-center gap-3 px-4 pt-3">
          <p className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
            {picked.length ? picked.map((p) => p.full_name || 'Member').join(', ') : room ? `Up to ${room} more ${room === 1 ? 'person' : 'people'}` : ''}
          </p>
          <button
            onClick={() => onAdd(picked)}
            disabled={!picked.length}
            className={cn('flex h-11 items-center gap-2 rounded-full px-5 text-[15px] font-semibold transition active:scale-95', picked.length ? 'bg-emerald-600 text-white' : 'bg-muted text-muted-foreground')}
          >
            <PhoneCall className="h-4 w-4" /> Ring {picked.length || ''}
          </button>
        </div>
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
    call, minimized, setMinimized, endCall, toggleMute, toggleVideo, flipCamera, toggleScreenShare, toggleSpeaker, invites, inviteToCall,
  } = useCall();
  const [adding, setAdding] = useState(false);
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
      : call.status === 'waiting' ? (call.isInitiator ? 'Ringing…' : call.isPrivate ? 'Connecting…' : 'Waiting for others…')
        : call.startedAt ? formatDuration(now - call.startedAt) : 'Connecting…';
  const canShare = isVideo && typeof (navigator.mediaDevices as any)?.getDisplayMedia === 'function' && !/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  const localHasVideo = isVideo && !call.videoOff && hasLiveVideo(call.localStream);
  const myName = (user?.user_metadata as any)?.full_name || 'You';

  if (minimized) {
    return createPortal(
      <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+6rem)] right-4 z-[9000] md:bottom-6">
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
  // People being rung in (not yet here). The person I called one-to-one, still ringing, is one of them too.
  const added = invites.filter((i) => !others.some((p) => p.userId === i.userId));
  const firstStillRinging = call.isPrivate && call.isInitiator && call.status === 'waiting' && others.length === 0 && added.length > 0;
  const ringing: CallInvite[] = firstStillRinging
    ? [{ userId: `chat-${call.chatId}`, name: call.chatName, status: 'ringing', at: call.startedAt ?? Date.now() }, ...added]
    : added;
  // A one-to-one call becomes a group call once someone else is added
  const solo = call.isPrivate && others.length <= 1 && ringing.length === 0;
  const tiles = others.length + ringing.length;
  const gridCols = tiles <= 1 ? 'grid-cols-1' : tiles <= 4 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2 lg:grid-cols-3';
  const title = call.isPrivate && !solo
    ? [...others.map((p) => p.name.split(' ')[0]), ...ringing.map((i) => i.name.split(' ')[0])].join(', ') || call.chatName
    : call.chatName;

  return createPortal(
    <div className="fixed inset-0 z-[9000] flex flex-col bg-slate-950 text-white animate-in fade-in duration-200">

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
          <p className="truncate text-base font-semibold">{title}</p>
          <p className="text-xs text-white/60">
            {statusText}
            {!solo && connected > 0 && ` · ${connected + 1} in call`}
          </p>
        </div>
        {solo ? (
          <div className="h-10 w-10" />
        ) : (
          <div className="flex h-10 min-w-10 items-center justify-center gap-1 rounded-full bg-white/10 px-3 text-sm">
            <Users className="h-4 w-4" /> {others.length + 1}
          </div>
        )}
      </div>

      {call.error && (
        <div className="mx-4 mb-2 rounded-2xl bg-amber-500/15 px-4 py-2 text-center text-sm text-amber-200">{call.error}</div>
      )}

      {/* Stage */}
      <div className="relative min-h-0 flex-1 px-3 pb-3">
        {tiles === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
            {localHasVideo && call.localStream ? (
              <div className="absolute inset-3 overflow-hidden rounded-3xl">
                <VideoElement stream={call.localStream} mirror={call.facingMode === 'user' && !call.screenSharing} />
                <div className="absolute inset-0 bg-slate-950/40" />
              </div>
            ) : null}
            <div className="relative">
              <span className="absolute inset-0 animate-ping rounded-full bg-blue-500/30" />
              {call.isPrivate ? (
                // One-to-one: their picture, with their name and "Ringing…" at the top
                <UserAvatar name={call.chatName} className="relative h-32 w-32 text-4xl shadow-2xl" />
              ) : (
                <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-blue-600 text-4xl font-semibold shadow-2xl">
                  {isVideo ? <Video className="h-12 w-12" /> : <Users className="h-12 w-12" />}
                </div>
              )}
            </div>
            {!call.isPrivate && (
              <div className="relative">
                <p className="text-2xl font-semibold">{call.isInitiator ? `Calling ${call.chatName}` : 'Joining call…'}</p>
                <p className="mt-1 text-white/60">{call.isInitiator ? 'Members will join as they pick up' : 'Connecting you to the others'}</p>
              </div>
            )}
          </div>
        ) : (
          <div className={cn('grid h-full auto-rows-fr gap-3', gridCols)}>
            {others.map((p) => <Tile key={p.userId} participant={p} compact={tiles > 2} />)}
            {ringing.map((i) => <InviteTile key={`invite-${i.userId}`} invite={i} compact={tiles > 2} />)}
          </div>
        )}

        {/* Self view */}
        {tiles > 0 && (
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
        {call.canSwitchSpeaker && (
          <ControlButton onClick={toggleSpeaker} active={call.speaker} label="Speaker">
            <Volume2 className="h-6 w-6" />
          </ControlButton>
        )}
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
        <ControlButton onClick={() => setAdding(true)} label="Add">
          <UserPlus className="h-6 w-6" />
        </ControlButton>
        <ControlButton onClick={endCall} danger label="Leave" className="w-16">
          <PhoneOff className="h-6 w-6" />
        </ControlButton>
      </div>

      {adding && user && (
        <AddToCall
          userId={user.id}
          inCall={[...others.map((p) => p.userId), ...ringing.filter((i) => i.status === 'ringing').map((i) => i.userId)]}
          onClose={() => setAdding(false)}
          onAdd={(people) => {
            setAdding(false);
            inviteToCall(people.map((p) => ({ id: p.id, name: p.full_name || 'Member', avatar: p.avatar_url ?? null })));
          }}
        />
      )}
    </div>,
    document.body,
  );
};

export default CallScreen;
