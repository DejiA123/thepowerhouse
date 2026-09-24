// App.tsx
import React, { Suspense, useEffect } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ScrollToTop from "@/components/ScrollToTop";

import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import HomePage from "@/pages/HomePage";
import { AudioProvider } from "@/contexts/AudioContext";
import { GlobalAudioProvider } from "@/contexts/GlobalAudioContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ShortcutsProvider } from "@/contexts/ShortcutsContext";
import { CallProvider } from "@/contexts/CallContext";
import { PresenceProvider } from "@/contexts/PresenceContext";
import { registerAppServiceWorker } from "@/lib/serviceWorker";
import { syncPushSubscription } from "@/lib/push";

/**
 * Pages are loaded on demand so the first screen appears quickly instead of
 * downloading every page of the app up front. After a new deploy an old tab
 * may request a chunk that no longer exists; reload once to pick up the new build.
 */
const lazyPage = <T extends React.ComponentType<any>>(load: () => Promise<{ default: T }>) =>
  React.lazy(async () => {
    try {
      const module = await load();
      sessionStorage.removeItem("chunk-reload");
      return module;
    } catch (error) {
      if (!sessionStorage.getItem("chunk-reload")) {
        sessionStorage.setItem("chunk-reload", "1");
        window.location.reload();
      }
      throw error;
    }
  });

const BiblePage = lazyPage(() => import("@/pages/BiblePage"));
const NewsPage = lazyPage(() => import("@/pages/NewsPage"));
const GroupsPage = lazyPage(() => import("@/pages/GroupsPage"));
const GivePage = lazyPage(() => import("@/pages/GivePage"));
const ResourcesPage = lazyPage(() => import("@/pages/ResourcesPage"));
const GroupChatsPage = lazyPage(() => import("@/pages/GroupChatsPage"));
const BibleReadingPlansPage = lazyPage(() => import("@/pages/BibleReadingPlansPage"));
const ServicesPage = lazyPage(() => import("@/pages/ServicesPage"));
const AuthPage = lazyPage(() => import("@/pages/AuthPage"));
const UserSettingsPage = lazyPage(() => import("@/pages/UserSettingsPage"));
const CampusFellowshipPage = lazyPage(() => import("@/pages/CampusFellowshipPage"));
const NotFound = lazyPage(() => import("./pages/NotFound"));
const PrayerWallPage = lazyPage(() => import("@/pages/PrayerWallPage"));
const FellowshipGroupPage = lazyPage(() => import("@/pages/FellowshipGroupPage"));
const SocialMediaPage = lazyPage(() => import("@/pages/SocialMediaPage"));
const BibleNotesPage = lazyPage(() => import("@/pages/BibleNotesPage"));
const EmailConfirmationPage = lazyPage(() => import("@/pages/EmailConfirmationPage"));
const PasswordResetPage = lazyPage(() => import("@/pages/PasswordResetPage"));
const EmailConfirmationDebug = lazyPage(() =>
  import("@/components/EmailConfirmationDebug").then((m) => ({ default: m.EmailConfirmationDebug })),
);
const IntroPage = lazyPage(() => import("@/pages/IntroPage"));
const TermsOfServicePage = lazyPage(() => import("@/pages/TermsOfServicePage"));
const PrivacyPolicyPage = lazyPage(() => import("@/pages/PrivacyPolicyPage"));
const FollowUpPage = lazyPage(() => import("@/pages/FollowUpPage"));
const SocialPage = lazyPage(() => import("@/pages/SocialPage"));
const NewHerePage = lazyPage(() => import("@/pages/NewHerePage"));
const ServePage = lazyPage(() => import("@/pages/ServePage"));
const BuildingCampaignPage = lazyPage(() => import("@/pages/BuildingCampaignPage"));
const ChoirPage = lazyPage(() => import("@/pages/ChoirPage"));
const ChoirPortalPage = lazyPage(() => import("@/pages/ChoirPortalPage"));
const ContributionTrackerPage = lazyPage(() => import("@/pages/ContributionTrackerPage"));
const ManagementTeamPage = lazyPage(() => import("@/pages/ManagementTeamPage"));
const UsheringPage = lazyPage(() => import("@/pages/UsheringPage"));
const EvangelismPage = lazyPage(() => import("@/pages/EvangelismPage"));
const PastoralCarePage = lazyPage(() => import("@/pages/PastoralCarePage"));
const TeamFollowUpPage = lazyPage(() => import("@/pages/TeamFollowUpPage"));
const IsolatedEditorPage = lazyPage(() => import("@/pages/IsolatedEditorPage"));

