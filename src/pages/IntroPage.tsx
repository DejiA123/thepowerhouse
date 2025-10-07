import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useEffect, useRef } from "react";

const IntroPage = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleGetStarted = () => {
    navigate("/auth");
  };

  useEffect(() => {
    // Ensure video plays on mount
    const playVideo = async () => {
      if (videoRef.current) {
        try {
          await videoRef.current.play();
          console.log('✅ Video playing');
        } catch (error) {
          console.error('❌ Video play failed:', error);
        }
      }
    };
    
    playVideo();
  }, []);

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Background Video */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        poster="/placeholder.svg"
        className="absolute inset-0 w-full h-full object-cover z-0 bg-black"
        onError={(e) => {
          console.error('❌ Video error:', e);
        }}
        onLoadedData={() => {
          console.log('✅ Video loaded');
        }}
        onCanPlay={() => {
          console.log('✅ Video can play');
        }}
      >
        <source src="/App_Intro_1.mp4?v=3" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Reduced overlay for minimal darkening */}
      <div className="absolute inset-0 bg-black/20 z-[1]" />

      {/* Content - Above everything */}
      <div className="relative z-10 flex flex-col items-center justify-between min-h-screen px-6 py-12">
        {/* Centered Text Content */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-2xl">
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

        {/* Bottom CTA Button */}
        <div className="w-full max-w-md pb-8">
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
