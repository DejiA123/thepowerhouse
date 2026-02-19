import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Users,
  MessageCircle,
  BookOpen,
  Heart,
  Megaphone,
  ChevronRight
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import GroupChatComponent from "@/components/GroupChatComponent";

const fellowshipData: Record<string, {
  name: string;
  location: string;
  meetingTime: string;
  description: string;
  image: string;
  activities: string[];
}> = {
  uog: {
    name: "Believers Connect UoG",
    location: "University of Galway",
    meetingTime: "Monday 6:00 PM",
    description: "Join our vibrant community of believers at the University of Galway. We gather weekly for worship, Bible study, and fellowship.",
    image: "photo-1523580494863-6f3031224c94",
    activities: ["Weekly Bible Study", "Prayer Meetings", "Outreach Programs", "Social Events"]
  },
  atu: {
    name: "Believers Connect ATU",
    location: "Atlantic Technological University",
    meetingTime: "Monday 6:00 PM",
    description: "A welcoming community for students at ATU. We focus on building strong relationships and growing in faith together.",
    image: "photo-1517048676732-d65bc937f952",
    activities: ["Worship Sessions", "Discussion Groups", "Community Service", "Leadership Training"]
  },
  tus: {
    name: "Believers Connect TUS",
    location: "Technological University of the Shannon (TUS)",
    meetingTime: "Monday 6:00 PM",
    description: "Our TUS fellowship is dedicated to supporting students in their spiritual journey while pursuing academic excellence.",
    image: "photo-1524178232363-1fb2b075b655",
    activities: ["Bible Study", "Prayer Groups", "Mentorship Program", "Social Gatherings"]
  },
  maynooth: {
    name: "Believers Connect Maynooth",
    location: "Maynooth University",
    meetingTime: "Monday 6:00 PM",
    description: "A growing community of believers at Maynooth University, committed to supporting students in their faith journey.",
    image: "photo-1541829070764-84a7d30dd3f3",
    activities: ["Bible Study", "Prayer Meetings", "Community Outreach", "Social Events"]
  },
  south: {
    name: "Believers Connect South",
    location: "Southern Region",
    meetingTime: "Monday 6:00 PM",
    description: "Connect with a vibrant community of believers in the South. We gather weekly to worship, study the Word, pray, and build lasting friendships.",
    image: "photo-1590012314607-cda9d9b699ae",
    activities: ["Weekly Bible Study", "Prayer Meetings", "Outreach Programs", "Social Events"]
  }
};

const activityIcons: Record<string, any> = {
  "Weekly Bible Study": BookOpen,
  "Bible Study": BookOpen,
  "Prayer Meetings": Heart,
  "Prayer Groups": Heart,
  "Outreach Programs": Megaphone,
  "Community Outreach": Megaphone,
  "Social Events": Users,
  "Social Gatherings": Users,
  "Worship Sessions": Heart,
  "Discussion Groups": MessageCircle,
  "Community Service": Megaphone,
  "Leadership Training": Users,
  "Mentorship Program": Users,
};

