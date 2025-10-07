
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
      return;
    }
    const video = videoRef.current;

    if (video) {
        try {
            await video.play();
        } catch (error: any) {
            if (error.name !== 'AbortError') {
                console.error('⚠️ video.play() was rejected with an unexpected error.', error);
            }
        }
    } else {
        console.error('safePlay called but video ref is null!');
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      console.error("Video ref is not available on mount!");
      return;
    }

    let objectUrl: string | null = null;

    const onPlay = () => {
      setVideoPlaying(true);
    };
    const onPause = () => {
      setVideoPlaying(false);
    };
    const onError = (e: Event) => {
      console.error('🔥🔥🔥 Video Element Error Event Fired! 🔥🔥🔥', video.error);
    };

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('error', onError);


    const loadVideoAsBlob = async () => {
      const videoUrl = "/App_Intro_1.mp4?v=10"; // Incremented version
      try {
        const response = await fetch(videoUrl);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        video.src = objectUrl;
        setVideoLoaded(true);
      } catch (error) {
        console.error("🔥🔥🔥 Failed to fetch and load video via blob. 🔥🔥🔥", error);
      }
    };

    loadVideoAsBlob();

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('error', onError);
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, []);

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