/** Relays service-worker events (notification taps) into router navigation. */
const AppEvents = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const onNavigate = (e: Event) => {
      const url = (e as CustomEvent).detail?.url;
      if (typeof url === "string" && url.startsWith("/")) navigate(url);
    };
    window.addEventListener("app:navigate", onNavigate);
    return () => window.removeEventListener("app:navigate", onNavigate);
  }, [navigate]);

  // Link this device's push subscription to the signed-in user
  useEffect(() => {
    if (user) syncPushSubscription();
  }, [user?.id]);

  return null;
};

const PageFallback = () => (
  <div className="flex min-h-[60vh] items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
  </div>
);

// Create QueryClient with error handling
let queryClient: QueryClient;
try {
  queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
} catch (error) {
  console.error('Failed to create QueryClient:', error);
  queryClient = new QueryClient();
}

const LoadingSpinner = () => (
  <div className="min-h-screen bg-background flex items-center justify-center" style={{ backgroundColor: 'hsl(var(--background))' }}>
    <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary border-t-transparent"></div>
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  try {

    if (loading) {
      return <LoadingSpinner />;
    }

    if (!user) {
      return <Navigate to="/auth" replace />;
    }

    return <>{children}</>;
  } catch (error) {
    console.error('Error in ProtectedRoute:', error);
    return <Navigate to="/auth" replace />;
  }
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  try {

    if (loading) {
      return <LoadingSpinner />;
    }

    if (user) {
      return <Navigate to="/" replace />;
    }

    return <>{children}</>;
  } catch (error) {
    console.error('Error in PublicRoute:', error);
    return <>{children}</>;
  }
};

