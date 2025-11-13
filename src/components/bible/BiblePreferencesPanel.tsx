import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, RotateCcw, Save, BookOpen } from "lucide-react";
import { useBiblePreferences } from "@/hooks/useBiblePreferences";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { enhancedApiBibleService } from "@/services/enhancedApiBibleService";

import type { BibleVersion } from '@/types/bible';

export const BiblePreferencesPanel = () => {
  const {
    preferences,
    resetPreferences,
    setAutoPlayNext,
    setPreferredTranslation,
    setPitch,
    setRate,
  } = useBiblePreferences();
  
  const [versions, setVersions] = useState<BibleVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Load Bible versions from the same API as BibleReader
  useEffect(() => {
    const loadVersions = async () => {
      setLoading(true);
      try {
        const bibleVersions = await enhancedApiBibleService.getVersions();
        setVersions(bibleVersions);
        console.log('BiblePreferencesPanel: Loaded versions:', bibleVersions);
      } catch (error) {
        console.error('Error loading Bible versions:', error);
      } finally {
        setLoading(false);
      }
    };
    loadVersions();
  }, []);

  // Debug: Log when preferences change
  useEffect(() => {
    console.log('BiblePreferencesPanel: Preferences changed:', preferences);
  }, [preferences]);

  const handleTranslationChange = (translation: string) => {
    console.log('BiblePreferencesPanel: Setting translation to:', translation);
    setPreferredTranslation(translation);
    const selectedVersion = versions.find(v => v.abbreviation === translation);
    toast({
      title: "Translation Saved",
      description: `Your preferred translation is now set to ${selectedVersion?.name || translation.toUpperCase()}`,
    });
  };

  const handleReset = () => {
    resetPreferences();
    toast({
      title: "Preferences Reset",
      description: "All Bible preferences have been reset to defaults.",
    });
  };

  const currentVersion = versions.find(v => v.abbreviation === preferences.preferredTranslation);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Settings className="w-5 h-5" />
          <span>Bible Preferences</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Bible Translation Selector */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-4 h-4" />
            <Label htmlFor="translation" className="text-base font-medium">
              Preferred Bible Translation
            </Label>
          </div>
          <Select 
            value={preferences.preferredTranslation} 
            onValueChange={handleTranslationChange}
            disabled={loading}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={loading ? "Loading translations..." : "Select Bible translation"} />
            </SelectTrigger>
            <SelectContent>
              {versions.map((version) => (
                <SelectItem key={version.abbreviation} value={version.abbreviation}>
                  <div className="flex flex-col">
                    <span className="font-medium">{version.name}</span>
                    <span className="text-sm text-muted-foreground">{version.abbreviation.toUpperCase()}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {currentVersion && (
            <p className="text-sm text-green-600 flex items-center">
              <Save className="w-3 h-3 mr-1" />
              Currently using: {currentVersion.name} ({currentVersion.abbreviation.toUpperCase()})
            </p>
          )}
          <div className="text-sm text-gray-600 mb-4">
            Choose your preferred Bible translation for reading and study.
          </div>
        </div>

        {/* Audio Settings */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Audio Settings
          </h3>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-play">Auto-Play Next Chapter</Label>
              <p className="text-sm text-muted-foreground">
                Automatically play the next chapter when current one finishes
              </p>
            </div>
            <Switch
              id="auto-play"
              checked={preferences.autoPlayNext}
              onCheckedChange={setAutoPlayNext}
            />
          </div>

          {false && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="audio-pitch">Audio Pitch</Label>
                <span className="text-sm text-muted-foreground">{preferences.pitch.toFixed(2)}</span>
              </div>
              <input
                type="range"
                id="audio-pitch"
                min="0.3"
                max={/iPad|iPhone|iPod/.test(navigator.userAgent) ? 1.8 : 2.0}
                step={/iPad|iPhone|iPod/.test(navigator.userAgent) ? 0.05 : 0.1}
                value={preferences.pitch}
                onChange={(e) => {
                  const newPitch = parseFloat(e.target.value);
                  setPitch(newPitch);
                }}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Lower</span>
                <span>Higher</span>
              </div>
            </div>
          )}

          {false && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="audio-rate">Audio Speed</Label>
                <span className="text-sm text-muted-foreground">{preferences.rate.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                id="audio-rate"
                min="0.3"
                max={/iPad|iPhone|iPod/.test(navigator.userAgent) ? 1.5 : 2.0}
                step="0.05"
                value={preferences.rate}
                onChange={(e) => {
                  const newRate = parseFloat(e.target.value);
                  setRate(newRate);
                }}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Slower</span>
                <span>Faster</span>
              </div>
            </div>
          )}
        </div>

        {false && (
          <div className="pt-4 border-t">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Current Status
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Translation:</span>
                <p className="font-medium">{currentVersion?.name || preferences.preferredTranslation.toUpperCase()}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Current Book:</span>
                <p className="font-medium">{preferences.preferredBook}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Current Chapter:</span>
                <p className="font-medium">{preferences.preferredChapter}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>
                <p className="font-medium text-green-600 flex items-center">
                  <Save className="w-3 h-3 mr-1" />
                  Saved
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Reset Button */}
        <div className="pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="w-full"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset to Defaults
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}; 
