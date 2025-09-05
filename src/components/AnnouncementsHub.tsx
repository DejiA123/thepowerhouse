
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Bell, Search, Filter, Pin, Plus, Edit } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const AnnouncementsHub = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: "",
    content: ""
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editAnnouncement, setEditAnnouncement] = useState<any | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();

  const categories = ["All", "General", "Youth", "Evangelism", "Campus", "Workers", "Events"];

  useEffect(() => {
    fetchAnnouncements();
    if (user) {
      checkAdminStatus();
    }
  }, [user]);

  const checkAdminStatus = async () => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user?.id)
      .eq('is_active', true)
      .in('role', ['administrator', 'pastor']);

    if (data && data.length > 0) {
      setIsAdmin(true);
    }
  };

  const fetchAnnouncements = async () => {
    // First fetch announcements
    const { data: announcementsData, error: announcementsError } = await supabase
      .from('announcements')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

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

      console.log('Fetched announcements with profiles:', announcementsWithProfiles); // Debug log
      setAnnouncements(announcementsWithProfiles);
    } else {
      setAnnouncements([]); // Always set state to avoid stale UI
    }
  };

  const createAnnouncement = async () => {
    if (!user || !newAnnouncement.title || !newAnnouncement.content) return;
    
    setLoading(true);
    
    const { data, error } = await supabase
      .from('announcements')
      .insert({
        title: newAnnouncement.title,
        content: newAnnouncement.content,
        author_id: user.id,
        is_active: true // Always set explicitly
      })
      .select(); // Get the inserted row(s) back

    if (!error) {
      toast({ title: "Success", description: "Announcement created successfully" });
      setNewAnnouncement({ title: "", content: "" });
      setIsDialogOpen(false);
      await fetchAnnouncements();
    } else {
      console.error("Failed to create announcement:", error);
      toast({ title: "Error", description: `Failed to create announcement: ${error.message || error}`, variant: "destructive" });
    }
    
    setLoading(false);
  };

  const updateAnnouncement = async () => {
    if (!editAnnouncement || !editAnnouncement.title || !editAnnouncement.content) return;
    setEditLoading(true);
    const { error } = await supabase
      .from('announcements')
      .update({
        title: editAnnouncement.title,
        content: editAnnouncement.content
      })
      .eq('id', editAnnouncement.id);
    setEditLoading(false);
    if (!error) {
      toast({ title: "Success", description: "Announcement updated" });
      setEditAnnouncement(null);
      fetchAnnouncements();
    } else {
      toast({ title: "Error", description: "Failed to update announcement", variant: "destructive" });
    }
  };

  const deleteAnnouncement = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', deleteId);
    setDeleteLoading(false);
    if (!error) {
      toast({ title: "Deleted", description: "Announcement deleted" });
      setDeleteId(null);
      fetchAnnouncements();
    } else {
      toast({ title: "Error", description: "Failed to delete announcement", variant: "destructive" });
    }
  };

  const filteredAnnouncements = searchTerm.trim() === ""
    ? announcements
    : announcements.filter(announcement => {
        const matchesSearch = announcement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             announcement.content.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
      });

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5 text-blue-600" />
            <span>Announcements</span>
          </div>
          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Create
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Announcement</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Title</label>
                    <Input
                      value={newAnnouncement.title}
                      onChange={(e) => setNewAnnouncement(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Enter announcement title"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Content</label>
                    <Textarea
                      value={newAnnouncement.content}
                      onChange={(e) => setNewAnnouncement(prev => ({ ...prev, content: e.target.value }))}
                      placeholder="Enter announcement content"
                      rows={4}
                    />
                  </div>
                  <Button 
                    onClick={createAnnouncement}
                    disabled={loading || !newAnnouncement.title || !newAnnouncement.content}
                    className="w-full"
                  >
                    {loading ? "Creating..." : "Create Announcement"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </CardTitle>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search announcements..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {filteredAnnouncements.length > 0 ? (
          filteredAnnouncements.map((announcement) => (
            <div key={announcement.id} className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-foreground">{announcement.title}</h3>
                {isAdmin && (
                  <div className="flex space-x-2">
                    <Button size="icon" variant="ghost" onClick={() => setEditAnnouncement(announcement)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setDeleteId(announcement.id)}>
                      <Pin className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                )}
              </div>
              <p className="text-foreground mb-3">{announcement.content}</p>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-4">
                  <span className="text-muted-foreground">
                    By {announcement.profiles?.full_name || announcement.profiles?.email || 'Unknown'}
                  </span>
                  <span className="text-muted-foreground">
                    {new Date(announcement.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : announcements.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No announcements have been posted yet.
          </div>
        ) : searchTerm.trim() !== "" ? (
          <div className="text-center py-8 text-muted-foreground">
            No announcements found matching your search.
          </div>
        ) : null}
        {/* Edit Announcement Dialog */}
        {isAdmin && editAnnouncement && (
          <Dialog open={!!editAnnouncement} onOpenChange={(open) => !open && setEditAnnouncement(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Announcement</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    value={editAnnouncement.title}
                    onChange={(e) => setEditAnnouncement((prev: any) => ({ ...prev, title: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Content</label>
                  <Textarea
                    value={editAnnouncement.content}
                    onChange={(e) => setEditAnnouncement((prev: any) => ({ ...prev, content: e.target.value }))}
                    rows={4}
                  />
                </div>
                <DialogFooter>
                  <Button onClick={updateAnnouncement} disabled={editLoading || !editAnnouncement.title || !editAnnouncement.content}>
                    {editLoading ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button variant="outline" onClick={() => setEditAnnouncement(null)}>
                    Cancel
                  </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
        )}
        {/* Delete Confirmation Dialog */}
        {isAdmin && deleteId && (
          <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Announcement?</DialogTitle>
              </DialogHeader>
              <p>Are you sure you want to delete this announcement? This action cannot be undone.</p>
              <DialogFooter>
                <Button variant="destructive" onClick={deleteAnnouncement} disabled={deleteLoading}>
                  {deleteLoading ? "Deleting..." : "Delete"}
                </Button>
                <Button variant="outline" onClick={() => setDeleteId(null)}>
                  Cancel
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
};

export default AnnouncementsHub;
