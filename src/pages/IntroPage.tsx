import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

const IntroPage = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  // iOS PWA detection and video helpers
  const isIOS = typeof navigator !== 'undefined' && ((/iPad|iPhone|iPod/.test(navigator.userAgent)) || (navigator.platform === 'MacIntel' && (navigator as any).maxTouchPoints > 1));
  const isStandalone = typeof window !== 'undefined' && ((((window as any).navigator)?.standalone) || window.matchMedia('(display-mode: standalone)').matches);
  const avoidOverflowHidden = isIOS && isStandalone;

  const handleGetStarted = () => {
    if (videoRef.current && !videoPlaying) {
      safePlay();
    }
    navigate("/auth");
  };

  const safePlay = async () => {
    if (videoRef.current) {
      try {
        await videoRef.current.play();
        console.log('✅ Video playing');
      } catch (error) {
        console.warn('⚠️ play() failed, will retry on gesture', error);
      }
    }
  };
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    // Ensure inline playback on iOS PWA before load
    v.setAttribute('playsinline', '');
    (v as any).playsInline = true;
    v.setAttribute('webkit-playsinline', 'true');
    v.muted = true;
    v.autoplay = true;
    v.loop = true;

    const onCanPlay = () => {
      setVideoReady(true);
      safePlay();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        safePlay();
      }
    };
    const onGesture = () => safePlay();

    v.addEventListener('canplay', onCanPlay);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('touchend', onGesture, { once: true, passive: true } as any);
    window.addEventListener('click', onGesture, { once: true } as any);

    // Try immediately too
    safePlay();

    return () => {
      v.removeEventListener('canplay', onCanPlay);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('touchend', onGesture);
      window.removeEventListener('click', onGesture);
    };
  }, []);
  return (
    <div className={`relative h-screen w-full ${avoidOverflowHidden ? '' : 'overflow-hidden'}`} onClick={safePlay}>
      {/* Background Video */}
      <video
        ref={videoRef}
        src="/App_Intro_1.mp4?v=5"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        poster="/placeholder.svg"
        className="absolute inset-0 w-full h-full object-cover z-10 bg-black transform-gpu will-change-transform [backface-visibility:hidden]"
        crossOrigin="anonymous"
        onError={(e) => {
          console.error('❌ Video error:', e);
        }}
        onLoadedData={() => {
          console.log('✅ Video loaded');
        }}
        onCanPlay={() => {
          console.log('✅ Video can play');
          setVideoReady(true);
        }}
        onPlay={() => {
          console.log('▶️ Video playing');
          setVideoPlaying(true);
        }}
        onPause={() => {
          console.log('⏸️ Video paused');
          setVideoPlaying(false);
        }}
        {...{ 'webkit-playsinline': 'true' }}
      />
      {/* Poster fallback overlay for iOS PWA to avoid black screen */}
      <div
        className={`absolute inset-0 z-15 pointer-events-none transition-opacity duration-500 ${!videoPlaying ? 'opacity-100' : 'opacity-0'}`}
        aria-hidden="true"
      >
        <img
          src="/placeholder.svg"
          alt="Intro background poster"
          className="w-full h-full object-cover"
          loading="eager"
        />
      </div>

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
