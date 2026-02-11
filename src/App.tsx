// App.tsx - Fixed BrowserRouter caching issue
import React, { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ScrollToTop from "@/components/ScrollToTop";

import { BrowserRouter as Router, Routes, Route, Navigate, useParams, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import HomePage from "@/pages/HomePage";
import BiblePage from "@/pages/BiblePage";
import NewsPage from "@/pages/NewsPage";
import GroupsPage from "@/pages/GroupsPage";
import GivePage from "@/pages/GivePage";
import ResourcesPage from "@/pages/ResourcesPage";
import GroupChatsPage from "@/pages/GroupChatsPage";
import BibleReadingPlansPage from "@/pages/BibleReadingPlansPage";
import ServicesPage from "@/pages/ServicesPage";
import AuthPage from "@/pages/AuthPage";
import UserSettingsPage from "@/pages/UserSettingsPage";
import CampusFellowshipPage from "@/pages/CampusFellowshipPage";
import NotFound from "./pages/NotFound";
import PrayerWallPage from "@/pages/PrayerWallPage";
import GroupPage from "@/components/GroupPage";
import { AudioProvider } from "@/contexts/AudioContext";
import { GlobalAudioProvider } from "@/contexts/GlobalAudioContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import SocialMediaPage from "@/pages/SocialMediaPage";
import BibleNotesPage from "@/pages/BibleNotesPage";
import EmailConfirmationPage from "@/pages/EmailConfirmationPage";
import PasswordResetPage from "@/pages/PasswordResetPage";
import { EmailConfirmationDebug } from "@/components/EmailConfirmationDebug";
import IntroPage from "@/pages/IntroPage";
import TermsOfServicePage from "@/pages/TermsOfServicePage";
import PrivacyPolicyPage from "@/pages/PrivacyPolicyPage";
import FollowUpPage from "@/pages/FollowUpPage";
import NewHerePage from "@/pages/NewHerePage";
import ServePage from "@/pages/ServePage";
import BuildingCampaignPage from "@/pages/BuildingCampaignPage";
import ChoirPage from "@/pages/ChoirPage";
import ChoirPortalPage from "@/pages/ChoirPortalPage";
import ContributionTrackerPage from "@/pages/ContributionTrackerPage";
import ManagementTeamPage from "@/pages/ManagementTeamPage";
import UsheringPage from "@/pages/UsheringPage";
import EvangelismPage from "@/pages/EvangelismPage";
import PastoralCarePage from "@/pages/PastoralCarePage";
import TeamFollowUpPage from "@/pages/TeamFollowUpPage";
import IsolatedEditorPage from "@/pages/IsolatedEditorPage";
import { CallProvider, useCall } from "@/contexts/CallContext";
import CallOverlay from "@/components/chat/CallOverlay";

console.log('App.tsx: Component loading...');

// Service Worker Registration for Background Audio
const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('🎵 Service Worker registered successfully:', registration);

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'AUDIO_CONTROL') {
          console.log('🎵 Audio control message received:', event.data.action);
          // Handle audio control messages from service worker
          // This will be handled by the GlobalAudioContext
        }
      });

    } catch (error) {
      console.error('🎵 Service Worker registration failed:', error);
    }
  }
};

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
  console.log('App.tsx: QueryClient created');
} catch (error) {
  console.error('Failed to create QueryClient:', error);
  queryClient = new QueryClient();
}

const LoadingSpinner = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  try {
    console.log('ProtectedRoute: user=', !!user, 'loading=', loading);

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
    console.log('PublicRoute: user=', !!user, 'loading=', loading);

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
  console.log('AppRoutes: Rendering routes...');

  try {
    return (
      <AudioProvider onAudioEnd={() => {
        // This will be handled by the BibleChapterContent component
        // The callback is passed through the AudioContext
        console.log('🎵 Audio ended at app level');
      }}>
        <Layout>
          <Routes>
            <Route path="/intro" element={<IntroPage />} />
            <Route path="/" element={<HomePage />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/campus-fellowships" element={<CampusFellowshipPage />} />
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
              path="/fellowship-group/:groupId"
              element={
                <ProtectedRoute>
                  <GroupPageWrapper />
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

const GroupPageWrapper = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  // Convert groupId to a readable name (e.g. uog -> Believers Connect UoG)
  const groupNames: Record<string, string> = {
    uog: "Believers Connect UoG",
    atu: "Believers Connect ATU",
    tus: "Believers Connect TUS",
    maynooth: "Believers Connect Maynooth",
    south: "Believers Connect South"
  };
  const departmentName = groupNames[groupId || ""] || groupId || "Fellowship";
  return <GroupPage departmentName={departmentName} onBack={() => navigate(-1)} />;
};

const App = () => {
  console.log('App: Main component rendering...');

  useEffect(() => {
    applyTheme();
    window.addEventListener('storage', applyTheme);
    window.addEventListener('themechange', applyTheme); // Listen for custom event

    // Register service worker for background audio support
    registerServiceWorker();

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
                  <CallProvider>
                    <CallManager />
                    <AppRoutes />
                    <Toaster />
                    <Sonner />
                  </CallProvider>
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

// Global component to handle call overlay
const CallManager = () => {
  const { activeCall, endCall } = useCall();

  if (!activeCall) return null;

  return (
    <CallOverlay
      chatId={activeCall.chat_id}
      isActive={true}
      onEndCall={endCall}
    />
  );
};

export default App;
