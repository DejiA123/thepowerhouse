import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Type, Settings, Play } from "lucide-react";
import { useBiblePreferences } from "@/hooks/useBiblePreferences";

interface BibleMenuDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsChange?: () => void;
  onResetToGenesis?: () => void;
}

export const BibleMenuDialog = ({ isOpen, onClose, onSettingsChange, onResetToGenesis }: BibleMenuDialogProps) => {
  const { preferences, setAutoPlayNext, setLoopChapter } = useBiblePreferences();
  
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
      <DialogContent className={`w-full max-w-md overflow-hidden flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 ${
        isMobile 
          ? 'max-h-[95vh] mx-2 my-2' 
          : 'max-h-[80vh] mx-auto'
      }`}>
        <DialogHeader className="flex-shrink-0 pb-2 border-b border-slate-200 dark:border-slate-700">
          <DialogTitle className="flex items-center gap-2 text-lg text-slate-800 dark:text-slate-100">
            <Settings className="w-5 h-5 text-primary" />
            Reading Options
          </DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-400">
            Customize your Bible reading experience
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4 overflow-y-auto flex-1 px-3 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
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
                <div className="w-5 h-5 flex items-center justify-center text-primary">🔄</div>
                <span className="font-medium text-slate-800 dark:text-slate-200">Loop Chapter</span>
              </div>
              <Switch
                id="loop-chapter"
                checked={preferences.loopChapter}
                onCheckedChange={(checked) => {
                  console.log('Loop chapter changed to:', checked);
                  setLoopChapter(checked);
                  onSettingsChange?.();
                }}
                className="data-[state=checked]:bg-primary"
              />
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Repeat current chapter when audio finishes playing
            </p>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
};