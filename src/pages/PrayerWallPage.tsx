import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Trash } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PrayerRequestForm from "@/components/PrayerRequestForm";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const PrayerWallPage = () => {
  const [prayerRequests, setPrayerRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchPrayerRequests = async () => {
    setLoading(true);
    // Fetch only public requests for all users
    const { data: requests, error } = await supabase
      .from('prayer_requests')
      .select('*')
      .eq('is_private', false)
      .order('created_at', { ascending: false });
    if (error) {
      toast({ title: "Error", description: "Failed to load prayer requests", variant: "destructive" });
      setPrayerRequests([]);
      setLoading(false);
      return;
    }
    // Fetch all unique user profiles
    const userIds = [...new Set((requests || []).map((r) => r.user_id))];
    let profilesMap: Record<string, any> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);
      profilesMap = (profiles || []).reduce((acc, p) => {
        acc[p.id] = p;
        return acc;
      }, {});
    }
    // Merge profiles into requests
    const merged = (requests || []).map((r) => ({
      ...r,
      profiles: profilesMap[r.user_id] || { full_name: 'Anonymous' },
    }));
    setPrayerRequests(merged);
    setLoading(false);
  };

  useEffect(() => {
    fetchPrayerRequests();
    // Real-time subscription for new and deleted requests
    const channel = supabase
      .channel('prayer_requests')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'prayer_requests' },
        () => fetchPrayerRequests()
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'prayer_requests' },
        () => fetchPrayerRequests()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line
  }, [user]);

  // Determine if current user has admin privileges
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .in('role', ['administrator', 'pastor']);
      if (error) {
        setIsAdmin(false);
        return;
      }
      setIsAdmin(!!data && data.length > 0);
    };
    checkAdminStatus();
  }, [user]);

  // Refresh after submitting a new request
  const handleFormClose = (refresh = false) => {
    setShowForm(false);
    if (refresh) fetchPrayerRequests();
  };

  const getDisplayName = (prayer: any) => {
    if (prayer.profiles?.full_name && prayer.profiles.full_name.trim() !== '') {
      return prayer.profiles.full_name;
    }
    return 'Anonymous';
  };

  const handleDeletePrayer = async (prayerId: string) => {
    if (!isAdmin) return;
    const confirmed = window.confirm('Delete this prayer request? This cannot be undone.');
    if (!confirmed) return;
    const { error } = await supabase
      .from('prayer_requests')
      .delete()
      .eq('id', prayerId);
    if (error) {
      toast({ title: 'Error', description: 'Failed to delete prayer request', variant: 'destructive' });
      return;
    }
    toast({ title: 'Deleted', description: 'Prayer request removed' });
    fetchPrayerRequests();
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="w-5 h-5 text-purple-500" />
            <span>Prayer Wall</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 mb-6">
            <Button className="w-full bg-purple-600 hover:bg-purple-700" onClick={() => setShowForm(true)}>
              Submit Prayer Request
            </Button>
          </div>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading prayer requests...</div>
          ) : (
            <div className="space-y-4">
              {prayerRequests.length === 0 ? (
                <div className="text-center text-muted-foreground">No prayer requests yet.</div>
              ) : (
                prayerRequests.map((prayer) => (
                  <div key={prayer.id} className="p-4 bg-card border border-border rounded-lg">
                    <p className="mb-3 font-medium text-foreground">{prayer.title}</p>
                    <p className="mb-3 text-foreground">{prayer.content}</p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        By {getDisplayName(prayer)} • {prayer.is_private ? "Private" : "Public"} • {new Date(prayer.created_at).toLocaleString()}
                      </span>
                      {isAdmin && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeletePrayer(prayer.id)}
                        >
                          <Trash className="w-4 h-4 mr-1" /> Delete
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
          <div className="mt-8 p-4 bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <h3 className="font-medium text-green-800 dark:text-green-200 mb-2">This Week's Testimonies</h3>
            <div className="space-y-2">
              <p className="text-sm text-green-700 dark:text-green-300">"God provided the exact amount I needed for school fees!" - Mary K.</p>
              <p className="text-sm text-green-700 dark:text-green-300">"My father was healed after we prayed together!" - James L.</p>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Prayer Request Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Submit Prayer Request</DialogTitle>
          </DialogHeader>
          {/* Wrap form to refresh on close */}
          <PrayerRequestForm onSuccess={() => handleFormClose(true)} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PrayerWallPage; 