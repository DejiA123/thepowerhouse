
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

    // Create and unlock audio context immediately
    let audioContext: AudioContext | null = null;
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
          console.log('Audio context resumed');
        }).catch(() => {});
      }
    } catch (e) {}

    // Multiple aggressive play attempts
    const aggressivePlay = () => {
      if (!video) return;
      
      // Force muted state before play
      video.muted = true;
      video.volume = 0;
      
      // Multiple play attempts with different methods
      const playPromises = [
        video.play(),
        new Promise(resolve => setTimeout(() => resolve(video.play()), 50)),
        new Promise(resolve => setTimeout(() => resolve(video.play()), 100)),
        new Promise(resolve => setTimeout(() => resolve(video.play()), 200)),
        new Promise(resolve => setTimeout(() => resolve(video.play()), 500))
      ];

      Promise.allSettled(playPromises).then(results => {
        const success = results.some(r => r.status === 'fulfilled');
        if (success) {
          console.log('✅ Aggressive autoplay succeeded');
          setVideoPlaying(true);
        } else {
          console.warn('⚠️ All aggressive play attempts failed');
        }
      });
    };

    // Simulate user interaction programmatically
    const simulateUserInteraction = () => {
      const events = ['touchstart', 'touchmove', 'touchend', 'click', 'mousedown', 'mouseup'];
      events.forEach(eventType => {
        const syntheticEvent = new Event(eventType, { bubbles: true, cancelable: true });
        video.dispatchEvent(syntheticEvent);
      });
    };

    // Continuous monitoring and retry
    let retryCount = 0;
    const maxRetries = 20;
    const monitorInterval = setInterval(() => {
      if (video.paused && retryCount < maxRetries) {
        retryCount++;
        console.log(`🔄 Autoplay retry attempt ${retryCount}`);
        
        // Try different strategies
        if (retryCount % 3 === 0) {
          simulateUserInteraction();
        }
        
        aggressivePlay();
      } else if (!video.paused) {
        console.log('✅ Video is playing');
        clearInterval(monitorInterval);
      }
    }, 250);

    // Stop monitoring after 5 seconds
    setTimeout(() => {
      clearInterval(monitorInterval);
      if (video.paused) {
        console.warn('⚠️ Autoplay failed after maximum retries');
      }
    }, 5000);

    // Intersection Observer to trigger play when visible
    const intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && video.paused) {
          console.log('Video is visible, attempting play');
          aggressivePlay();
        }
      });
    }, { threshold: 0.1 });
    
    if (video.parentElement) {
      intersectionObserver.observe(video.parentElement);
    }

    // DOM Mutation Observer to detect when video is added to DOM
    const mutationObserver = new MutationObserver(() => {
      if (video.parentElement && video.paused) {
        console.log('Video detected in DOM, attempting play');
        aggressivePlay();
      }
    });
    
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
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

    // Add interaction listeners for sound (one-time)
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
      // Immediate play attempt when video is ready
      aggressivePlay();
    };

    const onError = (e: Event) => {
      console.error("❌ Video Element Error:", (e.target as HTMLVideoElement).error);
    };

    const onPlaying = () => {
      console.log("✅ Video is actively playing.");
      setVideoPlaying(true);
    };

    // Add event listeners
    video.addEventListener("play", onPlay);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("pause", onPause);
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("error", onError);
    video.addEventListener("loadedmetadata", () => {
      console.log("Video metadata loaded");
      aggressivePlay();
    });

    // Load video
    video.load();

    // Immediate aggressive attempt
    setTimeout(() => {
      simulateUserInteraction();
      aggressivePlay();
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
