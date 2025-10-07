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
    // Prevent the click from bubbling up to the parent div which would trigger safePlay
    e.stopPropagation();
    navigate("/auth");
  };

  // Function to attempt to play the video
  const safePlay = () => {
    const video = videoRef.current;
    if (video && video.paused) {
      // The play() method returns a Promise.
      // We'll catch potential errors to avoid unhandled promise rejections.
      video.play().catch(error => {
        console.warn('⚠️ Video play() was rejected. This is expected on iOS if not user-initiated.', error);
      });
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Set properties for inline playback, crucial for iOS
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', 'true');
    video.muted = true; // Muted is essential for any autoplay attempt
    video.loop = true;

    // Event listeners to update our videoPlaying state
    const onPlay = () => setVideoPlaying(true);
    const onPause = () => setVideoPlaying(false);

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);

    // On non-iOS PWAs, we can be more aggressive with autoplay.
    if (!isIOSPWA) {
      video.autoplay = true;
      safePlay();
    }
    
    // Cleanup listeners on component unmount
    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
    };
  }, [isIOSPWA]);

  return (
    // Make the entire container clickable to play the video
    <div className="relative h-screen w-full overflow-hidden bg-black" onClick={safePlay}>
      {/* Background Video */}
      <video
        ref={videoRef}
        src="/App_Intro_1.mp4?v=5" // Appended version for cache-busting
        loop
        muted
        playsInline
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover z-10"
      />
      
      {/* Visual Poster Overlay (not clickable itself) */}
      {/* This is shown when the video is not playing and fades out when it starts */}
      <div
        className={`absolute inset-0 z-20 transition-opacity duration-500 ${!videoPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        aria-hidden={videoPlaying}
      >
        <img
          src="/placeholder.svg"
          alt="Intro background poster"
          className="w-full h-full object-cover"
          loading="eager"
        />
      </div>

      {/* Content - Above the video and poster */}
      <div className="relative z-30 flex flex-col items-center justify-between h-screen px-6 py-12">
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
