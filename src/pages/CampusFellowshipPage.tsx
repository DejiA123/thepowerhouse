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
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedCampus, setSelectedCampus] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showContactForm, setShowContactForm] = useState(false);
  const [selectedLeader, setSelectedLeader] = useState<{ name: string, contact: string } | null>(null);
  const [contactMessage, setContactMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [joinedGroup, setJoinedGroup] = useState<string | null>(null);

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
  const [memberNames, setMemberNames] = useState<Record<string, string[]>>({});
  const [joining, setJoining] = useState<string | null>(null);

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

    // Get all unique user IDs
    const userIds = [...new Set(membersData.map(m => m.user_id))];

    // Fetch profiles for all users
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', userIds);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return;
    }

    // Create a map of profiles by user ID
    const profilesMap = profilesData.reduce((acc, p) => {
      acc[p.id] = p;
      return acc;
    }, {} as Record<string, any>);

    // Process the data
    const counts: Record<string, number> = {};
    const names: Record<string, string[]> = {};
    groupNames.forEach(name => {
      counts[name] = 0;
      names[name] = [];
    });

    membersData.forEach((row: any) => {
      if (counts[row.group_name] !== undefined) {
        counts[row.group_name] += 1;
        const profile = profilesMap[row.user_id];
        names[row.group_name].push(profile?.full_name || `User ${row.user_id.substring(0, 8)}`);
      }
    });

    setMemberCounts(counts);
    setMemberNames(names);
  };

  useEffect(() => {
    fetchAllMembers();
  }, []);

  const filteredFellowships = campusFellowships.filter(fellowship =>
    fellowship.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    fellowship.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Join fellowship logic
  const handleJoinFellowship = async (campusId: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please login to join a fellowship",
        variant: "destructive"
      });
      navigate("/auth");
      return;
    }
    const campus = campusFellowships.find(f => f.id === campusId);
    if (!campus) return;
    setJoining(campusId);
    // Add user to group_members
    const { error } = await supabase
      .from('group_members')
      .insert({ user_id: user.id, group_name: campus.name });
    setJoining(null);
    if (!error) {
      toast({ title: "Joined Fellowship", description: `You joined ${campus.name}` });
      fetchAllMembers();
      setJoinedGroup(campus.name); // Open group chat after joining
    } else if (error && error.code === '23505') { // Unique violation: already a member
      // Open group chat anyway
      setJoinedGroup(campus.name);
    } else {
      toast({ title: "Error", description: "Failed to join fellowship", variant: "destructive" });
    }
  };

  const handleContactLeader = (leader: { name: string, contact: string }) => {
    setSelectedLeader(leader);
    setShowContactForm(true);
  };

  const handleSubmitContactForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeader) return;

    setIsSubmitting(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast({
        title: "Message Sent",
        description: `Your message has been sent to ${selectedLeader.name}. They will get back to you soon.`
      });

      setShowContactForm(false);
      setContactMessage("");
      setSelectedLeader(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // If joinedGroup is set, show the group chat page
  if (joinedGroup) {
    return <GroupPage departmentName={joinedGroup} onBack={() => setJoinedGroup(null)} />;
  }

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
                className={`h-full border-0 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${selectedCampus === campus.id
                  ? 'ring-2 ring-primary ring-offset-2'
                  : 'bg-card/50 backdrop-blur-sm shadow-lg'
                  }`}
                onClick={() => setSelectedCampus(campus.id === selectedCampus ? null : campus.id)}
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

                    {selectedCampus === campus.id && (
                      <div className="pt-4 space-y-5 animate-in fade-in slide-in-from-top-2">
                        <div className="space-y-3">
                          <h4 className="font-semibold text-sm uppercase tracking-wider text-primary">Activities</h4>
                          <div className="grid grid-cols-2 gap-2">
                            {campus.activities.map((activity, idx) => (
                              <div key={idx} className="flex items-center text-sm text-foreground/80">
                                <div className="w-1.5 h-1.5 bg-primary/60 rounded-full mr-2" />
                                {activity}
                              </div>
                            ))}
                          </div>
                        </div>

                        {memberNames[campus.name]?.length > 0 && (
                          <div className="space-y-3">
                            <h4 className="font-semibold text-sm uppercase tracking-wider text-primary">Members</h4>
                            <div className="flex flex-wrap gap-2">
                              {memberNames[campus.name].slice(0, 5).map((name, idx) => (
                                <Badge key={idx} variant="secondary" className="font-normal">
                                  {name}
                                </Badge>
                              ))}
                              {memberNames[campus.name].length > 5 && (
                                <Badge variant="outline" className="text-muted-foreground">
                                  +{memberNames[campus.name].length - 5} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="flex gap-3 pt-2">
                          <Button
                            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all"
                            onClick={e => { e.stopPropagation(); handleJoinFellowship(campus.id); }}
                            disabled={joining === campus.id}
                          >
                            {joining === campus.id ? "Joining..." : "Join Group"}
                            <ChevronRight className="w-4 h-4 ml-2" />
                          </Button>
                          <Button
                            variant="outline"
                            className="px-3"
                            onClick={e => { e.stopPropagation(); handleContactLeader({ name: campus.name.split(' ')[0], contact: "Contact not available" }); }}
                          >
                            <Phone className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {selectedCampus !== campus.id && (
                      <div className="pt-2">
                        <Button
                          variant="link"
                          className="w-full text-primary p-0 h-auto font-medium hover:no-underline flex items-center justify-center group-hover:translate-x-1 transition-transform"
                          onClick={() => setSelectedCampus(campus.id)}
                        >
                          View Details <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>

      {/* Contact Form Dialog */}
      <Dialog open={showContactForm} onOpenChange={setShowContactForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Contact Leader</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitContactForm} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder={`Hi ${selectedLeader?.name}, I'd like to know more about the fellowship...`}
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                required
                className="min-h-[120px] resize-none"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowContactForm(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Sending..." : "Send Message"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CampusFellowshipPage;