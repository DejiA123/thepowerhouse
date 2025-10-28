
// Restructure the entire component to fix syntax errors and implement clean muted autoplay with unmute on interaction

import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

const IntroPage = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showSoundPrompt, setShowSoundPrompt] = useState(true);

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

    // Set source
    video.src = "/App_Intro_1.mp4?v=4";

    // Ensure muted autoplay attributes
    video.muted = true;
    video.autoplay = true;
    video.playsInline = true;
    video.loop = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');

    // Basic play attempt
    video.play().catch(error => {
      console.error("Muted autoplay failed:", error);
    });

    // Function to enable sound on interaction
    const enableSound = () => {
      if (isMuted) {
        console.log("Enabling sound on user interaction");
        video.muted = false;
        video.volume = 1;
        setIsMuted(false);
        setShowSoundPrompt(false);
        video.play().catch(error => console.error("Play with sound failed:", error));
      }
    };

    // Add one-time listeners for first touch/click
    const interactionEvents = ['touchstart', 'click'];
    interactionEvents.forEach(event => {
      document.addEventListener(event, enableSound, { once: true, passive: true });
    });

    // Event handlers
    const onPlay = () => {
      console.log("✅ Event: 'play'");
      setVideoPlaying(true);
    };

    const onPause = () => {
      console.log("Event: 'pause'");
      setVideoPlaying(false);
    };

    const onCanPlay = () => {
      console.log("✅ Event: 'canplay' - Video can play.");
      setVideoLoaded(true);
    };

    const onError = (e: Event) => {
      console.error("❌ Video Element Error:", (e.target as HTMLVideoElement).error);
    };

    const onPlaying = () => {
      console.log("✅ Video is actively playing.");
      setVideoPlaying(true);
    };

    // Warning if autoplay prevented
    const onPauseWarning = () => {
      if (video.paused && !video.ended) {
        console.warn("⚠️ Auto-play might have been prevented by the browser.");
      }
    };

    // Add event listeners
    video.addEventListener("play", onPlay);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("pause", onPause);
    video.addEventListener("pause", onPauseWarning);
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("error", onError);

    // Load video
    video.load();

    // Cleanup
    return () => {
      console.log("Cleaning up IntroPage.");
      interactionEvents.forEach(event => {
        document.removeEventListener(event, enableSound);
      });
      video.removeEventListener("play", onPlay);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("pause", onPauseWarning);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("error", onError);
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
        autoPlay
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover z-10"
        style={{
          backgroundColor: "#000",
          transform: "translateZ(0)",
        }}
      />

      {/* Sound Prompt Overlay */}
      {showSoundPrompt && isMuted && videoLoaded && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="bg-black bg-opacity-50 text-white px-4 py-2 rounded-lg animate-pulse">
            Tap anywhere to enable sound
          </div>
        </div>
      )}

      {/* UI Content */}
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
