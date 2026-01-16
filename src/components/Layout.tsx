import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import Header from "./Header";
import BottomNavigation from "./BottomNavigation";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const showChrome = location.pathname !== "/intro";

  // Initialize theme on app load
  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

    // Set fallback variables: 0px for top (relying on modern Safari's env support)
    // For bottom in browser mode, we want a substantial fallback (24px) to ensure accessibility
    const topFallback = '0px';
    const bottomFallback = (isIOS && !isStandalone) ? '4px' : '0px';

    document.documentElement.style.setProperty('--sat-fallback', topFallback);
    document.documentElement.style.setProperty('--sab-fallback', bottomFallback);

    console.log('📱 Layout: Platform Config', { isIOS, isStandalone, topFallback, bottomFallback });
    const savedTheme = localStorage.getItem('theme') || 'system';
    const savedColorTheme = localStorage.getItem('colorTheme') || 'default';
    const root = document.documentElement;
    const body = document.body;

    const applyTheme = (theme: string, colorTheme: string) => {
      // Remove existing theme classes from both html and body
      root.classList.remove('light', 'dark', 'theme-blue', 'theme-green', 'theme-purple', 'theme-yellow', 'theme-red', 'theme-orange', 'theme-custom');
      body.classList.remove('light', 'dark', 'theme-blue', 'theme-green', 'theme-purple', 'theme-yellow', 'theme-red', 'theme-orange', 'theme-custom');

      // Apply custom theme colors if selected
      if (colorTheme === 'custom') {
        applyCustomTheme();
      } else if (colorTheme !== 'default') {
        const colorThemeClass = `theme-${colorTheme}`;
        root.classList.add(colorThemeClass);
        body.classList.add(colorThemeClass);
      }

      // Apply light/dark theme
      if (theme === 'system') {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const themeClass = isDark ? 'dark' : 'light';
        root.classList.add(themeClass);
        body.classList.add(themeClass);
      } else {
        root.classList.add(theme);
        body.classList.add(theme);
      }

      // Apply background color based on selected theme
      const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

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

      console.log('🎨 Layout: Theme applied:', theme, 'Color:', colorTheme, 'Body classes:', body.className);
    };

    const applyCustomTheme = () => {
      const customPrimaryColor = localStorage.getItem('customPrimaryColor') || '#3b82f6';
      const customBackgroundColor = localStorage.getItem('customBackgroundColor') || '#ffffff';

      // Convert hex to HSL for CSS variables
      const primaryHSL = hexToHSL(customPrimaryColor);
      const backgroundHSL = hexToHSL(customBackgroundColor);

      // Apply custom CSS variables
      root.style.setProperty('--primary', primaryHSL);
      root.style.setProperty('--background', backgroundHSL);
      root.style.setProperty('--card', backgroundHSL);
      root.style.setProperty('--popover', backgroundHSL);

      // Calculate contrasting foreground color
      const isDarkBackground = isColorDark(customBackgroundColor);
      const foregroundHSL = isDarkBackground ? '0 0% 95%' : '0 0% 5%';
      root.style.setProperty('--foreground', foregroundHSL);
      root.style.setProperty('--card-foreground', foregroundHSL);
      root.style.setProperty('--popover-foreground', foregroundHSL);

      root.classList.add('theme-custom');
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

    // Apply initial theme
    applyTheme(savedTheme, savedColorTheme);

    // Listen for theme changes
    const handleThemeChange = () => {
      const currentTheme = localStorage.getItem('theme') || 'system';
      const currentColorTheme = localStorage.getItem('colorTheme') || 'default';
      applyTheme(currentTheme, currentColorTheme);
    };

    // Listen for storage changes (when theme is changed from another tab/window)
    window.addEventListener('storage', handleThemeChange);

    // Listen for custom theme change events
    window.addEventListener('themechange', handleThemeChange);

    return () => {
      window.removeEventListener('storage', handleThemeChange);
      window.removeEventListener('themechange', handleThemeChange);
    };
  }, []);

  return (
    <div className="fixed inset-0 flex flex-col w-full h-full text-foreground bg-background overscroll-none overflow-hidden">
      {/* Background fill for status bar - now using a real element to avoid pushing container height */}
      {/* Hide on Bible page (handles own spacing) AND when Header is shown (Header now handles spacing) */}
      {/* Only show for pages WITHOUT Header (like GroupChats, Intro) except Bible */}
      {location.pathname !== '/bible' && (location.pathname === '/group-chats' || !showChrome) && (
        <div className="shrink-0 bg-background z-20" style={{ height: 'max(env(safe-area-inset-top), var(--sat-fallback, 0px))' }} />
      )}

      {showChrome && location.pathname !== '/bible' && location.pathname !== '/group-chats' && (
        <>
          <Header />
          {/* Spacer for Fixed Header: 80px logo + 16px padding (py-2 = 0.5rem*2) + safe-area-top */}
          <div style={{ height: 'calc(5rem + 1rem + max(env(safe-area-inset-top), var(--sat-fallback, 0px)))' }} />
        </>
      )}

      {/* Main Content */}
      <main
        id="main-content"
        className="flex-1 overflow-y-auto"
      >
        <div className={cn(
          "min-h-full",
          showChrome && location.pathname !== '/group-chats' ? "pb-20" : (location.pathname === '/group-chats' ? "h-full" : "")
        )}>
          {children}
        </div>
      </main>

      {showChrome && location.pathname !== '/group-chats' && <BottomNavigation />}
    </div>
  );
};

export default Layout;
