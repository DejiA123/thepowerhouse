import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { appAlert } from '@/lib/appAlert';
import { CallEngine, type CallSnapshot, type CallType } from '@/lib/calls/callEngine';
import { installAudioUnlock, playCue, startRingtone } from '@/lib/calls/ringtone';
import { broadcast, onBroadcast, uniqueTopic } from '@/lib/realtime';
import { sendPush } from '@/lib/push';
import IncomingCallScreen from '@/components/calls/IncomingCallScreen';
import CallScreen from '@/components/calls/CallScreen';

export interface IncomingCall {
  callId: string;
  chatId: string;
  chatName: string;
  callType: CallType;
  initiatorId: string;
  initiatorName: string;
  initiatorAvatar?: string | null;
  receivedAt: number;
}

export interface OngoingCall {
  callId: string;
  chatId: string;
  callType: CallType;
  initiatorName?: string;
}

interface CallContextType {
  /** Snapshot of the call this device is in (null when not in a call) */
  call: CallSnapshot | null;
  incomingCall: IncomingCall | null;
  /** Calls currently running in chats (so members can join late) */
  ongoingCalls: Record<string, OngoingCall>;
  minimized: boolean;
  setMinimized: (value: boolean) => void;
  startCall: (chat: { id: string; name: string }, type: CallType) => Promise<void>;
  joinCall: (call: { callId: string; chatId: string; chatName: string; callType: CallType }) => Promise<void>;
  acceptCall: () => void;
  declineCall: () => void;
  endCall: () => void;
  refreshOngoingCall: (chatId: string) => Promise<void>;
  // controls
  toggleMute: () => void;
  toggleVideo: () => void;
  flipCamera: () => void;
  toggleScreenShare: () => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) throw new Error('useCall must be used within CallProvider');
  return context;
};

const RING_TIMEOUT_MS = 45_000;
const signalsTopic = (chatId: string) => `chat-signals:${chatId}`;

