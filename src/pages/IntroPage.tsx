import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const IntroPage = () => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate("/auth");
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src="/App_Intro_1.mp4" type="video/mp4" />
      </video>

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-end min-h-screen px-6 pb-20">
        <div className="text-center mb-auto mt-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Welcome to,
          </h1>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            The Power House International App
          </h2>
          <p className="text-xl md:text-2xl text-white/90">
            Experience Intimacy, Transformation & Dominion
          </p>
        </div>

        <Button
          onClick={handleGetStarted}
          size="lg"
          className="w-full max-w-md bg-primary hover:bg-primary/90 text-white text-lg py-6 rounded-full"
        >
          Get started
        </Button>
      </div>
    </div>
  );
};

export default IntroPage;
