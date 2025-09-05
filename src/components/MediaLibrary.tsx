
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play, Download, Upload, Headphones, Video } from "lucide-react";

const MediaLibrary = () => {
  const [isPlaying, setIsPlaying] = useState(false);

  const sermons = [
    {
      id: 1,
      title: "Walking in Faith",
      speaker: "Pastor John Doe",
      date: "2025-06-01",
      duration: "45 min",
      type: "video",
      thumbnail: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=200&fit=crop"
    },
    {
      id: 2,
      title: "The Power of Prayer",
      speaker: "Pastor Mary Johnson",
      date: "2025-05-25",
      duration: "38 min",
      type: "audio",
      thumbnail: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=300&h=200&fit=crop"
    },
    {
      id: 3,
      title: "Love Without Limits",
      speaker: "Pastor David Smith",
      date: "2025-05-18",
      duration: "42 min",
      type: "video",
      thumbnail: "https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=300&h=200&fit=crop"
    }
  ];

  const bibleStudyNotes = [
    {
      id: 1,
      title: "Romans Study Guide - Week 5",
      date: "2025-06-01",
      size: "2.4 MB",
      type: "PDF"
    },
    {
      id: 2,
      title: "Prayer & Fasting Notes",
      date: "2025-05-28",
      size: "1.8 MB",
      type: "PDF"
    }
  ];

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Video className="w-5 h-5 text-blue-600" />
            <span>Media Library</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="sermons">
            <TabsList className="grid w-full grid-cols-3 bg-blue-50">
              <TabsTrigger value="sermons" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                Sermons
              </TabsTrigger>
              <TabsTrigger value="live" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                Live Stream
              </TabsTrigger>
              <TabsTrigger value="notes" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                Bible Study Notes
              </TabsTrigger>
            </TabsList>

            <TabsContent value="sermons" className="space-y-4">
              {sermons.map((sermon) => (
                <div key={sermon.id} className="flex items-center space-x-4 p-4 bg-blue-50 rounded-lg">
                  <div className="relative">
                    <img 
                      src={sermon.thumbnail} 
                      alt={sermon.title}
                      className="w-20 h-16 object-cover rounded"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Play className="w-6 h-6 text-white bg-black/50 rounded-full p-1" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">{sermon.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {sermon.speaker} • {sermon.date} • {sermon.duration}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className={sermon.type === 'video' ? 'border-blue-200 text-blue-700' : 'border-green-200 text-green-700'}>
                      {sermon.type === 'video' ? <Video className="w-3 h-3 mr-1" /> : <Headphones className="w-3 h-3 mr-1" />}
                      {sermon.type}
                    </Badge>
                    <Button variant="ghost" size="sm">
                      <Play className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="live">
              <div className="text-center p-8 bg-blue-50 rounded-lg">
                <div className="bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg p-6 mb-4">
                  <h3 className="text-xl font-bold mb-2">🔴 LIVE NOW</h3>
                  <p>Sunday Morning Service</p>
                  <p className="text-sm opacity-90">Started 15 minutes ago</p>
                </div>
                <Button className="bg-red-600 hover:bg-red-700 text-white">
                  <Play className="w-4 h-4 mr-2" />
                  Join Live Stream
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="notes" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-medium">Bible Study Materials</h3>
                <Button variant="outline" size="sm">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Notes
                </Button>
              </div>
              {bibleStudyNotes.map((note) => (
                <div key={note.id} className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div>
                    <h4 className="font-medium">{note.title}</h4>
                    <p className="text-sm text-muted-foreground">{note.date} • {note.size}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">{note.type}</Badge>
                    <Button variant="ghost" size="sm">
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default MediaLibrary;
