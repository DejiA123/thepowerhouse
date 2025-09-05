import { useState, useEffect } from 'react';

export interface BiblePreferences {
  preferredTranslation: string;
  preferredBook: string;
  preferredChapter: number;
  autoPlayNext: boolean;
  loopChapter: boolean;
  fontSize: number;
  pitch: number;
  rate: number;
  redLetters: boolean;
}

const DEFAULT_PREFERENCES: BiblePreferences = {
  preferredTranslation: 'ENGKJV', // Use Bible Brain version ID
  preferredBook: 'Genesis',
  preferredChapter: 1,
  autoPlayNext: true,
  loopChapter: false,
  fontSize: 16,
  pitch: 1.6, // Increased from 1.44 to 1.6 for higher pitch
  rate: 0.6, // Slightly slower for more realistic speech (was 0.75)
  redLetters: false,
};

const STORAGE_KEY = 'bible_preferences';

export const useBiblePreferences = () => {
  const [preferences, setPreferences] = useState<BiblePreferences>(DEFAULT_PREFERENCES);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        
        // Migration: Convert old translation IDs to Bible Brain version IDs
        if (parsed.preferredTranslation) {
          console.log(`🔍 Migration check: Current translation = '${parsed.preferredTranslation}'`);
          const translationMap: { [key: string]: string } = {
            // Lowercase versions - only convert problematic ones
            'kjv': 'ENGKJV',
            'niv': 'ENGKJV', // NIV requires special permissions, fallback to KJV
            'esv': 'ENGESV', // ESV should work
            'nlt': 'ENGKJV', // NLT requires special permissions, fallback to KJV
            'amp': 'ENGKJV', // AMP requires special permissions, fallback to KJV
            'gnt': 'ENGKJV', // GNT requires special permissions, fallback to KJV
            'nkjv': 'ENGKJV', // NKJV requires special permissions, fallback to KJV
            'nasb': 'ENGNAS', // NASB should work
            'asv': 'ENGASV', // ASV should work
            'rev': 'ENGREV', // REV should work
            'web': 'ENGWEB', // WEB should work
            // Uppercase versions - only convert problematic ones
            'KJV': 'ENGKJV',
            'NIV': 'ENGKJV', // NIV requires special permissions, fallback to KJV
            'ESV': 'ENGESV', // ESV should work
            'NLT': 'ENGKJV', // NLT requires special permissions, fallback to KJV
            'AMP': 'ENGKJV', // AMP requires special permissions, fallback to KJV
            'GNT': 'ENGKJV', // GNT requires special permissions, fallback to KJV
            'NKJV': 'ENGKJV', // NKJV requires special permissions, fallback to KJV
            'NASB': 'ENGNAS', // NASB should work
            'ASV': 'ENGASV', // ASV should work
            'REV': 'ENGREV', // REV should work
            'WEB': 'ENGWEB', // WEB should work
            // Bible Brain versions that need migration - only problematic ones
            'ENGNIV': 'ENGKJV', // NIV requires special permissions, fallback to KJV
            'ENGNLT': 'ENGKJV', // NLT requires special permissions, fallback to KJV
            'ENGAMP': 'ENGKJV', // AMP requires special permissions, fallback to KJV
            'ENGNKJV': 'ENGKJV', // NKJV requires special permissions, fallback to KJV
            // Unknown/invalid versions
            'CGTCBT': 'ENGKJV', // Unknown version, fallback to KJV
            'UNKNOWN': 'ENGKJV', // Unknown version, fallback to KJV
            'INVALID': 'ENGKJV', // Invalid version, fallback to KJV
          };
          
          const oldTranslation = parsed.preferredTranslation;
          if (translationMap[oldTranslation]) {
            console.log(`🔄 Migrating translation '${parsed.preferredTranslation}' to '${translationMap[oldTranslation]}'`);
            parsed.preferredTranslation = translationMap[oldTranslation];
            
            // Save the migrated preferences
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
              console.log('✅ Migrated preferences saved');
            } catch (error) {
              console.warn('⚠️ Could not save migrated preferences:', error);
            }
          }
        }
        
        // Force migration for ENGNIV if it's still there (aggressive migration)
        if (parsed.preferredTranslation === 'ENGNIV') {
          console.log('🔄 FORCE MIGRATION: Converting ENGNIV to ENGKJV');
          parsed.preferredTranslation = 'ENGKJV';
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
            console.log('✅ Force migration completed');
          } catch (error) {
            console.warn('⚠️ Could not save force migrated preferences:', error);
          }
        }
        
        // iPhone rate handling - ensure reasonable limits but don't force defaults
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        if (isIOS && parsed.rate) {
          console.log('📱 iPhone detected - checking audio rate limits');
          console.log('📱 Original parsed rate:', parsed.rate);
          
          // Only adjust if rate is outside reasonable bounds
          if (parsed.rate > 1.0) {
            console.log('📱 Rate too high for iPhone, capping at 1.0');
            parsed.rate = 1.0;
          } else if (parsed.rate < 0.5) {
            console.log('📱 Rate too low for iPhone, setting minimum to 0.5');
            parsed.rate = 0.5;
          }
          
          console.log('📱 Final parsed rate:', parsed.rate);
        }
        
        console.log('🎵 useBiblePreferences: Loading preferences:', {
          stored: parsed,
          defaults: DEFAULT_PREFERENCES,
          isIOS,
          userAgent: navigator.userAgent
        });
        
        setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
      } else {
        console.log('🎵 useBiblePreferences: No stored preferences, using defaults:', DEFAULT_PREFERENCES);
        console.log('🎵 useBiblePreferences: Default pitch:', DEFAULT_PREFERENCES.pitch, 'Default rate:', DEFAULT_PREFERENCES.rate);
      }
    } catch (error) {
      console.error('Error loading Bible preferences:', error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save preferences to localStorage whenever they change
  const updatePreferences = (newPreferences: Partial<BiblePreferences>) => {
    const updated = { ...preferences, ...newPreferences };
    console.log('useBiblePreferences: Updating preferences:', updated);
    setPreferences(updated);
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      console.log('Bible preferences saved to localStorage:', updated);
    } catch (error) {
      console.error('Error saving Bible preferences:', error);
    }
  };

  // Individual preference setters
  const setPreferredTranslation = (translation: string) => {
    console.log('useBiblePreferences: Setting preferred translation to:', translation);
    updatePreferences({ preferredTranslation: translation });
  };

  const setPreferredBook = (book: string) => {
    updatePreferences({ preferredBook: book });
  };

  const setPreferredChapter = (chapter: number) => {
    updatePreferences({ preferredChapter: chapter });
  };

  const setAutoPlayNext = (autoPlay: boolean) => {
    updatePreferences({ autoPlayNext: autoPlay });
  };

  const setLoopChapter = (loopChapter: boolean) => {
    console.log('useBiblePreferences: setLoopChapter called with:', loopChapter);
    updatePreferences({ loopChapter });
  };

  const setFontSize = (fontSize: number) => {
    console.log('useBiblePreferences: setFontSize called with:', fontSize);
    updatePreferences({ fontSize });
  };

  const setPitch = (pitch: number) => {
    console.log('🎵 useBiblePreferences: setPitch called with:', pitch);
    console.log('🎵 useBiblePreferences: Pitch validation:', {
      isNumber: typeof pitch === 'number',
      value: pitch,
      isValid: !isNaN(pitch) && pitch > 0,
      originalValue: pitch
    });
    updatePreferences({ pitch });
  };

  const setRate = (rate: number) => {
    // iPhone rate handling - allow user preferences but ensure reasonable limits
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    console.log('🎵 useBiblePreferences: setRate called with:', rate, 'isIOS:', isIOS);
    
    let finalRate = rate;
    
    if (isIOS) {
      // Allow user's rate but cap at reasonable limit for iPhone
      if (rate > 1.0) {
        console.log('📱 iPhone detected - capping audio rate to 1.0 (requested: ' + rate + ')');
        finalRate = 1.0;
      } else if (rate < 0.5) {
        console.log('📱 iPhone detected - setting minimum audio rate to 0.5 (requested: ' + rate + ')');
        finalRate = 0.5;
      }
    }
    
    console.log('🎵 useBiblePreferences: Final rate being set:', finalRate);
    console.log('🎵 useBiblePreferences: Rate validation:', {
      isNumber: typeof finalRate === 'number',
      value: finalRate,
      isValid: !isNaN(finalRate) && finalRate > 0,
      originalValue: rate,
      adjusted: finalRate !== rate
    });
    updatePreferences({ rate: finalRate });
  };

  const setRedLetters = (redLetters: boolean) => {
    updatePreferences({ redLetters });
  };

  // Reset to defaults
  const resetPreferences = () => {
    setPreferences(DEFAULT_PREFERENCES);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Error resetting Bible preferences:', error);
    }
  };

  // Reset rate to reasonable iPhone defaults
  const resetRateForIPhone = () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      console.log('📱 iPhone detected - resetting audio rate to 0.6 (iPhone-optimized default)');
      updatePreferences({ rate: 0.6 });
    }
  };

  return {
    preferences,
    isLoaded,
    updatePreferences,
    setPreferredTranslation,
    setPreferredBook,
    setPreferredChapter,
    setAutoPlayNext,
    setLoopChapter,
    setFontSize,
    setPitch,
    setRate,
    setRedLetters,
    resetPreferences,
    resetRateForIPhone,
  };
}; 