
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
    navigate("/");
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
      
      // iOS Safari specific: Force play immediately when video is ready
      setTimeout(() => {
        video.play().catch(error => {
          console.error("❌ Auto-play failed on canplay event:", error);
          
          // iOS Safari workaround: Try multiple aggressive play attempts
          let attempts = 0;
          const maxAttempts = 10;
          const aggressivePlay = () => {
            if (attempts < maxAttempts && video.paused) {
              attempts++;
              console.log(`🔄 Aggressive play attempt ${attempts}/${maxAttempts}`);
              video.play().catch(() => {
                setTimeout(aggressivePlay, 100);
              });
            }
          };
          aggressivePlay();
        });
      }, 100);
    };

    const onError = (e: Event) => {
      console.error("❌ Video Element Error:", video.error);
    };
    
    // Add a 'playing' event listener to be more robust
    const onPlaying = () => {
        console.log("✅ Video is actively playing.");
        setVideoPlaying(true);
    }
    
    // iOS Safari: Monitor for pause events and restart immediately
    const onPauseMonitor = () => {
      if (video.paused && !video.ended && video.readyState >= 2) {
        console.warn("⚠️ Video paused unexpectedly, attempting to restart...");
        setTimeout(() => {
          video.play().catch(() => {
            // If still paused, try even more aggressive restart
            setTimeout(() => video.play(), 50);
          });
        }, 50);
      }
    };

    video.addEventListener("play", onPlay);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("pause", onPause);
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("error", onError);
    video.addEventListener("pause", onPauseMonitor);
    
    // iOS Safari: Additional aggressive autoplay strategy
    const aggressiveAutoplay = () => {
      if (video.paused && video.readyState >= 2) {
        console.log("🚀 Executing aggressive autoplay strategy for iOS Safari");
        
        // Try multiple play attempts with different delays
        Promise.allSettled([
          video.play(),
          new Promise(resolve => setTimeout(() => video.play().catch(() => {}), 50)),
          new Promise(resolve => setTimeout(() => video.play().catch(() => {}), 100)),
          new Promise(resolve => setTimeout(() => video.play().catch(() => {}), 200))
        ]).then(() => {
          if (video.paused) {
            console.log("🔄 Still paused, trying more aggressive approach...");
            // Force play by simulating user interaction context
            const events = ['touchstart', 'click', 'mousedown'];
            events.forEach(eventType => {
              const fakeEvent = new Event(eventType, { bubbles: true, cancelable: true });
              video.dispatchEvent(fakeEvent);
            });
            video.play();
          }
        });
      }
    };
    
    // Monitor video state and force play if needed
    const stateMonitor = setInterval(() => {
      if (video.readyState >= 2 && video.paused && !video.ended) {
        aggressiveAutoplay();
      }
    }, 500);
    
    // The `load` method is called to load the video resource.
    video.load();
    
    // Start monitoring immediately
    setTimeout(aggressiveAutoplay, 100);
    setTimeout(aggressiveAutoplay, 500);
    setTimeout(aggressiveAutoplay, 1000);

    return () => {
      console.log("Cleaning up IntroPage.");
      clearInterval(stateMonitor);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("error", onError);
      video.removeEventListener("pause", onPauseMonitor);
    };
  }, []);

  return (
    <div className="relative h-screen w-full overflow-hidden bg-black" onClick={handleContainerClick}>
      
      {/* Video Element with maximum iOS Safari compatibility */}
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
          WebkitTransform: "translateZ(0)", // Hardware acceleration
          transform: "translateZ(0)",
          WebkitBackfaceVisibility: "hidden",
          backfaceVisibility: "hidden"
        }}
        data-wf-ignore="true"
        disablePictureInPicture
        disableRemotePlayback
        controls={false}
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
