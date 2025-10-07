
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import DebugOverlay from "@/components/DebugOverlay"; // Import the new component

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
    console.log('safePlay() called.');
    const video = videoRef.current;
    if (video && video.paused) {
      try {
        console.log('Attempting to play video...', { 
          src: video.src, 
          readyState: video.readyState, 
          networkState: video.networkState,
          error: video.error 
        });
        await video.play();
        console.log('video.play() promise was resolved. Video should be playing.');
      } catch (error) {
        console.error('⚠️ video.play() was rejected. This is often a browser policy issue.', error);
      }
    } else {
      console.log('safePlay() called but video was not paused. Current state:', { paused: video?.paused });
    }
  };

  useEffect(() => {
    console.log('IntroPage useEffect running. isIOSPWA:', isIOSPWA);
    const video = videoRef.current;
    if (!video) {
      console.error("Video ref is not available on mount!");
      return;
    }

    // --- CRITICAL ERROR LISTENER ---
    const onError = (e: Event) => {
      console.error('🔥🔥🔥 Video Element Error Event Fired! 🔥🔥🔥');
      // The error object itself doesn't have much, but the video element's error property does
      const error = video.error;
      if (error) {
        console.error('Video Error Details:', {
          code: error.code,
          message: error.message, // This is the most important piece of info!
        });
         switch (error.code) {
          case error.MEDIA_ERR_ABORTED:
            console.error('Error Diagnosis: The video playback was aborted.');
            break;
          case error.MEDIA_ERR_NETWORK:
            console.error('Error Diagnosis: A network error caused the video download to fail.');
            break;
          case error.MEDIA_ERR_DECODE:
            console.error('Error Diagnosis: The video playback was aborted due to a corruption problem or because the video used features your browser did not support.');
            break;
          case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
            console.error('Error Diagnosis: The video could not be loaded, either because the server or network failed or because the format is not supported.');
            break;
          default:
            console.error('Error Diagnosis: An unknown error occurred.');
            break;
        }
      } else {
        console.error("The 'error' event fired, but the video.error property is null. Event object:", e);
      }
    };

    video.muted = true;
    video.loop = true;

    const onPlay = () => {
      console.log("Event: 'play' - Video has started playing.");
      setVideoPlaying(true);
    };
    const onPause = () => {
      console.log("Event: 'pause' - Video has been paused.");
      setVideoPlaying(false);
    };
    const onStalled = () => {
      console.warn("Event: 'stalled' - Playback stalled. Browser is trying to fetch data but it is not available.");
    };
     const onCanPlay = () => {
      console.log("Event: 'canplay' - Browser can play media, but estimates that not enough data has been loaded to play through to the end.");
    };
    const onCanPlayThrough = () => {
      console.log("Event: 'canplaythrough' - Browser estimates it can play through the media without stopping for buffering.");
    };
    const onWaiting = () => {
      console.warn("Event: 'waiting' - Playback has stopped because of a temporary lack of data.");
    }

    // Adding all listeners
    video.addEventListener('error', onError);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('stalled', onStalled);
    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('canplaythrough', onCanPlayThrough);
    video.addEventListener('waiting', onWaiting);

    if (!isIOSPWA) {
      console.log('Not an iOS PWA, attempting autoplay.');
      video.autoplay = true;
      safePlay();
    } else {
      console.log('iOS PWA detected. Autoplay is disabled. Awaiting user interaction.');
    }
    
    // Cleanup
    return () => {
      console.log('Cleaning up IntroPage useEffect listeners.');
      video.removeEventListener('error', onError);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('stalled', onStalled);
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('canplaythrough', onCanPlayThrough);
      video.removeEventListener('waiting', onWaiting);
    };
  }, [isIOSPWA]);

  return (
    <div className="relative h-screen w-full overflow-hidden bg-black" onClick={safePlay}>
       {/* The Debug Overlay will only render in PWA mode */}
      {isIOSPWA && <DebugOverlay />}

      <video
        ref={videoRef}
        src="/App_Intro_1.mp4?v=6" // Incremented version to bypass browser cache
        loop
        muted
        playsInline
        webkit-playsinline // More aggressive inline playback for iOS
        preload="auto" // Changed to auto for better loading
        className="absolute inset-0 w-full h-full object-cover z-10"
      />
      
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
