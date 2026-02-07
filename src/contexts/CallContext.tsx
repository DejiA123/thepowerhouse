import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { GroupChatService, CallSession } from '@/services/groupChatService';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff, Video } from 'lucide-react';

interface CallContextType {
    activeCall: CallSession | null;
    incomingCall: CallSession | null;
    acceptCall: () => void;
    declineCall: () => void;
    endCall: () => void;
    startCall: (chatId: string, type: 'audio' | 'video') => Promise<void>;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export const useCall = () => {
    const context = useContext(CallContext);
    if (!context) throw new Error('useCall must be used within CallProvider');
    return context;
};

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [activeCall, setActiveCall] = useState<CallSession | null>(null);
    const [incomingCall, setIncomingCall] = useState<CallSession | null>(null);
    const { user } = useAuth();
    const { toast } = useToast();

    useEffect(() => {
        if (!user) return;

        const channel = GroupChatService.subscribeToCalls(async (call) => {
            if (call.initiated_by === user.id) return;
            if (call.status !== 'ringing') return;

            // Check if user is participant
            const isParticipant = await GroupChatService.isParticipant(call.chat_id);
            if (isParticipant) {
                console.log('📞 Incoming call detected:', call);
                setIncomingCall(call);

                // Also play sound or show toast
                toast({
                    title: "Incoming Call",
                    description: `Incoming ${call.call_type} call...`,
                    duration: 10000,
                });
            }
        });

        return () => {
            GroupChatService.unsubscribe(channel);
        };
    }, [user]);

    const startCall = async (chatId: string, type: 'audio' | 'video') => {
        try {
            const session = await GroupChatService.initiateCall(chatId, type);
            setActiveCall(session);
        } catch (error) {
            console.error('Failed to start call:', error);
            toast({
                title: "Call Failed",
                description: "Could not initiate the call. Please try again.",
                variant: "destructive"
            });
        }
    };

    const acceptCall = () => {
        if (incomingCall) {
            setActiveCall(incomingCall);
            setIncomingCall(null);
        }
    };

    const declineCall = () => {
        setIncomingCall(null);
    };

    const endCall = () => {
        if (activeCall) {
            GroupChatService.endCall(activeCall.id);
            setActiveCall(null);
        }
    };

    return (
        <CallContext.Provider value={{ activeCall, incomingCall, acceptCall, declineCall, endCall, startCall }}>
            {children}
            {incomingCall && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[10000] w-[90%] max-w-md bg-white dark:bg-slate-900 shadow-2xl rounded-2xl p-4 border border-indigo-100 dark:border-slate-800 animate-in slide-in-from-top duration-300">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-indigo-500 flex items-center justify-center text-white animate-pulse">
                                {incomingCall.call_type === 'video' ? <Video /> : <Phone />}
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-white">Incoming {incomingCall.call_type} Call</h3>
                                <p className="text-xs text-slate-500">Someone is calling the group</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="destructive"
                                size="icon"
                                className="rounded-full h-12 w-12"
                                onClick={declineCall}
                            >
                                <PhoneOff className="w-5 h-5" />
                            </Button>
                            <Button
                                variant="default"
                                size="icon"
                                className="rounded-full h-12 w-12 bg-green-500 hover:bg-green-600"
                                onClick={acceptCall}
                            >
                                <Phone className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </CallContext.Provider>
    );
};
