import React, { useEffect, useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { GroupChatService } from "@/services/groupChatService";

interface CallOverlayProps {
    chatId: string;
    isActive: boolean;
    onEndCall: () => void;
}

const CallOverlay = ({ chatId, isActive, onEndCall }: CallOverlayProps) => {
    const { user } = useAuth();
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());

    // Controls
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);

    const localVideoRef = useRef<HTMLVideoElement>(null);
    const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());

    // Initialize Call
    useEffect(() => {
        if (isActive && user) {
            startCall();
        }
        return () => {
            stopCall();
        };
    }, [isActive, user]);

    // Handle Signaling
    useEffect(() => {
        if (!isActive || !user) return;

        const channel = GroupChatService.subscribeToSignals(chatId, async (signal) => {
            if (signal.from === user.id) return; // Ignore own signals

            const { type, payload, from } = signal;

            if (type === 'offer') {
                await handleOffer(payload, from);
            } else if (type === 'answer') {
                await handleAnswer(payload, from);
            } else if (type === 'ice-candidate') {
                await handleCandidate(payload, from);
            } else if (type === 'join-call') {
                // New user joined, initiate offer
                createPeerConnection(from, true);
            }
        });

        // Announce presence
        GroupChatService.sendSignal(chatId, 'join-call', {}, undefined);

        return () => {
            GroupChatService.unsubscribe(channel);
        };
    }, [isActive, user, localStream]);


    const startCall = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true,
            });
            setLocalStream(stream);
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Error accessing media devices:", err);
            onEndCall();
        }
    };

    const stopCall = () => {
        localStream?.getTracks().forEach(track => track.stop());
        setLocalStream(null);

        // Close all peer connections
        peerConnections.current.forEach(pc => pc.close());
        peerConnections.current.clear();
        setRemoteStreams(new Map());
    };

    const createPeerConnection = async (remoteUserId: string, isInitiator: boolean) => {
        if (peerConnections.current.has(remoteUserId)) return;

        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        });

        peerConnections.current.set(remoteUserId, pc);

        // Add local tracks
        localStream?.getTracks().forEach(track => {
            pc.addTrack(track, localStream!);
        });

        // Handle remote tracks
        pc.ontrack = (event) => {
            setRemoteStreams(prev => {
                const newMap = new Map(prev);
                newMap.set(remoteUserId, event.streams[0]);
                return newMap;
            });
        };

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                GroupChatService.sendSignal(chatId, 'ice-candidate', event.candidate, remoteUserId);
            }
        };

        if (isInitiator) {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            GroupChatService.sendSignal(chatId, 'offer', offer, remoteUserId);
        }

        return pc;
    };

    const handleOffer = async (offer: RTCSessionDescriptionInit, fromUserId: string) => {
        const pc = await createPeerConnection(fromUserId, false);
        if (!pc) return;

        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        GroupChatService.sendSignal(chatId, 'answer', answer, fromUserId);
    };

    const handleAnswer = async (answer: RTCSessionDescriptionInit, fromUserId: string) => {
        const pc = peerConnections.current.get(fromUserId);
        if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
        }
    };

    const handleCandidate = async (candidate: RTCIceCandidateInit, fromUserId: string) => {
        const pc = peerConnections.current.get(fromUserId);
        if (pc) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
    };

    // Toggles
    const toggleMute = () => {
        if (localStream) {
            localStream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
            setIsMuted(!isMuted);
        }
    };

    const toggleVideo = () => {
        if (localStream) {
            localStream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
            setIsVideoOff(!isVideoOff);
        }
    };


    if (!isActive) return null;

    return (
        <div className="absolute inset-0 z-50 bg-slate-900/95 backdrop-blur-sm flex flex-col p-4 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2 text-white/80">
                    <Users className="w-5 h-5" />
                    <span className="font-medium text-sm">Group Call ({remoteStreams.size + 1})</span>
                </div>
                <div className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-bold animate-pulse">
                    Live
                </div>
            </div>

            {/* Video Grid */}
            <div className="flex-1 grid grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr">
                {/* Local Video */}
                <div className="relative bg-slate-800 rounded-2xl overflow-hidden aspect-video shadow-lg ring-1 ring-white/10">
                    <video
                        ref={localVideoRef}
                        autoPlay
                        muted
                        playsInline
                        className={cn("w-full h-full object-cover transform scale-x-[-1]", isVideoOff && "hidden")}
                    />
                    {/* Fallback avatar */}
                    <div className={cn("absolute inset-0 flex items-center justify-center", !isVideoOff && "hidden")}>
                        <div className="w-20 h-20 rounded-full bg-indigo-600 flex items-center justify-center text-white text-2xl font-bold">
                            You
                        </div>
                    </div>
                    <div className="absolute bottom-3 right-3 bg-black/60 px-2 py-1 rounded-md text-white text-xs backdrop-blur-md">
                        You {isMuted && '(Muted)'}
                    </div>
                </div>

                {/* Remote Videos */}
                {Array.from(remoteStreams.entries()).map(([userId, stream]) => (
                    <div key={userId} className="relative bg-slate-800 rounded-2xl overflow-hidden aspect-video shadow-lg ring-1 ring-white/10">
                        <RemoteVideo stream={stream} />
                        <div className="absolute bottom-3 right-3 bg-black/60 px-2 py-1 rounded-md text-white text-xs backdrop-blur-md">
                            User {userId.split('-')[0]}
                        </div>
                    </div>
                ))}
            </div>

            {/* Controls Bar */}
            <div className="h-24 flex items-center justify-center gap-6 mt-6">
                <Button
                    size="lg"
                    variant={isMuted ? "destructive" : "secondary"}
                    className="rounded-full w-14 h-14"
                    onClick={toggleMute}
                >
                    {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </Button>

                <Button
                    size="lg"
                    variant="destructive"
                    className="rounded-full w-20 h-20 shadow-red-500/20 shadow-2xl"
                    onClick={onEndCall}
                >
                    <PhoneOff className="w-8 h-8" />
                </Button>

                <Button
                    size="lg"
                    variant={isVideoOff ? "destructive" : "secondary"}
                    className="rounded-full w-14 h-14"
                    onClick={toggleVideo}
                >
                    {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                </Button>
            </div>
        </div>
    );
};

// Helper component for remote video
const RemoteVideo = ({ stream }: { stream: MediaStream }) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    return <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />;
}

export default CallOverlay;
