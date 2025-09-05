
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Announcement {
  id: string;
  title: string;
  content: string;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
  } | null;
}

const RealTimeAnnouncements = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchAnnouncements();
    subscribeToAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    // First fetch announcements
    const { data: announcementsData, error: announcementsError } = await supabase
      .from('announcements')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(10);

    if (announcementsError) {
      toast({ title: "Error", description: "Failed to load announcements", variant: "destructive" });
      return;
    }

    if (announcementsData) {
      // Then fetch profiles for all author_ids
      const authorIds = [...new Set(announcementsData.map(a => a.author_id))];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', authorIds);

      // Create a map of user_id to profile
      const profilesMap = new Map();
      if (profilesData) {
        profilesData.forEach(profile => {
          profilesMap.set(profile.id, profile);
        });
      }

      // Combine announcements with their profiles
      const announcementsWithProfiles = announcementsData.map(announcement => ({
        ...announcement,
        profiles: profilesMap.get(announcement.author_id) || null
      }));

      setAnnouncements(announcementsWithProfiles);
    } else {
      setAnnouncements([]);
    }
  };

  const subscribeToAnnouncements = () => {
    const channel = supabase
      .channel('announcements')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'announcements'
        },
        (payload) => {
          fetchAnnouncements();
          toast({
            title: "New Announcement",
            description: payload.new.title,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5" />
            <span>Live Announcements</span>
          </div>
          {user && (
            <Button size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {announcements.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No announcements yet
          </p>
        ) : (
          announcements.map((announcement) => (
            <div key={announcement.id} className="border rounded-lg p-4 space-y-2">
              <div className="flex items-start justify-between">
                <h3 className="font-semibold dark:text-black">{announcement.title}</h3>
                <Badge variant="secondary">
                  {new Date(announcement.created_at).toLocaleDateString()}
                </Badge>
              </div>
              <p className="text-sm text-foreground dark:text-black">{announcement.content}</p>
              {(announcement.profiles?.full_name || announcement.profiles?.email) && (
                <p className="text-xs text-muted-foreground dark:text-black">
                  By {announcement.profiles?.full_name || announcement.profiles?.email}
                </p>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default RealTimeAnnouncements;
