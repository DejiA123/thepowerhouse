import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Type, Settings, Play, Save } from "lucide-react";
import { useBiblePreferences } from "@/hooks/useBiblePreferences";
import { toast } from "sonner";

interface BibleMenuDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsChange?: () => void;
  onResetToGenesis?: () => void;
}

export const BibleMenuDialog = ({ isOpen, onClose, onSettingsChange, onResetToGenesis }: BibleMenuDialogProps) => {
  const { preferences, setFontSize, setAutoPlayNext, setLoopChapter } = useBiblePreferences();
  
  // Local state for font size slider to allow changes before saving
  const [localFontSize, setLocalFontSize] = useState(preferences.fontSize);
  
  // Update local font size when modal opens or preferences change
  useEffect(() => {
    setLocalFontSize(preferences.fontSize);
  }, [isOpen, preferences.fontSize]);
  
  const handleSaveFontSize = () => {
    console.log('🔍 BibleMenuDialog: Saving font size:', {
      localFontSize: localFontSize,
      currentPreferences: preferences.fontSize,
      willSave: localFontSize
    });
    
    setFontSize(localFontSize);
    
    // Add a small delay to ensure the save completes before dispatching events
    setTimeout(() => {
      // Dispatch custom event to notify other components
      const event = new CustomEvent('fontSizeChanged', {
        detail: { fontSize: localFontSize }
      });
      window.dispatchEvent(event);
      
      // Call onSettingsChange to trigger re-render
      onSettingsChange?.();
      
      toast.success(`Font size saved: ${localFontSize}px`);
      
      console.log('🔍 BibleMenuDialog: Font size save completed and events dispatched');
    }, 100);
  };
  
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
      <DialogContent className={`w-full max-w-md overflow-hidden flex flex-col ${
        isMobile 
          ? 'max-h-[95vh] mx-2 my-2' 
          : 'max-h-[80vh] mx-auto'
      }`}>
        <DialogHeader className="flex-shrink-0 pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Settings className="w-4 h-4" />
            Reading Options
          </DialogTitle>
          <DialogDescription>
            Customize your Bible reading experience with font size and display preferences.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 py-2 overflow-y-auto flex-1 px-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          {/* Font Size */}
          <div className="space-y-1 bg-blue-50 p-2 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-1">
              <Type className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-blue-800 text-sm">Font Size</span>
            </div>
            <Slider
              value={[localFontSize]}
              onValueChange={(value) => {
                console.log('🔍 BibleMenuDialog: Slider changed to:', value[0], 'previous localFontSize:', localFontSize);
                setLocalFontSize(value[0]);
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
            <div className="flex justify-between items-center text-xs text-blue-600 mb-2">
              <span>12px</span>
              <span className="font-medium">{localFontSize}px</span>
              <span>24px</span>
            </div>
            <Button 
              onClick={handleSaveFontSize}
              size="sm"
              className="w-full"
              disabled={localFontSize === preferences.fontSize}
            >
              <Save className="w-3 h-3 mr-1" />
              {localFontSize === preferences.fontSize ? 'Saved' : 'Save Font Size'}
            </Button>
          </div>

          {/* Auto-Play Next Chapter */}
          <div className="space-y-1 bg-orange-50 p-2 rounded-lg border border-orange-200">
            <div className="flex items-center gap-2 mb-1">
              <Play className="w-4 h-4 text-orange-600" />
              <span className="font-medium text-orange-800 text-sm">Auto-Play Next Chapter</span>
            </div>
            <div className="flex items-center space-x-2 mb-1">
              <Switch
                id="auto-play-next"
                checked={preferences.autoPlayNext}
                onCheckedChange={(checked) => {
                  console.log('Auto-play next changed to:', checked);
                  setAutoPlayNext(checked);
                  onSettingsChange?.();
                }}
              />
              <Label htmlFor="auto-play-next" className="text-xs text-orange-700">
                {preferences.autoPlayNext ? 'Enabled' : 'Disabled'}
              </Label>
            </div>
            <p className="text-xs text-orange-600">
              Auto-continue to next chapter when finished
            </p>
          </div>

          {/* Loop Chapter */}
          <div className="space-y-1 bg-pink-50 p-2 rounded-lg border border-pink-200">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-4 h-4 text-pink-600">🔄</div>
              <span className="font-medium text-pink-800 text-sm">Loop Chapter</span>
            </div>
            <div className="flex items-center space-x-2 mb-1">
              <Switch
                id="loop-chapter"
                checked={preferences.loopChapter}
                onCheckedChange={(checked) => {
                  console.log('Loop chapter changed to:', checked);
                  setLoopChapter(checked);
                  onSettingsChange?.();
                }}
              />
              <Label htmlFor="loop-chapter" className="text-xs text-pink-700">
                {preferences.loopChapter ? 'Enabled' : 'Disabled'}
              </Label>
            </div>
            <p className="text-xs text-pink-600">
              Repeat current chapter when it finishes playing
            </p>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
};