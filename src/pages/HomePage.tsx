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
import { useEffect } from "react";
import { pushNotificationService } from "@/services/pushNotificationService";
import { getTodaysScripture } from "@/utils/dailyScriptureUtils";

const HomePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("welcome");

  // Check and trigger daily scripture notification
  useEffect(() => {
    const handleDailyNotification = async () => {
      // 1. Check if we've already shown it today
      const today = new Date().toDateString();
      const lastShownDate = localStorage.getItem('lastDailyScriptureNotification');

      if (lastShownDate === today) {
        return; // Already shown today
      }

      // 2. Request permission (if not already granted)
      const hasPermission = await pushNotificationService.requestPermission();

      if (hasPermission) {
        // 3. Get scripture and show notification
        const scripture = getTodaysScripture();
        await pushNotificationService.forceShowNotification(
          "Today's Scripture",
          `"${scripture.verse}" - ${scripture.reference}`,
          undefined,
          false
        );

        // 4. Mark as shown
        localStorage.setItem('lastDailyScriptureNotification', today);
        console.log("✅ Daily scripture notification shown");
      }
    };

    handleDailyNotification();
  }, []);

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

  const handleWebsiteClick = () => {
    window.open("https://www.thepowerhouseinternational.org/", "_blank");
  };

  const mainCards = [
    {
      title: "New Here?",
      onClick: handleNewHereClick,
      image: "url('/lovable-uploads/This.jpg')",
      fallbackColor: "bg-gradient-to-br from-blue-500 to-blue-700"
    },
    {
      title: "Serve",
      onClick: handleServeClick,
      image: "url('/lovable-uploads/next.jpg')",
      fallbackColor: "bg-gradient-to-br from-green-500 to-green-700"
    },
    {
      title: "Building Campaign",
      onClick: handleBuildingCampaignClick,
      image: "url('/lovable-uploads/PastorSadi.JPG')",
      fallbackColor: "bg-gradient-to-br from-purple-500 to-purple-700"
    },
    {
      title: "Life Groups",
      onClick: handleLifeGroupsClick,
      image: "url('/lovable-uploads/Praise.png')",
      fallbackColor: "bg-gradient-to-br from-orange-500 to-orange-700"
    }
  ];

  const quickActions: Array<{
    title: string;
    sections?: string[];
    onClick: () => void;
  }> = [
      {
        title: "Website",
        onClick: handleWebsiteClick,
      },
      {
        title: "Social Media",
        onClick: () => navigate("/social-media"),
      },
      {
        title: "Past Teachings",
        onClick: () => window.open("https://www.youtube.com/@thepowerhouseintl/videos", "_blank"),
      },
      {
        title: "Beginning The Journey",
        onClick: () => navigate("/resources"),
      }
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

      {/* Main Feature Cards */}
      <div className="space-y-4 px-4 pt-4">
        {mainCards.map((card, index) => (
          <div
            key={index}
            className={`relative overflow-hidden h-48 flex items-end cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-xl rounded-2xl ${card.fallbackColor} min-h-[192px] group`}
            style={{
              backgroundImage: card.image,
              backgroundSize: index === 2 ? '110%' : index === 3 ? '110%' : index === 1 ? '120%' : 'cover',
              backgroundPosition: index === 0 ? 'center 10%' : index === 1 ? 'center 5%' : index === 2 ? '0% 20%' : index === 3 ? 'center 8%' : 'center',
              backgroundRepeat: 'no-repeat',
              WebkitTransform: 'translateZ(0)',
              transform: 'translateZ(0)',
              WebkitBackfaceVisibility: 'hidden',
              willChange: 'transform, background-image'
            }}
            onClick={card.onClick}
          >
            {/* Dark gradient overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent transition-opacity group-hover:via-black/50"></div>

            <div className="relative z-10 p-6 text-white w-full">
              <div className="h-1 w-12 bg-primary rounded-full mb-3 shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
              <h2 className="text-3xl font-bold mb-1 text-white tracking-tight">{card.title}</h2>
            </div>
          </div>
        ))}
      </div>

      {/* Give Online Section */}
      <div className="px-4 mb-6 mt-6">
        <div
          className="relative overflow-hidden h-64 flex items-end cursor-pointer transition-transform duration-300 hover:scale-[1.01] hover:shadow-2xl rounded-3xl bg-gradient-to-br from-red-500 to-red-700 shadow-lg group"
          style={{
            backgroundImage: "url('/lovable-uploads/UpdatedPic.jpg')",
            backgroundSize: 'cover',
            backgroundPosition: '20% 10%',
            backgroundRepeat: 'no-repeat',
            display: 'block',
            visibility: 'visible',
            opacity: 1
          }}
          onClick={handleGiveClick}
        >
          {/* Dark gradient overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent transition-opacity group-hover:via-black/60"></div>

          <div className="relative z-10 p-8 text-white w-full text-center">
            <div className="h-1 w-16 bg-primary rounded-full mb-4 mx-auto shadow-[0_0_15px_rgba(59,130,246,0.6)]"></div>
            <h2 className="text-4xl font-bold mb-6 text-white tracking-tight text-shadow">Give Online</h2>
            <Button className="bg-white text-black hover:bg-gray-100 font-bold px-10 py-6 text-lg rounded-full shadow-xl transition-transform group-hover:scale-105">
              Give Now
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Action Cards - Premium Grid */}
      <div className="px-4 mb-2">
        <h3 className="text-lg font-bold text-foreground mb-3 px-1">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action, index) => (
            <div
              key={index}
              className={`relative overflow-hidden rounded-2xl p-4 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-xl border border-white/10 ${index === 0 ? "bg-gradient-to-br from-cyan-500 to-blue-600 shadow-blue-500/20" :
                index === 1 ? "bg-gradient-to-br from-violet-500 to-purple-600 shadow-purple-500/20" :
                  index === 2 ? "bg-gradient-to-br from-amber-500 to-red-600 shadow-orange-500/20" :
                    "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/20"
                }`}
              onClick={action.onClick}
            >
              {/* Glass shine effect */}
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/20 to-transparent opacity-50"></div>

              <div className="relative z-10 flex flex-col h-full justify-between min-h-[100px]">
                <div className="bg-white/20 w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-sm mb-3">
                  {index === 0 ? <Map className="w-5 h-5 text-white" /> :
                    index === 1 ? <Heart className="w-5 h-5 text-white" /> :
                      index === 2 ? <Book className="w-5 h-5 text-white" /> :
                        <Calendar className="w-5 h-5 text-white" />}
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg leading-tight">{action.title}</h3>
                  {action.sections && (
                    <p className="text-white/80 text-xs mt-1 truncate">
                      {action.sections.join(", ")}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Campus Fellowships - Premium Redesign */}
      <div className="px-4 mb-8">
        <div className="relative overflow-hidden rounded-3xl p-1 shadow-xl shadow-indigo-100/50">
          {/* Animated border gradient - Restricted to desktop */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-300 via-indigo-300 to-purple-300 opacity-30 hidden md:block md:animate-pulse"></div>

          <Card className="relative border-0 shadow-none bg-white/80 backdrop-blur-xl text-gray-800 overflow-hidden rounded-[22px]">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-blue-100 rounded-full blur-3xl pointer-events-none opacity-40"></div>
            <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-purple-100 rounded-full blur-3xl pointer-events-none opacity-40"></div>

            <div className="relative z-10 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2 text-indigo-600">
                  <Users className="w-6 h-6" />
                  <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                    Believers Connect
                  </span>
                </div>
                <span className="text-xs font-bold bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full border border-indigo-100">
                  5 Locations
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {campusFellowships.map((fellowship, index) => (
                  <div
                    key={index}
                    onClick={() => navigate("/campus-fellowships")}
                    className="group relative overflow-hidden rounded-2xl bg-white border border-indigo-50 p-4 shadow-sm md:hover:shadow-md md:hover:border-indigo-300 transition-all duration-300 cursor-pointer md:hover:scale-[1.01]"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-indigo-100 shadow-sm group-hover:shadow-indigo-200 transition-shadow">
                        <img
                          src="/lovable-uploads/believers-connect-logo.jpg"
                          alt="Believers Connect Logo"
                          className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                        />
                      </div>

                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors text-base mb-0.5">
                          {fellowship.name}
                        </h4>
                        <p className="text-xs font-medium text-gray-500 group-hover:text-indigo-400 transition-colors">
                          {fellowship.subtitle}
                        </p>
                      </div>

                      <div className="w-8 h-8 rounded-full bg-indigo-50 items-center justify-center text-indigo-400 hidden md:flex opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300 group-hover:bg-indigo-600 group-hover:text-white">
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
      <div className="px-4 mb-6">
        <DailyScripture />
      </div>

      {/* Connect & Grow - Premium Redesign */}
      <div className="px-4 mb-8">
        <div className="relative overflow-hidden rounded-3xl p-1">
          {/* Animated border gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-30 animate-pulse"></div>

          <div className="relative bg-card/95 backdrop-blur-xl rounded-[22px] p-6 md:p-8 overflow-hidden">
            {/* Subtle background decoration */}
            <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative z-10">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <div>
                  <h3 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600 inline-block mb-1">
                    Connect & Grow
                  </h3>
                  <p className="text-muted-foreground font-medium">Deepen your faith and build community</p>
                </div>
                {!user && (
                  <div className="hidden md:block">
                    <Link to="/auth">
                      <Button size="sm" className="rounded-full px-6 font-semibold bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all">
                        Login Access
                      </Button>
                    </Link>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Prayer Wall Card */}
                <div
                  onClick={() => user ? navigate("/prayer") : null}
                  className={`group relative overflow-hidden rounded-2xl p-6 transition-all duration-300 border border-border/50 ${user ? 'cursor-pointer hover:shadow-lg hover:border-primary/50 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20' : 'opacity-70 grayscale-[0.5]'}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-xl ${user ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'bg-muted text-muted-foreground'}`}>
                      <MessageSquare className="w-6 h-6" />
                    </div>
                    {user && <ArrowLeft className="w-5 h-5 text-muted-foreground rotate-180 opacity-0 group-hover:opacity-100 transition-all transform -translate-x-2 group-hover:translate-x-0" />}
                    {!user && <Lock className="w-5 h-5 text-muted-foreground" />}
                  </div>
                  <div>
                    <h4 className="text-lg font-bold mb-1">Prayer Wall</h4>
                    <p className="text-sm text-muted-foreground">Share requests and pray for others in our community.</p>
                  </div>
                </div>

                {/* Join Ministry Card */}
                <div
                  onClick={() => user ? navigate("/groups") : null}
                  className={`group relative overflow-hidden rounded-2xl p-6 transition-all duration-300 border border-border/50 ${user ? 'cursor-pointer hover:shadow-lg hover:border-purple-500/50 bg-gradient-to-br from-purple-50/50 to-pink-50/50 dark:from-purple-950/20 dark:to-pink-950/20' : 'opacity-70 grayscale-[0.5]'}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-xl ${user ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400' : 'bg-muted text-muted-foreground'}`}>
                      <Users className="w-6 h-6" />
                    </div>
                    {user && <ArrowLeft className="w-5 h-5 text-muted-foreground rotate-180 opacity-0 group-hover:opacity-100 transition-all transform -translate-x-2 group-hover:translate-x-0" />}
                    {!user && <Lock className="w-5 h-5 text-muted-foreground" />}
                  </div>
                  <div>
                    <h4 className="text-lg font-bold mb-1">Join Ministry</h4>
                    <p className="text-sm text-muted-foreground">Find your place to serve and grow with others.</p>
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
