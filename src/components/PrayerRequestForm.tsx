import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { appAlert } from "@/lib/appAlert";

interface PrayerRequestFormProps {
  onSuccess?: () => void;
}

const missingColumn = (error: { code?: string; message?: string } | null) =>
  !!error && (error.code === "PGRST204" || error.code === "42703" || /is_anonymous/.test(error.message || ""));

/** Share a prayer request on the Prayer Wall. Requests are visible to the church family. */
const PrayerRequestForm = ({ onSuccess }: PrayerRequestFormProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [hideName, setHideName] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!user || !content.trim()) return;
    setLoading(true);
    const base = {
      user_id: user.id,
      // A short title is optional; fall back to the first words of the request
      title: (title.trim() || content.trim().split(/\s+/).slice(0, 8).join(" ")).slice(0, 120),
      content: content.trim(),
      is_private: false,
    };
    let { error } = await supabase.from("prayer_requests").insert({ ...base, is_anonymous: hideName } as any);
    if (missingColumn(error)) {
      // Database not updated yet: still post, just without the hide-name option
      ({ error } = await supabase.from("prayer_requests").insert(base));
      if (!error && hideName) appAlert("Posted with your name", "Hiding names isn't switched on for the church yet.", "info");
    }
    setLoading(false);
    if (error) {
      appAlert("Couldn't post your request", error.message, "error");
      return;
    }
    setTitle("");
    setContent("");
    setHideName(false);
    onSuccess?.();
  };

  if (!user) {
    return (
      <div className="py-6 text-center">
        <p className="text-muted-foreground">Sign in to share a prayer request with the church family.</p>
        <Button onClick={() => navigate("/auth")} className="mt-4 rounded-full bg-blue-600 px-6 hover:bg-blue-700">
          Sign in
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="What would you like prayer for?"
        className="min-h-[140px] resize-none rounded-2xl text-base leading-relaxed"
        autoFocus
      />
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Short title (optional)"
        className="h-11 rounded-xl text-base"
      />
      <label className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-700">
        <span>
          <span className="block text-[15px] font-semibold text-foreground">Hide my name</span>
          <span className="block text-xs text-muted-foreground">Shows as “Someone from the church” on the wall</span>
        </span>
        <Switch checked={hideName} onCheckedChange={setHideName} />
      </label>
      <Button
        onClick={submit}
        disabled={loading || !content.trim()}
        className="h-12 w-full rounded-2xl bg-blue-600 text-base font-bold hover:bg-blue-700"
      >
        <Send className="mr-2 h-4 w-4" />
        {loading ? "Posting…" : "Post request"}
      </Button>
    </div>
  );
};

export default PrayerRequestForm;
