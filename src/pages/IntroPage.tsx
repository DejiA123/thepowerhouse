
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
      // Attempt to play after loaded
      video.play().catch(error => {
         console.warn("⚠️ Auto-play was prevented. Waiting for user interaction.", error.name);
      });
    };
    
    const onError = (e: Event) => {
      console.error("❌ Video Element Error:", video.error);
    };

    const loadVideo = async () => {
      const videoUrl = "/App_Intro_1.mp4?v=4"; // Version bump
      console.log(`Fetching video: ${videoUrl}`);
      try {
        const response = await fetch(videoUrl);
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const blob = await response.blob();
        console.log(`Blob created. Size: ${blob.size}, Type: ${blob.type}`);
        objectUrl = URL.createObjectURL(blob);
        video.src = objectUrl;
        video.load(); // Important: Trigger load for the new src
        console.log("Video source set to object URL. Waiting for 'canplay' event.");

      } catch (error) {
        console.error("❌ Failed to load video via blob:", error);
      }
    };
    
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("error", onError);

    loadVideo();

    return () => {
      console.log("Cleaning up IntroPage.");
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("error", onError);
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        console.log("Revoked object URL.");
      }
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
        webkit-playsinline
        className="absolute inset-0 w-full h-full object-cover z-10"
      />
      
      {/* Placeholder Image Overlay - Fades out when video plays */}
      <div
        className={`absolute inset-0 z-20 transition-opacity duration-1000 ${videoPlaying ? 'opacity-0' : 'opacity-100'}`}
        aria-hidden={videoPlaying}
      >
        <img
          src="/placeholder.svg"
          alt="Intro background poster"
          className="w-full h-full object-cover"
        />
      </div>

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
