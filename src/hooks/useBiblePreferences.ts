import { useState, useEffect, useCallback } from 'react';

export interface BiblePreferences {
  preferredTranslation: string;
  preferredBook: string;
  preferredChapter: number;
  autoPlayNext: boolean;
  loopChapter: boolean;
  loopBook: boolean;
  fontSize: number;
  ttsVoice: string;
  ttsRate: number;
  ttsPitch: number;
  // Legacy properties for backward compatibility
  pitch?: number;
  rate?: number;
  redLetters?: boolean;
}

const DEFAULT_PREFERENCES: BiblePreferences = {
  preferredTranslation: 'de4e12af7f28f599-02', // KJV in API.Bible format
  preferredBook: 'Genesis',
  preferredChapter: 1,
  autoPlayNext: true,
  loopChapter: false,
  loopBook: false,
  fontSize: 16,
  ttsVoice: 'default',
  ttsRate: 1.0,
  ttsPitch: 1.0,
  // Legacy properties
  pitch: 1.0,
  rate: 1.0,
  redLetters: false,
};

const STORAGE_KEY = 'bible-preferences';

// Migration logic for updating old Bible Brain IDs to API.Bible format
const migrateTranslationPreference = (stored: BiblePreferences): BiblePreferences => {
  console.log('🔍 Migration check: Current translation =', stored.preferredTranslation);

  // Map old Bible Brain IDs to API.Bible IDs
  const migrationMap: Record<string, string> = {
    'EN1ESV': 'de4e12af7f28f599-02', // KJV fallback
    'EN1KJV': 'de4e12af7f28f599-02', // KJV
    'EN1NIV': '71c6efe4-400e-4a1c-b96b-7cb16a2b3a85', // NIV
    'EN1NLT': '7142504b-f34b-4c6b-8c14-7f89d5b4c3a8', // NLT
    'EN1NASB': '26ff8c70-53a8-4b8b-aa49-8c9e4b8e9c29', // NASB
    'KJVPCE': 'de4e12af7f28f599-02', // KJV
    'ASV': 'de4e12af7f28f599-02', // KJV fallback
    'YLT': 'de4e12af7f28f599-02', // KJV fallback
    'WEB': 'de4e12af7f28f599-02', // KJV fallback
    'ENGKJV2014': 'de4e12af7f28f599-02', // KJV
    'ENGNKJP2014': 'de4e12af7f28f599-02', // KJV fallback
    'ENGLSV2014': '8d1c8f15-bb26-4b8b-ba2c-1f2f6a5a5c57', // ESV
    'ENGNIV2011': '71c6efe4-400e-4a1c-b96b-7cb16a2b3a85', // NIV
    'ENGNLTP2014': '7142504b-f34b-4c6b-8c14-7f89d5b4c3a8', // NLT
    'ENGKJV': 'de4e12af7f28f599-02', // KJV
    'ENGESV': '8d1c8f15-bb26-4b8b-ba2c-1f2f6a5a5c57', // ESV
    'ENGNIV': '71c6efe4-400e-4a1c-b96b-7cb16a2b3a85', // NIV
    'ENGNLT': '7142504b-f34b-4c6b-8c14-7f89d5b4c3a8', // NLT
    'ENGAMP': 'de4e12af7f28f599-02', // KJV fallback
    'ENGNKJV': 'de4e12af7f28f599-02', // KJV
    'ENGNAS': '26ff8c70-53a8-4b8b-aa49-8c9e4b8e9c29', // NASB
    'ENGASV': 'de4e12af7f28f599-02', // KJV fallback
    'ENGREV': 'de4e12af7f28f599-02', // KJV fallback
    'ENGWEB': 'de4e12af7f28f599-02', // KJV fallback
    'CGTCBT': 'de4e12af7f28f599-02', // KJV fallback
    'UNKNOWN': 'de4e12af7f28f599-02', // KJV fallback
    'INVALID': 'de4e12af7f28f599-02', // KJV fallback
  };

  const newTranslation = migrationMap[stored.preferredTranslation];
  if (newTranslation) {
    console.log(`🔄 Migrating translation '${stored.preferredTranslation}' to API.Bible format: '${newTranslation}'`);
    return {
      ...stored,
      preferredTranslation: newTranslation
    };
  }

  return stored;
};

/** The saved preferences, read straight away (it's quick) so the Bible opens without a loading screen. */
const readStoredPreferences = (): BiblePreferences => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_PREFERENCES;
    const raw = JSON.parse(stored) as BiblePreferences;
    const parsed = migrateTranslationPreference(raw);
    // Merge with defaults to ensure all properties exist
    const merged = { ...DEFAULT_PREFERENCES, ...parsed };
    // Save back if migration occurred
    if (parsed.preferredTranslation !== raw.preferredTranslation) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      } catch {
        /* storage full */
      }
    }
    return merged;
  } catch (error) {
    // Unreadable, or storage unavailable (iOS private mode)
    console.warn('⚠️ Could not load Bible preferences from localStorage:', error);
    return DEFAULT_PREFERENCES;
  }
};

