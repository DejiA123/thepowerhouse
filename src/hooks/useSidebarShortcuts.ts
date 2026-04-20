
import { useShortcutsContext, SidebarShortcut } from "@/contexts/ShortcutsContext";
import { 
  Home, Book, Calendar, Heart, Info, Users, Video, 
  MessageSquare, MapPin, Settings, FileText, Shield,
  Music, Mic, ClipboardList, Handshake, Camera, Globe, Star, Bookmark,
  Trophy, Target, Zap, Waves, Church, Landmark
} from "lucide-react";

export type { SidebarShortcut };

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
  const context = useShortcutsContext();
  
  return {
    shortcuts: context.shortcuts,
    loading: context.loading,
    addShortcut: context.addShortcut,
    updateShortcut: context.updateShortcut,
    removeShortcut: context.removeShortcut,
    refresh: context.refresh
  };
};
