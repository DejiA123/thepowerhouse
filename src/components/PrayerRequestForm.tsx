
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { MessageSquare, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface PrayerRequestFormProps {
  onSuccess?: () => void;
}

const PrayerRequestForm = ({ onSuccess }: PrayerRequestFormProps) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  // All requests are public
  const isPrivate = false;
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const submitPrayerRequest = async () => {
    if (!user || !title.trim() || !content.trim()) return;

    setLoading(true);

    const { error } = await supabase
      .from('prayer_requests')
      .insert({
        user_id: user.id,
        title: title.trim(),
        content: content.trim(),
        is_private: false // always public
      });

    if (error) {
      toast({ title: "Error", description: "Failed to submit prayer request", variant: "destructive" });
    } else {
      setTitle("");
      setContent("");

      if (onSuccess) onSuccess();
    }

    setLoading(false);
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Please log in to submit prayer requests</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <MessageSquare className="w-5 h-5" />
          <span>Submit Prayer Request</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Brief title for your prayer request"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="content">Prayer Request</Label>
          <Textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share your prayer request..."
            className="min-h-[120px]"
          />
        </div>

        <Button
          onClick={submitPrayerRequest}
          disabled={loading || !title.trim() || !content.trim()}
          className="w-full"
        >
          <Send className="w-4 h-4 mr-2" />
          {loading ? 'Submitting...' : 'Submit Prayer Request'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default PrayerRequestForm;