export const useBiblePreferences = () => {
  const [preferences, setPreferences] = useState<BiblePreferences>(readStoredPreferences);
  // Read before the first draw, so always ready (kept for the pages that check it)
  const isLoaded = true;

  // One id per hook instance (for the logs)
  const [hookId] = useState(() => Math.random().toString(36).slice(2, 11));

  // Update preferences from localStorage when it changes in other tabs/instances
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue) as BiblePreferences;
          setPreferences(prev => ({ ...prev, ...parsed }));
          console.log(`🔄 useBiblePreferences [${hookId}]: Synced from storage event`);
        } catch (error) {
          console.warn('⚠️ Could not sync preferences from storage event:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [hookId]);

  // Save preferences to localStorage whenever they change
  useEffect(() => {
    if (isLoaded) {
      try {
        // Check if localStorage is available (important for iOS Safari private mode)
        if (typeof Storage !== 'undefined' && localStorage) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
          console.log('🎵 useBiblePreferences: Saving preferences:', {
            stored: preferences,
            defaults: DEFAULT_PREFERENCES,
            isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
            userAgent: navigator.userAgent,
            localStorageAvailable: true,
            hookId: hookId,
            fontSize: preferences.fontSize
          });
          console.log('🎵 useBiblePreferences: Font size being saved:', preferences.fontSize);
          console.log('🎵 useBiblePreferences: localStorage.setItem called with fontSize:', preferences.fontSize);
        } else {
          console.warn('⚠️ localStorage not available on this device');
        }
      } catch (error) {
        console.warn('⚠️ Could not save Bible preferences to localStorage:', error);
        // On iOS Safari private mode, localStorage might throw an error
        if (error instanceof DOMException && error.code === 22) {
          console.warn('⚠️ localStorage quota exceeded or private mode detected');
        }
      }
    }
  }, [preferences, isLoaded, hookId]);

  // Debug: Log when preferences state changes
  useEffect(() => {
    console.log(`🔍 useBiblePreferences [${hookId}]: Preferences state changed:`, preferences);
  }, [preferences, hookId]);

  const setPreferredTranslation = useCallback((translation: string) => {
    setPreferences(prev => ({ ...prev, preferredTranslation: translation }));
  }, []);

  const setPreferredBook = useCallback((book: string) => {
    setPreferences(prev => {
      const next = { ...prev, preferredBook: book };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { }
      return next;
    });
  }, []);

  const setPreferredChapter = useCallback((chapter: number) => {
    setPreferences(prev => {
      const next = { ...prev, preferredChapter: chapter };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { }
      return next;
    });
  }, []);

  const setReadingPosition = useCallback((book: string, chapter: number) => {
    setPreferences(prev => {
      const next = { ...prev, preferredBook: book, preferredChapter: chapter };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        console.log(`💾 useBiblePreferences: Saved reading position: ${book} ${chapter}`);
      } catch { }
      return next;
    });
  }, []);

  const setAutoPlayNext = (autoPlay: boolean) => {
    setPreferences(prev => ({ ...prev, autoPlayNext: autoPlay }));
  };

  const setLoopChapter = (loop: boolean) => {
    setPreferences(prev => ({ ...prev, loopChapter: loop }));
  };

  const setLoopBook = (loop: boolean) => {
    setPreferences(prev => ({ ...prev, loopBook: loop }));
  };

  const setFontSize = (fontSize: number) => {
    console.log(`🎯 useBiblePreferences [${hookId}]: setFontSize called with:`, fontSize);
    console.log(`🎯 useBiblePreferences [${hookId}]: Current preferences before change:`, preferences);
    console.log(`🎯 useBiblePreferences [${hookId}]: Current fontSize in preferences:`, preferences.fontSize);
    console.log(`🎯 useBiblePreferences [${hookId}]: About to update preferences with fontSize:`, fontSize);

    const oldFontSize = preferences.fontSize;
    const newPrefs = { ...preferences, fontSize: fontSize };

    // Immediately update localStorage to prevent race conditions
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newPrefs));
      console.log(`🎯 useBiblePreferences [${hookId}]: Font size immediately saved to localStorage:`, fontSize);
    } catch (error) {
      console.warn('⚠️ Failed to immediately save font size to localStorage:', error);
    }

    setPreferences(newPrefs);
    console.log(`🎯 useBiblePreferences [${hookId}]: Font size change - from ${oldFontSize} to ${fontSize}`);
    console.log(`🎯 useBiblePreferences [${hookId}]: New preferences after change:`, newPrefs);
    console.log(`🎯 useBiblePreferences [${hookId}]: Preferences update completed`);
  };

  const setTtsVoice = (voice: string) => {
    setPreferences(prev => ({ ...prev, ttsVoice: voice }));
  };

  const setTtsRate = (rate: number) => {
    setPreferences(prev => ({ ...prev, ttsRate: rate }));
  };

  const setTtsPitch = (pitch: number) => {
    setPreferences(prev => ({ ...prev, ttsPitch: pitch, pitch })); // Set both for compatibility
  };

  // Legacy setters for backward compatibility
  const setPitch = (pitch: number) => {
    setPreferences(prev => ({ ...prev, ttsPitch: pitch, pitch }));
  };

  const setRate = (rate: number) => {
    setPreferences(prev => ({ ...prev, ttsRate: rate, rate }));
  };

  const setRedLetters = (redLetters: boolean) => {
    setPreferences(prev => ({ ...prev, redLetters }));
  };

  const resetPreferences = () => {
    setPreferences(DEFAULT_PREFERENCES);
  };

  const updatePreferences = (updates: Partial<BiblePreferences>) => {
    setPreferences(prev => ({ ...prev, ...updates }));
  };

  return {
    preferences,
    isLoaded,
    setPreferredTranslation,
    setPreferredBook,
    setPreferredChapter,
    setReadingPosition,
    setAutoPlayNext,
    setLoopChapter,
    setLoopBook,
    setFontSize,
    setTtsVoice,
    setTtsRate,
    setTtsPitch,
    // Legacy methods for backward compatibility
    setPitch,
    setRate,
    setRedLetters,
    resetPreferences,
    updatePreferences,
  };
};