const FellowshipGroupPage = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [memberCount, setMemberCount] = useState(0);
  const [isMember, setIsMember] = useState(false);
  const [showChat, setShowChat] = useState(false);

  const fellowship = fellowshipData[groupId || ""];

  useEffect(() => {
    if (fellowship) {
      fetchMemberInfo();
    }
  }, [fellowship, user]);

  const fetchMemberInfo = async () => {
    if (!fellowship) return;
    const { count } = await supabase
      .from("group_members")
      .select("*", { count: "exact", head: true })
      .eq("group_name", fellowship.name);
    setMemberCount(count || 0);

    if (user) {
      const { data } = await supabase
        .from("group_members")
        .select("id")
        .eq("group_name", fellowship.name)
        .eq("user_id", user.id)
        .maybeSingle();
      setIsMember(!!data);
    }
  };

  const handleJoin = async () => {
    if (!user || !fellowship) return;
    const { error } = await supabase
      .from("group_members")
      .insert({ group_name: fellowship.name, user_id: user.id });
    if (!error) {
      setIsMember(true);
      setMemberCount(prev => prev + 1);
      toast({ title: "Joined!", description: `You've joined ${fellowship.name}` });
    }
  };

  const handleLeave = async () => {
    if (!user || !fellowship) return;
    const { error } = await supabase
      .from("group_members")
      .delete()
      .eq("group_name", fellowship.name)
      .eq("user_id", user.id);
    if (!error) {
      setIsMember(false);
      setMemberCount(prev => prev - 1);
    }
  };

  if (!fellowship) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Fellowship not found</h1>
          <Button onClick={() => navigate("/campus-fellowships")}>Back to Fellowships</Button>
        </div>
      </div>
    );
  }

  if (showChat) {
    return (
      <div className="h-screen flex flex-col">
        <div className="p-3 bg-card border-b border-border flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setShowChat(false)} className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="font-bold text-foreground">{fellowship.name} Chat</h2>
        </div>
        <div className="flex-1 min-h-0">
          <GroupChatComponent groupName={fellowship.name} onBack={() => setShowChat(false)} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Hero */}
      <div className="relative h-[35vh] min-h-[280px] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-10" />
        <img
          src={`https://images.unsplash.com/${fellowship.image}?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80`}
          alt={fellowship.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 z-20 flex flex-col justify-between p-4 md:p-8">
          <Button
            variant="ghost"
            className="self-start text-white/90 hover:text-white hover:bg-white/10 rounded-full"
            onClick={() => navigate("/campus-fellowships")}
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </Button>
          <div>
            <Badge className="bg-white/20 backdrop-blur-md text-white border-0 mb-3">
              {memberCount} members
            </Badge>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
              {fellowship.name}
            </h1>
            <div className="flex items-center gap-2 text-white/80 mt-2">
              <MapPin className="w-4 h-4" />
              <span className="text-sm font-medium">{fellowship.location}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 -mt-6 relative z-30 space-y-6 max-w-3xl">
        {/* Join / Leave Button */}
        {user && (
          <div className="flex gap-3">
            {isMember ? (
              <>
                <Button
                  onClick={() => setShowChat(true)}
                  className="flex-1 h-14 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base shadow-xl"
                >
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Open Group Chat
                </Button>
                <Button
                  variant="outline"
                  onClick={handleLeave}
                  className="h-14 rounded-2xl border-destructive text-destructive hover:bg-destructive/10 font-bold"
                >
                  Leave
                </Button>
              </>
            ) : (
              <Button
                onClick={handleJoin}
                className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base shadow-xl"
              >
                <Users className="w-5 h-5 mr-2" />
                Join Fellowship
              </Button>
            )}
          </div>
        )}

        {/* Description */}
        <Card className="border-0 shadow-lg bg-card/80 backdrop-blur-sm rounded-2xl">
          <CardContent className="p-6">
            <h2 className="text-lg font-bold text-foreground mb-3">About</h2>
            <p className="text-muted-foreground leading-relaxed">{fellowship.description}</p>
          </CardContent>
        </Card>

        {/* Meeting Info */}
        <Card className="border-0 shadow-lg bg-card/80 backdrop-blur-sm rounded-2xl">
          <CardContent className="p-6">
            <h2 className="text-lg font-bold text-foreground mb-4">Meeting Details</h2>
            <div className="flex items-center gap-4 p-4 bg-accent/50 rounded-xl">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-bold text-foreground">{fellowship.meetingTime}</p>
                <p className="text-sm text-muted-foreground">{fellowship.location}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activities */}
        <Card className="border-0 shadow-lg bg-card/80 backdrop-blur-sm rounded-2xl">
          <CardContent className="p-6">
            <h2 className="text-lg font-bold text-foreground mb-4">Activities</h2>
            <div className="grid grid-cols-2 gap-3">
              {fellowship.activities.map((activity) => {
                const Icon = activityIcons[activity] || Users;
                return (
                  <div
                    key={activity}
                    className="flex items-center gap-3 p-3 bg-accent/30 rounded-xl"
                  >
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-foreground">{activity}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Group Chat CTA */}
        {isMember && (
          <button
            onClick={() => setShowChat(true)}
            className="w-full p-5 bg-primary/5 hover:bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-between transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="text-left">
                <p className="font-bold text-foreground">Group Chat</p>
                <p className="text-sm text-muted-foreground">Chat with fellowship members</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
          </button>
        )}
      </div>
    </div>
  );
};

export default FellowshipGroupPage;
