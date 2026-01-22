
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Book } from "lucide-react";
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
  const playlistUrl = `https://www.youtube-nocookie.com/embed/${videoId}`;

  return (
    <div className="relative overflow-hidden rounded-3xl p-1 shadow-xl shadow-indigo-100/50">
      {/* Animated border gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-300 via-indigo-300 to-purple-300 opacity-30 animate-pulse"></div>

      <Card className="relative border-0 shadow-none bg-white/80 backdrop-blur-xl text-gray-800 overflow-hidden rounded-[22px]">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-blue-100 rounded-full blur-3xl pointer-events-none opacity-40"></div>
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-purple-100 rounded-full blur-3xl pointer-events-none opacity-40"></div>

        <CardHeader className="relative z-10 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                <Book className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-900 leading-tight">Today's Scripture</h3>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="relative z-10 space-y-8">
          {/* Scripture Section */}
          <div className="text-center px-4">
            <h4 className="text-lg md:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-900 to-indigo-600 mb-3 leading-relaxed">
              "{todaysScripture.verse}"
            </h4>
            <p className="inline-block px-4 py-1 rounded-full bg-indigo-50 text-indigo-700 font-bold text-sm tracking-wide">
              {todaysScripture.reference}
            </p>
          </div>

          {/* Shorts Display */}
          <div className="flex flex-col items-center">
            <div className="relative group w-full max-w-[260px] mx-auto">
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-[20px] blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
              <div className="relative aspect-[9/16] w-full bg-black rounded-2xl overflow-hidden shadow-2xl border border-gray-100">
                <iframe
                  className="w-full h-full"
                  src={playlistUrl}
                  title="Daily Christian Inspiration"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                  loading="lazy"
                  {...({ fetchpriority: "low" } as any)}
                ></iframe>
              </div>
            </div>


          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DailyScripture;
