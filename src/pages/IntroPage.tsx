
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

    // Force muted autoplay attributes
    video.muted = true;
    video.autoplay = true;
    video.playsInline = true;
    video.loop = true;
    video.preload = "auto";
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.setAttribute('webkit-playsinline', 'true');
    video.setAttribute('x5-playsinline', '');
    video.setAttribute('x5-video-player-type', 'h5');
    video.setAttribute('x5-video-player-fullscreen', 'false');
    video.setAttribute('x5-video-orientation', 'portrait');

    // Force hardware acceleration and prevent airplay
    video.style.setProperty('transform', 'translateZ(0)', 'important');
    video.style.setProperty('opacity', '0.99', 'important');
    video.style.setProperty('pointer-events', 'none', 'important');
    video.setAttribute('controlsList', 'nodownload nofullscreen noremoteplayback');
    video.setAttribute('disablePictureInPicture', '');
    video.setAttribute('disableRemotePlayback', '');

    // Aggressive autoplay attempt
    video.load();
    setTimeout(() => {
      video.play().catch(() => {});
    }, 100);

    // Cleanup
    return () => {
      console.log("Cleaning up IntroPage.");
      clearInterval(monitorInterval);
      intersectionObserver.disconnect();
      mutationObserver.disconnect();
      interactionEvents.forEach(event => {
        document.removeEventListener(event, enableSound);
      });
      video.removeEventListener("play", onPlay);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("error", onError);
      video.removeEventListener("loadedmetadata", () => {});
      if (audioContext) {
        audioContext.close().catch(() => {});
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
        autoPlay
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover z-10"
        style={{
          backgroundColor: "#000",
          transform: "translateZ(0)",
          opacity: "0.99",
          pointerEvents: "none",
        }}
        webkit-playsinline="true"
        x5-playsinline="true"
        x5-video-player-type="h5"
        x5-video-player-fullscreen="false"
        x5-video-orientation="portrait"
        controlsList="nodownload nofullscreen noremoteplayback"
        disablePictureInPicture
        disableRemotePlayback
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
