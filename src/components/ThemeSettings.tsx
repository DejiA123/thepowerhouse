import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ChevronLeft, Sun, Moon, Monitor, Palette, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface ThemeSettingsProps {
  onBack: () => void;
}

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

  const loadThemeSettings = async () => {
    try {
      // Load from localStorage first
      const stored = localStorage.getItem('theme_settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings(prev => ({ ...prev, ...parsed }));
      }

      // Load from database if available - only load theme field that exists
      if (user) {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('theme')
          .eq('user_id', user.id)
          .single();

        if (data) {
          setSettings(prev => ({
            ...prev,
            theme: data.theme || 'system'
          }));
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
      // Save to localStorage
      localStorage.setItem('theme_settings', JSON.stringify(updatedSettings));

      // Save to database - only save theme field that exists in the schema
      if (user) {
        const { error } = await supabase
          .from('user_preferences')
          .upsert({
            user_id: user.id,
            theme: updatedSettings.theme,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          });

        if (error) {
          console.error('Database error:', error);
          toast({
            title: "Error",
            description: "Failed to save theme settings",
            variant: "destructive"
          });
        } else {


          // Apply theme changes
          applyTheme(updatedSettings);
        }
      }
    } catch (error) {
      console.error('Error saving theme settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive"
      });
    }
  };

  const applyTheme = (themeSettings: typeof settings) => {
    // Apply theme to document
    const root = document.documentElement;

    // Remove existing theme classes
    root.classList.remove('light', 'dark');

    // Apply new theme
    if (themeSettings.theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.add(prefersDark ? 'dark' : 'light');
    } else {
      root.classList.add(themeSettings.theme);
    }

    // Apply accessibility settings
    if (themeSettings.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    if (themeSettings.reduceMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }

    // Apply color blindness settings
    root.classList.remove('colorblind-protanopia', 'colorblind-deuteranopia', 'colorblind-tritanopia');
    if (themeSettings.colorBlindness !== 'none') {
      root.classList.add(`colorblind-${themeSettings.colorBlindness}`);
    }

    // Apply font size
    root.classList.remove('text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl');
    root.classList.add(`text-${themeSettings.fontSize}`);
  };

  const handleThemeChange = (theme: string) => {
    saveThemeSettings({ theme });
  };

  const handleToggle = (setting: keyof typeof settings, value: boolean) => {
    saveThemeSettings({ [setting]: value });
  };

  const handleFontSizeChange = (size: string) => {
    saveThemeSettings({ fontSize: size });
  };

  const handleColorBlindnessChange = (type: string) => {
    saveThemeSettings({ colorBlindness: type });
  };

  const getThemeIcon = (theme: string) => {
    switch (theme) {
      case 'light':
        return <Sun className="w-5 h-5" />;
      case 'dark':
        return <Moon className="w-5 h-5" />;
      case 'system':
        return <Monitor className="w-5 h-5" />;
      default:
        return <Sun className="w-5 h-5" />;
    }
  };

  const getThemeName = (theme: string) => {
    switch (theme) {
      case 'light':
        return 'Light';
      case 'dark':
        return 'Dark';
      case 'system':
        return 'System';
      default:
        return 'Light';
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <button onClick={onBack} className="p-2">
          <ChevronLeft className="w-6 h-6 text-gray-900 dark:text-white" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Theme Settings</h1>
        <div className="w-10"></div>
      </div>

      <div className="p-4 space-y-6">
        {/* Theme Selection */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Theme
          </h2>

          <div className="grid grid-cols-1 gap-3">
            {['light', 'dark', 'system'].map((theme) => (
              <button
                key={theme}
                onClick={() => handleThemeChange(theme)}
                className={`p-4 rounded-lg border transition-colors ${settings.theme === theme
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
              >
                <div className="flex items-center gap-3">
                  {getThemeIcon(theme)}
                  <div className="text-left">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {getThemeName(theme)}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {theme === 'system'
                        ? 'Follow your device settings'
                        : theme === 'light'
                          ? 'Light background with dark text'
                          : 'Dark background with light text'
                      }
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Accessibility Settings */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Accessibility</h2>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Low Light Mode</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Reduce brightness for low-light environments</p>
              </div>
              <Switch
                checked={settings.lowLightMode}
                onCheckedChange={(checked) => handleToggle('lowLightMode', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Reduce Motion</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Minimize animations and transitions</p>
              </div>
              <Switch
                checked={settings.reduceMotion}
                onCheckedChange={(checked) => handleToggle('reduceMotion', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">High Contrast</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Increase contrast for better visibility</p>
              </div>
              <Switch
                checked={settings.highContrast}
                onCheckedChange={(checked) => handleToggle('highContrast', checked)}
              />
            </div>
          </div>
        </div>

        {/* Font Size */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Font Size</h2>

          <div className="grid grid-cols-3 gap-3">
            {[
              { value: 'xs', label: 'Small' },
              { value: 'sm', label: 'Medium' },
              { value: 'lg', label: 'Large' }
            ].map((size) => (
              <button
                key={size.value}
                onClick={() => handleFontSizeChange(size.value)}
                className={`p-3 rounded-lg border transition-colors ${settings.fontSize === size.value
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
              >
                <p className={`font-medium text-gray-900 dark:text-white text-${size.value}`}>
                  {size.label}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Color Blindness Support */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Color Blindness Support</h2>

          <div className="space-y-3">
            {[
              { value: 'none', label: 'None' },
              { value: 'protanopia', label: 'Protanopia (Red-Blind)' },
              { value: 'deuteranopia', label: 'Deuteranopia (Green-Blind)' },
              { value: 'tritanopia', label: 'Tritanopia (Blue-Blind)' }
            ].map((type) => (
              <button
                key={type.value}
                onClick={() => handleColorBlindnessChange(type.value)}
                className={`w-full p-3 text-left rounded-lg border transition-colors ${settings.colorBlindness === type.value
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
              >
                <p className="font-medium text-gray-900 dark:text-white">
                  {type.label}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}; 