import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, Book, Volume2, Type, Palette, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useBiblePreferences } from "@/hooks/useBiblePreferences";
import { hybridBibleApi } from "@/services/hybridBibleApi";
import { EnhancedBibleVersionSelector } from "@/components/bible/EnhancedBibleVersionSelector";

interface BibleSettingsPanelProps {
  onBack: () => void;
}

import type { BibleVersion } from '@/types/bible';

export const BibleSettingsPanel = ({ onBack }: BibleSettingsPanelProps) => {
  const { toast } = useToast();
  const {
    preferences,
    setPreferredTranslation,
    setFontSize,
    setPitch,
    setRate,
    setRedLetters,
    setAutoPlayNext,
    resetPreferences
  } = useBiblePreferences();

  const [versions, setVersions] = useState<BibleVersion[]>([]);
  const [loading, setLoading] = useState(true);

  // Local state for toggles
  const [showFootnotes, setShowFootnotes] = useState(false);
  const [showVersePicker, setShowVersePicker] = useState(false);
  const [showAudioTrackingBar, setShowAudioTrackingBar] = useState(true);
  const [completionNotices, setCompletionNotices] = useState(true);

  useEffect(() => {
    loadVersions();
  }, []);

  const loadVersions = async () => {
    try {
      const bibleVersions = await hybridBibleApi.getVersions();
      setVersions(bibleVersions);
    } catch (error) {
      console.error('Error loading Bible versions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTranslationChange = (translation: string) => {
    setPreferredTranslation(translation);
    toast({
      title: "Translation Updated",
      description: `Changed to ${translation.toUpperCase()}`,
    });
  };

  const handleFontSizeChange = (value: number[]) => {
    setFontSize(value[0]);
  };

  const handlePitchChange = (value: number[]) => {
    setPitch(value[0]);
  };

  const handleRateChange = (value: number[]) => {
    setRate(value[0]);
  };

  const handleReset = () => {
    resetPreferences();
    setShowFootnotes(false);
    setShowVersePicker(false);
    setShowAudioTrackingBar(true);
    setCompletionNotices(true);
    toast({
      title: "Settings Reset",
      description: "All Bible settings have been reset to defaults",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <button onClick={onBack} className="p-2">
          <ChevronLeft className="w-6 h-6 text-foreground" />
        </button>
        <h1 className="text-lg font-semibold text-foreground">Bible Settings</h1>
        <div className="w-10"></div>
      </div>

      <div className="p-4 space-y-6">
        {/* Enhanced Bible Translation Selector */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Book className="w-5 h-5" />
            Bible Translation
          </h2>
          
          <EnhancedBibleVersionSelector 
            selectedVersion={preferences.preferredTranslation}
            onVersionChange={handleTranslationChange}
          />
          
          <div className="text-sm text-gray-600">
            Choose from over 100 available English Bible translations for reading and study.
          </div>
        </div>

        {/* Reading Settings */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Type className="w-5 h-5" />
            Reading Settings
          </h2>
          
          <div className="space-y-4">
            {/* Font Size */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">Font Size</span>
                <span className="text-sm text-muted-foreground">{preferences.fontSize}px</span>
              </div>
              <Slider
                value={[preferences.fontSize]}
                onValueChange={handleFontSizeChange}
                min={12}
                max={24}
                step={1}
                className="w-full"
              />
            </div>

            {/* Red Letters Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Red Letters</p>
                <p className="text-sm text-muted-foreground">Highlight Jesus' words in red</p>
              </div>
              <Switch
                checked={preferences.redLetters}
                onCheckedChange={setRedLetters}
              />
            </div>

            {/* Footnotes Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Show Footnotes</p>
                <p className="text-sm text-muted-foreground">Display study notes and references</p>
              </div>
              <Switch
                checked={showFootnotes}
                onCheckedChange={setShowFootnotes}
              />
            </div>

            {/* Verse Picker Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Show Verse Picker</p>
                <p className="text-sm text-muted-foreground">Quick verse navigation</p>
              </div>
              <Switch
                checked={showVersePicker}
                onCheckedChange={setShowVersePicker}
              />
            </div>
          </div>
        </div>

        {/* Audio Settings */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Volume2 className="w-5 h-5" />
            Audio Settings
          </h2>
          
          <div className="space-y-4">
            {/* Audio Tracking Bar */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Show Audio Tracking Bar</p>
                <p className="text-sm text-muted-foreground">Display audio progress indicator</p>
              </div>
              <Switch
                checked={showAudioTrackingBar}
                onCheckedChange={setShowAudioTrackingBar}
              />
            </div>

            {/* Auto-Play Next Chapter */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Auto-Play Next Chapter</p>
                <p className="text-sm text-muted-foreground">Automatically continue to next chapter</p>
              </div>
              <Switch
                checked={preferences.autoPlayNext}
                onCheckedChange={setAutoPlayNext}
              />
            </div>

            {/* Completion Notices */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Completion Notices</p>
                <p className="text-sm text-muted-foreground">Show notifications when chapters complete</p>
              </div>
              <Switch
                checked={completionNotices}
                onCheckedChange={setCompletionNotices}
              />
            </div>

            {/* Audio Pitch */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">Audio Pitch</span>
                <span className="text-sm text-muted-foreground">{preferences.pitch.toFixed(2)}</span>
              </div>
              <Slider
                value={[preferences.pitch]}
                onValueChange={handlePitchChange}
                min={0.5}
                max={2.0}
                step={0.1}
                className="w-full"
              />
            </div>

            {/* Audio Rate */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">Audio Speed</span>
                <span className="text-sm text-muted-foreground">{preferences.rate.toFixed(2)}x</span>
              </div>
              <Slider
                value={[preferences.rate]}
                onValueChange={handleRateChange}
                min={0.25}
                max={2.0}
                step={0.25}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Current Preferences Status */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Current Settings
          </h2>
          
          <div className="space-y-2 p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Translation:</strong> {preferences.preferredTranslation.toUpperCase()}
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Book:</strong> {preferences.preferredBook}
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Chapter:</strong> {preferences.preferredChapter}
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Font Size:</strong> {preferences.fontSize}px
            </p>
          </div>
        </div>

        {/* Reset Button */}
        <div className="pt-4">
          <Button
            variant="outline"
            onClick={handleReset}
            className="w-full"
          >
            Reset to Defaults
          </Button>
        </div>
      </div>
    </div>
  );
};