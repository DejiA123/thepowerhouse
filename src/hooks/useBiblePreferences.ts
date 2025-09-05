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
  preferredTranslation: 'ENGKJV2014', // Use confirmed working Bible Brain version ID
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
            // Migrate all to confirmed working Bible Brain IDs
            'kjv': 'ENGKJV2014',
            'niv': 'ENGNIV2011', 
            'esv': 'ENGLSV2014',
            'nlt': 'ENGNLTP2014',
            'amp': 'ENGAMP2015',
            'nkjv': 'ENGNKJP2014',
            'asv': 'ENGKJV2014', // Fallback to KJV
            'ylt': 'ENGKJV2014', // Fallback to KJV
            'web': 'ENGKJV2014', // Fallback to KJV
            // Uppercase versions
            'KJV': 'ENGKJV2014',
            'NIV': 'ENGNIV2011',
            'ESV': 'ENGLSV2014',
            'NLT': 'ENGNLTP2014',
            'AMP': 'ENGAMP2015',
            'NKJV': 'ENGNKJP2014',
            'ASV': 'ENGKJV2014',
            'YLT': 'ENGKJV2014',
            'WEB': 'ENGKJV2014',
            // Old Bible Brain versions that need migration
            'KJVPCE': 'ENGKJV2014',
            'ENGKJV': 'ENGKJV2014',
            'ENGESV': 'ENGLSV2014',
            'ENGNIV': 'ENGNIV2011',
            'ENGNLT': 'ENGNLTP2014',
            'ENGAMP': 'ENGAMP2015',
            'ENGNKJV': 'ENGNKJP2014',
            'ENGNAS': 'ENGKJV2014',
            'ENGASV': 'ENGKJV2014',
            'ENGREV': 'ENGKJV2014',
            'ENGWEB': 'ENGKJV2014',
            // Invalid/problematic versions
            'EN1ESV': 'ENGKJV2014',
            'CGTCBT': 'ENGKJV2014',
            'UNKNOWN': 'ENGKJV2014',
            'INVALID': 'ENGKJV2014',
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
        
        // Force migration for any problematic versions (aggressive migration)
        const problematicVersions = ['ENGNIV', 'EN1ESV', 'ENGKJV', 'ENGESV', 'KJVPCE', 'ASV', 'YLT', 'WEB'];
        if (problematicVersions.includes(parsed.preferredTranslation)) {
          console.log(`🔄 FORCE MIGRATION: Converting ${parsed.preferredTranslation} to ENGKJV2014`);
          parsed.preferredTranslation = 'ENGKJV2014';
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