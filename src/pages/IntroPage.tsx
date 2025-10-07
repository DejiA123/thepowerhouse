
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

const IntroPage = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoPlaying, setVideoPlaying] = useState(false);

  // iOS PWA detection
  const isIOS = typeof navigator !== 'undefined' && ((/iPad|iPhone|iPod/.test(navigator.userAgent)) || (navigator.platform === 'MacIntel' && (navigator as any).maxTouchPoints > 1));
  const isStandalone = typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || ((window as any).navigator)?.standalone);
  const isIOSPWA = isIOS && isStandalone;

  const handleGetStarted = (e: React.MouseEvent) => {
    e.stopPropagation(); // Stop click from bubbling to the parent div
    navigate("/auth");
  };

  // Async function to attempt to play the video safely
  const safePlay = async () => {
    const video = videoRef.current;
    if (video && video.paused) {
      try {
        console.log('Attempting to play video. ReadyState:', video.readyState);
        await video.play();
        console.log('video.play() promise resolved.');
      } catch (error) {
        console.error('⚠️ Video play() was rejected.', error);
      }
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.loop = true;

    const onPlay = () => {
      console.log("Video 'play' event triggered.");
      setVideoPlaying(true);
    };
    const onPause = () => {
      console.log("Video 'pause' event triggered.");
      setVideoPlaying(false);
    };
    const onStalled = () => {
      console.warn('Video playback stalled. Check network or service worker.');
    };

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('stalled', onStalled);

    if (!isIOSPWA) {
      video.autoplay = true;
      safePlay();
    }
    
    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('stalled', onStalled);
    };
  }, [isIOSPWA]);

  return (
    <div className="relative h-screen w-full overflow-hidden bg-black" onClick={safePlay}>
      <video
        ref={videoRef}
        src="/App_Intro_1.mp4?v=5"
        loop
        muted
        playsInline
        webkit-playsinline // More aggressive inline playback for iOS
        preload="metadata"     // Only load metadata initially
        className="absolute inset-0 w-full h-full object-cover z-10"
      />
      
      {/* Visual Poster Overlay */}
      <div
        className={`absolute inset-0 z-20 transition-opacity duration-500 ${videoPlaying ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        aria-hidden={videoPlaying}
      >
        <img
          src="/placeholder.svg"
          alt="Intro background poster"
          className="w-full h-full object-cover"
          loading="eager"
        />
      </div>

      {/* Content Layer (non-interactive by default) */}
      <div className="relative z-30 flex flex-col items-center justify-between h-screen px-6 py-12 pointer-events-none">
        <div className="flex-[2]" />
        
        <div className="flex-1 flex items-end justify-center pb-8 text-center max-w-2xl">
          <div>
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

        {/* Button container (re-enables interaction) */}
        <div className="w-full max-w-md pb-8 pointer-events-auto">
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
