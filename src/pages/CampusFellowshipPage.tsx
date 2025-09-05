import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users, Calendar, MessageSquare, Phone, Search, Filter, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import GroupPage from "@/components/GroupPage";

const CampusFellowshipPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedCampus, setSelectedCampus] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showContactForm, setShowContactForm] = useState(false);
  const [selectedLeader, setSelectedLeader] = useState<{name: string, contact: string} | null>(null);
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
      activities: [
        "Worship Sessions",
        "Discussion Groups",
        "Community Service",
        "Leadership Training"
      ]
    },
    {
      id: "athlone",
      name: "Believers Connect Athlone",
      location: "Athlone Institute of Technology",
      meetingTime: "Monday 6:00 PM",
      description: "Our Athlone fellowship is dedicated to supporting students in their spiritual journey while pursuing academic excellence.",
      activities: [
        "Bible Study",
        "Prayer Groups",
        "Mentorship Program",
        "Social Gatherings"
      ]
    },
    {
      id: "ucd",
      name: "Believers Connect UCD",
      location: "University College Dublin",
      meetingTime: "Monday 6:00 PM",
      description: "Join our dynamic community at UCD where we explore faith, build lasting friendships, and serve our campus.",
      activities: [
        "Weekly Worship",
        "Study Groups",
        "Outreach Events",
        "Leadership Development"
      ]
    },
    {
      id: "maynooth",
      name: "Believers Connect Maynooth",
      location: "Maynooth University",
      meetingTime: "Monday 6:00 PM",
      description: "A growing community of believers at Maynooth University, committed to supporting students in their faith journey.",
      activities: [
        "Bible Study",
        "Prayer Meetings",
        "Community Outreach",
        "Social Events"
      ]
    },
    {
      id: "cork",
      name: "Believers Connect Cork",
      location: "University College Cork",
      meetingTime: "Monday 6:00 PM",
      description: "Connect with a vibrant community of believers in Cork. We gather weekly to worship, study the Word, pray, and build lasting friendships.",
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

  const handleContactLeader = (leader: {name: string, contact: string}) => {
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
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Campus Fellowships</h1>
          <p className="text-muted-foreground">Connect with believers on your campus</p>
        </div>
        <Button variant="outline" onClick={() => navigate("/")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search by campus or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Campus List */}
      <div className="grid gap-4">
        {filteredFellowships.map((campus) => (
          <Card 
            key={campus.id}
            className={`cursor-pointer transition-all hover:shadow-lg ${selectedCampus === campus.id ? 'border-primary' : ''}`}
            onClick={() => setSelectedCampus(campus.id)}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{campus.name}</span>
                <Badge variant="secondary">{memberCounts[campus.name] ?? 0} members</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>{campus.location}</span>
                </div>
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>{campus.meetingTime}</span>
                </div>
                <p className="text-sm text-foreground">{campus.description}</p>
                
                {selectedCampus === campus.id && (
                  <div className="mt-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <h4 className="font-semibold">Activities</h4>
                        <ul className="text-sm space-y-1">
                          {campus.activities.map((activity, index) => (
                            <li key={index} className="flex items-center space-x-2">
                              <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                              <span>{activity}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-semibold">Meeting Details</h4>
                        <p className="text-sm">Meeting Place: {campus.location}</p>
                        <div className="flex items-center space-x-2 text-sm">
                          <Users className="w-4 h-4" />
                          <span>Leader: {campus.name.split(' ')[0]}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-1">Members</h4>
                      {memberNames[campus.name]?.length ? (
                        <ul className="text-sm space-y-1">
                          {memberNames[campus.name].map((name, idx) => (
                            <li key={idx} className="flex items-center space-x-2">
                              <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                              <span>{name}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-muted-foreground text-sm">No members yet</span>
                      )}
                    </div>
                    <div className="flex gap-4">
                      <Button 
                        className="flex-1"
                        onClick={e => { e.stopPropagation(); handleJoinFellowship(campus.id); }}
                        disabled={joining === campus.id}
                      >
                        {joining === campus.id ? "Joining..." : "Join Fellowship"}
                      </Button>
                      <Button 
                        variant="outline"
                        className="flex items-center space-x-2"
                        onClick={e => { e.stopPropagation(); handleContactLeader({ name: campus.name.split(' ')[0], contact: "Contact not available" }); }}
                      >
                        <Phone className="w-4 h-4" />
                        <span>Contact Leader</span>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Contact Form Dialog */}
      <Dialog open={showContactForm} onOpenChange={setShowContactForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contact Fellowship Leader</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitContactForm} className="space-y-4">
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                placeholder="Write your message here..."
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                required
                className="min-h-[100px]"
              />
            </div>
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
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