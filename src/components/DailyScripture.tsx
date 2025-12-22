import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Book, ExternalLink, RefreshCw } from "lucide-react";
import { getTodaysScripture } from "@/utils/dailyScriptureUtils";

const DailyScripture = () => {
  const [randomIndex, setRandomIndex] = useState(0);

  const todaysScripture = getTodaysScripture();
  // List of Shorts IDs
  const shortsIds = [
    "JGUmWeuY4pU", "GA4qFuKt-2I", "dAh8tG6jxDI", "BxFJPCG9vMU", "EjGuZW77aVU",
    "S1k8y0dK76s", "7liSmxfYtB8", "gXGmqnYQsyI", "DQHlK_kEZz4", "Jj0-3pTMjmg",
    "lsSrFvBRU5Q", "QYydTsMvqUY", "FCNWG3FN-H0", "puyMbu13k_s", "mvp6pubURyk",
    "cdFlwTCyvGg", "UTkYnhEmGkk", "7qataP2zPVo", "bf1Rokk-OMg", "UqZwLMeJ5Nc",
    "PXBn8ha5ngg", "K7vu4qa-UVo", "LO0oG0HwN-8", "BZ6MlyT9q98", "moMneTgjIYM",
    "0jiy0AG8jCg", "5kWyNjixmrk", "3IVfo4jkRIs", "ZSrxOZseS9c", "pcJlQJwb9v8"
  ];

  const channelId = "UC35azCG6jqVkR2G8aH91v4A";

  const refreshVideo = () => {
    const newIndex = Math.floor(Math.random() * shortsIds.length);
    setRandomIndex(newIndex);
  };

  useEffect(() => {
    refreshVideo();
  }, []);

  const videoId = shortsIds[randomIndex];
  const playlistUrl = `https://www.youtube.com/embed/${videoId}`;

  return (
    <Card className="glass border-0 overflow-hidden relative group">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-indigo-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-primary">
            <Book className="w-5 h-5" />
            <span className="font-bold tracking-tight">Today's Scripture</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <p className="text-xl md:text-2xl font-serif italic text-foreground/90 leading-relaxed mb-3">
            "{todaysScripture.verse}"
          </p>
          <p className="text-primary font-medium text-right">— {todaysScripture.reference}</p>
        </div>

        <div className="mt-4 bg-muted/50 rounded-2xl p-4 border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Shorts</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshVideo}
              className="h-8 px-2 text-xs hover:bg-white/50 hover:text-primary transition-colors rounded-full"
            >
              <RefreshCw className="w-3 h-3 mr-1.5" />
              Next Video
            </Button>
          </div>

          <div className="flex justify-center mb-2">
            <div className="aspect-[9/16] w-full max-w-[280px] bg-black/5 rounded-2xl overflow-hidden shadow-2xl border border-white/10 ring-1 ring-black/5">
              <iframe
                className="w-full h-full"
                src={playlistUrl}
                title="Daily Christian Inspiration"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              ></iframe>
            </div>
          </div>

          <div className="text-center mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`https://www.youtube.com/channel/${channelId}`, '_blank')}
              className="text-xs rounded-full border-primary/20 hover:bg-primary hover:text-white transition-all duration-300"
            >
              <ExternalLink className="w-3 h-3 mr-1.5" />
              Visit Channel
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DailyScripture;
