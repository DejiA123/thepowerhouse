
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar, MapPin, Users, Volume2, Eye, ArrowLeft, Phone, Mail, MessageCircle } from "lucide-react";
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
  const navigate = useNavigate();
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [isLiveStreamActive, setIsLiveStreamActive] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStreamService, setSelectedStreamService] = useState<any>(null);
  const [liveServices, setLiveServices] = useState<LiveService[]>([]);

  // Fetch live services from database and check for live streams
  useEffect(() => {
    fetchLiveServices();

    const checkLiveStatus = async () => {
      try {
        // 1. Check Supabase for manually marked live services
        const { data: liveData } = await supabase
          .from('live_services')
          .select('*')
          .eq('is_live', true)
          .maybeSingle();

        if (liveData) {
          setIsLiveStreamActive(true);
          return;
        }

        // 2. Time-based simulation (fallback)
        const now = new Date();
        const currentHour = now.getHours();
        const currentDay = now.getDay();

        // Sunday 10 AM or Wednesday 7 PM
        const isSundayService = currentDay === 0 && currentHour >= 10 && currentHour <= 13;
        const isWednesdayService = currentDay === 3 && currentHour >= 19 && currentHour <= 21;

        setIsLiveStreamActive(isSundayService || isWednesdayService);
      } catch (err) {
        console.error("Error checking live status in ServicesPage:", err);
      }
    };

    checkLiveStatus();
    const interval = setInterval(checkLiveStatus, 60000);
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

  const branchServices = [
    {
      name: "Galway",
      address: "The Power House International Church, Unit 22 Marangonii House, Monivea Rd, Ballybrit, Galway, H91 958A",
      times: {
        sunday: "10 AM",
        bibleStudy: "7 PM",
        prayer: "7 PM"
      },
      phone: "089 953 4714",
      email: "contact.thepowerhouse@gmail.com",
      whatsappGroup: "https://chat.whatsapp.com/GalwayGroup"
    },
    {
      name: "Kildare",
      address: "The Power House International, O'Cola House Lower Eyre Street, Newbridge, W12TK37",
      times: {
        sunday: "10 AM",
        bibleStudy: "7 PM",
        prayer: "7 PM"
      },
      phone: "089 953 5663",
      email: "contact.thepowerhouse@gmail.com",
      whatsappGroup: "https://chat.whatsapp.com/KildareGroup"
    },
    {
      name: "Athlone",
      address: "Unit 22 Athlone Shopping Centre, Sean Costello Street, Athlone, Co. Westmeath, N37 V2Y2",
      times: {
        sunday: "10 AM",
        bibleStudy: "7 PM",
        prayer: "7 PM"
      },
      phone: "089 982 2556",
      email: "contact.thepowerhouse@gmail.com",
      whatsappGroup: "https://chat.whatsapp.com/AthloneGroup"
    },
    {
      name: "Dublin",
      address: "Holiday Inn Express 28-32 O'Connell Street Upper, Rotunda Dublin 1, D01T2X2",
      times: {
        sunday: "10 AM",
        bibleStudy: "8 PM",
        prayer: "8 PM"
      },
      phone: "089 252 7008",
      email: "contact.thepowerhouse@gmail.com",
      whatsappGroup: "https://chat.whatsapp.com/DublinGroup"
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
      {/* Header */}
      <div className="relative mb-8 pt-4 pb-2 px-2 flex flex-col items-center justify-center">
        <Button
          variant="outline"
          size="icon"
          className="absolute left-0 top-4 h-10 w-10 rounded-full bg-background/50 backdrop-blur-md border-border/50 shadow-sm hover:bg-background/80 hover:shadow-md transition-all duration-300"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="w-5 h-5 text-foreground/80" />
        </Button>

        <div className="text-center space-y-2 max-w-2xl mx-auto rounded-3xl p-6 transition-all duration-300">
          <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl mb-2 backdrop-blur-sm">
            <Calendar className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600 animate-in fade-in zoom-in duration-500">
            Services
          </h1>
          <p className="text-lg text-muted-foreground font-medium max-w-md mx-auto leading-relaxed">
            Join us for worship, learning, and fellowship
          </p>
        </div>
      </div>

      {/* Branch Services */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-foreground">Our Services</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {branchServices.map((branch, index) => (
            <Card key={index} className="overflow-hidden border border-border bg-card/50 hover:bg-card hover:shadow-lg transition-all">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl font-bold text-primary flex items-center justify-between">
                  {branch.name}
                  <Badge variant="outline" className="ml-2 font-normal text-xs">
                    In-Person
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                {/* Address */}
                <div className="flex items-start space-x-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                  <span>{branch.address}</span>
                </div>

                {/* Service Times */}
                <div className="space-y-2 bg-muted/30 p-3 rounded-lg border border-border/50">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">Sunday Service</span>
                    <span className="text-primary font-bold">{branch.times.sunday}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">Bible Study</span>
                    <span className="text-primary font-bold">{branch.times.bibleStudy}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">Prayer Meeting</span>
                    <span className="text-primary font-bold">{branch.times.prayer}</span>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground/90">{branch.phone}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground/90 truncate">{branch.email}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="w-full text-xs"
                    onClick={() => window.open(branch.whatsappGroup, '_blank')}
                  >
                    <MessageCircle className="w-3 h-3 mr-1.5 text-green-600" />
                    WhatsApp Group
                  </Button>
                  {branch.name !== "Dublin" && (
                    <Button
                      variant="default"
                      className="w-full text-xs"
                      onClick={() => {
                        const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(branch.address)}`;
                        window.open(url, '_blank');
                      }}
                    >
                      <MapPin className="w-3 h-3 mr-1.5" />
                      Get Directions
                    </Button>
                  )}
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

      {/* Power House YouTube Videos (Latest Sermons) */}
      <div className="pt-4">
        <PowerHouseVideos />
      </div>

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
