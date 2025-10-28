
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

    // IPHONE SAFARI ULTRA-AUTOPLAY STRATEGY
    
    // 1. Create and resume audio context immediately
    let audioContext;
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === 'suspended') {
        audioContext.resume().catch(() => {});
      }
    } catch (e) {
      console.log("Audio context not available");
    }

    // 2. Force video to be muted and hidden initially
    video.muted = true;
    video.volume = 0;
    video.style.opacity = '0.99'; // Just under 1 to avoid visibility issues
    
    // 3. Safari-specific: Try to trigger play on any document interaction
    const safariInteractionHandler = () => {
      console.log("📱 Safari interaction detected, attempting play");
      video.play().then(() => {
        console.log("✅ Safari play succeeded on interaction");
      }).catch(() => {});
    };
    
    // Add interaction listeners immediately
    ['touchstart', 'touchend', 'touchmove', 'click', 'mousedown', 'mouseup'].forEach(event => {
      document.addEventListener(event, safariInteractionHandler, { once: true, passive: true });
    });

    // ULTRA-AGGRESSIVE: Try to trigger play on page load events
    const pageLoadHandler = () => {
      console.log("📱 Page load event, attempting Safari autoplay");
      if (video.paused) {
        video.play().catch(() => {});
      }
    };
    
    // Try on various page events
    ['DOMContentLoaded', 'load', 'pageshow'].forEach(event => {
      window.addEventListener(event, pageLoadHandler, { once: true });
    });
    
    // Try immediately if document is already loaded
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      setTimeout(pageLoadHandler, 100);
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
      
      // IPHONE SAFARI ULTRA-AUTOPLAY STRATEGY
      console.log("🚀 Starting iPhone Safari ultra-autoplay strategy");
      
      // Force video to be in optimal state for Safari
      video.muted = true;
      video.volume = 0;
      video.playsInline = true;
      video.webkitPlaysInline = true;
      
      const safariAutoplay = () => {
        console.log("📱 Attempting Safari autoplay");
        
        // Safari-specific: Try to play with maximum compatibility
        video.play().then(() => {
          console.log("✅ Safari autoplay succeeded");
          video.style.opacity = '1'; // Make visible on success
        }).catch(error => {
          console.error("❌ Safari autoplay failed:", error);
          
          // Safari fallback: Force play through multiple techniques
          
          // Technique 1: Try programmatic click
          const clickEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window
          });
          video.dispatchEvent(clickEvent);
          
          // Technique 2: Force muted state and retry
          video.muted = true;
          video.setAttribute('muted', '');
          
          // Technique 3: Try to trigger through focus
          video.focus();
          video.click();
          
          // Final retry with delay
          setTimeout(() => {
            video.play().catch(() => {
              console.log("🔄 Safari autoplay failed, waiting for user interaction");
            });
          }, 100);
        });
      };
      
      // Immediate attempt
      safariAutoplay();
      
      // Multiple rapid retries for Safari
      setTimeout(safariAutoplay, 50);
      setTimeout(safariAutoplay, 150);
      setTimeout(safariAutoplay, 300);
      setTimeout(safariAutoplay, 500);
      setTimeout(safariAutoplay, 1000);
      
      // Safari-specific: Also try on visibility change
      const visibilityHandler = () => {
        if (!document.hidden) {
          console.log("📱 Page became visible, trying Safari autoplay");
          safariAutoplay();
        }
      };
      document.addEventListener('visibilitychange', visibilityHandler, { once: true });
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
      
      {/* Video Element with ULTRA iPhone Safari autoplay attributes */}
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
          WebkitTransform: "translateZ(0)",
          opacity: 0.99 // Start slightly transparent for Safari
        }}
        disablePictureInPicture
        controls={false}
        disableRemotePlayback
        // Safari-specific attributes
        webkit-playsinline
        webkit-muted
        webkit-autoplay
        // Prevent any Safari interference
        x-webkit-airplay="deny"
        x5-playsinline="true"
        x5-video-player-type="h5"
        x5-video-player-fullscreen="false"
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
