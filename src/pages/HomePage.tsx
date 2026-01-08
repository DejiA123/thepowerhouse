import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Heart, MessageSquare, Users, Book, Lock, Calendar, Map } from "lucide-react";
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
    "Believers Connect UoG",
    "Believers Connect ATU",
    "Believers Connect TUS",
    "Believers Connect Maynooth",
    "Believers Connect South"
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

      {/* Quick Action Cards */}
      <div className="p-4 space-y-4">
        {quickActions.map((action, index) => (
          <div
            key={index}
            className="bg-card rounded-lg p-6 cursor-pointer hover:shadow-lg transition-shadow border-2 border-primary/20 hover:border-primary/50"
            onClick={action.onClick}
          >
            <h3 className="text-xl font-bold mb-2 text-foreground">{action.title}</h3>
            {action.sections && (
              <div className="flex space-x-4 text-sm text-muted-foreground">
                {action.sections.map((section, idx) => (
                  <span key={idx} className="font-medium">{section}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Campus Fellowships */}
      <div className="px-4 mb-6">
        <div className="bg-card rounded-lg p-6 border-2 border-primary/20">
          <h3 className="text-xl font-bold text-foreground mb-4">Campus Fellowships</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {campusFellowships.map((fellowship, index) => (
              <div
                key={index}
                className="bg-accent rounded-lg p-3 text-center cursor-pointer hover:bg-accent/80 transition-colors"
                onClick={() => navigate("/campus-fellowships")}
              >
                <span className="text-sm font-medium text-foreground">{fellowship}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Daily Scripture */}
      <div className="px-4 mb-6">
        <DailyScripture />
      </div>

      {/* Core Features */}
      <div className="px-4 mb-6">
        <div className="bg-card rounded-lg p-6 border-2 border-primary/20">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-foreground mb-2">Connect & Grow</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {/* Authentication required features */}
            {user ? (
              <>
                <Button
                  variant="outline"
                  className="h-20 flex-col space-y-2 border-border hover:bg-accent hover:border-primary"
                  onClick={() => navigate("/prayer")}
                >
                  <MessageSquare className="w-6 h-6 text-primary" />
                  <span>Prayer Wall</span>
                </Button>
                <Button variant="outline" className="h-20 flex-col space-y-2 border-border hover:bg-accent hover:border-primary" onClick={() => navigate("/groups")}>
                  <Users className="w-6 h-6 text-primary" />
                  <span>Join Ministry</span>
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" disabled className="h-20 flex-col space-y-2 border-border opacity-50">
                  <MessageSquare className="w-6 h-6 text-muted-foreground" />
                  <span>Prayer Wall</span>
                </Button>
                <Button variant="outline" disabled className="h-20 flex-col space-y-2 border-border opacity-50">
                  <Users className="w-6 h-6 text-muted-foreground" />
                  <span>Join Ministry</span>
                </Button>
              </>
            )}
          </div>
          {!user && (
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground flex items-center justify-center mb-3">
                <Lock className="w-4 h-4 mr-2" />
                Login to access Prayer Wall and Ministry features
              </p>
              <Link to="/auth">
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold px-6 py-2 rounded-full">
                  Login to Access More Features
                </Button>
              </Link>
            </div>
          )}
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