const AppRoutes = () => {
  const { user, loading } = useAuth();

  try {
    return (
      <AudioProvider onAudioEnd={() => {
        // This will be handled by the BibleChapterContent component
        // The callback is passed through the AudioContext
        console.log('🎵 Audio ended at app level');
      }}>
        <Layout>
          <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/intro" element={<IntroPage />} />
            <Route path="/" element={<HomePage />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/campus-fellowships" element={<CampusFellowshipPage />} />
            <Route path="/campus-fellowship" element={<Navigate to="/campus-fellowships" replace />} />
            <Route
              path="/bible"
              element={<BiblePage />}
            />
            <Route
              path="/bible-notes"
              element={
                <ProtectedRoute>
                  <BibleNotesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/news"
              element={
                <ProtectedRoute>
                  <NewsPage />
                </ProtectedRoute>
              }
            />
            <Route path="/groups" element={<GroupsPage />} />
            <Route path="/give" element={<GivePage />} />
            <Route path="/resources" element={<ResourcesPage />} />
            <Route
              path="/group-chats"
              element={
                <ProtectedRoute>
                  <GroupChatsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/bible-reading-plans"
              element={
                <ProtectedRoute>
                  <BibleReadingPlansPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <UserSettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/auth"
              element={
                <PublicRoute>
                  <AuthPage />
                </PublicRoute>
              }
            />
            <Route path="/email-confirmation" element={<EmailConfirmationPage />} />
            <Route path="/reset-password" element={<PasswordResetPage />} />
            <Route path="/debug-email" element={<EmailConfirmationDebug />} />
            <Route
              path="/prayer"
              element={
                <ProtectedRoute>
                  <PrayerWallPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/social-media"
              element={
                <ProtectedRoute>
                  <SocialMediaPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/social"
              element={
                <ProtectedRoute>
                  <SocialPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/fellowship-group/:groupId"
              element={
                <ProtectedRoute>
                  <FellowshipGroupPage />
                </ProtectedRoute>
              }
            />
            <Route path="/terms-of-service" element={<TermsOfServicePage />} />
            <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
            <Route path="/follow-up" element={<FollowUpPage />} />
            <Route path="/new-here" element={<NewHerePage />} />
            <Route path="/serve" element={<ServePage />} />
            <Route path="/building-campaign" element={<BuildingCampaignPage />} />
            <Route path="/groups/choir" element={<ChoirPortalPage />} />
            <Route path="/groups/choir/contributions" element={<ContributionTrackerPage />} />
            <Route path="/groups/choir/:locationId" element={<ChoirPage />} />
            <Route path="/groups/management" element={<ManagementTeamPage />} />
            <Route path="/groups/ushering" element={<UsheringPage />} />
            <Route path="/groups/evangelism" element={<EvangelismPage />} />
            <Route path="/groups/pastoral" element={<PastoralCarePage />} />
            <Route path="/follow-up-team" element={<TeamFollowUpPage />} />
            <Route path="/team-follow-up" element={<TeamFollowUpPage />} />

            {/* Isolated Editor Route - Nuclear Option for iOS Selection */}
            <Route path="/editor-frame" element={<IsolatedEditorPage />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </Layout>
      </AudioProvider>
    );
  } catch (error) {
    console.error('Error in AppRoutes:', error);
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Routing Error</h1>
          <p className="text-red-500">Failed to load application routes.</p>
        </div>
      </div>
    );
  }
};

const applyTheme = () => {
  // Priority 1: Check new 'theme' key from UnifiedThemeSettings
  const unifiedTheme = localStorage.getItem('theme');

  // Priority 2: Check legacy 'user_preferences'
  let theme = unifiedTheme || 'light'; // Default to light if nothing set

  if (!unifiedTheme) {
    try {
      const userPrefs = localStorage.getItem('user_preferences');
      if (userPrefs) {
        const parsed = JSON.parse(userPrefs);
        if (parsed.theme) theme = parsed.theme;
      }
    } catch (e) {
      console.warn('Failed to parse user preferences:', e);
    }
  }

  const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = theme === 'system' ? isSystemDark : theme === 'dark';

  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  // Dynamically set iOS status bar style for PWA
  try {
    const statusBarMeta = document.querySelector(
      'meta[name="apple-mobile-web-app-status-bar-style"]'
    ) as HTMLMetaElement | null;
    if (statusBarMeta) {
      // For dark mode, use 'black' to show black status bar text on dark background
      // For light mode, use 'default' to show black status bar text on light background
      statusBarMeta.setAttribute('content', isDark ? 'black' : 'default');
    }
  } catch (e) {
    // no-op
  }
};


const App = () => {

  useEffect(() => {
    applyTheme();
    window.addEventListener('storage', applyTheme);
    window.addEventListener('themechange', applyTheme); // Listen for custom event

    // Offline shell + Web Push notifications
    registerAppServiceWorker();

    return () => {
      window.removeEventListener('storage', applyTheme);
      window.removeEventListener('themechange', applyTheme);
    };
  }, []);



  try {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <GlobalAudioProvider>
            <Router>
              <ScrollToTop />
              <TooltipProvider>
                <NotificationProvider>
                  <ShortcutsProvider>
                    <PresenceProvider>
                      <CallProvider>
                        <AppEvents />
                        <AppRoutes />
                      </CallProvider>
                    </PresenceProvider>
                  </ShortcutsProvider>
                </NotificationProvider>
              </TooltipProvider>
            </Router>
          </GlobalAudioProvider>
        </AuthProvider>
      </QueryClientProvider>
    );
  } catch (error) {
    console.error('Error in App component:', error);
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Application Error</h1>
          <p className="text-red-500 mb-4">The application failed to initialize properly.</p>
          <details className="text-left">
            <summary className="cursor-pointer text-red-600 font-medium">Error Details</summary>
            <pre className="mt-2 p-2 bg-red-100 rounded text-xs overflow-auto">
              {error?.toString() || 'Unknown error'}
            </pre>
          </details>
        </div>
      </div>
    );
  }
};

export default App;
