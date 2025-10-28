
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

const IntroPage = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);

  const handleGetStarted = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate("/auth");
  };

  const handleContainerClick = () => {
    const video = videoRef.current;
    if (video && video.paused) {
      console.log("Container clicked, attempting to play video.");
      video.play().catch(error => {
        console.error("❌ Video play failed on container click:", error);
      });
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Set the video source. The `autoPlay` attribute will handle playing.
    video.src = "/App_Intro_1.mp4?v=4";

    const onPlay = () => {
      console.log("✅ Event: 'play'");
      setVideoPlaying(true);
    };

    const onPause = () => {
      console.log("Event: 'pause'");
      setVideoPlaying(false);
    };

    const onCanPlay = () => {
      console.log("✅ Event: 'oncanplay' - Video can play.");
      setVideoLoaded(true);
      
      // Force play when video is ready, especially important for PWA
      video.play().catch(error => {
        console.error("❌ Auto-play failed on canplay event:", error);
        // If autoplay fails, try playing on user interaction
        document.addEventListener('touchstart', function playOnFirstTouch() {
          video.play().catch(e => console.error("Play on touch failed:", e));
          document.removeEventListener('touchstart', playOnFirstTouch);
        }, { once: true });
      });
    };

    const onError = (e: Event) => {
      console.error("❌ Video Element Error:", video.error);
    };
    
    // Add a 'playing' event listener to be more robust
    const onPlaying = () => {
        console.log("✅ Video is actively playing.");
        setVideoPlaying(true);
    }
    
    // A warning if autoplay is prevented
    video.addEventListener('pause', () => {
        if (video.paused && !video.ended) {
            console.warn("⚠️ Auto-play might have been prevented by the browser.");
        }
    });

    video.addEventListener("play", onPlay);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("pause", onPause);
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("error", onError);
    
    // The `load` method is called to load the video resource.
    video.load();

    return () => {
      console.log("Cleaning up IntroPage.");
      video.removeEventListener("play", onPlay);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("error", onError);
    };
  }, []);

  return (
    <div className="relative h-screen w-full overflow-hidden bg-black" onClick={handleContainerClick}>
      
      {/* Video Element with autoPlay */}
      <video
        ref={videoRef}
        loop
        muted
        playsInline
        autoPlay
        webkit-playsinline="true"
        x5-playsinline="true"
        x5-video-player-type="h5"
        x5-video-player-fullscreen="true"
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover z-10"
        style={{ backgroundColor: "#000" }}
        data-wf-ignore="true"
        playsinline="true"
      />

      {/* UI Content - Always on top */}
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
