
import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface SidebarShortcut {
  id: string;
  name: string;
  path: string;
  icon: string;
}

interface ShortcutsContextType {
  shortcuts: SidebarShortcut[];
  loading: boolean;
  addShortcut: (shortcut: Omit<SidebarShortcut, 'id'>) => Promise<void>;
  removeShortcut: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const ShortcutsContext = createContext<ShortcutsContextType | undefined>(undefined);

export const useShortcutsContext = () => {
  const context = useContext(ShortcutsContext);
  if (context === undefined) {
    throw new Error("useShortcutsContext must be used within a ShortcutsProvider");
  }
  return context;
};

export const ShortcutsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
        setShortcuts(Array.isArray(data.sidebar_shortcuts) ? data.sidebar_shortcuts as unknown as SidebarShortcut[] : []);
      }
    } catch (error) {
      console.error('Error fetching shortcuts:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveToSupabase = async (newShortcuts: SidebarShortcut[]) => {
    if (!user) return;

    try {
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
      // Fallback: refetch original data on error
      fetchShortcuts();
    }
  };

  const addShortcut = async (shortcut: Omit<SidebarShortcut, 'id'>) => {
    if (shortcuts.some(s => s.path === shortcut.path)) {
      toast({
        title: "Already Added",
        description: "This page is already in your shortcuts.",
      });
      return;
    }

    const newShortcut = { ...shortcut, id: crypto.randomUUID() };
    const updatedShortcuts = [...shortcuts, newShortcut];
    
    // Optimistic local update
    setShortcuts(updatedShortcuts);
    
    await saveToSupabase(updatedShortcuts);
    
    toast({
      title: "Shortcut Added",
      description: `"${shortcut.name}" added to your sidebar.`,
    });
  };

  const removeShortcut = async (id: string) => {
    const updatedShortcuts = shortcuts.filter(s => s.id !== id);
    
    // Optimistic local update
    setShortcuts(updatedShortcuts);
    
    await saveToSupabase(updatedShortcuts);
  };

  return (
    <ShortcutsContext.Provider value={{ shortcuts, loading, addShortcut, removeShortcut, refresh: fetchShortcuts }}>
      {children}
    </ShortcutsContext.Provider>
  );
};
