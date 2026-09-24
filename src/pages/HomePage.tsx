import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heart, MessageSquare, Users, Book, Lock, Calendar, Map, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import DailyScripture from "@/components/DailyScripture";
import EventCountdown from "@/components/EventCountdown";
import LocationsSection from "@/components/LocationsSection";
import PowerHouseVideos from "@/components/PowerHouseVideos";
import NotificationPrompt from "@/components/notifications/NotificationPrompt";
import HomeToday, { type HomeBanner } from "@/components/home/HomeToday";

const HomePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("welcome");

  const handleNewHereClick = () => {
    navigate("/new-here");
  };

  const handleServeClick = () => {
    navigate("/serve");
  };

  const handleBuildingCampaignClick = () => {
    navigate("/building-campaign");
  };

  const handleLifeGroupsClick = () => {
    navigate("/groups");
  };

  const handleGiveClick = () => {
    navigate("/give");
  };

  const banners: HomeBanner[] = [
    {
      title: "New Here?",
      subtitle: "Start your journey with us",
      onClick: handleNewHereClick,
      image: "/lovable-uploads/This.jpg",
      position: "center 10%",
      fallback: "bg-gradient-to-br from-blue-500 to-blue-700",
    },
    {
      title: "Serve",
      subtitle: "Find your place on a team",
      onClick: handleServeClick,
      image: "/lovable-uploads/next.jpg",
      position: "center 5%",
      fallback: "bg-gradient-to-br from-green-500 to-green-700",
    },
    {
      title: "Building Campaign",
      subtitle: "Build the house with us",
      onClick: handleBuildingCampaignClick,
      image: "/lovable-uploads/PastorSadi.JPG",
      position: "0% 20%",
      fallback: "bg-gradient-to-br from-purple-500 to-purple-700",
    },
    {
      title: "Life Groups",
      subtitle: "Grow in community",
      onClick: handleLifeGroupsClick,
      image: "/lovable-uploads/Praise.png",
      position: "center 8%",
      fallback: "bg-gradient-to-br from-orange-500 to-orange-700",
    },
    {
      title: "Give Online",
      subtitle: "Tithes, offerings and seeds",
      onClick: handleGiveClick,
      image: "/lovable-uploads/UpdatedPic.jpg",
      position: "20% 10%",
      fallback: "bg-gradient-to-br from-red-500 to-red-700",
      cta: "Give now",
    },
  ];

  const campusFellowships = [
    { name: "Believers Connect UoG", subtitle: "University of Galway" },
    { name: "Believers Connect ATU", subtitle: "ATU" },
    { name: "Believers Connect TUS", subtitle: "TUS" },
    { name: "Believers Connect Maynooth", subtitle: "Maynooth University" },
    { name: "Believers Connect South", subtitle: "Cork" }
  ];

  return (
    <div className="bg-background min-h-screen pb-20 lg:pb-4">
      {/* Tab Navigation */}
      <div className="tab-navigation">
        <div
          className={`tab-item ${activeTab === "welcome" ? "active" : ""}`}
          onClick={() => setActiveTab("welcome")}
        >
          Welcome
        </div>
        <div
          className={`tab-item ${activeTab === "services" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("services");
            navigate("/services");
          }}
        >
          Services
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 pt-4 empty:hidden">
        <NotificationPrompt />
      </div>

      {/* Greeting, photo banners, verse of the day, continue & shortcuts */}
      <HomeToday
        banners={banners}
        websiteUrl="https://www.thepowerhouseinternational.org/"
        teachingsUrl="https://www.youtube.com/@thepowerhouseintl/videos"
      />

      {/* Campus Fellowships - Premium Redesign */}
      <div className="px-4 mb-8 max-w-[1400px] mx-auto mt-6">
        <div className="relative overflow-hidden rounded-3xl p-1 shadow-xl shadow-indigo-100/50">
          {/* Animated border gradient - Restricted to desktop */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-300 via-indigo-300 to-purple-300 opacity-30 hidden md:block md:animate-pulse"></div>

          <Card className="relative border-0 shadow-none bg-white/80 backdrop-blur-xl text-gray-800 overflow-hidden rounded-[22px]">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-blue-100 rounded-full blur-3xl pointer-events-none opacity-40"></div>
            <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-purple-100 rounded-full blur-3xl pointer-events-none opacity-40"></div>

            <div className="relative z-10 p-6 md:p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3 text-indigo-600">
                  <Users className="w-6 h-6 md:w-8 md:h-8" />
                  <span className="text-xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                    Believers Connect
                  </span>
                </div>
                <span className="text-xs md:text-sm font-bold bg-indigo-50 text-indigo-600 px-3 py-1 md:px-4 md:py-2 rounded-full border border-indigo-100">
                  5 Locations
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
                {campusFellowships.map((fellowship, index) => (
                  <div
                    key={index}
                    onClick={() => navigate("/campus-fellowships")}
                    className="group relative overflow-hidden rounded-2xl bg-white border border-indigo-50 p-4 shadow-sm md:hover:shadow-md md:hover:border-indigo-300 transition-all duration-300 cursor-pointer md:hover:scale-[1.01]"
                  >
                    <div className="flex items-center xl:flex-col xl:items-start gap-4">
                      <div className="w-14 h-14 xl:w-16 xl:h-16 rounded-xl overflow-hidden shrink-0 border border-indigo-100 shadow-sm group-hover:shadow-indigo-200 transition-shadow">
                        <img
                          src="/lovable-uploads/believers-connect-logo.jpg"
                          alt="Believers Connect Logo"
                          className="w-full h-full object-cover transform md:group-hover:scale-110 transition-transform duration-500"
                        />
                      </div>

                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900 md:group-hover:text-indigo-600 transition-colors text-base xl:text-lg mb-0.5">
                          {fellowship.name}
                        </h4>
                        <p className="text-xs xl:text-sm font-medium text-gray-500 md:group-hover:text-indigo-400 transition-colors">
                          {fellowship.subtitle}
                        </p>
                      </div>

                      <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-400 opacity-0 group-hover:opacity-100 transform translate-x-2 xl:translate-x-0 xl:translate-y-2 group-hover:translate-x-0 group-hover:translate-y-0 transition-all duration-300 group-hover:bg-indigo-600 group-hover:text-white xl:absolute xl:bottom-4 xl:right-4">
                        <ArrowLeft className="w-4 h-4 rotate-180" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Daily Scripture */}
      <div className="px-4 mb-6 max-w-[1400px] mx-auto">
        <DailyScripture showVerse={false} />
      </div>

      {/* Connect & Grow - Premium Redesign */}
      <div className="px-4 mb-8 max-w-[1400px] mx-auto">
        <div className="relative overflow-hidden rounded-3xl p-1">
          {/* Animated border gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-30 animate-pulse"></div>

          <div className="relative bg-card/95 backdrop-blur-xl rounded-[22px] p-6 md:p-10 overflow-hidden">
            {/* Subtle background decoration */}
            <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative z-10">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                  <h3 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600 inline-block mb-2">
                    Connect & Grow
                  </h3>
                  <p className="text-muted-foreground font-medium md:text-lg">Deepen your faith and build community</p>
                </div>
                {!user && (
                  <div className="hidden md:block">
                    <Link to="/auth">
                      <Button size="lg" className="rounded-full px-8 text-md font-semibold bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all shadow-sm shadow-primary/20">
                        Login Access
                      </Button>
                    </Link>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Prayer Wall Card */}
                <div
                  onClick={() => user ? navigate("/prayer") : null}
                  className={`group relative overflow-hidden rounded-2xl p-6 md:p-8 transition-all duration-300 border border-border/50 ${user ? 'cursor-pointer hover:shadow-xl hover:border-primary/50 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20 hover:-translate-y-1' : 'opacity-70 grayscale-[0.5]'}`}
                >
                  <div className="flex items-start justify-between mb-5">
                    <div className={`p-4 rounded-xl ${user ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'bg-muted text-muted-foreground'}`}>
                      <MessageSquare className="w-8 h-8 md:w-10 md:h-10" />
                    </div>
                    {user && <ArrowLeft className="w-6 h-6 md:w-8 md:h-8 text-muted-foreground rotate-180 opacity-0 group-hover:opacity-100 transition-all transform -translate-x-3 group-hover:translate-x-0" />}
                    {!user && <Lock className="w-6 h-6 text-muted-foreground" />}
                  </div>
                  <div>
                    <h4 className="text-xl md:text-2xl font-bold mb-2">Prayer Wall</h4>
                    <p className="text-sm md:text-base text-muted-foreground">Share requests and pray for others in our community.</p>
                  </div>
                </div>

                {/* Join Ministry Card */}
                <div
                  onClick={() => user ? navigate("/groups") : null}
                  className={`group relative overflow-hidden rounded-2xl p-6 md:p-8 transition-all duration-300 border border-border/50 ${user ? 'cursor-pointer hover:shadow-xl hover:border-purple-500/50 bg-gradient-to-br from-purple-50/50 to-pink-50/50 dark:from-purple-950/20 dark:to-pink-950/20 hover:-translate-y-1' : 'opacity-70 grayscale-[0.5]'}`}
                >
                  <div className="flex items-start justify-between mb-5">
                    <div className={`p-4 rounded-xl ${user ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400' : 'bg-muted text-muted-foreground'}`}>
                      <Users className="w-8 h-8 md:w-10 md:h-10" />
                    </div>
                    {user && <ArrowLeft className="w-6 h-6 md:w-8 md:h-8 text-muted-foreground rotate-180 opacity-0 group-hover:opacity-100 transition-all transform -translate-x-3 group-hover:translate-x-0" />}
                    {!user && <Lock className="w-6 h-6 text-muted-foreground" />}
                  </div>
                  <div>
                    <h4 className="text-xl md:text-2xl font-bold mb-2">Join Ministry</h4>
                    <p className="text-sm md:text-base text-muted-foreground">Find your place to serve and grow with others.</p>
                  </div>
                </div>
              </div>

              {!user && (
                <div className="mt-6 p-4 bg-primary/5 rounded-xl border border-primary/10 flex flex-col items-center justify-center text-center md:hidden">
                  <p className="text-sm text-muted-foreground mb-3 font-medium">
                    Unlock full access to these features
                  </p>
                  <Link to="/auth" className="w-full">
                    <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold rounded-xl shadow-lg shadow-primary/20">
                      Login Now
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Event Countdown */}
      <div className="px-4 mb-6">
        <EventCountdown />
      </div>

      {/* Church Locations */}
      <div className="px-4 mb-6">
        <LocationsSection />
      </div>

      {/* Power House Videos */}
      <div className="px-4 mb-6">
        <PowerHouseVideos />
      </div>
    </div>
  );
};

export default HomePage;
