import { lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import NotificationPrompt from "@/components/notifications/NotificationPrompt";
import InstallCard from "@/components/install/InstallCard";
import HomeToday, { type HomeBanner } from "@/components/home/HomeToday";
import { useAfterFirstScreen } from "@/hooks/useAfterFirstScreen";
import { church, hasFeature } from "@/config/church";

// Further down the page: loaded just after the first screen is showing
const DailyScripture = lazy(() => import("@/components/DailyScripture"));
const EventCountdown = lazy(() => import("@/components/EventCountdown"));
const ChurchVideos = lazy(() => import("@/components/ChurchVideos"));

const HomePage = () => {
  const navigate = useNavigate();
  // The top of the page is drawn first; everything below it follows a moment later
  const showRest = useAfterFirstScreen();

  // This church's banners, for the parts of the app it uses
  const banners: HomeBanner[] = church.banners
    .filter((b) => !b.feature || hasFeature(b.feature))
    .map(({ to, feature: _feature, ...b }) => ({ ...b, onClick: () => navigate(to) }));

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
            {/* Service times come with the church's campuses; sermons with its YouTube channel */}
            {church.campuses.length > 0 && <EventCountdown />}
            <DailyScripture showVerse={false} />
            {hasFeature('watch') && <ChurchVideos />}
          </div>
        </Suspense>
      )}
    </div>
  );
};

export default HomePage;
