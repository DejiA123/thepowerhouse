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
  colorTheme: 'default' | 'blue' | 'green' | 'purple' | 'yellow' | 'red' | 'orange' | 'custom';
  customPrimaryColor?: string;
  customBackgroundColor?: string;
}

export const UnifiedThemeSettings = ({ onBack }: UnifiedThemeSettingsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [settings, setSettings] = useState<ThemeSettings>({
    theme: 'system',
    colorTheme: 'default',
    customPrimaryColor: '#3b82f6',
    customBackgroundColor: '#ffffff'
  });

  useEffect(() => {
    loadThemeSettings();
  }, [user]);

  const loadThemeSettings = async () => {
    // Load from localStorage first
    const localSettings = {
      theme: (localStorage.getItem('theme') || 'system') as 'light' | 'dark' | 'system',
      colorTheme: (localStorage.getItem('colorTheme') || 'default') as 'default' | 'blue' | 'green' | 'purple' | 'yellow' | 'red' | 'orange' | 'custom',
      customPrimaryColor: localStorage.getItem('customPrimaryColor') || '#3b82f6',
      customBackgroundColor: localStorage.getItem('customBackgroundColor') || '#ffffff'
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
    if (updated.customPrimaryColor) localStorage.setItem('customPrimaryColor', updated.customPrimaryColor);
    if (updated.customBackgroundColor) localStorage.setItem('customBackgroundColor', updated.customBackgroundColor);

    // Save to database if user is logged in
    if (user) {
      try {
        const { error } = await supabase
          .from('user_preferences')
          .upsert({
            user_id: user.id,
            theme: updated.theme,
            color_theme: updated.colorTheme,
            custom_primary_color: updated.customPrimaryColor,
            custom_background_color: updated.customBackgroundColor
          }, {
            onConflict: 'user_id'
          });

        if (error) throw error;
      } catch (error) {
        console.error('Error saving theme settings to database:', error);
      }
    }

    applyTheme(updated);
  };

  const applyTheme = (themeSettings: ThemeSettings) => {
    const root = document.documentElement;
    const body = document.body;

    // Remove existing theme classes from both html and body
    root.classList.remove('light', 'dark', 'theme-blue', 'theme-green', 'theme-purple', 'theme-yellow', 'theme-red', 'theme-orange', 'theme-custom');
    body.classList.remove('light', 'dark', 'theme-blue', 'theme-green', 'theme-purple', 'theme-yellow', 'theme-red', 'theme-orange', 'theme-custom');

    // Apply custom theme colors if selected
    if (themeSettings.colorTheme === 'custom') {
      applyCustomTheme(themeSettings);
    } else if (themeSettings.colorTheme !== 'default') {
      const colorThemeClass = `theme-${themeSettings.colorTheme}`;
      root.classList.add(colorThemeClass);
      body.classList.add(colorThemeClass);

      // Apply the theme color as background with !important to override any other styles
      if (themeSettings.colorTheme === 'blue') {
        const color = 'hsl(210, 100%, 97%)';
        document.body.style.setProperty('background-color', color, 'important');
        document.documentElement.style.setProperty('background-color', color, 'important');
        document.documentElement.style.setProperty('--background-color', color, 'important');
      } else if (themeSettings.colorTheme === 'green') {
        const color = 'hsl(120, 60%, 97%)';
        document.body.style.setProperty('background-color', color, 'important');
        document.documentElement.style.setProperty('background-color', color, 'important');
        document.documentElement.style.setProperty('--background-color', color, 'important');
      } else if (themeSettings.colorTheme === 'purple') {
        const color = 'hsl(270, 60%, 90%)'; // Changed from 97% to 90% for more visible purple
        document.body.style.setProperty('background-color', color, 'important');
        document.documentElement.style.setProperty('background-color', color, 'important');
        document.documentElement.style.setProperty('--background-color', color, 'important');
      } else if (themeSettings.colorTheme === 'yellow') {
        const color = 'hsl(48, 100%, 97%)';
        document.body.style.setProperty('background-color', color, 'important');
        document.documentElement.style.setProperty('background-color', color, 'important');
        document.documentElement.style.setProperty('--background-color', color, 'important');
      } else if (themeSettings.colorTheme === 'red') {
        const color = 'hsl(0, 60%, 97%)';
        document.body.style.setProperty('background-color', color, 'important');
        document.documentElement.style.setProperty('background-color', color, 'important');
        document.documentElement.style.setProperty('--background-color', color, 'important');
      } else if (themeSettings.colorTheme === 'orange') {
        const color = 'hsl(30, 100%, 97%)';
        document.body.style.setProperty('background-color', color, 'important');
        document.documentElement.style.setProperty('background-color', color, 'important');
        document.documentElement.style.setProperty('--background-color', color, 'important');
      }
    } else {
      // Reset background for default theme
      document.body.style.removeProperty('background-color');
      document.documentElement.style.removeProperty('background-color');
      document.documentElement.style.removeProperty('--background-color');
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

    // Adjust background color for dark mode
    if (isDark && themeSettings.colorTheme !== 'default') {
      if (themeSettings.colorTheme === 'blue') {
        const color = 'hsl(210, 50%, 6%)';
        document.body.style.setProperty('background-color', color, 'important');
        document.documentElement.style.setProperty('background-color', color, 'important');
        document.documentElement.style.setProperty('--background-color', color, 'important');
      } else if (themeSettings.colorTheme === 'green') {
        const color = 'hsl(120, 50%, 6%)';
        document.body.style.setProperty('background-color', color, 'important');
        document.documentElement.style.setProperty('background-color', color, 'important');
        document.documentElement.style.setProperty('--background-color', color, 'important');
      } else if (themeSettings.colorTheme === 'purple') {
        const color = 'hsl(270, 50%, 15%)'; // Changed from 6% to 15% for more visible purple in dark mode
        document.body.style.setProperty('background-color', color, 'important');
        document.documentElement.style.setProperty('background-color', color, 'important');
        document.documentElement.style.setProperty('--background-color', color, 'important');
      } else if (themeSettings.colorTheme === 'yellow') {
        const color = 'hsl(48, 50%, 6%)';
        document.body.style.setProperty('background-color', color, 'important');
        document.documentElement.style.setProperty('background-color', color, 'important');
        document.documentElement.style.setProperty('--background-color', color, 'important');
      } else if (themeSettings.colorTheme === 'red') {
        const color = 'hsl(0, 50%, 6%)';
        document.body.style.setProperty('background-color', color, 'important');
        document.documentElement.style.setProperty('background-color', color, 'important');
        document.documentElement.style.setProperty('--background-color', color, 'important');
      } else if (themeSettings.colorTheme === 'orange') {
        const color = 'hsl(30, 50%, 6%)';
        document.body.style.setProperty('background-color', color, 'important');
        document.documentElement.style.setProperty('background-color', color, 'important');
        document.documentElement.style.setProperty('--background-color', color, 'important');
      }
    }

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

  const applyCustomTheme = (themeSettings: ThemeSettings) => {
    const root = document.documentElement;

    if (themeSettings.customPrimaryColor && themeSettings.customBackgroundColor) {
      // Convert hex to HSL for CSS variables
      const primaryHSL = hexToHSL(themeSettings.customPrimaryColor);
      const backgroundHSL = hexToHSL(themeSettings.customBackgroundColor);

      // Apply custom CSS variables
      root.style.setProperty('--primary', primaryHSL);
      root.style.setProperty('--background', backgroundHSL);
      root.style.setProperty('--card', backgroundHSL);
      root.style.setProperty('--popover', backgroundHSL);

      // Calculate contrasting foreground color
      const isDarkBackground = isColorDark(themeSettings.customBackgroundColor);
      const foregroundHSL = isDarkBackground ? '0 0% 95%' : '0 0% 5%';
      root.style.setProperty('--foreground', foregroundHSL);
      root.style.setProperty('--card-foreground', foregroundHSL);
      root.style.setProperty('--popover-foreground', foregroundHSL);

      root.classList.add('theme-custom');
    }
  };

  const hexToHSL = (hex: string): string => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }

    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  };

  const isColorDark = (hex: string): boolean => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness < 128;
  };

  const handleThemeChange = (theme: 'light' | 'dark' | 'system') => {
    saveThemeSettings({ theme });
  };

  const handleColorThemeChange = (colorTheme: 'default' | 'blue' | 'green' | 'purple' | 'yellow' | 'red' | 'orange' | 'custom') => {
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
      case 'custom': return <div className="w-4 h-4 rounded-full border-2 border-foreground flex items-center justify-center"><span className="text-xs">✨</span></div>;
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
      case 'custom': return 'Custom';
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
            {['default', 'blue', 'green', 'purple', 'yellow', 'red', 'orange', 'custom'].map((colorTheme) => (
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

          {/* Custom Color Picker */}
          {settings.colorTheme === 'custom' && (
            <div className="space-y-4 border border-border rounded-lg p-4 bg-card">
              <h3 className="text-sm font-medium text-foreground">Custom Colors</h3>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Primary Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.customPrimaryColor}
                      onChange={(e) => saveThemeSettings({ customPrimaryColor: e.target.value })}
                      className="w-8 h-8 rounded border border-border cursor-pointer"
                    />
                    <input
                      type="text"
                      value={settings.customPrimaryColor}
                      onChange={(e) => saveThemeSettings({ customPrimaryColor: e.target.value })}
                      className="flex-1 px-2 py-1 text-xs bg-input border border-border rounded"
                      placeholder="#3b82f6"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Background Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.customBackgroundColor}
                      onChange={(e) => saveThemeSettings({ customBackgroundColor: e.target.value })}
                      className="w-8 h-8 rounded border border-border cursor-pointer"
                    />
                    <input
                      type="text"
                      value={settings.customBackgroundColor}
                      onChange={(e) => saveThemeSettings({ customBackgroundColor: e.target.value })}
                      className="flex-1 px-2 py-1 text-xs bg-input border border-border rounded"
                      placeholder="#ffffff"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};