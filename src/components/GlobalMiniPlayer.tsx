import React, { useEffect, useState } from 'react';
import { useGlobalAudio } from '@/contexts/GlobalAudioContext';
import { Button } from '@/components/ui/button';
import { Play, Pause, X, Music, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate, useLocation } from 'react-router-dom';

const GlobalMiniPlayer: React.FC = () => {
    const { audioState, pause, resume, reset } = useGlobalAudio();
    const navigate = useNavigate();
    const location = useLocation();
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        const checkStandalone = () => {
            const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                (window.navigator as any).standalone ||
                document.referrer.includes('android-app://');
            setIsStandalone(standalone);
        };
        checkStandalone();
    }, []);

    // Don't show on the intro page
    if (location.pathname === '/intro') return null;

    // Only show if there is audio active (playing, paused, or loading with content)
    // AND the mini player is not explicitly hidden (e.g. by a full-screen modal)
    const shouldShow = audioState.hasAudio && (audioState.audioUrl || audioState.isLoading) && !audioState.isMiniPlayerHidden;

    if (!shouldShow) return null;

    return (
        <div
            className={cn(
                "fixed left-0 right-0 z-40 mx-auto max-w-md px-4 transition-all duration-300 slide-in-from-bottom-10 animate-in fade-in",
                isStandalone
                    ? "bottom-[calc(4.2rem+env(safe-area-inset-bottom,12px))]"
                    : "bottom-[calc(5rem+env(safe-area-inset-bottom,20px))]",
                // Adjust position if on desktop or pages without bottom nav
                location.pathname === '/group-chats' ? "bottom-6" : ""
            )}
        >
            <div
                className="bg-slate-900/90 dark:bg-slate-800/90 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-3 flex items-center justify-between gap-3 text-white cursor-pointer"
                onClick={() => {
                    // Navigate to source if clicked? For now just maybe expand or do nothing specific
                    // Could navigate to Bible if isBibleMode
                    if (audioState.isBibleMode) {
                        navigate('/bible');
                    }
                }}
            >
                {/* Artwork / Icon */}
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0 overflow-hidden relative">
                    {audioState.trackImage && audioState.trackImage !== '/bible-icon.svg' ? (
                        <img src={audioState.trackImage} alt="Cover" className="h-full w-full object-cover" />
                    ) : (
                        audioState.isBibleMode ? <BookOpen className="h-6 w-6 text-white" /> : <Music className="h-6 w-6 text-white" />
                    )}

                    {/* Loading Indicator */}
                    {audioState.isLoading && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        </div>
                    )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 overflow-hidden">
                    <h4 className="font-bold text-sm truncate leading-tight">
                        {audioState.trackTitle || "Loading..."}
                    </h4>
                    <p className="text-xs text-slate-300 truncate">
                        {audioState.trackArtist || "Audio Player"}
                    </p>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-10 w-10 text-white hover:bg-white/10 rounded-full"
                        onClick={audioState.isPlaying ? pause : resume}
                    >
                        {audioState.isPlaying ?
                            <Pause className="h-5 w-5 fill-current" /> :
                            <Play className="h-5 w-5 fill-current ml-0.5" />
                        }
                    </Button>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10 rounded-full"
                        onClick={reset}
                    >
                        <X className="h-5 w-5" />
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default GlobalMiniPlayer;
