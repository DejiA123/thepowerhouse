
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

    // IPHONE SAFARI ULTRA-AUTOPLAY STRATEGY - MAXIMUM AGGRESSION
    
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

    // 2. Force video to be in optimal Safari state
    video.muted = true;
    video.volume = 0;
    video.playsInline = true;
    video.webkitPlaysInline = true;
    video.style.opacity = '0.99'; // Just under 1 to avoid visibility issues
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    
    // 3. Safari-specific: Try to trigger play on ANY possible interaction
    const safariInteractionHandler = () => {
      console.log("📱 Safari interaction detected, attempting play");
      video.play().then(() => {
        console.log("✅ Safari play succeeded on interaction");
        video.style.opacity = '1';
      }).catch(() => {});
    };
    
    // Add interaction listeners for EVERY possible event
    ['touchstart', 'touchend', 'touchmove', 'touchcancel', 'click', 'mousedown', 'mouseup', 'mousemove', 'mouseover', 'mouseenter', 'mouseleave', 'focus', 'blur', 'scroll', 'wheel', 'keydown', 'keyup', 'keypress'].forEach(event => {
      document.addEventListener(event, safariInteractionHandler, { once: false, passive: true });
    });

    // 4. ULTRA-AGGRESSIVE: Try to trigger play on every possible page event
    const pageLoadHandler = () => {
      console.log("📱 Page load event, attempting Safari autoplay");
      if (video.paused) {
        video.play().catch(() => {});
      }
    };
    
    // Try on every possible page event
    ['DOMContentLoaded', 'load', 'pageshow', 'beforeunload', 'unload', 'pagehide', 'popstate', 'hashchange'].forEach(event => {
      window.addEventListener(event, pageLoadHandler, { once: true });
    });
    
    // Try immediately if document is already loaded
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      setTimeout(pageLoadHandler, 50);
      setTimeout(pageLoadHandler, 100);
      setTimeout(pageLoadHandler, 200);
    }
    
    // 5. Safari-specific: Try to unlock through simulated user gesture
    const simulateUserGesture = () => {
      console.log("🎭 Simulating user gesture for Safari");
      
      // Create and dispatch multiple gesture events
      const events = [
        new TouchEvent('touchstart', { bubbles: true, cancelable: true }),
        new MouseEvent('click', { bubbles: true, cancelable: true, view: window }),
        new Event('gesturestart', { bubbles: true })
      ];
      
      events.forEach(event => {
        document.dispatchEvent(event);
        video.dispatchEvent(event);
      });
      
      // Try to play after simulated gesture
      setTimeout(() => {
        video.play().catch(() => {});
      }, 50);
    };
    
    // Try simulated gesture immediately and on various events
    setTimeout(simulateUserGesture, 100);
    setTimeout(simulateUserGesture, 500);
    
    // 6. Safari-specific: Force video metadata loading
    video.addEventListener('loadedmetadata', () => {
      console.log("📹 Video metadata loaded, attempting autoplay");
      video.play().catch(() => {});
    });
    
    // 7. Safari-specific: Monitor and retry on state changes
    const stateMonitor = setInterval(() => {
      if (video.paused && !video.ended && video.readyState >= 2) {
        console.log("🔄 Safari retrying autoplay via state monitor");
        video.play().catch(() => {});
      }
      if (!video.paused) {
        clearInterval(stateMonitor);
        video.style.opacity = '1';
      }
    }, 100);
    
    // Clear monitor after 10 seconds
    setTimeout(() => clearInterval(stateMonitor), 10000);
    
    // 8. ULTRA-AGGRESSIVE: Mutation observer to catch ANY DOM changes
    const mutationObserver = new MutationObserver(() => {
      if (video.paused && !video.ended) {
        console.log("🧬 DOM mutation detected, trying Safari autoplay");
        video.play().catch(() => {});
      }
    });
    
    // Observe everything
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeOldValue: true,
      characterData: true,
      characterDataOldValue: true
    });
    
    // Stop observing after 10 seconds
    setTimeout(() => mutationObserver.disconnect(), 10000);
    
    // 9. ULTRA-AGGRESSIVE: Intersection observer
    const intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && video.paused && !video.ended) {
          console.log("👁️ Video became visible, attempting Safari autoplay");
          video.play().catch(() => {});
        }
      });
    }, { threshold: 0.01 });
    
    intersectionObserver.observe(video);
    
    // Stop observing after 10 seconds
    setTimeout(() => intersectionObserver.disconnect(), 10000);

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
      
      // IPHONE SAFARI MAXIMUM AGGRESSION AUTOPLAY STRATEGY
      console.log("🚀 Starting iPhone Safari MAXIMUM AGGRESSION autoplay strategy");
      
      // Force video to be in optimal state for Safari
      video.muted = true;
      video.volume = 0;
      video.playsInline = true;
      video.webkitPlaysInline = true;
      video.setAttribute('muted', '');
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', '');
      
      const safariMaximumAutoplay = () => {
        console.log("📱 MAXIMUM AGGRESSION Safari autoplay attempt");
        
        // Safari-specific: Try to play with ABSOLUTE MAXIMUM compatibility
        video.play().then(() => {
          console.log("✅ Safari autoplay succeeded");
          video.style.opacity = '1';
        }).catch(error => {
          console.error("❌ Safari autoplay failed:", error);
          
          // Safari MAXIMUM fallback: Use EVERY possible technique
          
          // Technique 1: Multiple programmatic clicks
          for (let i = 0; i < 5; i++) {
            setTimeout(() => {
              const clickEvent = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window
              });
              video.dispatchEvent(clickEvent);
              video.click();
            }, i * 10);
          }
          
          // Technique 2: Force ALL muted states and retry
          video.muted = true;
          video.volume = 0;
          video.setAttribute('muted', '');
          video.defaultMuted = true;
          
          // Technique 3: Try to trigger through focus and selection
          video.focus();
          video.blur();
          video.focus();
          
          // Technique 4: Force style changes to trigger Safari
          video.style.opacity = '0.98';
          setTimeout(() => {
            video.style.opacity = '0.99';
          }, 50);
          
          // Technique 5: Try to play through multiple methods
          const playMethods = [
            () => video.play(),
            () => video.webkitPlay?.(),
            () => video.mozPlay?.(),
            () => video.msPlay?.()
          ];
          
          playMethods.forEach((method, index) => {
            setTimeout(() => {
              try {
                method();
              } catch (e) {}
            }, index * 20);
          });
          
          // Final retry with longer delay
          setTimeout(() => {
            video.play().catch(() => {
              console.log("🔄 Safari autoplay failed, continuing retry loop");
            });
          }, 200);
        });
      };
      
      // IMMEDIATE attempt with NO delay
      safariMaximumAutoplay();
      
      // ULTRA-RAPID retries for Safari (every 50ms)
      for (let i = 1; i <= 20; i++) {
        setTimeout(safariMaximumAutoplay, i * 50);
      }
      
      // Continue retries for 5 seconds
      const aggressiveRetry = setInterval(() => {
        if (video.paused && !video.ended) {
          console.log("🔄 Safari aggressive retry");
          safariMaximumAutoplay();
        } else {
          clearInterval(aggressiveRetry);
          video.style.opacity = '1';
        }
      }, 100);
      
      // Stop after 5 seconds
      setTimeout(() => clearInterval(aggressiveRetry), 5000);
      
      // Safari-specific: Try on EVERY possible event
      const visibilityHandler = () => {
        if (!document.hidden) {
          console.log("📱 Page became visible, trying Safari autoplay");
          safariMaximumAutoplay();
        }
      };
      document.addEventListener('visibilitychange', visibilityHandler, { once: false });
      
      // Try on focus/blur events
      window.addEventListener('focus', visibilityHandler, { once: false });
      window.addEventListener('blur', visibilityHandler, { once: false });
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
      
      {/* Video Element with MAXIMUM iPhone Safari autoplay attributes */}
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
          opacity: 0.99, // Start slightly transparent for Safari
          WebkitOpacity: 0.99,
          webkitOpacity: 0.99
        }}
        disablePictureInPicture
        controls={false}
        disableRemotePlayback
        // Safari-specific attributes - EVERY POSSIBLE ONE
        webkit-playsinline
        webkit-muted
        webkit-autoplay
        webkit-disableremoteplayback
        webkit-inline="true"
        // Prevent any Safari interference
        x-webkit-airplay="deny"
        x5-playsinline="true"
        x5-video-player-type="h5"
        x5-video-player-fullscreen="false"
        // Additional Safari workarounds
        data-wf-ignore="false"
        data-autoplay-mobile="true"
        // Force Safari to treat as inline
        style={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: 10,
          backgroundColor: '#000',
          transform: 'translateZ(0)',
          WebkitTransform: 'translateZ(0)',
          WebkitBackfaceVisibility: 'hidden',
          webkitBackfaceVisibility: 'hidden'
        }}
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
