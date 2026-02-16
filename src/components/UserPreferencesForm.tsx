
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const UserPreferencesForm = () => {
  const [preferences, setPreferences] = useState({
    audio_quality: 'high',
    theme: 'light'
  });
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Function to get current theme from localStorage and DOM
  const getCurrentTheme = () => {
    try {
      const userPrefs = localStorage.getItem('user_preferences');
      if (userPrefs) {
        const parsed = JSON.parse(userPrefs);
        if (parsed.theme) return parsed.theme;
      }
    } catch (e) { }

    // Fallback: check if dark class is present on document
    if (document.documentElement.classList.contains('dark')) {
      return 'dark';
    }

    return 'light';
  };

  useEffect(() => {
    if (user) {
      fetchPreferences();
    }
  }, [user]);

  // Listen for theme changes and update the dropdown
  useEffect(() => {
    const handleThemeChange = () => {
      const currentTheme = getCurrentTheme();
      setPreferences(prev => ({
        ...prev,
        theme: currentTheme
      }));
    };

    // Listen for the custom themechange event
    window.addEventListener('themechange', handleThemeChange);

    // Also listen for storage changes (in case theme is changed in another tab)
    window.addEventListener('storage', handleThemeChange);

    return () => {
      window.removeEventListener('themechange', handleThemeChange);
      window.removeEventListener('storage', handleThemeChange);
    };
  }, []);

  const fetchPreferences = async () => {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user?.id)
      .single();

    if (data) {
      // Merge database preferences with current theme state, excluding notifications_enabled
      const currentTheme = getCurrentTheme();
      setPreferences({
        audio_quality: data.audio_quality || 'high',
        theme: currentTheme // Use current theme instead of database theme
      });
    } else if (error && error.code !== 'PGRST116') {
      toast({ title: "Error", description: "Failed to load preferences", variant: "destructive" });
    } else {
      // No preferences in database, use current theme
      const currentTheme = getCurrentTheme();
      setPreferences(prev => ({
        ...prev,
        theme: currentTheme
      }));
    }
  };

  const savePreferences = async () => {
    if (!user) return;

    setLoading(true);

    const { error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: user.id,
        ...preferences,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      toast({ title: "Error", description: "Failed to save preferences", variant: "destructive" });
    } else {

    }

    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Settings className="w-5 h-5" />
          <span>App Preferences</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Audio Quality</Label>
          <Select
            value={preferences.audio_quality}
            onValueChange={(value) =>
              setPreferences(prev => ({ ...prev, audio_quality: value }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low (Faster)</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High (Better Quality)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Theme</Label>
          <Select
            value={preferences.theme}
            onValueChange={(value) => {
              setPreferences(prev => {
                const updated = { ...prev, theme: value };
                // Save to localStorage for global theme effect
                try {
                  const userPrefs = localStorage.getItem('user_preferences');
                  const parsed = userPrefs ? JSON.parse(userPrefs) : {};
                  localStorage.setItem('user_preferences', JSON.stringify({ ...parsed, theme: value }));
                  // Dispatch a custom event to trigger theme update immediately
                  window.dispatchEvent(new Event('themechange'));
                } catch (e) { }
                return updated;
              });
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button onClick={savePreferences} disabled={loading} className="flex-1">
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserPreferencesForm;
