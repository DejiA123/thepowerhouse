
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Bell, Search, Plus, Edit, Clock, Trash2, Megaphone, Calendar } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

const AnnouncementsHub = () => {
  const [searchTerm, setSearchTerm] = useState("");
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
    // Phase 1: Try reading from cache for instant load
    const cacheKey = 'announcements_hub_cache';
    const cachedData = localStorage.getItem(cacheKey);
    let hasCache = false;

    if (cachedData) {
      try {
        const parsedAnnouncements = JSON.parse(cachedData);
        if (Array.isArray(parsedAnnouncements) && parsedAnnouncements.length > 0) {
          setAnnouncements(parsedAnnouncements);
          hasCache = true;
        }
      } catch (error) {
        console.error('Failed to parse cached announcements', error);
      }
    }

    // Phase 2: Fetch accurate real data from server
    const { data: announcementsData } = await supabase
      .from('announcements')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (announcementsData) {
      const authorIds = [...new Set(announcementsData.map(a => a.author_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', authorIds);

      const profilesMap = new Map();
      if (profilesData) {
        profilesData.forEach(profile => {
          profilesMap.set(profile.id, profile);
        });
      }

      const announcementsWithProfiles = announcementsData.map(announcement => ({
        ...announcement,
        profiles: profilesMap.get(announcement.author_id) || null
      }));

      setAnnouncements(announcementsWithProfiles);
      localStorage.setItem(cacheKey, JSON.stringify(announcementsWithProfiles));
    } else if (!hasCache) {
      setAnnouncements([]);
    }
  };

  const createAnnouncement = async () => {
    if (!user || !newAnnouncement.title || !newAnnouncement.content) return;

    setLoading(true);

    const { error } = await supabase
      .from('announcements')
      .insert({
        title: newAnnouncement.title,
        content: newAnnouncement.content,
        author_id: user.id,
        is_active: true
      });

    if (!error) {

      setNewAnnouncement({ title: "", content: "" });
      setIsDialogOpen(false);
      await fetchAnnouncements();
    } else {
      toast({ title: "Error", description: `Failed to create announcement`, variant: "destructive" });
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
      toast({ title: "Deleted" });
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

  return (
    <Card className="border-none bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl shadow-2xl ring-1 ring-white/50 dark:ring-white/10 overflow-hidden rounded-[2.5rem]">
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-indigo-50/50 to-transparent dark:from-indigo-950/20 dark:to-transparent pointer-events-none" />

      <CardHeader className="relative pb-6 px-8 pt-8">
        <CardTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center space-x-4 w-full sm:w-auto">
            <div className="relative group">
              <div className="absolute inset-0 bg-blue-600/20 rounded-2xl blur-lg group-hover:bg-blue-600/30 transition-all duration-500" />
              <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-700 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-600/25 group-hover:scale-105 transition-transform duration-300">
                <Megaphone className="w-6 h-6 animate-pulse" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300">
                Announcements
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="h-5 px-2 text-[10px] uppercase font-bold tracking-wider bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/50">
                  Updates
                </Badge>
                <p className="text-xs font-medium text-slate-400">Latest news from the team</p>
              </div>
            </div>
          </div>

          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="w-full sm:w-auto bg-gradient-to-r from-blue-800 to-blue-600 hover:from-blue-700 hover:to-blue-500 text-white shadow-xl shadow-blue-900/20 active:scale-95 transition-all px-6 h-10 rounded-xl font-bold group">
                  <Plus className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform duration-300" />
                  New Post
                </Button>
              </DialogTrigger>
              <DialogContent className="border-none shadow-2xl rounded-3xl bg-white dark:bg-slate-900 p-0 overflow-hidden max-w-lg">
                <div className="bg-gradient-to-r from-blue-800 to-blue-600 p-8 text-white">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-black tracking-tight">Create Announcement</DialogTitle>
                    <p className="text-indigo-100 font-medium">Share updates with the community</p>
                  </DialogHeader>
                </div>
                <div className="p-8 space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-400">Title</label>
                    <Input
                      value={newAnnouncement.title}
                      onChange={(e) => setNewAnnouncement(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g. Youth Service Check-in"
                      className="h-12 bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-800 rounded-xl focus-visible:ring-indigo-500 font-medium text-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-400">Content</label>
                    <Textarea
                      value={newAnnouncement.content}
                      onChange={(e) => setNewAnnouncement(prev => ({ ...prev, content: e.target.value }))}
                      placeholder="Type your message here..."
                      rows={6}
                      className="bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-800 rounded-xl focus-visible:ring-indigo-500 resize-none font-medium leading-relaxed"
                    />
                  </div>
                  <DialogFooter className="pt-2">
                    <Button
                      onClick={createAnnouncement}
                      disabled={loading || !newAnnouncement.title || !newAnnouncement.content}
                      className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-lg shadow-xl shadow-indigo-600/20 active:scale-95 transition-all rounded-xl"
                    >
                      {loading ? "Publishing..." : "Publish Now"}
                    </Button>
                  </DialogFooter>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </CardTitle>

        <div className="relative mt-8">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <Input
            placeholder="Search announcements..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-11 h-12 bg-white/50 dark:bg-slate-800/50 border-slate-200/50 dark:border-slate-700/50 rounded-2xl focus-visible:ring-indigo-500 transition-all shadow-sm hover:bg-white/80 dark:hover:bg-slate-800/80 backdrop-blur-sm"
          />
        </div>
      </CardHeader>

      <CardContent className="px-8 pb-8">
        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
          {filteredAnnouncements.length > 0 ? (
            filteredAnnouncements.map((announcement) => (
              <div
                key={announcement.id}
                className="group relative bg-white dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-100 dark:border-slate-700/50 hover:border-blue-500/30 dark:hover:border-sky-400/30 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/5 hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                        <Bell className="w-4 h-4" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight group-hover:text-blue-600 dark:group-hover:text-sky-400 transition-colors">
                        {announcement.title}
                      </h3>
                      {(new Date().getTime() - new Date(announcement.created_at).getTime()) < (7 * 24 * 60 * 60 * 1000) && (
                        <Badge variant="default" className="bg-indigo-600 hover:bg-indigo-500 text-[10px] px-1.5 h-5">NEW</Badge>
                      )}
                    </div>

                    <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap pl-11">
                      {announcement.content}
                    </p>

                    <div className="flex items-center gap-4 pl-11 pt-1 opacity-60 group-hover:opacity-100 transition-opacity">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{new Date(announcement.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                      </div>
                      <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                      <div className="text-xs font-medium text-slate-400">
                        {announcement.profiles?.full_name || 'Admin'}
                      </div>
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity translate-x-4 group-hover:translate-x-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur rounded-lg p-1 shadow-sm border border-slate-100 dark:border-slate-800">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setEditAnnouncement(announcement)}
                        className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-md"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeleteId(announcement.id)}
                        className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-4 ring-1 ring-slate-100 dark:ring-slate-700">
                <Bell className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">No Announcements</h3>
              <p className="text-sm text-slate-500 max-w-xs mx-auto">
                Check back later for news and updates from the community.
              </p>
            </div>
          )}
        </div>

        {/* Edit & Delete Dialogs unchanged functionally but styled similarly if needed */}
        {isAdmin && editAnnouncement && (
          <Dialog open={!!editAnnouncement} onOpenChange={(open) => !open && setEditAnnouncement(null)}>
            <DialogContent className="border-none shadow-2xl rounded-3xl bg-white dark:bg-slate-900 p-0 overflow-hidden max-w-lg">
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-8 text-white">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black tracking-tight">Edit Post</DialogTitle>
                </DialogHeader>
              </div>
              <div className="p-8 space-y-6">
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
                    rows={6}
                    className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus-visible:ring-indigo-500 resize-none"
                  />
                </div>
                <DialogFooter className="pt-2 gap-2">
                  <Button variant="ghost" onClick={() => setEditAnnouncement(null)} className="h-12 rounded-xl flex-1">
                    Cancel
                  </Button>
                  <Button
                    onClick={updateAnnouncement}
                    disabled={editLoading || !editAnnouncement.title || !editAnnouncement.content}
                    className="flex-1 h-12 bg-indigo-600 hover:bg-indigo-500 text-white font-black shadow-xl shadow-indigo-600/20 active:scale-95 transition-all rounded-xl"
                  >
                    {editLoading ? "Saving..." : "Save Changes"}
                  </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {isAdmin && deleteId && (
          <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
            <DialogContent className="border-none shadow-2xl rounded-3xl bg-white dark:bg-slate-900 p-8">
              <DialogHeader>
                <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/30 rounded-2xl flex items-center justify-center text-rose-600 mb-4">
                  <Trash2 className="w-6 h-6" />
                </div>
                <DialogTitle className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Delete Post?</DialogTitle>
              </DialogHeader>
              <p className="text-slate-600 dark:text-slate-400 text-base font-medium py-2">
                This action cannot be undone. This will permanently remove the announcement from the hub.
              </p>
              <DialogFooter className="gap-3 mt-6">
                <Button variant="outline" onClick={() => setDeleteId(null)} className="h-12 rounded-xl flex-1 font-bold">
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={deleteAnnouncement}
                  disabled={deleteLoading}
                  className="h-12 font-black shadow-lg shadow-rose-600/20 active:scale-95 transition-all flex-1 rounded-xl"
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
