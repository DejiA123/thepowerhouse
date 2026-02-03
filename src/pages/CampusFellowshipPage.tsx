import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users, Calendar, Phone, Search, ArrowLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import GroupPage from "@/components/GroupPage";

const CampusFellowshipPage = () => {
  const navigate = useNavigate();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { user } = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [showContactForm, setShowContactForm] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedLeader, setSelectedLeader] = useState<{ name: string, contact: string } | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [contactMessage, setContactMessage] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Remove static members property from campusFellowships
  const campusFellowships = [
    {
      id: "uog",
      name: "Believers Connect UoG",
      location: "University of Galway",
      meetingTime: "Monday 6:00 PM",
      description: "Join our vibrant community of believers at the University of Galway. We gather weekly for worship, Bible study, and fellowship.",
      image: "photo-1523580494863-6f3031224c94",
      activities: [
        "Weekly Bible Study",
        "Prayer Meetings",
        "Outreach Programs",
        "Social Events"
      ]
    },
    {
      id: "atu",
      name: "Believers Connect ATU",
      location: "Atlantic Technological University",
      meetingTime: "Monday 6:00 PM",
      description: "A welcoming community for students at ATU. We focus on building strong relationships and growing in faith together.",
      image: "photo-1517048676732-d65bc937f952",
      activities: [
        "Worship Sessions",
        "Discussion Groups",
        "Community Service",
        "Leadership Training"
      ]
    },
    {
      id: "tus",
      name: "Believers Connect TUS",
      location: "Technological University of the Shannon (TUS)",
      meetingTime: "Monday 6:00 PM",
      description: "Our TUS fellowship is dedicated to supporting students in their spiritual journey while pursuing academic excellence.",
      image: "photo-1524178232363-1fb2b075b655",
      activities: [
        "Bible Study",
        "Prayer Groups",
        "Mentorship Program",
        "Social Gatherings"
      ]
    },
    {
      id: "maynooth",
      name: "Believers Connect Maynooth",
      location: "Maynooth University",
      meetingTime: "Monday 6:00 PM",
      description: "A growing community of believers at Maynooth University, committed to supporting students in their faith journey.",
      image: "photo-1541829070764-84a7d30dd3f3",
      activities: [
        "Bible Study",
        "Prayer Meetings",
        "Community Outreach",
        "Social Events"
      ]
    },
    {
      id: "south",
      name: "Believers Connect South",
      location: "Southern Region",
      meetingTime: "Monday 6:00 PM",
      description: "Connect with a vibrant community of believers in the South. We gather weekly to worship, study the Word, pray, and build lasting friendships.",
      image: "photo-1590012314607-cda9d9b699ae",
      activities: [
        "Weekly Bible Study",
        "Prayer Meetings",
        "Outreach Programs",
        "Social Events"
      ]
    }
  ];

  // Dynamic member state
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});

  // Fetch member counts and names for all campus fellowships
  const fetchAllMembers = async () => {
    const groupNames = campusFellowships.map(f => f.name);

    // First, get all group members
    const { data: membersData, error: membersError } = await supabase
      .from('group_members')
      .select('group_name, user_id')
      .in('group_name', groupNames);

    if (membersError) {
      console.error('Error fetching group members:', membersError);
      return;
    }

    // Process the data
    const counts: Record<string, number> = {};
    groupNames.forEach(name => {
      counts[name] = 0;
    });

    membersData.forEach((row: any) => {
      if (counts[row.group_name] !== undefined) {
        counts[row.group_name] += 1;
      }
    });

    setMemberCounts(counts);
  };

  useEffect(() => {
    fetchAllMembers();
  }, []);

  const filteredFellowships = campusFellowships.filter(fellowship =>
    fellowship.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    fellowship.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background font-sans pb-20">
      {/* Hero Section */}
      <div className="relative h-[30vh] min-h-[250px] bg-gradient-to-r from-blue-700 via-indigo-600 to-purple-600 overflow-hidden">
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1523580494863-6f3031224c94?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80')] bg-cover bg-center opacity-30 mix-blend-overlay" />

        <div className="relative container mx-auto h-full flex flex-col justify-end pb-8 px-4">
          <Button
            variant="ghost"
            className="self-start text-white/90 hover:text-white hover:bg-white/10 mb-auto mt-4"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Home
          </Button>

          <h1 className="text-4xl md:text-5xl font-outfit font-bold text-white mb-2">
            Life Groups
          </h1>
          <p className="text-blue-100 text-lg md:text-xl max-w-2xl">
            Find your community and grow in faith together on campus.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 -mt-8 relative z-10">
        {/* Search Bar */}
        <div className="glass bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl p-2 rounded-2xl shadow-xl border border-white/20 dark:border-white/10 mb-8 max-w-2xl mx-auto">
          <div className="relative flex items-center">
            <Search className="absolute left-4 text-muted-foreground w-5 h-5" />
            <Input
              placeholder="Search for your campus..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-14 bg-transparent border-0 focus-visible:ring-0 text-lg placeholder:text-muted-foreground/70"
            />
          </div>
        </div>

        {/* Fellowships Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredFellowships.map((campus, index) => (
            <div
              key={campus.id}
              className="group animate-in fade-in slide-in-from-bottom-4 fill-mode-forwards"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <Card
                className="h-full border-0 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 bg-card/50 backdrop-blur-sm shadow-lg cursor-pointer"
                onClick={() => navigate(`/fellowship-group/${campus.id}`)}
              >
                <div className="relative h-48 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10" />
                  <img
                    src={`https://images.unsplash.com/${campus.image}?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80`}
                    alt={campus.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute bottom-4 left-4 right-4 z-20">
                    <h3 className="text-xl font-bold text-white mb-1 font-outfit">{campus.name}</h3>
                    <div className="flex items-center text-white/80 text-sm">
                      <MapPin className="w-3 h-3 mr-1" />
                      <span className="truncate">{campus.location}</span>
                    </div>
                  </div>
                  <Badge className="absolute top-4 right-4 z-20 bg-white/20 backdrop-blur-md hover:bg-white/30 border-0 text-white">
                    {memberCounts[campus.name] ?? 0} members
                  </Badge>
                </div>

                <CardContent className="p-5">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center text-sm text-muted-foreground bg-accent/50 px-3 py-1.5 rounded-full">
                        <Calendar className="w-4 h-4 mr-2 text-primary" />
                        {campus.meetingTime}
                      </div>
                    </div>

                    <p className="text-muted-foreground leading-relaxed line-clamp-3 group-hover:line-clamp-none transition-all">
                      {campus.description}
                    </p>

                    <div className="pt-2">
                      <Button
                        variant="ghost"
                        className="w-full text-primary hover:text-primary/80 hover:bg-primary/10 transition-colors"
                      >
                        View Group <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};


export default CampusFellowshipPage;