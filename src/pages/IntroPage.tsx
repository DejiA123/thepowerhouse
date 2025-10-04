import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

const IntroPage = () => {
  const navigate = useNavigate();
  const [videoError, setVideoError] = useState(false);

  const handleGetStarted = () => {
    navigate("/auth");
  };

  useEffect(() => {
    console.log('IntroPage: Component mounted');
  }, []);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-blue-900 via-purple-900 to-blue-800">
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        onError={(e) => {
          console.error('Video failed to load:', e);
          setVideoError(true);
        }}
        onLoadedData={() => {
          console.log('Video loaded successfully');
          setVideoError(false);
        }}
      >
        <source src="/App_Intro_1.mp4" type="video/mp4" />
      </video>

      {/* Dark Overlay for better text readability */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-between min-h-screen px-6 py-12">
        {/* Centered Text Content */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-2xl">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 drop-shadow-lg">
              Welcome to,
            </h1>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-8 drop-shadow-lg">
              The Power House International App
            </h2>
            <p className="text-xl md:text-3xl text-white font-light drop-shadow-lg">
              Experience Intimacy, Transformation & Dominion
            </p>
          </div>
        </div>

        {/* Bottom CTA Button */}
        <div className="w-full max-w-md pb-8">
          <Button
            onClick={handleGetStarted}
            size="lg"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg py-7 rounded-full shadow-2xl font-semibold"
          >
            Get started
          </Button>
        </div>
      </div>
    </div>
  );
};

export default IntroPage;
