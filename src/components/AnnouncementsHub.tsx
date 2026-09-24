import { useEffect, useState } from "react";
import { Megaphone, MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import UserAvatar from "@/components/common/UserAvatar";
import { EmptyState, Pill } from "@/components/page/PageKit";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { appAlert } from "@/lib/appAlert";
import { cn } from "@/lib/utils";

const CACHE_KEY = "announcements_hub_cache";
const WEEK = 7 * 24 * 60 * 60 * 1000;

const readCache = (): any[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(CACHE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const Post = ({ post, isAdmin, onEdit, onDelete }: { post: any; isAdmin: boolean; onEdit: () => void; onDelete: () => void }) => {
  const [open, setOpen] = useState(false);
  const author = post.profiles?.full_name || "The Power House";
  const isNew = Date.now() - new Date(post.created_at).getTime() < WEEK;
  const long = (post.content || "").length > 260 || (post.content || "").split("\n").length > 5;

  return (
    <article className="rounded-[20px] border border-slate-200/70 bg-card p-4 shadow-sm dark:border-slate-800">
      <div className="flex items-center gap-3">
        <UserAvatar name={author} seed={post.author_id || author} className="h-9 w-9 text-xs" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{author}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(post.created_at).toLocaleDateString([], { day: "numeric", month: "short", year: new Date(post.created_at).getFullYear() === new Date().getFullYear() ? undefined : "numeric" })}
          </p>
        </div>
        {isNew && <Pill className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">New</Pill>}
        {isAdmin && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="-mr-1 rounded-full p-1.5 text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Post options">
                <MoreHorizontal className="h-5 w-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={onDelete}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <h3 className="mt-3 text-[17px] font-bold leading-snug text-foreground">{post.title}</h3>
      <p className={cn("mt-1 whitespace-pre-wrap text-[15px] leading-relaxed text-slate-600 dark:text-slate-300", !open && long && "line-clamp-5")}>
        {post.content}
      </p>
      {long && (
        <button onClick={() => setOpen((v) => !v)} className="mt-1 text-sm font-semibold text-blue-600 dark:text-blue-400">
          {open ? "Show less" : "Read more"}
        </button>
      )}
    </article>
  );
};

/** Church updates: a simple feed, with posting tools for admins and pastors. */
const AnnouncementsHub = () => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<any[]>(readCache);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [editor, setEditor] = useState<{ id?: string; title: string; content: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
    if (!user) return;
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .in("role", ["administrator", "pastor"])
      .then(({ data }) => setIsAdmin(!!data?.length));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchAnnouncements = async () => {
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    if (!data) return;

    const authorIds = [...new Set(data.map((a) => a.author_id).filter(Boolean))];
    const { data: profiles } = authorIds.length
      ? await supabase.from("profiles").select("id, full_name").in("id", authorIds)
      : { data: [] as any[] };
    const byId = new Map((profiles || []).map((p: any) => [p.id, p]));
    const merged = data.map((a) => ({ ...a, profiles: byId.get(a.author_id) || null }));
    setAnnouncements(merged);
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(merged));
    } catch {
      /* storage full */
    }
  };

  const save = async () => {
    if (!user || !editor?.title.trim() || !editor.content.trim()) return;
    setSaving(true);
    const payload = { title: editor.title.trim(), content: editor.content.trim() };
    const { error } = editor.id
      ? await supabase.from("announcements").update(payload).eq("id", editor.id)
      : await supabase.from("announcements").insert({ ...payload, author_id: user.id, is_active: true });
    setSaving(false);
    if (error) {
      appAlert("Couldn't save the post", error.message, "error");
      return;
    }
    setEditor(null);
    appAlert(editor.id ? "Post updated" : "Post published", "", "success");
    fetchAnnouncements();
  };

  const remove = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const { error } = await supabase.from("announcements").delete().eq("id", deleteId);
    setDeleting(false);
    if (error) {
      appAlert("Couldn't delete the post", error.message, "error");
      return;
    }
    setDeleteId(null);
    setAnnouncements((prev) => prev.filter((a) => a.id !== deleteId));
  };

  const q = searchTerm.trim().toLowerCase();
  const visible = q
    ? announcements.filter((a) => `${a.title} ${a.content}`.toLowerCase().includes(q))
    : announcements;

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(announcements.length > 3 || q) && (
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search updates"
              className="h-10 rounded-xl border-0 bg-slate-200/60 pl-9 text-[15px] focus-visible:ring-1 dark:bg-slate-800"
            />
          </div>
        )}
        {isAdmin && (
          <Button onClick={() => setEditor({ title: "", content: "" })} className="h-10 rounded-full bg-blue-600 px-4 font-semibold hover:bg-blue-700">
            <Plus className="mr-1 h-4 w-4" /> New post
          </Button>
        )}
      </div>

      {visible.length > 0 ? (
        visible.map((post) => (
          <Post
            key={post.id}
            post={post}
            isAdmin={isAdmin}
            onEdit={() => setEditor({ id: post.id, title: post.title, content: post.content })}
            onDelete={() => setDeleteId(post.id)}
          />
        ))
      ) : (
        <EmptyState icon={Megaphone} title={q ? "No updates match your search" : "No updates yet"}>
          {q ? "Try a different word." : "News from the church will appear here."}
        </EmptyState>
      )}

      <Dialog open={!!editor} onOpenChange={(open) => !open && setEditor(null)}>
        <DialogContent className="max-w-lg rounded-3xl">
          <DialogHeader>
            <DialogTitle>{editor?.id ? "Edit post" : "New post"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={editor?.title ?? ""}
              onChange={(e) => setEditor((prev) => prev && { ...prev, title: e.target.value })}
              placeholder="Title"
              className="h-12 rounded-xl text-base font-semibold"
            />
            <Textarea
              value={editor?.content ?? ""}
              onChange={(e) => setEditor((prev) => prev && { ...prev, content: e.target.value })}
              placeholder="What would you like to share?"
              rows={7}
              className="resize-none rounded-xl text-base leading-relaxed"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => setEditor(null)} className="rounded-full">
              Cancel
            </Button>
            <Button
              onClick={save}
              disabled={saving || !editor?.title.trim() || !editor?.content.trim()}
              className="rounded-full bg-blue-600 px-6 font-semibold hover:bg-blue-700"
            >
              {saving ? "Saving…" : editor?.id ? "Save" : "Publish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle>Delete this post?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">It will be removed for everyone. This can't be undone.</p>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setDeleteId(null)} className="flex-1 rounded-full">
              Cancel
            </Button>
            <Button variant="destructive" onClick={remove} disabled={deleting} className="flex-1 rounded-full">
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AnnouncementsHub;
