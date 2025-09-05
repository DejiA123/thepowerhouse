import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, Pause, Volume2, Settings, Smartphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BibleTTSTest = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string | undefined>(undefined);
  const [pitch, setPitch] = useState(1);
  const [rate, setRate] = useState(1);
  const [preset, setPreset] = useState('natural');
  const { toast } = useToast();

  // Move useEffect before early return to fix hooks rules
  useEffect(() => {
    const loadVoices = () => {
      const allVoices = window.speechSynthesis.getVoices();
      // Prioritize high-quality, natural-sounding voices (like Tecarta Bible)
      const englishVoices = allVoices.filter(v => 
        v.lang.startsWith('en')
      ).sort((a, b) => {
        // Sort by quality: Enhanced > Premium > Local > Others
        const aScore = getVoiceQualityScore(a);
        const bScore = getVoiceQualityScore(b);
        return bScore - aScore;
      });
      setVoices(englishVoices);
      
      // Auto-select the best voice
      if (englishVoices.length > 0 && !selectedVoice) {
        setSelectedVoice(englishVoices[0].name);
      }
    };

    // Load voices immediately
    loadVoices();

    // Also load voices when they become available (some browsers load them asynchronously)
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    // Cleanup
    return () => {
      if (window.speechSynthesis.onvoiceschanged) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [selectedVoice]);

  // Early return after hooks are called
  if (typeof window !== 'undefined' && (window as any).__APP_CONFIG__?.mp3Only) {
    return null;
  }

  // Detect platform for voice optimization
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);
  const isMobile = isIOS || isAndroid;

  // Helper function to score voice quality (higher = better)
  const getVoiceQualityScore = (voice: SpeechSynthesisVoice) => {
    let score = 0;
    
    // Enhanced voices are highest quality (like Tecarta Bible quality)
    if (voice.name.includes('Enhanced')) score += 100;
    if (voice.name.includes('Premium')) score += 90;
    if (voice.name.includes('Wavenet')) score += 85;
    if (voice.name.includes('Neural')) score += 80;
    if (voice.name.includes('Standard')) score += 70;
    
    // Local voices are generally better quality
    if (voice.localService) score += 50;
    
    // Specific high-quality voice names (prioritizing male voices like Tecarta)
    const premiumVoices = [
      'Daniel', 'Alex', 'Matthew', 'David', 'Thomas', 'Nathan', 'Aaron', 'Fred', 
      'James', 'Paul', 'Tom', 'Victor', 'Bruce', 'Henry', 'Sam', 'John', 'Robert', 
      'Mark', 'Arthur', 'Albert', 'Ralph', 'Mike', 'Luca', 'Jorge', 'Christopher',
      'Michael', 'William', 'Richard', 'Joseph', 'Charles', 'Christopher', 'Anthony',
      'Donald', 'Steven', 'Kenneth', 'Andrew', 'Joshua', 'Kevin', 'Brian', 'George',
      'Timothy', 'Ronald', 'Jason', 'Edward', 'Jeffrey', 'Ryan', 'Jacob', 'Gary',
      'Nicholas', 'Eric', 'Jonathan', 'Stephen', 'Larry', 'Justin', 'Scott', 'Brandon',
      'Benjamin', 'Frank', 'Gregory', 'Raymond', 'Samuel', 'Patrick', 'Alexander',
      'Jack', 'Dennis', 'Jerry', 'Tyler', 'Aaron', 'Jose', 'Adam', 'Nathan', 'Henry',
      'Douglas', 'Zachary', 'Peter', 'Kyle', 'Walter', 'Ethan', 'Jeremy', 'Harold',
      'Samantha', 'Victoria', 'Karen', 'Susan', 'Nicky', 'Bella', 'Moira', 'Tessa', 
      'Fiona', 'Melina', 'Ava', 'Zoe', 'Emma', 'Olivia', 'Sarah', 'Lisa', 'Mary', 
      'Anna', 'Grace', 'Sophie', 'Isabella', 'Charlotte', 'Amelia', 'Mia', 'Harper',
      'Evelyn', 'Abigail', 'Emily', 'Elizabeth', 'Sofia', 'Madison', 'Avery', 'Ella',
      'Scarlett', 'Grace', 'Chloe', 'Victoria', 'Riley', 'Aria', 'Lily', 'Aubrey',
      'Zoey', 'Penelope', 'Layla', 'Nora', 'Lily', 'Eleanor', 'Hannah', 'Luna',
      'Savannah', 'Brooklyn', 'Leah', 'Zoe', 'Stella', 'Hazel', 'Ellie', 'Paisley',
      'Audrey', 'Skylar', 'Violet', 'Claire', 'Bella', 'Aurora', 'Lucy', 'Anna'
    ];
    
    if (premiumVoices.some(name => voice.name.includes(name))) score += 30;
    
    // Prefer US English for consistency
    if (voice.lang === 'en-US') score += 20;
    
    return score;
  };


  const getBestVoice = (voiceList: SpeechSynthesisVoice[] = voices) => {
    if (selectedVoice) {
      return voiceList.find(v => v.name === selectedVoice);
    }

    // Daniel British voice - highest priority across all platforms
    const danielVoice = voiceList.find(v => 
      (v.name.includes('Daniel') || v.name.includes('daniel')) && 
      v.lang.startsWith('en-') && 
      v.localService === true
    );
    if (danielVoice) {
      console.log(`🎤 Using Daniel British voice: ${danielVoice.name}`);
      return danielVoice;
    }

    // iPhone/iOS optimized voice preferences (Daniel already checked above)
    if (isIOS) {
      const iosPreferred = [
        'Alex (Enhanced)', 'Thomas (Enhanced)', 'Nathan (Enhanced)',
        'Aaron (Enhanced)', 'Matthew (Enhanced)', 'David (Enhanced)', 'Samantha (Enhanced)',
        'Victoria (Enhanced)', 'Karen (Enhanced)', 'Susan (Enhanced)', 'Nicky (Enhanced)',
        'Alex', 'Thomas', 'Nathan', 'Aaron', 'Matthew', 'David', 'Samantha',
        'Victoria', 'Karen', 'Susan', 'Nicky', 'Fred', 'James', 'Paul', 'Tom', 'Victor', 
        'Bruce', 'Henry', 'Sam', 'John', 'Robert', 'Mark', 'Ralph', 'Mike', 'Luca', 
        'Jorge', 'Arthur', 'Albert', 'Bella', 'Moira', 'Tessa', 'Fiona', 'Melina'
      ];
      
      return (
        voiceList.find(v => iosPreferred.some(p => v.name.includes(p))) ||
        voiceList.find(v => v.name.includes('Enhanced')) ||
        voiceList.find(v => v.localService) ||
        voiceList[0]
      );
    }

    // Android optimized voice preferences (Daniel already checked above)
    if (isAndroid) {
      const androidPreferred = [
        'en-US-Standard-A', 'en-US-Standard-B', 'en-US-Standard-C', 'en-US-Standard-D',
        'en-US-Standard-E', 'en-US-Standard-F', 'en-US-Standard-G', 'en-US-Standard-H',
        'en-US-Standard-I', 'en-US-Standard-J', 'en-US-Wavenet-A', 'en-US-Wavenet-B', 
        'en-US-Wavenet-C', 'en-US-Wavenet-D', 'en-US-Wavenet-E', 'en-US-Wavenet-F',
        'en-US-Wavenet-G', 'en-US-Wavenet-H', 'en-US-Wavenet-I', 'en-US-Wavenet-J',
        'Alex', 'Matthew', 'David', 'Samantha', 'Victoria', 'Karen', 'Susan',
        'Fred', 'James', 'Paul', 'Tom', 'Victor', 'Bruce', 'Henry', 'Sam', 'John', 
        'Robert', 'Mark', 'Ralph', 'Mike', 'Luca', 'Jorge', 'Arthur', 'Albert'
      ];
      
      return (
        voiceList.find(v => androidPreferred.some(p => v.name.includes(p))) ||
        voiceList.find(v => v.localService) ||
        voiceList[0]
      );
    }

    // Desktop optimized voice preferences (Daniel already checked above)
    const desktopPreferred = [
      'Alex (Enhanced)', 'Matthew (Enhanced)', 'David (Enhanced)',
      'Aaron (Enhanced)', 'Thomas (Enhanced)', 'Nathan (Enhanced)', 'Samantha (Enhanced)',
      'Victoria (Enhanced)', 'Karen (Enhanced)', 'Susan (Enhanced)', 'Nicky (Enhanced)',
      'Alex', 'Matthew', 'David', 'Samantha', 'Victoria', 'Karen', 'Susan', 'Nicky',
      'Fred', 'James', 'Paul', 'Tom', 'Victor', 'Bruce', 'Henry', 'Sam', 'John', 'Robert', 
      'Mark', 'Arthur', 'Albert', 'Ralph', 'Mike', 'Aaron', 'Luca', 'Jorge', 'Nathan', 
      'Thomas', 'Bella', 'Moira', 'Tessa', 'Fiona', 'Melina', 'Ava', 'Zoe', 'Emma', 'Olivia',
      'en-US-Standard-A', 'en-US-Standard-B', 'en-US-Standard-C', 'en-US-Standard-D',
      'en-US-Wavenet-A', 'en-US-Wavenet-B', 'en-US-Wavenet-C', 'en-US-Wavenet-D'
    ];
    
    return (
      voiceList.find(v => desktopPreferred.some(p => v.name.includes(p))) ||
      voiceList.find(v => v.name.includes('Enhanced')) ||
      voiceList.find(v => v.localService) ||
      voiceList[0]
    );
  };

  const getOptimizedSettings = (deviceType: string) => {
    switch (deviceType) {
      case 'iPhone':
        return {
          pitch: 1.70,
          rate: 0.75,
          volume: 1.0,
          lang: 'en-US'
        };
      case 'Android':
        return {
          pitch: 1.70,
          rate: 0.75,
          volume: 1.0,
          lang: 'en-US'
        };
      case 'Desktop':
        return {
          pitch: 1.70,
          rate: 0.75,
          volume: 1.0,
          lang: 'en-US'
        };
      default:
        return {
          pitch: 1.70,
          rate: 0.75,
          volume: 1.0,
          lang: 'en-US'
        };
    }
  };

  const testText = "The Lord is my shepherd, I shall not want. He makes me lie down in green pastures, he leads me beside quiet waters, he refreshes my soul.";

  // Preset handler
  const handlePresetChange = (value: string) => {
    setPreset(value);
    if (value === 'natural') {
      setPitch(1);
      setRate(1);
    } else if (value === 'robotic') {
      setPitch(1.5);
      setRate(1.5);
    } else if (value === 'low') {
      setPitch(0.7);
      setRate(0.9);
    } else if (value === 'high') {
      setPitch(1.7);
      setRate(1.1);
    }
  };

  const handleTestPlay = () => {
    if (isPlaying) return;
    
    // Cancel any existing speech
    window.speechSynthesis.cancel();
    
    try {
      const utterance = new window.SpeechSynthesisUtterance(testText);
      const bestVoice = voices.find(v => v.name === selectedVoice) || getBestVoice();
      // Use user-selected pitch/rate
      utterance.pitch = pitch;
      utterance.rate = rate;
      utterance.volume = 1.0;
      utterance.lang = bestVoice?.lang || 'en-US';
      
      if (bestVoice) {
        utterance.voice = bestVoice;
        console.log(`🎤 Test - Using voice: ${bestVoice.name} (${bestVoice.lang}) [Local: ${bestVoice.localService}]`);
      }
      
      // Event handlers
      utterance.onstart = () => {
        setIsPlaying(true);
        setIsPaused(false);
        toast({ 
          title: 'TTS Test Started', 
          description: `Using ${bestVoice ? bestVoice.name : 'default voice'}${isIOS ? ' (iPhone Optimized)' : ''}` 
        });
      };
      
      utterance.onend = () => {
        setIsPlaying(false);
        setIsPaused(false);
        toast({ title: 'TTS Test Complete', description: 'Test finished successfully.' });
      };
      
      utterance.onerror = (e) => {
        setIsPlaying(false);
        setIsPaused(false);
        console.error('TTS test error:', e);
        toast({ 
          title: 'TTS Test Error', 
          description: e.error || 'Speech synthesis error', 
          variant: 'destructive' 
        });
      };
      
      utterance.onpause = () => {
        setIsPlaying(false);
        setIsPaused(true);
      };
      
      utterance.onresume = () => {
        setIsPlaying(true);
        setIsPaused(false);
      };
      
      // Start speaking
      window.speechSynthesis.speak(utterance);
      
    } catch (error) {
      setIsPlaying(false);
      setIsPaused(false);
      console.error('TTS test error:', error);
      toast({ 
        title: 'TTS Test Error', 
        description: error instanceof Error ? error.message : 'Unknown error', 
        variant: 'destructive' 
      });
    }
  };

  const handlePause = () => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      setIsPlaying(false);
      setIsPaused(true);
    }
  };

  const handleResume = () => {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setIsPlaying(true);
      setIsPaused(false);
    }
  };

  const handleStop = () => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="w-5 h-5" />
          Browser TTS Test
          {isIOS && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">iPhone</span>}
          {isAndroid && <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Android</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-gray-600">
          <p><strong>Test Text:</strong></p>
          <p className="italic">"{testText}"</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            onClick={isPlaying ? handlePause : handleTestPlay}
            disabled={isPaused}
            size="sm"
            className="min-w-[60px]"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isPlaying ? 'Pause' : 'Test'}
          </Button>
          
          <Button
            onClick={handleResume}
            disabled={!isPaused}
            size="sm"
            variant="outline"
          >
            Resume
          </Button>
          
          <Button
            onClick={handleStop}
            disabled={!isPlaying && !isPaused}
            size="sm"
            variant="outline"
          >
            Stop
          </Button>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-muted-foreground flex items-center">
            <Settings className="w-3 h-3 mr-1" />
            Voice Preset:
          </label>
          <select
            className="w-full border rounded p-1 text-xs mb-2"
            value={preset}
            onChange={e => handlePresetChange(e.target.value)}
          >
            <option value="natural">Natural</option>
            <option value="robotic">Robotic</option>
            <option value="low">Lower/Deeper</option>
            <option value="high">Higher</option>
          </select>
          <label className="text-xs text-muted-foreground flex items-center">
            <Settings className="w-3 h-3 mr-1" />
            Pitch: <span className="ml-2 font-mono">{pitch.toFixed(2)}</span>
          </label>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.01"
            value={pitch}
            onChange={e => { setPitch(Number(e.target.value)); setPreset('custom'); }}
            className="w-full"
          />
          <label className="text-xs text-muted-foreground flex items-center">
            <Settings className="w-3 h-3 mr-1" />
            Rate: <span className="ml-2 font-mono">{rate.toFixed(2)}</span>
          </label>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.01"
            value={rate}
            onChange={e => { setRate(Number(e.target.value)); setPreset('custom'); }}
            className="w-full"
          />
          <label className="text-xs text-muted-foreground flex items-center">
            <Settings className="w-3 h-3 mr-1" />
            Select Voice:
          </label>
          <select
            className="w-full border rounded p-1 text-xs mb-2"
            value={selectedVoice || ''}
            onChange={e => setSelectedVoice(e.target.value)}
            disabled={voices.length === 0}
          >
            {voices.length === 0 ? (
              <option>Loading voices...</option>
            ) : (
              voices.map(v => (
                <option key={v.name} value={v.name}>
                  {v.name} ({v.lang}){v.localService ? ' [Local]' : ''}{v.name.includes('Enhanced') ? ' [Enhanced]' : ''}
                </option>
              ))
            )}
          </select>
          <label className="text-xs text-muted-foreground flex items-center">
            <Settings className="w-3 h-3 mr-1" />
            Available Voices:
          </label>
          <div className="max-h-32 overflow-y-auto border rounded p-2 text-xs">
            {voices.length === 0 ? (
              <p className="text-gray-500">Loading voices...</p>
            ) : (
              voices.map(v => (
                <div
                  key={v.name}
                  className={`py-1 border-b last:border-b-0 ${selectedVoice === v.name ? 'bg-primary/10 font-bold' : ''}`}
                >
                  <div className="font-medium">{v.name}</div>
                  <div className="text-gray-500">
                    {v.lang} • {v.localService ? 'Local' : 'Remote'}
                    {v.name.includes('Enhanced') && ' • Enhanced'}
                    {selectedVoice === v.name && ' • Selected'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="text-xs text-gray-500 space-y-1">
          <p><strong>Platform:</strong> {isIOS ? 'iOS/iPhone' : isAndroid ? 'Android' : 'Desktop'}</p>
          <p><strong>Settings:</strong> Rate: {rate}, Pitch: {pitch}</p>
          <p><strong>Best Voice:</strong> {getBestVoice()?.name || 'None available'}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default BibleTTSTest; 