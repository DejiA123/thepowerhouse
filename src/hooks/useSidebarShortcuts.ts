import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { 
  Home, Book, Calendar, Heart, Info, Users, Video, 
  MessageSquare, MapPin, Settings, FileText, Shield,
  Music, Mic, ClipboardList, Handshake, Camera, Globe, Star, Bookmark,
  Trophy, Target, Zap, Waves, Church, Landmark
} from "lucide-react";

export interface SidebarShortcut {
  id: string;
  name: string;
  path: string;
  icon: string;
}

export const ICON_MAP: Record<string, any> = {
  Home, Book, Calendar, Heart, Info, Users, Video, 
  MessageSquare, MapPin, Settings, FileText, Shield,
  Music, Mic, ClipboardList, Handshake, Camera, Globe, Star, Bookmark,
  Trophy, Target, Zap, Waves, Church, Landmark
};

export const PRESET_SHORTCUTS = [
  { name: "My Choir", path: "/groups/choir", icon: "Music" },
  { name: "Galway Choir", path: "/groups/choir/galway", icon: "Music" },
  { name: "Dublin Choir", path: "/groups/choir/dublin", icon: "Music" },
  { name: "Management", path: "/groups/management", icon: "ClipboardList" },
  { name: "Social", path: "/social", icon: "Users" },
  { name: "Bible Notes", path: "/bible-notes", icon: "FileText" },
];

export const useSidebarShortcuts = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [shortcuts, setShortcuts] = useState<SidebarShortcut[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchShortcuts();
    } else {
      setShortcuts([]);
      setLoading(false);
    }
  }, [user]);

  const fetchShortcuts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_preferences')
        .select('sidebar_shortcuts')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;

      if (data && data.sidebar_shortcuts) {
        // Handle both array and potential null if column exists but is empty
        setShortcuts(Array.isArray(data.sidebar_shortcuts) ? data.sidebar_shortcuts as unknown as SidebarShortcut[] : []);
      }
    } catch (error) {
      console.error('Error fetching shortcuts:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveShortcuts = async (newShortcuts: SidebarShortcut[]) => {
    if (!user) return;

    try {
      // Optimistic update
      setShortcuts(newShortcuts);

      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          sidebar_shortcuts: newShortcuts as any,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving shortcuts:', error);
      toast({
        title: "Error",
        description: "Failed to save your shortcuts preferences.",
        variant: "destructive"
      });
      // Rollback on error
      fetchShortcuts();
    }
  };

  const addShortcut = (shortcut: Omit<SidebarShortcut, 'id'>) => {
    const newId = crypto.randomUUID();
    const fullShortcut = { ...shortcut, id: newId };
    
    // Check if path already exists to avoid redundant shortcuts
    if (shortcuts.some(s => s.path === shortcut.path)) {
      toast({
        title: "Already Added",
        description: "This page is already in your shortcuts.",
      });
      return;
    }

    saveShortcuts([...shortcuts, fullShortcut]);
    toast({
      title: "Shortcut Added",
      description: `"${shortcut.name}" added to your sidebar.`,
    });
  };

  const removeShortcut = (id: string) => {
    const newShortcuts = shortcuts.filter(s => s.id !== id);
    saveShortcuts(newShortcuts);
  };

  return {
    shortcuts,
    loading,
    addShortcut,
    removeShortcut,
    refresh: fetchShortcuts
  };
};
