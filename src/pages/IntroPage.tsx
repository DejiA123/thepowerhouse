import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

const IntroPage = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [showTapToStart, setShowTapToStart] = useState(false);

  const handleGetStarted = () => {
    navigate("/auth");
  };

  const playVideo = async () => {
    if (videoRef.current) {
      try {
        videoRef.current.load(); // Force reload for iOS
        await videoRef.current.play();
        console.log('✅ Video playing');
        setVideoPlaying(true);
        setShowTapToStart(false);
      } catch (error) {
        console.error('❌ Video play failed:', error);
        setShowTapToStart(true);
      }
    }
  };

  const handleTapToStart = async () => {
    await playVideo();
  };

  useEffect(() => {
    // Robust iOS PWA detection
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && (navigator as any).maxTouchPoints > 1);
    const isStandaloneMQ = window.matchMedia('(display-mode: standalone)').matches;
    const isStandaloneNav = (window.navigator as any).standalone === true;
    const isPWA = isStandaloneMQ || isStandaloneNav;

    console.log('IntroPage iOS/PWA detection', { isIOS, isPWA, isStandaloneMQ, isStandaloneNav });

    if (videoRef.current) {
      // Ensure correct inline playback flags for iOS
      videoRef.current.muted = true;
      videoRef.current.setAttribute('muted', 'true');
      videoRef.current.setAttribute('playsinline', 'true');
      videoRef.current.setAttribute('webkit-playsinline', 'true');
    }

    const tryAuto = () => {
      playVideo();
    };

    if (isIOS && isPWA) {
      // Require user gesture in iOS PWA
      setShowTapToStart(true);
    } else {
      const timer = setTimeout(tryAuto, 100);
      // Cleanup for timer
      const cleanup = () => clearTimeout(timer);
      // Return cleanup later with other listeners
      (cleanup as any)._timer = true;
    }

    // Add user gesture listeners to reliably trigger playback
    const onUserGesture = () => {
      playVideo();
      document.removeEventListener('touchstart', onUserGesture);
      document.removeEventListener('click', onUserGesture);
    };
    document.addEventListener('touchstart', onUserGesture, { once: true });
    document.addEventListener('click', onUserGesture, { once: true });

    // Replay when app becomes visible
    const onVisibility = () => {
      if (!document.hidden && !videoPlaying) {
        playVideo();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      document.removeEventListener('touchstart', onUserGesture);
      document.removeEventListener('click', onUserGesture);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [videoPlaying]);

  return (
    <div className="relative h-screen w-full overflow-hidden" onClick={handleTapToStart} onTouchStart={handleTapToStart}>
      {/* Background Video */}
      <video
        ref={videoRef}
        src="/App_Intro_1.mp4"
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        className="absolute inset-0 w-full h-full object-cover z-10 bg-black transform-gpu"
        onError={(e) => {
          console.error('❌ Video error:', e);
          setShowTapToStart(true);
        }}
        onLoadedMetadata={() => {
          console.log('✅ Video metadata loaded');
          playVideo();
        }}
        onCanPlay={() => {
          console.log('✅ Video can play');
        }}
        onPlay={() => {
          console.log('✅ Video started playing');
          setVideoPlaying(true);
          setShowTapToStart(false);
        }}
        onPause={() => {
          console.log('⏸️ Video paused');
          setVideoPlaying(false);
        }}
      />

      {/* Tap to start overlay for iOS PWA */}
      {showTapToStart && !videoPlaying && (
        <div className="absolute inset-0 z-30 bg-black/70 flex items-center justify-center">
          <div className="text-center">
            <div className="text-white text-2xl mb-4">Tap to Start</div>
            <div className="text-white/70 text-sm">Tap anywhere to begin</div>
          </div>
        </div>
      )}


      {/* Content - Above everything */}
      <div className="relative z-20 flex flex-col items-center justify-between h-screen px-6 py-12">
        {/* Spacer to push content down */}
        <div className="flex-[2]" />
        
        {/* Text Content */}
        <div className="flex-1 flex items-end justify-center pb-8">
          <div className="text-center max-w-2xl">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 drop-shadow-2xl">
              Welcome to,
            </h1>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-8 drop-shadow-2xl">
              The Power House International App
            </h2>
            <p className="text-xl md:text-3xl text-white font-light drop-shadow-2xl">
              Experience Intimacy, Transformation & Dominion
            </p>
          </div>
        </div>

        {/* Bottom CTA Button */}
        <div className="w-full max-w-md pb-8">
          <Button
            onClick={handleGetStarted}
            size="lg"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg py-7 rounded-full shadow-2xl font-semibold transition-all hover:scale-105"
          >
            Get started
          </Button>
        </div>
      </div>
    </div>
  );
};

export default IntroPage;
