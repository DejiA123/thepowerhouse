import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Type, Play, BookOpen, Repeat, Repeat1, Download, ChevronRight, GraduationCap, BookDown } from "lucide-react";
import { useBiblePreferences } from "@/hooks/useBiblePreferences";
import { useGlobalAudio } from "@/contexts/GlobalAudioContext";

interface BibleMenuDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsChange?: () => void;
  onResetToGenesis?: () => void;
  onOpenOffline?: () => void;
  onOpenOfflineText?: () => void;
}

export const BibleMenuDialog = ({
  isOpen,
  onClose,
  onSettingsChange,
  onResetToGenesis,
  onOpenOffline,
  onOpenOfflineText
}: BibleMenuDialogProps) => {
  const { preferences, setAutoPlayNext, setLoopChapter, setLoopBook } = useBiblePreferences();
  const { setLoopChapter: setGlobalLoopChapter, setAutoPlayNext: setGlobalAutoPlayNext, setLoopBook: setGlobalLoopBook } = useGlobalAudio();

  const [studyMarkers, setStudyMarkers] = useState(() => {
    try {
      return localStorage.getItem('bible_study_markers') === 'on';
    } catch {
      return false;
    }
  });

  const [followAudio, setFollowAudio] = useState(() => {
    try {
      return localStorage.getItem('bible_follow_audio') !== 'off';
    } catch {
      return true;
    }
  });

  // Local state for font size slider to allow changes before saving
  const [localFontSize, setLocalFontSize] = useState(() => {
    // Initialize with saved font size from separate localStorage key
    try {
      const savedFontSize = localStorage.getItem('bible-font-size');
      return savedFontSize ? parseInt(savedFontSize) : 15;
    } catch {
      return 15;
    }
  });

  // Update local font size when modal opens (but not when preferences change to avoid resetting slider)
  useEffect(() => {
    if (isOpen) {
      try {
        const savedFontSize = localStorage.getItem('bible-font-size');
        const fontSize = savedFontSize ? parseInt(savedFontSize) : 15;
        console.log('🔍 BibleMenuDialog: Modal opened, setting localFontSize to:', fontSize);
        setLocalFontSize(fontSize);
      } catch {
        setLocalFontSize(15);
      }
    }
  }, [isOpen]); // Only when modal opens, not when preferences change


  console.log('🔍 BibleMenuDialog: Component initialized with:', {
    preferencesFontSize: preferences.fontSize,
    localFontSize: localFontSize,
    isOpen: isOpen
  });

  // Check if device is mobile
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  // Debug: Log mobile detection
  console.log('BibleMenuDialog: Mobile detection:', { isMobile, isIOS, userAgent: navigator.userAgent });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full h-[100dvh] max-w-none m-0 rounded-none overflow-hidden flex flex-col gap-0 bg-slate-100 dark:bg-slate-950 border-none p-0 pt-[env(safe-area-inset-top,0px)] sm:h-[90vh] sm:max-w-lg sm:rounded-3xl [&>button]:right-5 [&>button]:top-[calc(1.4rem+env(safe-area-inset-top,0px))]">
        <DialogHeader className="flex-shrink-0 space-y-0.5 px-5 pb-3 pt-5 text-left">
          <DialogTitle className="font-outfit text-[28px] font-extrabold tracking-tight text-foreground">
            Settings
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Reading and listening preferences
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+2rem)] pt-2">
          <div className="mx-auto max-w-2xl space-y-3">

            <h3 className="px-1 pt-2 text-[12.5px] font-bold uppercase tracking-[0.07em] text-muted-foreground">Reading</h3>

            {/* Font Size */}
            <div className="space-y-2 rounded-xl bg-white dark:bg-slate-800 shadow-sm p-4 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Type className="w-5 h-5 text-primary" />
                  <span className="font-medium text-slate-800 dark:text-slate-200">Font Size</span>
                </div>
                <span className="text-sm font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">{localFontSize}px</span>
              </div>
              <Slider
                value={[localFontSize]}
                onValueChange={(value) => {
                  console.log('🔍 BibleMenuDialog: Slider changed to:', value[0], 'previous localFontSize:', localFontSize);
                  console.log('🔍 BibleMenuDialog: About to save font size:', value[0]);
                  setLocalFontSize(value[0]);

                  // Save font size to separate localStorage key (don't use setFontSize from hook)
                  console.log('🔍 BibleMenuDialog: Saving font size to separate localStorage key:', value[0]);

                  try {
                    localStorage.setItem('bible-font-size', value[0].toString());
                    console.log('🔍 BibleMenuDialog: Saved to separate localStorage key:', value[0]);

                    // Dispatch a custom event to notify all components about the font size change
                    const fontSizeChangeEvent = new CustomEvent('fontSizeChanged', {
                      detail: { fontSize: value[0] }
                    });
                    window.dispatchEvent(fontSizeChangeEvent);
                    console.log('🔍 BibleMenuDialog: Dispatched fontSizeChanged event');
                  } catch (error) {
                    console.warn('🔍 BibleMenuDialog: Failed to save to localStorage:', error);
                  }

                  // No need to override hook changes since we're using separate localStorage key

                  // Apply font size immediately for preview
                  document.documentElement.style.setProperty('--bible-font-size', `${value[0]}px`);
                  console.log('🔍 BibleMenuDialog: CSS custom property set to:', `${value[0]}px`);

                  // Dispatch event for immediate preview
                  const event = new CustomEvent('fontSizeChanged', {
                    detail: { fontSize: value[0] }
                  });
                  window.dispatchEvent(event);
                  console.log('🔍 BibleMenuDialog: fontSizeChanged event dispatched with:', value[0]);

                  // Test if event is being dispatched correctly
                  console.log('🔍 BibleMenuDialog: Event object:', event);
                  console.log('🔍 BibleMenuDialog: Event detail:', event.detail);

                  // Call onSettingsChange to trigger re-render
                  onSettingsChange?.();
                  console.log('🔍 BibleMenuDialog: onSettingsChange called');
                }}
                max={24}
                min={12}
                step={1}
                className={`w-full mb-2 ${isMobile ? 'touch-manipulation' : ''}`}
                style={isMobile ? {
                  touchAction: 'pan-x',
                  WebkitTouchCallout: 'none',
                  WebkitUserSelect: 'none'
                } : {}}
              />
              <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
                <span>Small</span>
                <span>Large</span>
              </div>
            </div>

            {/* Follow along with audio */}
            <div className="space-y-2 rounded-xl bg-white dark:bg-slate-800 shadow-sm p-4 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  <div>
                    <span className="block font-medium text-slate-800 dark:text-slate-200">Follow along with audio</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">Highlight and scroll to the verse being read</span>
                  </div>
                </div>
                <Switch
                  id="follow-audio"
                  checked={followAudio}
                  onCheckedChange={(checked) => {
                    setFollowAudio(checked);
                    try {
                      localStorage.setItem('bible_follow_audio', checked ? 'on' : 'off');
                    } catch {
                      /* ignore */
                    }
                    window.dispatchEvent(new CustomEvent('bible-follow-audio-changed'));
                  }}
                  className="data-[state=checked]:bg-primary"
                />
              </div>
            </div>

            {/* Study note markers */}
            <div className="space-y-2 rounded-xl bg-white dark:bg-slate-800 shadow-sm p-4 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 shrink-0 text-amber-500" />
                  <div>
                    <span className="block font-medium text-slate-800 dark:text-slate-200">Study note markers</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">Show a small cap beside verses that have a study note</span>
                  </div>
                </div>
                <Switch
                  id="study-markers"
                  checked={studyMarkers}
                  onCheckedChange={(checked) => {
                    setStudyMarkers(checked);
                    try {
                      localStorage.setItem('bible_study_markers', checked ? 'on' : 'off');
                    } catch {
                      /* ignore */
                    }
                    window.dispatchEvent(new CustomEvent('bible-study-markers-changed'));
                  }}
                  className="data-[state=checked]:bg-primary"
                />
              </div>
            </div>

            <h3 className="px-1 pt-4 text-[12.5px] font-bold uppercase tracking-[0.07em] text-muted-foreground">Listening</h3>

            {/* Auto-Play Next Chapter */}
            <div className="space-y-2 rounded-xl bg-white dark:bg-slate-800 shadow-sm p-4 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Play className="w-5 h-5 text-primary" />
                  <span className="font-medium text-slate-800 dark:text-slate-200">Auto-Play Next Chapter</span>
                </div>
                <Switch
                  id="auto-play-next"
                  checked={preferences.autoPlayNext}
                  onCheckedChange={(checked) => {
                    console.log('Auto-play next changed to:', checked);
                    setAutoPlayNext(checked);
                    setGlobalAutoPlayNext(checked);

                    // If turning ON Auto-Play, turn OFF Loop Chapter
                    if (checked && preferences.loopChapter) {
                      setLoopChapter(false);
                      setGlobalLoopChapter(false);
                    }

                    // If turning OFF Auto-Play, also turn OFF Loop Book (it depends on Auto-Play)
                    if (!checked && preferences.loopBook) {
                      setLoopBook(false);
                      setGlobalLoopBook(false);
                    }

                    onSettingsChange?.();
                  }}
                  className="data-[state=checked]:bg-primary"
                />
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Automatically continue to the next chapter when audio finishes
              </p>
            </div>

            {/* Loop Chapter */}
            <div className="space-y-2 rounded-xl bg-white dark:bg-slate-800 shadow-sm p-4 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Repeat1 className="w-5 h-5 text-primary" />
                  <span className="font-medium text-slate-800 dark:text-slate-200">Loop Chapter</span>
                </div>
                <Switch
                  id="loop-chapter"
                  checked={preferences.loopChapter}
                  onCheckedChange={(checked) => {
                    console.log('Loop chapter changed to:', checked);
                    setLoopChapter(checked);
                    setGlobalLoopChapter(checked);

                    // If turning ON Loop Chapter, turn OFF Auto-Play Next
                    if (checked && preferences.autoPlayNext) {
                      setAutoPlayNext(false);
                      setGlobalAutoPlayNext(false);
                    }
                    // Also turn OFF Loop Book (mutually exclusive)
                    if (checked && preferences.loopBook) {
                      setLoopBook(false);
                      setGlobalLoopBook(false);
                    }

                    onSettingsChange?.();
                  }}
                  className="data-[state=checked]:bg-primary"
                />
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Repeat current chapter when audio finishes playing
              </p>
            </div>

            {/* Loop Book */}
            <div className="space-y-2 rounded-xl bg-white dark:bg-slate-800 shadow-sm p-4 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Repeat className="w-5 h-5 text-primary" />
                  <span className="font-medium text-slate-800 dark:text-slate-200">Loop Book</span>
                </div>
                <Switch
                  id="loop-book"
                  checked={preferences.loopBook}
                  onCheckedChange={(checked) => {
                    console.log('Loop book changed to:', checked);
                    setLoopBook(checked);
                    setGlobalLoopBook(checked);

                    if (checked) {
                      // Loop Book requires Auto-Play Next to be ON
                      if (!preferences.autoPlayNext) {
                        setAutoPlayNext(true);
                        setGlobalAutoPlayNext(true);
                      }
                      // Turn OFF Loop Chapter (mutually exclusive)
                      if (preferences.loopChapter) {
                        setLoopChapter(false);
                        setGlobalLoopChapter(false);
                      }
                    }

                    onSettingsChange?.();
                  }}
                  className="data-[state=checked]:bg-primary"
                />
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Repeat entire book from chapter 1 when the last chapter finishes
              </p>
            </div>

            <h3 className="px-1 pt-4 text-[12.5px] font-bold uppercase tracking-[0.07em] text-muted-foreground">Offline</h3>

            {/* Offline reading */}
            <button
              onClick={() => {
                onClose();
                onOpenOfflineText?.();
              }}
              className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:bg-slate-50 active:scale-[0.99] dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700/60"
            >
              <BookDown className="h-5 w-5 shrink-0 text-primary" />
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-slate-800 dark:text-slate-200">Read offline</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">Download the Bible to read with no internet</span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-slate-300 dark:text-slate-600" />
            </button>

            {/* Offline audio */}
            <button
              onClick={() => {
                onClose();
                onOpenOffline?.();
              }}
              className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:bg-slate-50 active:scale-[0.99] dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700/60"
            >
              <Download className="h-5 w-5 shrink-0 text-primary" />
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-slate-800 dark:text-slate-200">Listen offline</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">Download chapters to listen without internet</span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-slate-300 dark:text-slate-600" />
            </button>

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};