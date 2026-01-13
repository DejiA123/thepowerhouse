
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Bell, Search, Filter, Pin, Plus, Edit, Clock } from "lucide-react";
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
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Card className="border-none bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl shadow-2xl ring-1 ring-slate-200/50 dark:ring-slate-800/50 overflow-hidden">
      <CardHeader className="pb-4">
        <CardTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <Bell className="w-5 h-5 animate-bounce-subtle" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Announcements</span>
              <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mt-0.5">Community Updates</p>
            </div>
          </div>
          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 active:scale-95 transition-all px-4 h-9 rounded-xl font-bold">
                  <Plus className="w-4 h-4 mr-2" />
                  Create
                </Button>
              </DialogTrigger>
              <DialogContent className="border-none shadow-2xl rounded-2xl bg-white dark:bg-slate-900">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black tracking-tight">New Announcement</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-400">Title</label>
                    <Input
                      value={newAnnouncement.title}
                      onChange={(e) => setNewAnnouncement(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Enter announcement title"
                      className="h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus-visible:ring-indigo-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-400">Content</label>
                    <Textarea
                      value={newAnnouncement.content}
                      onChange={(e) => setNewAnnouncement(prev => ({ ...prev, content: e.target.value }))}
                      placeholder="Enter announcement content"
                      rows={4}
                      className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus-visible:ring-indigo-500"
                    />
                  </div>
                  <Button
                    onClick={createAnnouncement}
                    disabled={loading || !newAnnouncement.title || !newAnnouncement.content}
                    className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-lg shadow-xl shadow-indigo-600/20 active:scale-95 transition-all mt-4"
                  >
                    {loading ? "Creating..." : "Post Announcement"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </CardTitle>

        <div className="flex flex-col sm:flex-row gap-4 mt-6">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <Input
              placeholder="Search community updates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 h-11 bg-slate-50/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 rounded-2xl focus-visible:ring-indigo-500 transition-all shadow-sm"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 px-6 pb-6 mt-2">
        {filteredAnnouncements.length > 0 ? (
          <div className="space-y-4">
            {filteredAnnouncements.map((announcement) => (
              <div
                key={announcement.id}
                className="group p-5 bg-gradient-to-br from-indigo-50/50 to-white dark:from-indigo-950/20 dark:to-slate-900/50 rounded-2xl border border-indigo-100/50 dark:border-indigo-900/30 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 rounded-full" />

                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                      <Bell className="w-4 h-4" />
                    </div>
                    <h3 className="font-black text-slate-900 dark:text-white tracking-tight leading-none">
                      {announcement.title}
                    </h3>
                  </div>

                  {isAdmin && (
                    <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setEditAnnouncement(announcement)}
                        className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeleteId(announcement.id)}
                        className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
                      >
                        <Pin className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>

                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4">
                  {announcement.content}
                </p>

                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-50/50 dark:bg-slate-800/30 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800/50">
                  <div className="flex items-center gap-2">
                    <span className="text-indigo-500">By</span>
                    <span className="text-slate-900 dark:text-slate-200">
                      {announcement.profiles?.full_name || announcement.profiles?.email || 'Unknown'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3 text-indigo-500" />
                    <span>
                      {new Date(announcement.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-12 px-6">
            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100 dark:border-slate-800">
              <Bell className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">No Updates Yet</h3>
            <p className="text-xs text-slate-500 mt-1">Announcements will appear here once posted.</p>
          </div>
        ) : searchTerm.trim() !== "" ? (
          <div className="text-center py-12 px-6">
            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100 dark:border-slate-800">
              <Search className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">No Results Found</h3>
            <p className="text-xs text-slate-500 mt-1">Try adjusting your search terms.</p>
          </div>
        ) : null}
        {/* Edit Announcement Dialog */}
        {isAdmin && editAnnouncement && (
          <Dialog open={!!editAnnouncement} onOpenChange={(open) => !open && setEditAnnouncement(null)}>
            <DialogContent className="border-none shadow-2xl rounded-2xl bg-white dark:bg-slate-900">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black tracking-tight">Edit Announcement</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-400">Title</label>
                  <Input
                    value={editAnnouncement.title}
                    onChange={(e) => setEditAnnouncement((prev: any) => ({ ...prev, title: e.target.value }))}
                    className="h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus-visible:ring-indigo-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-400">Content</label>
                  <Textarea
                    value={editAnnouncement.content}
                    onChange={(e) => setEditAnnouncement((prev: any) => ({ ...prev, content: e.target.value }))}
                    rows={4}
                    className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus-visible:ring-indigo-500"
                  />
                </div>
                <DialogFooter className="gap-2 sm:gap-0 mt-6">
                  <Button variant="outline" onClick={() => setEditAnnouncement(null)} className="h-12 rounded-xl flex-1 sm:flex-none">
                    Cancel
                  </Button>
                  <Button
                    onClick={updateAnnouncement}
                    disabled={editLoading || !editAnnouncement.title || !editAnnouncement.content}
                    className="h-12 bg-indigo-600 hover:bg-indigo-500 text-white font-black shadow-lg shadow-indigo-600/20 active:scale-95 transition-all flex-1 sm:flex-none sm:min-w-[140px]"
                  >
                    {editLoading ? "Saving..." : "Save Changes"}
                  </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
        )}
        {/* Delete Confirmation Dialog */}
        {isAdmin && deleteId && (
          <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
            <DialogContent className="border-none shadow-2xl rounded-2xl bg-white dark:bg-slate-900">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black tracking-tight text-rose-600">Delete Announcement?</DialogTitle>
              </DialogHeader>
              <p className="text-slate-600 dark:text-slate-400 py-4">Are you sure you want to delete this announcement? This action is permanent and cannot be undone.</p>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setDeleteId(null)} className="h-12 rounded-xl flex-1 sm:flex-none">
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={deleteAnnouncement}
                  disabled={deleteLoading}
                  className="h-12 font-black shadow-lg shadow-rose-600/20 active:scale-95 transition-all flex-1 sm:flex-none sm:min-w-[120px]"
                >
                  {deleteLoading ? "Deleting..." : "Delete Permanently"}
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
