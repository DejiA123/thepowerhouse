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
  colorTheme: 'default' | 'blue' | 'green' | 'purple' | 'yellow' | 'red' | 'orange';
}

export const UnifiedThemeSettings = ({ onBack }: UnifiedThemeSettingsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [settings, setSettings] = useState<ThemeSettings>({
    theme: 'system',
    colorTheme: 'default'
  });

  useEffect(() => {
    loadThemeSettings();
  }, [user]);

  const loadThemeSettings = async () => {
    // Load from localStorage first
    const localSettings = {
      theme: (localStorage.getItem('theme') || 'system') as 'light' | 'dark' | 'system',
      colorTheme: (localStorage.getItem('colorTheme') || 'default') as 'default' | 'blue' | 'green' | 'purple' | 'yellow' | 'red' | 'orange'
    };

    setSettings(localSettings);
    applyTheme(localSettings);
  };

  const saveThemeSettings = async (newSettings: Partial<ThemeSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);

    // Save to localStorage
    localStorage.setItem('theme', updated.theme);
    localStorage.setItem('colorTheme', updated.colorTheme);

    // Save to database if user is logged in
    if (user) {
      try {
        const { error } = await supabase
          .from('user_preferences')
          .upsert({
            user_id: user.id,
            theme: updated.theme,
            color_theme: updated.colorTheme
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
    root.classList.remove('light', 'dark', 'theme-blue', 'theme-green', 'theme-purple', 'theme-yellow', 'theme-red', 'theme-orange');
    body.classList.remove('light', 'dark', 'theme-blue', 'theme-green', 'theme-purple', 'theme-yellow', 'theme-red', 'theme-orange');
    
    // Apply color theme first
    if (themeSettings.colorTheme !== 'default') {
      const colorThemeClass = `theme-${themeSettings.colorTheme}`;
      root.classList.add(colorThemeClass);
      body.classList.add(colorThemeClass);
    }
    
    // Apply light/dark theme
    if (themeSettings.theme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const themeClass = isDark ? 'dark' : 'light';
      root.classList.add(themeClass);
      body.classList.add(themeClass);
    } else {
      root.classList.add(themeSettings.theme);
      body.classList.add(themeSettings.theme);
    }
    
    // Apply background color based on selected theme
    const isDark = themeSettings.theme === 'dark' || (themeSettings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    // Get the computed styles for the current theme combination
    const computedStyles = getComputedStyle(root);
    const backgroundColor = computedStyles.getPropertyValue('--background');
    const foregroundColor = computedStyles.getPropertyValue('--foreground');
    
    if (backgroundColor && foregroundColor) {
      body.style.backgroundColor = `hsl(${backgroundColor})`;
      body.style.color = `hsl(${foregroundColor})`;
      root.style.backgroundColor = `hsl(${backgroundColor})`;
      root.style.color = `hsl(${foregroundColor})`;
    }
    
    // Dynamically update iOS status bar style for PWA
    try {
      const statusBarMeta = document.querySelector(
        'meta[name="apple-mobile-web-app-status-bar-style"]'
      ) as HTMLMetaElement | null;
      if (statusBarMeta) {
        statusBarMeta.setAttribute('content', isDark ? 'black' : 'default');
      }
      
      // Also update theme-color meta tag for Android
      const themeColorMeta = document.querySelector(
        'meta[name="theme-color"]'
      ) as HTMLMetaElement | null;
      if (themeColorMeta) {
        themeColorMeta.setAttribute('content', `hsl(${backgroundColor})`);
      }
    } catch (e) {
      console.warn('Failed to update status bar meta tags:', e);
    }
    
    // Dispatch theme change event
    window.dispatchEvent(new Event('themechange'));
    
    console.log('🎨 Theme applied:', themeSettings.theme, 'Color:', themeSettings.colorTheme, 'Classes:', root.className);
  };

  const handleThemeChange = (theme: 'light' | 'dark' | 'system') => {
    saveThemeSettings({ theme });
  };

  const handleColorThemeChange = (colorTheme: 'default' | 'blue' | 'green' | 'purple' | 'yellow' | 'red' | 'orange') => {
    saveThemeSettings({ colorTheme });
  };

  const getColorThemeIcon = (colorTheme: string) => {
    switch (colorTheme) {
      case 'blue': return <div className="w-4 h-4 rounded-full bg-blue-500" />;
      case 'green': return <div className="w-4 h-4 rounded-full bg-green-500" />;
      case 'purple': return <div className="w-4 h-4 rounded-full bg-purple-500" />;
      case 'yellow': return <div className="w-4 h-4 rounded-full bg-yellow-500" />;
      case 'red': return <div className="w-4 h-4 rounded-full bg-red-500" />;
      case 'orange': return <div className="w-4 h-4 rounded-full bg-orange-500" />;
      default: return <Palette className="w-4 h-4" />;
    }
  };

  const getColorThemeName = (colorTheme: string) => {
    switch (colorTheme) {
      case 'blue': return 'Blue';
      case 'green': return 'Green';
      case 'purple': return 'Purple';
      case 'yellow': return 'Yellow';
      case 'red': return 'Red';
      case 'orange': return 'Orange';
      default: return 'Default';
    }
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
            <Sun className="w-5 h-5" />
            Appearance
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
            Choose your preferred appearance. Light theme provides a bright, clean interface, while Dark theme offers a comfortable viewing experience in low-light conditions.
          </div>
        </div>

        {/* Color Theme Selection */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Color Theme
          </h2>
          
          <div className="grid grid-cols-3 gap-3">
            {['default', 'blue', 'green', 'purple', 'yellow', 'red', 'orange'].map((colorTheme) => (
              <Button
                key={colorTheme}
                variant={settings.colorTheme === colorTheme ? "default" : "outline"}
                onClick={() => handleColorThemeChange(colorTheme as any)}
                className="flex flex-col items-center gap-2 h-20"
              >
                {getColorThemeIcon(colorTheme)}
                <span className="text-sm">{getColorThemeName(colorTheme)}</span>
              </Button>
            ))}
          </div>
          
          <div className="text-sm text-muted-foreground mt-4">
            Choose your preferred color scheme to personalize your experience.
          </div>
        </div>
      </div>
    </div>
  );
};