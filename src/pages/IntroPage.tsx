
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

    let objectUrl: string | undefined;

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
      // Immediately play when can play event fires
      video.play().catch(error => {
        console.warn("⚠️ Auto-play was prevented. Trying again...", error.name);
        // Try again with user activation state
        setTimeout(() => {
          video.play().catch(e => 
            console.error("❌ Second play attempt failed:", e)
          );
        }, 50);
      });
    };
    
    const onLoadedMetadata = () => {
      console.log("✅ Video metadata loaded - attempting immediate playback");
      video.play().catch(e => console.log("Initial play attempt waiting for canplay"));
    };
    
    const onError = (e: Event) => {
      console.error("❌ Video Element Error:", video.error);
    };

    // Set direct source instead of fetch+blob for faster loading
    video.src = "/App_Intro_1.mp4?v=5"; // Version bump
    video.load(); // Force load
    
    // Add event listeners
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("error", onError);

    // Try to play immediately
    if (document.hasFocus()) {
      video.play().catch(() => console.log("Waiting for canplay event"));
    }

    return () => {
      console.log("Cleaning up IntroPage.");
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("error", onError);
      video.src = ""; // Clear source
    };
  }, []);

  return (
    <div className="relative h-screen w-full overflow-hidden bg-black" onClick={handleContainerClick}>
      
      {/* Video Element */}
      <video
        ref={videoRef}
        loop
        muted
        playsInline
        webkit-playsinline="true"
        x5-playsinline="true"
        x5-video-player-type="h5"
        x5-video-player-fullscreen="true"
        preload="auto"
        autoPlay
        disablePictureInPicture
        className="absolute inset-0 w-full h-full object-cover z-10"
        style={{ backgroundColor: "#000" }}
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
