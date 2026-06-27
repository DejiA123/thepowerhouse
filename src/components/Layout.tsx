import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import Header from "./Header";
import BottomNavigation from "./BottomNavigation";
import DesktopSidebar from "./DesktopSidebar";
import GlobalMiniPlayer from "./GlobalMiniPlayer";
import { useIsMobile } from "@/hooks/use-mobile";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const showChrome = location.pathname !== "/intro";

  // Reset scroll on every route change — runs in Layout because it owns #main-content
  useEffect(() => {
    const el = document.getElementById('main-content');
    if (el) {
      el.scrollTop = 0;
    }
  }, [location.pathname]);

  // Initialize theme on app load
  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

    // Set fallback variables: 0px for top (relying on modern Safari's env support)
    // For bottom in browser mode, we want a substantial fallback (24px) to ensure accessibility
    const topFallback = '0px';
    const bottomFallback = '0px';

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
        const bgValue = `hsl(${backgroundColor})`;
        body.style.backgroundColor = bgValue;
        body.style.color = `hsl(${foregroundColor})`;
        root.style.backgroundColor = bgValue;
        root.style.color = `hsl(${foregroundColor})`;
        // Also ensure html is covered for absolute grounding
        document.body.parentElement!.style.backgroundColor = bgValue;
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

  // Isolated Editor Frame - Return children without any layout chrome
  if (location.pathname === '/editor-frame') {
    return <>{children}</>;
  }

  return (
    <div
      id="app-layout-root"
      className={cn(
        "fixed inset-0 flex w-full text-foreground bg-background overscroll-none overflow-x-hidden",
        isMobile ? "flex-col" : "flex-row",
        location.pathname === '/group-chats' && "overflow-hidden"
      )}
    >
      {/* Desktop Sidebar - only on desktop */}
      {!isMobile && showChrome && <DesktopSidebar />}

      {/* Main column */}
      <div id="app-main-wrapper" className="flex flex-col flex-1 min-w-0">
        {/* Background fill for status bar - mobile only */}
        {isMobile && location.pathname !== '/bible' && (location.pathname === '/follow-up' || !showChrome) && (
          <div className="shrink-0 bg-background z-20" style={{ height: 'max(env(safe-area-inset-top), var(--sat-fallback, 0px))' }} />
        )}

        {/* Header - mobile shows full header (not on group-chats; chat has its own header) */}
        {showChrome && location.pathname !== '/bible' && location.pathname !== '/group-chats' && location.pathname !== '/follow-up' && (
          <>
            {isMobile && (
              <>
                <Header />
                <div className="h-16 sm:h-20 shrink-0" style={{ marginTop: 'max(env(safe-area-inset-top), var(--sat-fallback, 0px))' }} />
              </>
            )}
          </>
        )}

        {/* Safe-area top fill for group-chats on mobile (no app header above) */}
        {isMobile && location.pathname === '/group-chats' && (
          <div className="shrink-0 bg-background" style={{ height: 'max(env(safe-area-inset-top), var(--sat-fallback, 0px))' }} />
        )}

        {/* Main Content */}
        <main
          id="main-content"
          className={cn(
            "flex-1 min-h-0 relative bg-background",
            isMobile && location.pathname === '/group-chats' && "pb-[90px]",
            location.pathname === '/bible' || location.pathname === '/group-chats' ? "overflow-hidden" : "overflow-y-auto"
          )}
        >
          <div
              key={location.pathname}
              className={cn(
                "page-enter bg-background",
                location.pathname === '/group-chats'
                  ? "h-full overflow-hidden"
                  : "min-h-full",
                location.pathname !== '/group-chats' && showChrome && isMobile && location.pathname !== '/follow-up' && location.pathname !== '/bible'
                  ? "pb-[90px]"
                  : ""
              )}
            >
              {children}
            </div>
        </main>

        {/* Bottom Nav - mobile only */}
        {isMobile && showChrome && location.pathname !== '/follow-up' && <BottomNavigation />}

        {/* Global Mini Player for Background Audio */}
        <GlobalMiniPlayer />
      </div>
    </div>
  );
};

export default Layout;
