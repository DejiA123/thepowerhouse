import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, AlertTriangle, CheckCircle, XCircle, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BibleTTSDebug = () => {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    runDiagnostics();
  }, []);

  const runDiagnostics = () => {
    const info: any = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      languages: navigator.languages,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      protocol: window.location.protocol,
      hostname: window.location.hostname,
      port: window.location.port,
    };

    // Check SpeechSynthesis support
    if ('speechSynthesis' in window) {
      info.speechSynthesisSupported = true;
      info.speechSynthesis = {
        speaking: window.speechSynthesis.speaking,
        paused: window.speechSynthesis.paused,
        pending: window.speechSynthesis.pending,
      };
      
      // Get available voices
      const voices = window.speechSynthesis.getVoices();
      info.voices = {
        total: voices.length,
        english: voices.filter(v => v.lang.startsWith('en')).length,
        local: voices.filter(v => v.localService).length,
        enhanced: voices.filter(v => v.name.includes('Enhanced')).length,
        list: voices.map(v => ({
          name: v.name,
          lang: v.lang,
          localService: v.localService,
          default: v.default
        }))
      };
    } else {
      info.speechSynthesisSupported = false;
    }

    // Check for common issues
    info.issues = [];
    
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      info.issues.push('HTTPS required for TTS in some browsers');
    }
    
    if (!info.speechSynthesisSupported) {
      info.issues.push('SpeechSynthesis not supported');
    }
    
    if (info.voices?.total === 0) {
      info.issues.push('No voices available');
    }

    setDebugInfo(info);
  };

  const testBasicTTS = async () => {
    setIsTesting(true);
    setTestResult('');
    
    try {
      if (!('speechSynthesis' in window)) {
        setTestResult('ERROR: SpeechSynthesis not supported');
        return;
      }

      const testText = "Hello, this is a test.";
      const utterance = new window.SpeechSynthesisUtterance(testText);
      
      let hasStarted = false;
      let hasEnded = false;
      let hasError = false;
      let errorMessage = '';

      utterance.onstart = () => {
        hasStarted = true;
        setTestResult('SUCCESS: TTS started successfully');
        toast({ title: 'TTS Test', description: 'Audio started successfully!' });
      };

      utterance.onend = () => {
        hasEnded = true;
        setTestResult('SUCCESS: TTS completed successfully');
        toast({ title: 'TTS Test', description: 'Audio completed successfully!' });
      };

      utterance.onerror = (e) => {
        hasError = true;
        errorMessage = e.error || 'Unknown error';
        setTestResult(`ERROR: ${errorMessage}`);
        toast({ 
          title: 'TTS Test Error', 
          description: errorMessage, 
          variant: 'destructive' 
        });
      };

      // Start speaking
      window.speechSynthesis.speak(utterance);

      // Timeout after 10 seconds
      setTimeout(() => {
        if (!hasStarted && !hasError) {
          setTestResult('TIMEOUT: TTS did not start within 10 seconds');
          toast({ 
            title: 'TTS Test Timeout', 
            description: 'Audio did not start - may need user interaction', 
            variant: 'destructive' 
          });
        }
        setIsTesting(false);
      }, 10000);

    } catch (error) {
      setTestResult(`ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsTesting(false);
    }
  };

  const testWithUserInteraction = () => {
    // This function requires user interaction
    const testText = "This test requires user interaction to work.";
    const utterance = new window.SpeechSynthesisUtterance(testText);
    
    utterance.onstart = () => {
      toast({ title: 'User Interaction Test', description: 'Audio started with user interaction!' });
    };

    utterance.onend = () => {
      toast({ title: 'User Interaction Test', description: 'Audio completed successfully!' });
    };

    utterance.onerror = (e) => {
      toast({ 
        title: 'User Interaction Test Error', 
        description: e.error || 'Unknown error', 
        variant: 'destructive' 
      });
    };

    window.speechSynthesis.speak(utterance);
  };

  const getStatusIcon = () => {
    if (debugInfo.issues?.length > 0) {
      return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    }
    if (debugInfo.speechSynthesisSupported) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
    return <XCircle className="w-5 h-5 text-red-500" />;
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="w-5 h-5" />
          TTS Debug Information
          {getStatusIcon()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Basic Test */}
        <div className="space-y-2">
          <h3 className="font-semibold">Basic TTS Test</h3>
          <div className="flex gap-2">
            <Button
              onClick={testBasicTTS}
              disabled={isTesting}
              size="sm"
            >
              {isTesting ? 'Testing...' : 'Test Basic TTS'}
            </Button>
            <Button
              onClick={testWithUserInteraction}
              size="sm"
              variant="outline"
            >
              Test with User Interaction
            </Button>
          </div>
          {testResult && (
            <div className={`p-2 rounded text-sm ${
              testResult.startsWith('SUCCESS') ? 'bg-green-100 text-green-800' :
              testResult.startsWith('ERROR') ? 'bg-red-100 text-red-800' :
              'bg-yellow-100 text-yellow-800'
            }`}>
              {testResult}
            </div>
          )}
        </div>

        {/* Issues */}
        {debugInfo.issues?.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold text-red-600">Issues Found:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-red-600">
              {debugInfo.issues.map((issue: string, index: number) => (
                <li key={index}>{issue}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Browser Info */}
        <div className="space-y-2">
          <h3 className="font-semibold">Browser Information</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><strong>Protocol:</strong> {debugInfo.protocol}</div>
            <div><strong>Hostname:</strong> {debugInfo.hostname}</div>
            <div><strong>Platform:</strong> {debugInfo.platform}</div>
            <div><strong>Language:</strong> {debugInfo.language}</div>
            <div><strong>Online:</strong> {debugInfo.onLine ? 'Yes' : 'No'}</div>
            <div><strong>Cookies:</strong> {debugInfo.cookieEnabled ? 'Enabled' : 'Disabled'}</div>
          </div>
        </div>

        {/* SpeechSynthesis Info */}
        {debugInfo.speechSynthesisSupported && (
          <div className="space-y-2">
            <h3 className="font-semibold">SpeechSynthesis Status</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><strong>Speaking:</strong> {debugInfo.speechSynthesis?.speaking ? 'Yes' : 'No'}</div>
              <div><strong>Paused:</strong> {debugInfo.speechSynthesis?.paused ? 'Yes' : 'No'}</div>
              <div><strong>Pending:</strong> {debugInfo.speechSynthesis?.pending ? 'Yes' : 'No'}</div>
            </div>
          </div>
        )}

        {/* Voices Info */}
        {debugInfo.voices && (
          <div className="space-y-2">
            <h3 className="font-semibold">Available Voices</h3>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div><strong>Total:</strong> {debugInfo.voices.total}</div>
              <div><strong>English:</strong> {debugInfo.voices.english}</div>
              <div><strong>Local:</strong> {debugInfo.voices.local}</div>
              <div><strong>Enhanced:</strong> {debugInfo.voices.enhanced}</div>
            </div>
            
            {debugInfo.voices.list?.length > 0 && (
              <div className="max-h-32 overflow-y-auto border rounded p-2 text-xs">
                {debugInfo.voices.list.map((voice: any, index: number) => (
                  <div key={index} className="py-1 border-b last:border-b-0">
                    <div className="font-medium">{voice.name}</div>
                    <div className="text-gray-500">
                      {voice.lang} • {voice.localService ? 'Local' : 'Remote'} 
                      {voice.default && ' • Default'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* User Agent */}
        <div className="space-y-2">
          <h3 className="font-semibold">User Agent</h3>
          <div className="text-xs bg-gray-100 p-2 rounded break-all">
            {debugInfo.userAgent}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <h3 className="font-semibold">Actions</h3>
          <div className="flex gap-2">
            <Button
              onClick={runDiagnostics}
              size="sm"
              variant="outline"
            >
              Refresh Diagnostics
            </Button>
            <Button
              onClick={() => {
                console.log('TTS Debug Info:', debugInfo);
                toast({ title: 'Debug Info', description: 'Check browser console for detailed information' });
              }}
              size="sm"
              variant="outline"
            >
              Log to Console
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BibleTTSDebug; 