
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

const IntroPage = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);

  const isIOS = typeof navigator !== 'undefined' && ((/iPad|iPhone|iPod/.test(navigator.userAgent)) || (navigator.platform === 'MacIntel' && (navigator as any).maxTouchPoints > 1));
  const isStandalone = typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || ((window as any).navigator)?.standalone);
  const isIOSPWA = isIOS && isStandalone;

  const handleGetStarted = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate("/auth");
  };

  const safePlay = async () => {
    if (!videoLoaded) {
      console.log("safePlay() called, but video is not loaded yet (oncanplaythrough has not fired). Ignoring.");
      return;
    }
    console.log('safePlay() called.');
    const video = videoRef.current;

    if (video) {
        console.log('Video State on safePlay tap:', {
            paused: video.paused,
            ended: video.ended,
            readyState: video.readyState, // 4 means HAVE_ENOUGH_DATA
            networkState: video.networkState, // 1 means NETWORK_IDLE
            currentTime: video.currentTime,
            src: video.src.substring(0, 40) + '...',
            error: video.error,
        });
        try {
            console.log('Attempting to call video.play().');
            await video.play();
            console.log('video.play() promise was resolved.');
        } catch (error: any) {
            if (error.name === 'AbortError') {
                console.log('video.play() was aborted, likely because it was already playing. This is safe to ignore.');
            } else {
                console.error('⚠️ video.play() was rejected with an unexpected error.', error);
            }
        }
    } else {
        console.error('safePlay called but video ref is null!');
    }
  };

  useEffect(() => {
    console.log('IntroPage useEffect running. isIOSPWA:', isIOSPWA);
    const video = videoRef.current;
    if (!video) {
      console.error("Video ref is not available on mount!");
      return;
    }

    let objectUrl: string | null = null;

    const onPlay = () => {
        console.log("Event: 'play' - Video has started playing.");
        setVideoPlaying(true);
    };
    const onPause = () => {
        console.log("Event: 'pause' - Video has been paused.");
        setVideoPlaying(false);
    };
    const onWaiting = () => {
        console.warn("Event: 'waiting' - Playback stopped due to temporary lack of data.");
    };
    const onStalled = () => {
        console.warn("Event: 'stalled' - Browser is trying to fetch data but it is not available.");
    };
    const onError = () => {
        console.error('🔥🔥🔥 Video Element Error Event Fired! 🔥🔥🔥', video.error);
    };
    const onCanPlayThrough = () => {
        console.log("✅ Event: 'canplaythrough' - Video is loaded and ready to play without buffering.");
        setVideoLoaded(true);
    }

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('stalled', onStalled);
    video.addEventListener('error', onError);
    video.addEventListener('canplaythrough', onCanPlayThrough);


    const loadVideoAsBlob = async () => {
      // Increment version to try and break any caches.
      const videoUrl = "/App_Intro_1.mp4?v=11";
      console.log(`Starting to fetch video as blob: ${videoUrl}`);
      try {
        const response = await fetch(videoUrl);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        console.log("Video fetch response OK. Converting to blob...");
        const blob = await response.blob();
        console.log(`Blob created. Size: ${blob.size}, Type: ${blob.type}`);
        
        objectUrl = URL.createObjectURL(blob);
        console.log(`Created object URL: ${objectUrl.substring(0, 40)}...`);
        
        video.src = objectUrl;
        console.log("Video source set to object URL. Calling video.load().");
        video.load(); // Explicitly trigger load for the new source
        console.log("video.load() called. Now waiting for 'canplaythrough' event.");

      } catch (error) {
        console.error("🔥🔥🔥 Failed to fetch and load video via blob. 🔥🔥🔥", error);
      }
    };

    loadVideoAsBlob();

    return () => {
      console.log('Cleaning up IntroPage listeners and object URL.');
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('stalled', onStalled);
      video.removeEventListener('error', onError);
      video.removeEventListener('canplaythrough', onCanPlayThrough);
      if (objectUrl) {
        console.log(`Revoking object URL: ${objectUrl.substring(0, 40)}...`);
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [isIOSPWA]);

  return (
    <div className="relative h-screen w-full overflow-hidden bg-black" onClick={safePlay}>

      <video
        ref={videoRef}
        loop
        muted
        playsInline
        webkit-playsinline
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