const noopSubscribe = () => () => undefined;
const nullSnapshot = () => null;

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [engine, setEngine] = useState<CallEngine | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [ongoingCalls, setOngoingCalls] = useState<Record<string, OngoingCall>>({});
  const [minimized, setMinimized] = useState(false);
  const [chatIds, setChatIds] = useState<string[]>([]);

  const engineRef = useRef<CallEngine | null>(null);
  engineRef.current = engine;
  const declinedRef = useRef(new Set<string>());
  const chatIdsRef = useRef<string[]>([]);
  const chatNamesRef = useRef<Record<string, string>>({});

  const call = useSyncExternalStore(
    engine ? engine.subscribe : noopSubscribe,
    engine ? engine.getSnapshot : nullSnapshot,
  );

  const me = useMemo(() => {
    if (!user) return null;
    const meta = (user.user_metadata || {}) as { full_name?: string; avatar_url?: string };
    return {
      id: user.id,
      name: meta.full_name || user.email?.split('@')[0] || 'Member',
      avatar: meta.avatar_url ?? null,
    };
  }, [user]);

  useEffect(() => installAudioUnlock(), []);

  // ── Which chats am I in? (listen for calls only there) ────────────
  const loadChats = useCallback(async () => {
    if (!user) {
      setChatIds([]);
      return;
    }
    const { data } = await supabase
      .from('chat_participants')
      .select('chat_id, group_chats(name)')
      .eq('user_id', user.id);
    const ids: string[] = [];
    (data || []).forEach((row: any) => {
      ids.push(row.chat_id);
      if (row.group_chats?.name) chatNamesRef.current[row.chat_id] = row.group_chats.name;
    });
    chatIdsRef.current = ids;
    setChatIds(ids);
  }, [user]);

  useEffect(() => {
    loadChats();
    const onChanged = () => loadChats();
    window.addEventListener('chats:changed', onChanged);
    return () => window.removeEventListener('chats:changed', onChanged);
  }, [loadChats]);

  // ── Incoming call signals on each of my chats ─────────────────────
  useEffect(() => {
    if (!user) return;
    const offs = chatIds.map((chatId) =>
      onBroadcast(signalsTopic(chatId), 'signal', (signal) => {
        const payload = signal?.payload || {};
        if (signal?.type === 'call-started') {
          const info: OngoingCall = {
            callId: payload.callId,
            chatId: payload.chatId || chatId,
            callType: payload.callType === 'video' ? 'video' : 'audio',
            initiatorName: payload.initiatorName,
          };
          setOngoingCalls((prev) => ({ ...prev, [info.chatId]: info }));
          if (payload.initiatorId === user.id || declinedRef.current.has(payload.callId)) return;
          if (engineRef.current && engineRef.current.getSnapshot().status !== 'ended') return; // busy
          setIncomingCall({
            callId: payload.callId,
            chatId: info.chatId,
            chatName: payload.groupName || chatNamesRef.current[info.chatId] || 'Group chat',
            callType: info.callType,
            initiatorId: payload.initiatorId,
            initiatorName: payload.initiatorName || 'Someone',
            initiatorAvatar: payload.initiatorAvatar ?? null,
            receivedAt: Date.now(),
          });
        } else if (signal?.type === 'call-ended') {
          setOngoingCalls((prev) => {
            if (prev[chatId]?.callId !== payload.callId) return prev;
            const next = { ...prev };
            delete next[chatId];
            return next;
          });
          setIncomingCall((prev) => (prev?.callId === payload.callId ? null : prev));
        }
      }),
    );
    return () => offs.forEach((off) => off());
  }, [chatIds, user]);

  // Backup path: the database row (covers a missed broadcast)
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(uniqueTopic('call-sessions'))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'call_sessions' }, async ({ new: row }: any) => {
        if (!row || row.initiated_by === user.id || row.status !== 'ringing') return;
        if (!chatIdsRef.current.includes(row.chat_id)) return;
        if (declinedRef.current.has(row.id) || engineRef.current) return;
        setIncomingCall((prev) =>
          prev ?? {
            callId: row.id,
            chatId: row.chat_id,
            chatName: chatNamesRef.current[row.chat_id] || 'Group chat',
            callType: row.call_type === 'video' ? 'video' : 'audio',
            initiatorId: row.initiated_by,
            initiatorName: 'A member',
            receivedAt: Date.now(),
          },
        );
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Ring while an incoming call is showing; give up after the timeout
  useEffect(() => {
    if (!incomingCall) return;
    const stop = startRingtone('incoming');
    const timeout = setTimeout(() => {
      setIncomingCall(null);
      appAlert(`Missed ${incomingCall.callType} call`, `${incomingCall.initiatorName} · ${incomingCall.chatName}`);
    }, Math.max(1000, RING_TIMEOUT_MS - (Date.now() - incomingCall.receivedAt)));
    return () => {
      stop();
      clearTimeout(timeout);
    };
  }, [incomingCall]);

  // "Decline" tapped on the OS notification
  useEffect(() => {
    const onDeclined = (e: Event) => {
      const callId = (e as CustomEvent).detail?.callId;
      if (callId) declinedRef.current.add(callId);
      setIncomingCall((prev) => (prev?.callId === callId ? null : prev));
    };
    window.addEventListener('app:call-declined', onDeclined);
    return () => window.removeEventListener('app:call-declined', onDeclined);
  }, []);

  // ── Engine lifecycle ───────────────────────────────────────────────
  const launch = useCallback(async (opts: { callId: string; chatId: string; chatName: string; callType: CallType; isInitiator: boolean }) => {
    if (!me) return null;
    engineRef.current?.end('hangup');
    const next = new CallEngine(me, opts);
    setMinimized(false);
    setEngine(next);
    await next.start();
    const snap = next.getSnapshot();
    if (snap.status === 'ended') {
      appAlert('Call could not start', snap.error ?? undefined, 'error');
      setEngine(null);
      return null;
    }
    if (snap.error) appAlert(snap.error);
    return next;
  }, [me]);

  const startCall = useCallback(async (chat: { id: string; name: string }, type: CallType) => {
    if (!user || !me) return;
    if (engineRef.current && engineRef.current.getSnapshot().status !== 'ended') {
      appAlert("You're already in a call");
      return;
    }
    // Get the microphone/camera first: if that fails, nobody gets rung for nothing
    const callId = crypto.randomUUID();
    const started = await launch({ callId, chatId: chat.id, chatName: chat.name, callType: type, isInitiator: true });
    if (!started) return;

    const { data, error } = await supabase
      .from('call_sessions')
      .insert({ id: callId, chat_id: chat.id, initiated_by: user.id, call_type: type, status: 'ringing', started_at: new Date().toISOString() })
      .select('id')
      .single();
    if (error || !data) {
      console.error('Failed to create call', error);
      started.end('error');
      setEngine(null);
      appAlert('Call failed', 'Could not start the call. Please try again.', 'error');
      return;
    }

    setOngoingCalls((prev) => ({ ...prev, [chat.id]: { callId: data.id, chatId: chat.id, callType: type, initiatorName: me.name } }));
    await broadcast(signalsTopic(chat.id), 'signal', {
      type: 'call-started',
      from: user.id,
      payload: {
        callId: data.id,
        chatId: chat.id,
        groupName: chat.name,
        initiatorId: user.id,
        initiatorName: me.name,
        initiatorAvatar: me.avatar,
        callType: type,
      },
    });
    sendPush({ type: 'call', callId: data.id });
  }, [user, me, launch]);

  const joinCall = useCallback(async (info: { callId: string; chatId: string; chatName: string; callType: CallType }) => {
    setIncomingCall(null);
    if (engineRef.current?.getSnapshot().callId === info.callId && engineRef.current.getSnapshot().status !== 'ended') {
      setMinimized(false);
      return;
    }
    await launch({ ...info, isInitiator: false });
  }, [launch]);

  const acceptCall = useCallback(() => {
    if (!incomingCall) return;
    joinCall(incomingCall);
  }, [incomingCall, joinCall]);

  const declineCall = useCallback(() => {
    if (incomingCall) declinedRef.current.add(incomingCall.callId);
    setIncomingCall(null);
  }, [incomingCall]);

  // Calls where someone other than me connected at some point
  const answeredCallsRef = useRef(new Set<string>());

  const finishCall = useCallback(async (eng: CallEngine, reason: 'hangup' | 'no-answer') => {
    const snap = eng.getSnapshot();
    const others = reason === 'no-answer' ? (eng.end('no-answer'), 0) : await eng.hangup();
    playCue('end');
    if (others === 0) {
      const status = reason === 'no-answer' ? 'missed' : 'ended';
      await supabase
        .from('call_sessions')
        .update({ status, ended_at: new Date().toISOString() })
        .eq('id', snap.callId);
      await broadcast(signalsTopic(snap.chatId), 'signal', { type: 'call-ended', from: user?.id, payload: { callId: snap.callId } });
      setOngoingCalls((prev) => {
        const next = { ...prev };
        delete next[snap.chatId];
        return next;
      });
      // Nobody answered (timed out, or the caller gave up): replace the ringing notification
      if (snap.isInitiator && (reason === 'no-answer' || !answeredCallsRef.current.has(snap.callId))) {
        sendPush({ type: 'call-missed', callId: snap.callId });
      }
    }
    setEngine(null);
    setMinimized(false);
  }, [user]);

  const endCall = useCallback(() => {
    if (engineRef.current) finishCall(engineRef.current, 'hangup');
  }, [finishCall]);

  // Caller: stop ringing everyone if nobody picks up
  useEffect(() => {
    if (!engine || !call?.isInitiator || call.status !== 'waiting') return;
    const stop = startRingtone('outgoing');
    const timeout = setTimeout(() => {
      if (engine.getSnapshot().status === 'waiting') {
        appAlert('No answer', `Nobody joined the call in ${call.chatName}.`);
        finishCall(engine, 'no-answer');
      }
    }, RING_TIMEOUT_MS);
    return () => {
      stop();
      clearTimeout(timeout);
    };
  }, [engine, call?.isInitiator, call?.status, call?.chatName, finishCall]);

  // Mark the call active once someone connects; cue joins/leaves
  const lastCountRef = useRef(0);
  useEffect(() => {
    if (!call) {
      lastCountRef.current = 0;
      return;
    }
    const connected = call.participants.filter((p) => p.connection === 'connected').length;
    if (connected > 0) answeredCallsRef.current.add(call.callId);
    if (connected > lastCountRef.current) playCue('join');
    else if (connected < lastCountRef.current && call.status !== 'ended') playCue('leave');
    if (lastCountRef.current === 0 && connected > 0 && call.isInitiator) {
      supabase.from('call_sessions').update({ status: 'active' }).eq('id', call.callId).then(() => undefined);
    }
    lastCountRef.current = connected;
  }, [call]);

  // Engine ended on its own (e.g. error)
  useEffect(() => {
    if (call?.status === 'ended' && engine) {
      setEngine(null);
      setMinimized(false);
    }
  }, [call?.status, engine]);

  // Close the call cleanly if the tab is closed mid-call
  useEffect(() => {
    const onUnload = () => engineRef.current?.end('hangup');
    window.addEventListener('pagehide', onUnload);
    return () => window.removeEventListener('pagehide', onUnload);
  }, []);

  // ── Deep link from a call notification: /group-chats?chat=..&call=.. ─
  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(location.search);
    const callId = params.get('call');
    if (!callId) return;
    params.delete('call');
    const autoAnswer = params.get('answer') === '1';
    params.delete('answer');
    navigate({ pathname: location.pathname, search: params.toString() ? `?${params}` : '' }, { replace: true });

    (async () => {
      const { data: row } = await supabase
        .from('call_sessions')
        .select('id, chat_id, call_type, status, initiated_by, group_chats(name)')
        .eq('id', callId)
        .maybeSingle();
      if (!row || (row.status !== 'ringing' && row.status !== 'active')) {
        appAlert('This call has ended');
        return;
      }
      const info = {
        callId: row.id,
        chatId: row.chat_id,
        chatName: (row as any).group_chats?.name || 'Group chat',
        callType: (row.call_type === 'video' ? 'video' : 'audio') as CallType,
      };
      if (autoAnswer) {
        joinCall(info);
      } else {
        const { data: caller } = await supabase.from('profiles').select('full_name').eq('id', row.initiated_by).maybeSingle();
        setIncomingCall({
          ...info,
          initiatorId: row.initiated_by,
          initiatorName: caller?.full_name?.trim() || 'A member',
          receivedAt: Date.now(),
        });
      }
    })();
  }, [location.search, location.pathname, user, navigate, joinCall]);

  const refreshOngoingCall = useCallback(async (chatId: string) => {
    const since = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from('call_sessions')
      .select('id, chat_id, call_type, status, started_at')
      .eq('chat_id', chatId)
      .in('status', ['ringing', 'active'])
      .gte('started_at', since)
      .order('started_at', { ascending: false })
      .limit(1);
    const row = data?.[0];
    setOngoingCalls((prev) => {
      const next = { ...prev };
      if (row) next[chatId] = { callId: row.id, chatId, callType: row.call_type === 'video' ? 'video' : 'audio' };
      else delete next[chatId];
      return next;
    });
  }, []);

  const value: CallContextType = {
    call: call && call.status !== 'ended' ? call : null,
    incomingCall,
    ongoingCalls,
    minimized,
    setMinimized,
    startCall,
    joinCall,
    acceptCall,
    declineCall,
    endCall,
    refreshOngoingCall,
    toggleMute: () => engineRef.current?.toggleMute(),
    toggleVideo: () => engineRef.current?.toggleVideo(),
    flipCamera: () => engineRef.current?.flipCamera(),
    toggleScreenShare: () => engineRef.current?.toggleScreenShare(),
  };

  return (
    <CallContext.Provider value={value}>
      {children}
      {incomingCall && !value.call && (
        <IncomingCallScreen call={incomingCall} onAccept={acceptCall} onDecline={declineCall} />
      )}
      {value.call && <CallScreen />}
    </CallContext.Provider>
  );
};
