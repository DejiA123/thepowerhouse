import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, Book, Volume2, Type, Palette, Settings, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { enhancedApiBibleService } from "@/services/enhancedApiBibleService";
import { EnhancedBibleVersionSelector } from "@/components/bible/EnhancedBibleVersionSelector";
import { useGlobalAudio } from "@/contexts/GlobalAudioContext";
import { useBiblePreferences } from "@/hooks/useBiblePreferences";

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
    setLoopChapter,
    setLoopBook,
    resetPreferences
  } = useBiblePreferences();

  const { setLoopChapter: setGlobalLoopChapter, setAutoPlayNext: setGlobalAutoPlayNext, setLoopBook: setGlobalLoopBook } = useGlobalAudio();

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
      const bibleVersions = await enhancedApiBibleService.getVersions();
      setVersions(bibleVersions);
    } catch (error) {
      console.error('Error loading Bible versions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTranslationChange = (translation: string) => {
    setPreferredTranslation(translation);
    const selectedVersion = versions.find(v => v.abbreviation === translation);
    toast({
      title: "Translation Updated",
      description: `Changed to ${selectedVersion?.name || translation.toUpperCase()}`,
    });
  };

  const handleFontSizeChange = (value: number[]) => {
    console.log('BibleSettingsPanel: Font size changed to:', value[0]);
    console.log('BibleSettingsPanel: Current preferences before change:', preferences);
    setFontSize(value[0]);
    console.log('BibleSettingsPanel: setFontSize called with:', value[0]);
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
        {false && (
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
        )}

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
                onCheckedChange={(checked) => {
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
                }}
              />
            </div>

            {/* Loop Chapter */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Loop Chapter</p>
                <p className="text-sm text-muted-foreground">Repeat current chapter when audio finishes playing</p>
              </div>
              <Switch
                checked={preferences.loopChapter}
                onCheckedChange={(checked) => {
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
                }}
              />
            </div>

            {/* Loop Book */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Loop Book
                </p>
                <p className="text-sm text-muted-foreground">Repeat entire book from chapter 1 when last chapter finishes</p>
              </div>
              <Switch
                checked={preferences.loopBook}
                onCheckedChange={(checked) => {
                  setLoopBook(checked);
                  setGlobalLoopBook(checked);

                  if (checked) {
                    // Loop Book requires Auto-Play Next
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
                }}
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

            {false && (
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
            )}

            {false && (
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
            )}
          </div>
        </div>

        {false && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Current Settings
            </h2>

            <div className="space-y-2 p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Translation:</strong> {versions.find(v => v.abbreviation === preferences.preferredTranslation)?.name || preferences.preferredTranslation.toUpperCase()}
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
        )}

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
