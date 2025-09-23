import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ChevronLeft, Sun, Moon, Monitor, Palette } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface ThemeSettingsProps {
  onBack: () => void;
}

const themes = [
  { name: 'Light', value: 'light', icon: Sun, description: 'Light background, dark text.', colorClass: 'bg-white' },
  { name: 'Dark', value: 'dark', icon: Moon, description: 'Dark background, light text.', colorClass: 'bg-gray-800' },
  { name: 'System', value: 'system', icon: Monitor, description: 'Follows device settings.', colorClass: 'bg-gray-400' },
  { name: 'Blue', value: 'theme-blue', icon: Palette, description: 'A calming blue theme.', colorClass: 'bg-blue-500' },
  { name: 'Green', value: 'theme-green', icon: Palette, description: 'A natural green theme.', colorClass: 'bg-green-500' },
  { name: 'Purple', value: 'theme-purple', icon: Palette, description: 'An elegant purple theme.', colorClass: 'bg-purple-500' },
  { name: 'Yellow', value: 'theme-yellow', icon: Palette, description: 'A bright yellow theme.', colorClass: 'bg-yellow-500' },
  { name: 'Rose', value: 'theme-rose', icon: Palette, description: 'A soft rose theme.', colorClass: 'bg-rose-500' },
];

const themeClasses = themes.map(t => t.value).filter(t => t !== 'system');

export const ThemeSettings = ({ onBack }: ThemeSettingsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [settings, setSettings] = useState({
    theme: 'system',
    lowLightMode: false,
    reduceMotion: false,
    highContrast: false,
    fontSize: 'medium',
    colorBlindness: 'none'
  });

  useEffect(() => {
    loadThemeSettings();
  }, [user]);

  useEffect(() => {
    applyTheme(settings);
  }, [settings.theme]);

  const loadThemeSettings = async () => {
    try {
      const stored = localStorage.getItem('theme_settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings(prev => ({ ...prev, ...parsed }));
      }

      if (user) {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('theme')
          .eq('user_id', user.id)
          .single();

        if (data && data.theme) {
          setSettings(prev => ({ ...prev, theme: data.theme }));
        }
      }
    } catch (error) {
      console.error('Error loading theme settings:', error);
    }
  };

  const saveThemeSettings = async (newSettings: Partial<typeof settings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    
    try {
      localStorage.setItem('theme_settings', JSON.stringify(updatedSettings));
      
      if (user) {
        const { error } = await supabase
          .from('user_preferences')
          .upsert({
            user_id: user.id,
            theme: updatedSettings.theme,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' });

        if (error) throw error;

        toast({
          title: "Success",
          description: "Theme updated successfully.",
        });
      }
    } catch (error) {
      console.error('Error saving theme settings:', error);
      toast({
        title: "Error",
        description: "Failed to save theme settings.",
        variant: "destructive"
      });
    }
  };

  const applyTheme = (themeSettings: typeof settings) => {
    const root = document.documentElement;
    root.classList.remove(...themeClasses, 'dark');

    if (themeSettings.theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.add(prefersDark ? 'dark' : 'light');
    } else {
      root.classList.add(themeSettings.theme);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <button onClick={onBack} className="p-2">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-semibold">Theme & Appearance</h1>
        <div className="w-10"></div>
      </div>

      <div className="p-4 space-y-8">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Color Themes
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {themes.map((theme) => (
              <div key={theme.value} onClick={() => saveThemeSettings({ theme: theme.value })}>
                <div className={`w-full aspect-square rounded-lg flex items-center justify-center cursor-pointer border-2 ${
                  settings.theme === theme.value ? 'border-primary' : 'border-border'
                } ${theme.colorClass}`}>
                   <theme.icon className={`w-8 h-8 ${theme.value === 'dark' ? 'text-white' : 'text-black'}`} />
                </div>
                <p className="text-center text-sm font-medium mt-2">{theme.name}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Other settings can be added here */}
      </div>
    </div>
  );
};
