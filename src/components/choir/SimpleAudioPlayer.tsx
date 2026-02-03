import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

interface SimpleAudioPlayerProps {
    src: string;
    autoPlay?: boolean;
    className?: string;
}

export const SimpleAudioPlayer = ({ src, autoPlay = false, className }: SimpleAudioPlayerProps) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        if (autoPlay && audioRef.current) {
            const playPromise = audioRef.current.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.error("Autoplay prevented:", error);
                    setIsPlaying(false);
                });
            }
        }
    }, [src, autoPlay]);

    const togglePlay = () => {
        if (!audioRef.current) return;

        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const toggleMute = () => {
        if (!audioRef.current) return;
        audioRef.current.muted = !isMuted;
        setIsMuted(!isMuted);
    };

    const handleTimeUpdate = () => {
        if (!audioRef.current || isDragging) return;
        setCurrentTime(audioRef.current.currentTime);
    };

    const handleLoadedMetadata = () => {
        if (!audioRef.current) return;
        setDuration(audioRef.current.duration);
    };

    const handleSeek = (value: number[]) => {
        if (!audioRef.current) return;
        const newTime = value[0];
        setCurrentTime(newTime);
        audioRef.current.currentTime = newTime;
    };

    const formatTime = (time: number) => {
        if (isNaN(time)) return "0:00";
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const skipForward = () => {
        if (!audioRef.current) return;
        audioRef.current.currentTime = Math.min(audioRef.current.currentTime + 10, duration);
    };

    const skipBackward = () => {
        if (!audioRef.current) return;
        audioRef.current.currentTime = Math.max(audioRef.current.currentTime - 10, 0);
    };

    return (
        <div className={cn("w-full bg-slate-900/50 backdrop-blur-md rounded-3xl p-6 border border-white/10 shadow-xl", className)}>
            <audio
                ref={audioRef}
                src={src}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
            />

            <div className="space-y-6">
                {/* Progress Bar */}
                <div className="space-y-2">
                    <Slider
                        value={[currentTime]}
                        max={duration || 100}
                        step={0.1}
                        onValueChange={(val) => {
                            setIsDragging(true);
                            setCurrentTime(val[0]);
                        }}
                        onValueCommit={(val) => {
                            setIsDragging(false);
                            handleSeek(val);
                        }}
                        className="cursor-pointer py-2"
                    />
                    <div className="flex justify-between text-xs font-bold text-slate-400 font-mono">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-slate-400 hover:text-white hover:bg-white/10 rounded-full"
                        onClick={toggleMute}
                    >
                        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </Button>

                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-white hover:bg-white/10 rounded-full h-10 w-10"
                            onClick={skipBackward}
                        >
                            <RotateCcw className="w-5 h-5 -scale-x-100" />
                            <span className="sr-only">-10s</span>
                        </Button>

                        <Button
                            className="h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/30 flex items-center justify-center transition-transform active:scale-95"
                            onClick={togglePlay}
                        >
                            {isPlaying ? (
                                <Pause className="w-6 h-6 fill-current" />
                            ) : (
                                <Play className="w-6 h-6 fill-current ml-1" />
                            )}
                        </Button>

                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-white hover:bg-white/10 rounded-full h-10 w-10"
                            onClick={skipForward}
                        >
                            <RotateCcw className="w-5 h-5" />
                            <span className="sr-only">+10s</span>
                        </Button>
                    </div>

                    <div className="w-10" /> {/* Spacer for balance */}
                </div>
            </div>
        </div>
    );
};
