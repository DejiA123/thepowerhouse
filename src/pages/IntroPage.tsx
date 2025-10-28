
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

    // MOBILE AUTOPLAY STRATEGY: Create audio context to unlock media
    let audioContext;
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
    } catch (e) {
      console.log("Audio context not available");
    }

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
      
      // MOBILE AUTOPLAY STRATEGY - Force immediate play
      // Ensure video is muted (required for mobile autoplay)
      video.muted = true;
      video.volume = 0;
      
      const attemptMobileAutoplay = () => {
        console.log("🚀 Attempting mobile autoplay");
        
        // Try to play immediately
        video.play().then(() => {
          console.log("✅ Mobile autoplay succeeded");
        }).catch(error => {
          console.error("❌ Mobile autoplay failed:", error);
          
          // Retry with forceful techniques
          video.muted = true;
          video.click();
          
          setTimeout(() => {
            video.play().catch(() => {
              // Try toggling mute state
              video.muted = false;
              setTimeout(() => {
                video.muted = true;
                video.play().catch(() => {});
              }, 10);
            });
          }, 50);
        });
      };
      
      // Immediate attempt
      attemptMobileAutoplay();
      
      // Multiple rapid retry attempts
      setTimeout(attemptMobileAutoplay, 100);
      setTimeout(attemptMobileAutoplay, 250);
      setTimeout(attemptMobileAutoplay, 500);
      
      // Ultra-sensitive interaction fallback
      const interactionPlay = (e) => {
        console.log(`🔄 Trying play on ${e.type}`);
        video.play().catch(() => {});
      };
      
      // Listen for any interaction
      ['touchstart', 'click', 'scroll'].forEach(event => {
        document.addEventListener(event, interactionPlay, { once: true, passive: true });
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
      
      {/* Video Element with aggressive mobile autoplay attributes */}
      <video
        ref={videoRef}
        loop
        muted
        playsInline
        autoPlay
        webkit-playsinline="true"
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover z-10"
        style={{ 
          backgroundColor: "#000",
          transform: "translateZ(0)",
          WebkitTransform: "translateZ(0)"
        }}
        disablePictureInPicture
        controls={false}
        disableRemotePlayback
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
