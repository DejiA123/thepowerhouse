
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar, MapPin, Users, Volume2, Eye } from "lucide-react";
import VideoModal from "@/components/VideoModal";
import { supabase } from "@/integrations/supabase/client";
import PowerHouseVideos from "@/components/PowerHouseVideos";

interface LiveService {
  id: string;
  title: string;
  description: string;
  youtube_video_id: string;
  is_live: boolean;
  service_type: string;
  scheduled_time: string;
}

const ServicesPage = () => {
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [isLiveStreamActive, setIsLiveStreamActive] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStreamService, setSelectedStreamService] = useState<any>(null);
  const [liveServices, setLiveServices] = useState<LiveService[]>([]);

  // Fetch live services from database and check for live streams
  useEffect(() => {
    fetchLiveServices();
    
    const checkLiveStatus = () => {
      // Simulate live status - in production, this would check YouTube API
      const now = new Date();
      const currentHour = now.getHours();
      const currentDay = now.getDay();
      
      // Sunday 10 AM or Wednesday 7 PM
      const isSundayService = currentDay === 0 && currentHour >= 10 && currentHour <= 12;
      const isWednesdayService = currentDay === 3 && currentHour >= 19 && currentHour <= 21;
      
      setIsLiveStreamActive(isSundayService || isWednesdayService);
    };

    checkLiveStatus();
    const interval = setInterval(checkLiveStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchLiveServices = async () => {
    const { data, error } = await supabase
      .from('live_services')
      .select('*')
      .order('scheduled_time', { ascending: false });

    if (data) {
      setLiveServices(data);
    }
  };

  const services = [
    {
      id: "sunday",
      name: "Sunday Service",
      time: "10:00 AM",
      day: "Sunday",
      description: "Join us for worship, fellowship, and powerful teaching from God's Word.",
      isLive: isLiveStreamActive && new Date().getDay() === 0,
      streamUrl: "https://www.youtube.com/@thepowerhouseintl/streams",
      image: "url('data:image/svg+xml,%3Csvg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 800 400\"%3E%3Crect fill=\"%234F46E5\" width=\"800\" height=\"400\"/%3E%3C/svg%3E')"
    },
    {
      id: "bible-study",
      name: "Bible Study Service",
      time: "7:00 PM",
      day: "Wednesday", 
      description: "Deep dive into Scripture with interactive Bible study and discussion.",
      isLive: isLiveStreamActive && new Date().getDay() === 3,
      streamUrl: "https://www.youtube.com/@thepowerhouseintl/streams",
      image: "url('data:image/svg+xml,%3Csvg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 800 400\"%3E%3Crect fill=\"%2310B981\" width=\"800\" height=\"400\"/%3E%3C/svg%3E')"
    },
    {
      id: "prayer-meeting",
      name: "Prayer Meeting",
      time: "7:00 PM",
      day: "Friday",
      description: "Come together in corporate prayer and intercession for our community.",
      isLive: false,
      streamUrl: "https://www.youtube.com/@thepowerhouseintl/streams",
      image: "url('data:image/svg+xml,%3Csvg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 800 400\"%3E%3Crect fill=\"%23F59E0B\" width=\"800\" height=\"400\"/%3E%3C/svg%3E')"
    }
  ];

  const previousServices = [
    {
      title: "Faith Over Fear - Sunday Service",
      date: "January 7, 2024",
      duration: "1:25:30",
      views: "234",
      thumbnail: "url('data:image/svg+xml,%3Csvg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 320 180\"%3E%3Crect fill=\"%236366F1\" width=\"320\" height=\"180\"/%3E%3C/svg%3E')"
    },
    {
      title: "The Power of Prayer - Bible Study",
      date: "January 3, 2024",
      duration: "45:20",
      views: "156",
      thumbnail: "url('data:image/svg+xml,%3Csvg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 320 180\"%3E%3Crect fill=\"%2310B981\" width=\"320\" height=\"180\"/%3E%3C/svg%3E')"
    },
    {
      title: "New Year Prayer Meeting",
      date: "December 29, 2023",
      duration: "1:15:45",
      views: "89",
      thumbnail: "url('data:image/svg+xml,%3Csvg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 320 180\"%3E%3Crect fill=\"%23F59E0B\" width=\"320\" height=\"180\"/%3E%3C/svg%3E')"
    }
  ];

  const handleWatchLive = (service: any) => {
    if (service.isLive) {
      setSelectedStreamService(service);
      setIsModalOpen(true);
    } else {
      window.open(service.streamUrl, '_blank');
    }
  };

  const handleWatchLiveService = (liveService: LiveService) => {
    setSelectedStreamService({
      ...liveService,
      isLive: liveService.is_live,
      name: liveService.title,
      videoId: liveService.youtube_video_id
    });
    setIsModalOpen(true);
  };

  const handleWatchPrevious = (video: any) => {
    window.open("https://www.youtube.com/@thepowerhouseintl/videos", '_blank');
  };

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Services</h1>
        <p className="text-muted-foreground">Join us for worship, learning, and fellowship</p>
      </div>

      {/* Live Services */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-foreground">Our Services</h2>
        <div className="grid gap-4">
          {services.map((service) => (
            <Card key={service.id} className="overflow-hidden">
              <div 
                className="h-48 bg-cover bg-center relative"
                style={{ backgroundImage: service.image }}
              >
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="text-center text-white">
                    <h3 className="text-2xl font-bold mb-2">{service.name}</h3>
                    <div className="flex items-center justify-center space-x-4 text-sm">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>{service.day}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>{service.time}</span>
                      </div>
                    </div>
                    {service.isLive && (
                      <Badge className="mt-2 bg-red-500 text-white animate-pulse">
                        🔴 LIVE NOW
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <CardContent className="p-6">
                <p className="text-foreground mb-4">{service.description}</p>
                <div className="flex space-x-3">
                  <Button 
                    onClick={() => handleWatchLive(service)}
                    className="flex-1"
                    variant={service.isLive ? "default" : "outline"}
                  >
                    {service.isLive ? "Watch Live" : "Join Next Service"}
                  </Button>
                  <Button variant="outline" size="sm">
                    <MapPin className="w-4 h-4 mr-2" />
                    Locations
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Live Stream Services */}
      {liveServices.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground">Live Stream Services</h2>
          <div className="grid gap-4">
            {liveServices.map((liveService) => (
              <Card key={liveService.id} className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-semibold mb-2">{liveService.title}</h3>
                      <p className="text-foreground mb-2">{liveService.description}</p>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(liveService.scheduled_time).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>{new Date(liveService.scheduled_time).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {liveService.is_live && (
                        <Badge className="bg-red-500 text-white animate-pulse">
                          🔴 LIVE NOW
                        </Badge>
                      )}
                      <Button
                        onClick={() => handleWatchLiveService(liveService)}
                        variant={liveService.is_live ? "default" : "outline"}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        {liveService.is_live ? "Watch Live" : "Watch Recording"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Previous Services */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-foreground">Previous Services</h2>
        <div className="space-y-4">
          {previousServices.map((video, index) => (
            <Card key={index} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex space-x-4">
                   <div 
                    className="w-32 h-20 bg-cover bg-center rounded-lg flex items-center justify-center cursor-pointer"
                    style={{ backgroundImage: video.thumbnail }}
                    onClick={() => handleWatchPrevious(video)}
                  >
                    <div className="w-8 h-8 text-white">▶</div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-1">{video.title}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{video.date}</p>
                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{video.duration}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Users className="w-3 h-3" />
                        <span>{video.views} views</span>
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleWatchPrevious(video)}
                  >
                    ▶
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="text-center">
          <Button 
            variant="outline" 
            onClick={() => window.open("https://www.youtube.com/@thepowerhouseintl/videos", '_blank')}
          >
            View All Previous Services
          </Button>
        </div>
      </div>

      {/* Quick Info */}
      <Card className="bg-primary text-primary-foreground">
        <CardContent className="p-6 text-center">
          <h3 className="text-xl font-bold mb-2">Can't Make It In Person?</h3>
          <p className="mb-4 opacity-90">Join us online for all our services via live stream</p>
          <Button 
            variant="secondary" 
            onClick={() => window.open("https://www.youtube.com/@thepowerhouseintl/streams", '_blank')}
          >
            <Volume2 className="w-4 h-4 mr-2" />
            Watch Live Stream
          </Button>
        </CardContent>
      </Card>

      {/* Power House YouTube Videos */}
      <PowerHouseVideos />

      <VideoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        videoId={selectedStreamService?.videoId || selectedStreamService?.youtube_video_id || (selectedStreamService?.isLive ? "UCChannelId" : "")}
        title={selectedStreamService?.name || selectedStreamService?.title || "Live Stream"}
        isLive={selectedStreamService?.isLive || false}
      />
    </div>
  );
};

export default ServicesPage;
