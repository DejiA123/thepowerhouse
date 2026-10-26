import { lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import NotificationPrompt from "@/components/notifications/NotificationPrompt";
import InstallCard from "@/components/install/InstallCard";
import HomeToday, { type HomeBanner } from "@/components/home/HomeToday";
import { useAfterFirstScreen } from "@/hooks/useAfterFirstScreen";

// Further down the page: loaded just after the first screen is showing
const DailyScripture = lazy(() => import("@/components/DailyScripture"));
const EventCountdown = lazy(() => import("@/components/EventCountdown"));
const PowerHouseVideos = lazy(() => import("@/components/PowerHouseVideos"));

const HomePage = () => {
  const navigate = useNavigate();
  // The top of the page is drawn first; everything below it follows a moment later
  const showRest = useAfterFirstScreen();

  const banners: HomeBanner[] = [
    {
      title: "New Here?",
      subtitle: "Start your journey with us",
      onClick: () => navigate("/new-here"),
      image: "/banners/this.jpg",
      position: "center 10%",
      fallback: "bg-gradient-to-br from-blue-500 to-blue-700",
    },
    {
      title: "Serve",
      subtitle: "Find your place on a team",
      onClick: () => navigate("/serve"),
      image: "/banners/next.jpg",
      position: "center 5%",
      fallback: "bg-gradient-to-br from-green-500 to-green-700",
    },
    {
      title: "Building Campaign",
      subtitle: "Build the house with us",
      onClick: () => navigate("/building-campaign"),
      image: "/banners/pastorsadi.jpg",
      position: "0% 20%",
      fallback: "bg-gradient-to-br from-purple-500 to-purple-700",
    },
    {
      title: "Life Groups",
      subtitle: "Grow in community",
      onClick: () => navigate("/groups"),
      image: "/banners/praise.jpg",
      position: "center 8%",
      fallback: "bg-gradient-to-br from-orange-500 to-orange-700",
    },
    {
      title: "Give Online",
      subtitle: "Tithes, offerings and seeds",
      onClick: () => navigate("/give"),
      image: "/banners/updatedpic.jpg",
      position: "20% 10%",
      fallback: "bg-gradient-to-br from-red-500 to-red-700",
      cta: "Give now",
    },
  ];

  return (
    <div className="bg-background min-h-screen pb-28 lg:pb-8">
      <div className="max-w-5xl mx-auto space-y-3 px-4 pt-4 empty:hidden">
        <InstallCard />
        <NotificationPrompt />
      </div>

      {/* Greeting, search, carry on, the big picture buttons, verse of the day and banners */}
      <HomeToday banners={banners} />

      {showRest && (
        <Suspense fallback={null}>
          <div className="mx-auto mt-8 max-w-5xl space-y-6 px-4">
            <EventCountdown />
            <DailyScripture showVerse={false} />
            <PowerHouseVideos />
          </div>
        </Suspense>
      )}
    </div>
  );
};

export default HomePage;
