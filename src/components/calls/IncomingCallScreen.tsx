import { createPortal } from 'react-dom';
import { Phone, PhoneOff, Video } from 'lucide-react';
import UserAvatar from '@/components/common/UserAvatar';
import type { IncomingCall } from '@/contexts/CallContext';

interface Props {
  call: IncomingCall;
  onAccept: () => void;
  onDecline: () => void;
}

/** Full-screen ringing screen on phones, floating card on larger screens. */
const IncomingCallScreen = ({ call, onAccept, onDecline }: Props) => {
  const isVideo = call.callType === 'video';

  return createPortal(
    <div
      role="alertdialog"
      aria-label={`Incoming ${call.callType} call from ${call.initiatorName}`}
      className="fixed inset-0 z-[10000] flex items-end justify-center sm:items-start sm:justify-end sm:p-6 pointer-events-none"
    >
      <div className="pointer-events-auto relative flex h-[100dvh] w-full flex-col items-center justify-between overflow-hidden bg-gradient-to-b from-slate-900 via-slate-950 to-black px-6 pb-[calc(env(safe-area-inset-bottom)+3rem)] pt-[calc(env(safe-area-inset-top)+4rem)] text-white animate-in fade-in duration-300 sm:h-auto sm:w-[360px] sm:rounded-3xl sm:px-6 sm:py-6 sm:shadow-2xl sm:ring-1 sm:ring-white/10 sm:slide-in-from-top-4">
        <div className="absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-blue-600/30 blur-3xl sm:hidden" />

        <div className="relative flex flex-col items-center text-center sm:flex-row sm:gap-4 sm:text-left sm:w-full">
          <div className="relative mb-6 sm:mb-0">
            <span className="absolute inset-0 rounded-full bg-blue-500/40 animate-ping" />
            <UserAvatar
              name={call.initiatorName}
              src={call.initiatorAvatar}
              seed={call.initiatorId}
              className="relative h-28 w-28 ring-4 ring-white/10 sm:h-14 sm:w-14 sm:ring-2"
            />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium uppercase tracking-wider text-blue-300/90">
              {isVideo ? 'Incoming video call' : 'Incoming voice call'}
            </p>
            <h2 className="mt-2 truncate text-3xl font-semibold sm:mt-0.5 sm:text-lg">{call.initiatorName}</h2>
            <p className="mt-1 truncate text-base text-white/60 sm:text-sm">{call.chatName}</p>
          </div>
        </div>

        <div className="relative mt-10 flex w-full max-w-xs items-center justify-between sm:mt-5 sm:max-w-none sm:justify-end sm:gap-3">
          <div className="flex flex-col items-center gap-2 sm:flex-row">
            <button
              onClick={onDecline}
              className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-red-500 shadow-lg shadow-red-500/30 transition active:scale-90 sm:h-12 sm:w-12"
              aria-label="Decline"
            >
              <PhoneOff className="h-8 w-8 sm:h-5 sm:w-5" />
            </button>
            <span className="text-sm text-white/70 sm:hidden">Decline</span>
          </div>
          <div className="flex flex-col items-center gap-2 sm:flex-row">
            <button
              onClick={onAccept}
              className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/30 transition active:scale-90 sm:h-12 sm:w-12 animate-[bounce_1.4s_ease-in-out_infinite] sm:animate-none"
              aria-label="Accept"
            >
              {isVideo ? <Video className="h-8 w-8 sm:h-5 sm:w-5" /> : <Phone className="h-8 w-8 sm:h-5 sm:w-5" />}
            </button>
            <span className="text-sm text-white/70 sm:hidden">Accept</span>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default IncomingCallScreen;
