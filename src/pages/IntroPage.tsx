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
    const playVideo = async () => {
      if (videoRef.current) {
        try {
          await videoRef.current.play();
          console.log('✅ Intro Page: Video playback started.');
        } catch (error) {
          console.error('❌ Intro Page: Video playback failed.', error);
        }
      }
    };
    playVideo();
  }, []);

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Background Video: Uncovered and unobstructed */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        poster="/placeholder.svg"
        className="absolute inset-0 w-full h-full object-cover z-0"
        onError={(e) => console.error('❌ Video file error:', e)}
      >
        <source src="/App_Intro_1.mp4?v=7" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Content: Positioned directly on the video with text shadow for readability */}
      <div className="relative z-10 flex flex-col items-center justify-between min-h-screen px-6 py-12">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-2xl">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 [text-shadow:0_4px_8px_rgba(0,0,0,0.7)]">
              Welcome to,
            </h1>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-8 [text-shadow:0_4px_8px_rgba(0,0,0,0.7)]">
              The Power House International App
            </h2>
            <p className="text-xl md:text-3xl text-white font-light [text-shadow:0_2px_4px_rgba(0,0,0,0.7)]">
              Experience Intimacy, Transformation & Dominion
            </p>
          </div>
        </div>

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
