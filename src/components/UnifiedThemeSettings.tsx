import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Sun, Moon, Monitor, Palette } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface UnifiedThemeSettingsProps {
  onBack: () => void;
}

interface ThemeSettings {
  theme: 'light' | 'dark' | 'system';
}

export const UnifiedThemeSettings = ({ onBack }: UnifiedThemeSettingsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [settings, setSettings] = useState<ThemeSettings>({
    theme: 'system'
  });

  useEffect(() => {
    loadThemeSettings();
  }, [user]);

  const loadThemeSettings = async () => {
    // Load from localStorage first
    const localSettings = {
      theme: (localStorage.getItem('theme') || 'system') as 'light' | 'dark' | 'system'
    };

    setSettings(localSettings);
    applyTheme(localSettings);
  };

  const saveThemeSettings = async (newSettings: Partial<ThemeSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);

    // Save to localStorage
    localStorage.setItem('theme', updated.theme);

    // Save to database if user is logged in
    if (user) {
      try {
        const { error } = await supabase
          .from('user_preferences')
          .upsert({
            user_id: user.id,
            theme: updated.theme
          }, {
            onConflict: 'user_id'
          });

        if (error) throw error;
      } catch (error) {
        console.error('Error saving theme settings to database:', error);
      }
    }

    applyTheme(updated);
    
    toast({
      title: "Theme Updated",
      description: `Switched to ${getThemeName(updated.theme)} theme`,
    });
  };

  const applyTheme = (themeSettings: ThemeSettings) => {
    const root = document.documentElement;
    const body = document.body;
    
    // Remove existing theme classes from both html and body
    root.classList.remove('light', 'dark');
    body.classList.remove('light', 'dark');
    
    // Apply theme
    if (themeSettings.theme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const themeClass = isDark ? 'dark' : 'light';
      root.classList.add(themeClass);
      body.classList.add(themeClass);
      
      // Apply background color based on system preference
      if (isDark) {
        body.style.backgroundColor = '#0a0a0a';
        body.style.color = '#ffffff';
        root.style.backgroundColor = '#0a0a0a';
        root.style.color = '#ffffff';
      } else {
        body.style.backgroundColor = '#ffffff';
        body.style.color = '#000000';
        root.style.backgroundColor = '#ffffff';
        root.style.color = '#000000';
      }
    } else {
      root.classList.add(themeSettings.theme);
      body.classList.add(themeSettings.theme);
      
      // Apply background color based on selected theme
      if (themeSettings.theme === 'dark') {
        body.style.backgroundColor = '#0a0a0a';
        body.style.color = '#ffffff';
        root.style.backgroundColor = '#0a0a0a';
        root.style.color = '#ffffff';
      } else {
        body.style.backgroundColor = '#ffffff';
        body.style.color = '#000000';
        root.style.backgroundColor = '#ffffff';
        root.style.color = '#000000';
      }
    }
    
    // Dynamically update iOS status bar style for PWA
    try {
      const statusBarMeta = document.querySelector(
        'meta[name="apple-mobile-web-app-status-bar-style"]'
      ) as HTMLMetaElement | null;
      if (statusBarMeta) {
        // For dark mode, use 'black' to show black status bar text on dark background
        // For light mode, use 'default' to show black status bar text on light background
        const isDark = themeSettings.theme === 'dark' || (themeSettings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        statusBarMeta.setAttribute('content', isDark ? 'black' : 'default');
      }
      
      // Also update theme-color meta tag for Android
      const themeColorMeta = document.querySelector(
        'meta[name="theme-color"]'
      ) as HTMLMetaElement | null;
      if (themeColorMeta) {
        const isDark = themeSettings.theme === 'dark' || (themeSettings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        themeColorMeta.setAttribute('content', isDark ? '#0a0a0a' : '#ffffff');
      }
    } catch (e) {
      console.warn('Failed to update status bar meta tags:', e);
    }
    
    // Dispatch theme change event
    window.dispatchEvent(new Event('themechange'));
    
    console.log('🎨 Theme applied:', themeSettings.theme, 'Classes:', root.className, 'Body classes:', body.className);
  };

  const handleThemeChange = (theme: 'light' | 'dark' | 'system') => {
    saveThemeSettings({ theme });
  };

  const getThemeIcon = (theme: string) => {
    switch (theme) {
      case 'light': return <Sun className="w-4 h-4" />;
      case 'dark': return <Moon className="w-4 h-4" />;
      default: return <Monitor className="w-4 h-4" />;
    }
  };

  const getThemeName = (theme: string) => {
    switch (theme) {
      case 'light': return 'Light';
      case 'dark': return 'Dark';
      default: return 'System';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <button onClick={onBack} className="p-2">
          <ChevronLeft className="w-6 h-6 text-foreground" />
        </button>
        <h1 className="text-lg font-semibold text-foreground">Theme</h1>
        <div className="w-10"></div>
      </div>

      <div className="p-4 space-y-6">
        {/* Theme Selection */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Theme Selection
          </h2>
          
          <div className="grid grid-cols-3 gap-3">
            {['light', 'dark', 'system'].map((theme) => (
              <Button
                key={theme}
                variant={settings.theme === theme ? "default" : "outline"}
                onClick={() => handleThemeChange(theme as 'light' | 'dark' | 'system')}
                className="flex flex-col items-center gap-2 h-20"
              >
                {getThemeIcon(theme)}
                <span className="text-sm">{getThemeName(theme)}</span>
              </Button>
            ))}
          </div>
          
          <div className="text-sm text-muted-foreground mt-4">
            Choose your preferred theme. Light theme provides a bright, clean interface, while Dark theme offers a comfortable viewing experience in low-light conditions.
          </div>
        </div>
      </div>
    </div>
  );
};