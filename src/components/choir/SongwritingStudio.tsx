import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import type { User } from "@supabase/supabase-js";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format, startOfWeek } from "date-fns";
import {
    Music, Sparkles, Lightbulb, Zap, Waves, ListMusic, CheckCircle2, Send, Heart,
    Plus, Trash2, X, ChevronUp, ChevronDown, Copy, Loader2, BookOpen, MessageCircle,
    Pencil, Save, PlusCircle, Check, Share2, Edit3,
} from "lucide-react";

// The songwriting_* tables aren't in the generated Supabase types yet, so use a
// loosely-typed client handle for them.
const db = supabase as any;

interface SongTheme {
    id: string; location: string; week_date: string; title: string;
    scripture: string | null; description: string | null; focus_step: string | null; created_by: string | null;
}
interface Contribution {
    id: string; location: string; week_date: string; user_id: string | null;
    author_name: string | null; author_avatar: string | null; section: string;
    content: string; reply_to: string | null; liked_by: string[] | null; created_at: string;
}
interface SongLine {
    id: string; location: string; week_date: string; section: string; content: string;
    sort_order: number; added_by: string | null; added_by_name: string | null;
    source_contribution_id: string | null; created_at: string;
}
interface ActiveWriter { uid: string; name: string; color: string; }

type SectionKey = "hook" | "verse" | "chorus" | "bridge" | "melody" | "idea" | "other";

const SECTION_META: Record<string, { label: string; emoji: string; pill: string; dot: string }> = {
    hook: { label: "Hook", emoji: "🪝", pill: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-500" },
    verse: { label: "Verse", emoji: "📖", pill: "bg-sky-100 text-sky-700 border-sky-200", dot: "bg-sky-500" },
    chorus: { label: "Chorus", emoji: "🎶", pill: "bg-violet-100 text-violet-700 border-violet-200", dot: "bg-violet-500" },
    bridge: { label: "Bridge", emoji: "🌉", pill: "bg-rose-100 text-rose-700 border-rose-200", dot: "bg-rose-500" },
    melody: { label: "Melody", emoji: "🎵", pill: "bg-emerald-100 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
    idea: { label: "Idea", emoji: "💡", pill: "bg-slate-100 text-slate-700 border-slate-200", dot: "bg-slate-500" },
    other: { label: "Other", emoji: "✨", pill: "bg-indigo-100 text-indigo-700 border-indigo-200", dot: "bg-indigo-500" },
};
const SECTION_ORDER: SectionKey[] = ["hook", "verse", "chorus", "bridge", "melody", "idea", "other"];

const STEPS: { key: string; label: string; icon: any; tip: string }[] = [
    { key: "pray", label: "Pray & Reflect", icon: Sparkles, tip: "Sit with this week's theme and scripture. Ask the Holy Spirit for the heart of the song before writing a word." },
    { key: "brainstorm", label: "Brainstorm", icon: Lightbulb, tip: "Drop any words, images, or feelings the theme stirs up. No idea is too small — quantity first, polish later." },
    { key: "hook", label: "Find the Hook", icon: Zap, tip: "What's the one line everyone should walk away singing? Post catchy hook ideas tagged 'Hook'." },
    { key: "chorus", label: "Build the Chorus", icon: Music, tip: "Shape the repeatable heart of the song — the part the whole congregation will sing." },
    { key: "verses", label: "Write Verses", icon: Pencil, tip: "Tell the story. Each verse should build and lead naturally into the chorus." },
    { key: "bridge", label: "Add a Bridge", icon: Waves, tip: "A fresh turn — a new angle, a climax, or a moment of stillness before the final chorus." },
    { key: "compile", label: "Compile the Song", icon: ListMusic, tip: "Promote the best ideas into 'The Song' tab and arrange them into verses and choruses." },
    { key: "polish", label: "Polish & Finish", icon: CheckCircle2, tip: "Refine the wording, check the flow, and celebrate — you've written a song together!" },
];

const AVATAR_COLORS = [
    "from-rose-400 to-pink-500", "from-amber-400 to-orange-500", "from-emerald-400 to-teal-500",
    "from-sky-400 to-blue-500", "from-violet-400 to-purple-500", "from-fuchsia-400 to-pink-500",
    "from-cyan-400 to-sky-500", "from-lime-400 to-green-500",
];
const hashCode = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) { h = (h << 5) - h + s.charCodeAt(i); h |= 0; } return Math.abs(h); };
const colorFor = (seed: string) => AVATAR_COLORS[hashCode(seed || "x") % AVATAR_COLORS.length];
const initialsOf = (name?: string | null) => (name || "?").trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();

const genId = () => {
    try { if (typeof crypto !== "undefined" && (crypto as any).randomUUID) return (crypto as any).randomUUID(); } catch { /* noop */ }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0; const v = c === "x" ? r : (r & 0x3) | 0x8; return v.toString(16);
    });
};
const lsGet = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* noop */ } };

const WEEK_DATE = () => format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");

interface SongwritingStudioProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    locationId: string;
    isAdmin: boolean;
    user: User | null;
}

export function SongwritingStudio({ open, onOpenChange, locationId, isAdmin, user }: SongwritingStudioProps) {
    const weekDate = useMemo(() => WEEK_DATE(), []);

    // ---- Anonymous, no-login identity (stable per browser) ----
    const [myUid] = useState<string>(() => {
        let id = lsGet("songwriting_uid");
        if (!id) { id = genId(); lsSet("songwriting_uid", id); }
        return id;
    });
    const [myName, setMyName] = useState<string>(() =>
        lsGet("songwriting_name") || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "");
    const myColor = useMemo(() => colorFor(myUid), [myUid]);
    const myAvatar = user?.user_metadata?.avatar_url || null;

    const [editingName, setEditingName] = useState(false);
    const [nameInput, setNameInput] = useState("");

    const [loading, setLoading] = useState(true);
    const [theme, setTheme] = useState<SongTheme | null>(null);
    const [contributions, setContributions] = useState<Contribution[]>([]);
    const [songLines, setSongLines] = useState<SongLine[]>([]);
    const [activeWriters, setActiveWriters] = useState<ActiveWriter[]>([]);

    const [draft, setDraft] = useState("");
    const [section, setSection] = useState<SectionKey>("idea");
    const [replyTo, setReplyTo] = useState<Contribution | null>(null);
    const [sending, setSending] = useState(false);

    const [lineDraft, setLineDraft] = useState("");
    const [lineSection, setLineSection] = useState<SectionKey>("verse");
    const [editingLineId, setEditingLineId] = useState<string | null>(null);
    const [lineEditDraft, setLineEditDraft] = useState("");

    const [editingTheme, setEditingTheme] = useState(false);
    const [themeForm, setThemeForm] = useState({ title: "", scripture: "", description: "" });
    const [openStep, setOpenStep] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    const contributionsById = useMemo(() => {
        const m: Record<string, Contribution> = {};
        contributions.forEach((c) => { m[c.id] = c; });
        return m;
    }, [contributions]);

    // ---- Data fetching ----
    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [themeRes, contribRes, linesRes] = await Promise.all([
                db.from("songwriting_themes").select("*").eq("location", locationId).eq("week_date", weekDate).maybeSingle(),
                db.from("songwriting_contributions").select("*").eq("location", locationId).eq("week_date", weekDate).order("created_at", { ascending: true }),
                db.from("songwriting_song_lines").select("*").eq("location", locationId).eq("week_date", weekDate).order("sort_order", { ascending: true }),
            ]);
            setTheme((themeRes?.data as SongTheme) ?? null);
            setContributions((contribRes?.data as Contribution[]) ?? []);
            setSongLines((linesRes?.data as SongLine[]) ?? []);
        } catch (e) {
            console.error("SongwritingStudio fetch error", e);
            toast.error("Couldn't load the Songwriting Studio.");
        } finally {
            setLoading(false);
        }
    }, [locationId, weekDate]);

    // Fetch + realtime subscriptions while open
    useEffect(() => {
        if (!open || !locationId) return;
        fetchAll();
        const sameWeek = (row: any) => row && row.location === locationId && row.week_date === weekDate;

        const themeChannel = db.channel(`songwriting_themes_${locationId}`)
            .on("postgres_changes", { event: "*", schema: "public", table: "songwriting_themes", filter: `location=eq.${locationId}` }, (p: any) => {
                if (p.eventType === "DELETE") { setTheme((prev) => (prev && prev.id === p.old?.id ? null : prev)); return; }
                if (sameWeek(p.new)) setTheme(p.new as SongTheme);
            }).subscribe();

        const contribChannel = db.channel(`songwriting_contributions_${locationId}`)
            .on("postgres_changes", { event: "*", schema: "public", table: "songwriting_contributions", filter: `location=eq.${locationId}` }, (p: any) => {
                if (p.eventType === "INSERT") {
                    if (!sameWeek(p.new)) return;
                    setContributions((prev) => (prev.some((c) => c.id === p.new.id) ? prev : [...prev, p.new as Contribution]));
                } else if (p.eventType === "UPDATE") {
                    setContributions((prev) => prev.map((c) => (c.id === p.new.id ? (p.new as Contribution) : c)));
                } else if (p.eventType === "DELETE") {
                    setContributions((prev) => prev.filter((c) => c.id !== p.old.id));
                }
            }).subscribe();

        const linesChannel = db.channel(`songwriting_song_lines_${locationId}`)
            .on("postgres_changes", { event: "*", schema: "public", table: "songwriting_song_lines", filter: `location=eq.${locationId}` }, (p: any) => {
                if (p.eventType === "INSERT") {
                    if (!sameWeek(p.new)) return;
                    setSongLines((prev) => (prev.some((l) => l.id === p.new.id) ? prev : [...prev, p.new as SongLine].sort((a, b) => a.sort_order - b.sort_order)));
                } else if (p.eventType === "UPDATE") {
                    setSongLines((prev) => prev.map((l) => (l.id === p.new.id ? (p.new as SongLine) : l)).sort((a, b) => a.sort_order - b.sort_order));
                } else if (p.eventType === "DELETE") {
                    setSongLines((prev) => prev.filter((l) => l.id !== p.old.id));
                }
            }).subscribe();

        return () => {
            db.removeChannel(themeChannel);
            db.removeChannel(contribChannel);
            db.removeChannel(linesChannel);
        };
    }, [open, locationId, weekDate, fetchAll]);

    // Live presence — "who's writing now" (no login needed)
    useEffect(() => {
        if (!open || !locationId || !myName) return;
        const channel = db.channel(`songwriting_presence_${locationId}`, { config: { presence: { key: myUid } } });
        channel.on("presence", { event: "sync" }, () => {
            const state = channel.presenceState();
            const writers = Object.values(state).map((arr: any) => arr[0]).filter(Boolean) as ActiveWriter[];
            setActiveWriters(writers);
        });
        channel.subscribe((status: string) => {
            if (status === "SUBSCRIBED") channel.track({ uid: myUid, name: myName, color: myColor });
        });
        return () => { db.removeChannel(channel); };
    }, [open, locationId, myName, myUid, myColor]);

    useEffect(() => {
        if (editingTheme) setThemeForm({ title: theme?.title || "", scripture: theme?.scripture || "", description: theme?.description || "" });
    }, [editingTheme, theme]);

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [contributions]);

    // ---- Identity actions ----
    const startEditName = () => { setNameInput(myName); setEditingName(true); };
    const saveName = () => {
        const n = nameInput.trim();
        if (!n) { toast.error("Please enter a name."); return; }
        lsSet("songwriting_name", n);
        setMyName(n);
        setEditingName(false);
        toast.success(`You're writing as ${n} ✍️`);
    };
    const requireName = () => {
        if (!myName.trim()) { toast.error("Add your name first (top bar) to start writing."); startEditName(); return false; }
        return true;
    };

    // ---- Contribution actions ----
    const sendContribution = async () => {
        if (!requireName()) return;
        const content = draft.trim();
        if (!content) return;
        setSending(true);
        try {
            const row = {
                location: locationId, week_date: weekDate, user_id: myUid, author_name: myName,
                author_avatar: myAvatar, section, content, reply_to: replyTo?.id ?? null, liked_by: [],
            };
            const { data, error } = await db.from("songwriting_contributions").insert(row).select().single();
            if (error) throw error;
            if (data) setContributions((prev) => (prev.some((c) => c.id === data.id) ? prev : [...prev, data as Contribution]));
            setDraft(""); setReplyTo(null);
        } catch (e) {
            console.error(e); toast.error("Your idea couldn't be sent. Please try again.");
        } finally { setSending(false); }
    };

    const toggleLike = async (c: Contribution) => {
        if (!requireName()) return;
        const current = c.liked_by || [];
        const liked = current.includes(myUid);
        const next = liked ? current.filter((id) => id !== myUid) : [...current, myUid];
        setContributions((prev) => prev.map((x) => (x.id === c.id ? { ...x, liked_by: next } : x)));
        const { error } = await db.from("songwriting_contributions").update({ liked_by: next }).eq("id", c.id);
        if (error) { setContributions((prev) => prev.map((x) => (x.id === c.id ? { ...x, liked_by: current } : x))); toast.error("Couldn't update your like."); }
    };

    const deleteContribution = async (c: Contribution) => {
        const { error } = await db.from("songwriting_contributions").delete().eq("id", c.id);
        if (error) { toast.error("Couldn't delete this idea."); return; }
        setContributions((prev) => prev.filter((x) => x.id !== c.id));
    };

    const nextOrder = () => (songLines.reduce((max, l) => Math.max(max, l.sort_order), 0) || 0) + 1;

    const addToSong = async (c: Contribution) => {
        if (!requireName()) return;
        try {
            const row = {
                location: locationId, week_date: weekDate,
                section: c.section === "idea" || c.section === "other" || c.section === "melody" ? "verse" : c.section,
                content: c.content, sort_order: nextOrder(), added_by: myUid, added_by_name: myName, source_contribution_id: c.id,
            };
            const { data, error } = await db.from("songwriting_song_lines").insert(row).select().single();
            if (error) throw error;
            if (data) setSongLines((prev) => (prev.some((l) => l.id === data.id) ? prev : [...prev, data as SongLine].sort((a, b) => a.sort_order - b.sort_order)));
            toast.success("Added to the song ✨");
        } catch (e) { console.error(e); toast.error("Couldn't add that to the song."); }
    };

    const addSongLine = async () => {
        if (!requireName()) return;
        const content = lineDraft.trim();
        if (!content) return;
        try {
            const row = { location: locationId, week_date: weekDate, section: lineSection, content, sort_order: nextOrder(), added_by: myUid, added_by_name: myName, source_contribution_id: null };
            const { data, error } = await db.from("songwriting_song_lines").insert(row).select().single();
            if (error) throw error;
            if (data) setSongLines((prev) => (prev.some((l) => l.id === data.id) ? prev : [...prev, data as SongLine].sort((a, b) => a.sort_order - b.sort_order)));
            setLineDraft("");
        } catch (e) { console.error(e); toast.error("Couldn't add the line."); }
    };

    const saveLineEdit = async (line: SongLine) => {
        const content = lineEditDraft.trim();
        if (!content) { setEditingLineId(null); return; }
        setSongLines((prev) => prev.map((l) => (l.id === line.id ? { ...l, content } : l)));
        setEditingLineId(null);
        const { error } = await db.from("songwriting_song_lines").update({ content }).eq("id", line.id);
        if (error) { toast.error("Couldn't save the edit."); fetchAll(); }
    };

    const moveLine = async (line: SongLine, dir: -1 | 1) => {
        const ordered = [...songLines].sort((a, b) => a.sort_order - b.sort_order);
        const idx = ordered.findIndex((l) => l.id === line.id);
        const swapIdx = idx + dir;
        if (idx < 0 || swapIdx < 0 || swapIdx >= ordered.length) return;
        const a = ordered[idx], b = ordered[swapIdx];
        setSongLines((prev) => prev.map((l) => {
            if (l.id === a.id) return { ...l, sort_order: b.sort_order };
            if (l.id === b.id) return { ...l, sort_order: a.sort_order };
            return l;
        }).sort((x, y) => x.sort_order - y.sort_order));
        const r1 = await db.from("songwriting_song_lines").update({ sort_order: b.sort_order }).eq("id", a.id);
        const r2 = await db.from("songwriting_song_lines").update({ sort_order: a.sort_order }).eq("id", b.id);
        if (r1.error || r2.error) { toast.error("Couldn't reorder."); fetchAll(); }
    };

    const deleteSongLine = async (line: SongLine) => {
        const { error } = await db.from("songwriting_song_lines").delete().eq("id", line.id);
        if (error) { toast.error("Couldn't remove the line."); return; }
        setSongLines((prev) => prev.filter((l) => l.id !== line.id));
    };

    const buildSongText = () => {
        const ordered = [...songLines].sort((a, b) => a.sort_order - b.sort_order);
        let text = theme?.title ? `${theme.title}\n` : "Our Song\n";
        if (theme?.scripture) text += `(${theme.scripture})\n`;
        text += "\n";
        let last = "";
        ordered.forEach((l) => {
            if (l.section !== last) { text += `\n[${(SECTION_META[l.section]?.label || l.section).toUpperCase()}]\n`; last = l.section; }
            text += `${l.content}\n`;
        });
        return text.trim();
    };
    const copySong = async () => {
        if (songLines.length === 0) { toast.error("The song is still empty."); return; }
        try { await navigator.clipboard.writeText(buildSongText()); toast.success("Song copied to clipboard 📋"); }
        catch { toast.error("Couldn't copy — your browser blocked clipboard access."); }
    };
    const shareSong = async () => {
        if (songLines.length === 0) { toast.error("The song is still empty."); return; }
        const text = buildSongText();
        try {
            if ((navigator as any).share) { await (navigator as any).share({ title: theme?.title || "Our Song", text }); }
            else { await navigator.clipboard.writeText(text); toast.success("Song copied to clipboard 📋"); }
        } catch { /* user cancelled */ }
    };

    const saveTheme = async () => {
        if (!themeForm.title.trim()) { toast.error("Give the theme a title."); return; }
        try {
            const row = {
                location: locationId, week_date: weekDate, title: themeForm.title.trim(),
                scripture: themeForm.scripture.trim() || null, description: themeForm.description.trim() || null,
                focus_step: theme?.focus_step ?? "brainstorm", created_by: myUid, updated_at: new Date().toISOString(),
            };
            const { data, error } = await db.from("songwriting_themes").upsert(row, { onConflict: "location,week_date" }).select().single();
            if (error) throw error;
            if (data) setTheme(data as SongTheme);
            setEditingTheme(false); toast.success("This week's theme is set!");
        } catch (e) { console.error(e); toast.error("Couldn't save the theme."); }
    };
    const setFocusStep = async (stepKey: string) => {
        if (!theme) { toast.error("Set this week's theme first."); return; }
        const prev = theme.focus_step;
        setTheme({ ...theme, focus_step: stepKey });
        const { error } = await db.from("songwriting_themes").update({ focus_step: stepKey }).eq("id", theme.id);
        if (error) { setTheme({ ...theme, focus_step: prev }); toast.error("Couldn't update the focus."); }
        else toast.success(`Focus set to "${STEPS.find((s) => s.key === stepKey)?.label}"`);
    };

    const canModify = (ownerId: string | null) => isAdmin || ownerId === myUid;
    const orderedLines = useMemo(() => [...songLines].sort((a, b) => a.sort_order - b.sort_order), [songLines]);

    const SectionChips = ({ value, onChange }: { value: SectionKey; onChange: (k: SectionKey) => void }) => (
        <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {SECTION_ORDER.map((k) => {
                const m = SECTION_META[k];
                const active = value === k;
                return (
                    <button key={k} type="button" onClick={() => onChange(k)}
                        className={cn("flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition",
                            active ? "border-transparent bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50")}>
                        <span>{m.emoji}</span>{m.label}
                    </button>
                );
            })}
        </div>
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl gap-0 p-0 h-[100dvh] w-full md:h-[90vh] overflow-hidden border-none bg-slate-50 rounded-none md:rounded-[1.75rem] shadow-2xl z-[201] flex flex-col [&>button]:hidden">
                <DialogTitle className="sr-only">Songwriting Studio</DialogTitle>
                <DialogDescription className="sr-only">Collaborate with the choir on this week's song — no login needed.</DialogDescription>

                {/* Header */}
                <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 px-5 py-4 text-white md:px-6">
                    <div className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
                    <div className="pointer-events-none absolute -bottom-12 left-10 h-32 w-32 rounded-full bg-fuchsia-300/20 blur-2xl" />
                    <button onClick={() => onOpenChange(false)} className="absolute right-4 top-4 rounded-full bg-white/15 p-1.5 transition hover:bg-white/25" aria-label="Close">
                        <X className="h-5 w-5" />
                    </button>
                    <div className="relative flex items-center gap-3 pr-10">
                        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/15 backdrop-blur">
                            <Music className="h-6 w-6" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-xl font-black tracking-tight md:text-2xl">Songwriting Studio</h2>
                            <p className="truncate text-xs font-medium text-white/80 md:text-sm">
                                Week of {format(new Date(weekDate), "d MMM yyyy")} · write a song together
                            </p>
                        </div>
                    </div>

                    {/* Identity + presence row */}
                    <div className="relative mt-3 flex flex-wrap items-center gap-2">
                        {editingName ? (
                            <div className="flex items-center gap-1.5">
                                <Input autoFocus value={nameInput} onChange={(e) => setNameInput(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === "Enter") saveName(); }}
                                    placeholder="Your name" maxLength={32}
                                    className="h-8 w-40 border-white/30 bg-white/15 text-sm text-white placeholder:text-white/60" />
                                <Button size="sm" onClick={saveName} className="h-8 bg-white text-indigo-700 hover:bg-white/90">
                                    <Check className="h-4 w-4" />
                                </Button>
                            </div>
                        ) : (
                            <button onClick={startEditName}
                                className={cn("flex items-center gap-1.5 rounded-full py-1 pl-1 pr-3 text-xs font-bold transition",
                                    myName ? "bg-white/15 hover:bg-white/25" : "animate-pulse bg-white text-indigo-700")}>
                                <span className={cn("grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br text-[10px] font-black text-white", myName ? myColor : "from-indigo-400 to-violet-500")}>
                                    {myName ? initialsOf(myName) : "✍️"}
                                </span>
                                {myName || "Tap to add your name"}
                                <Edit3 className="h-3 w-3 opacity-70" />
                            </button>
                        )}

                        {activeWriters.length > 0 && (
                            <div className="ml-auto flex items-center gap-1.5 rounded-full bg-white/15 py-1 pl-2 pr-3 text-xs font-semibold">
                                <span className="relative flex h-2 w-2">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
                                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                                </span>
                                <div className="flex -space-x-1.5">
                                    {activeWriters.slice(0, 4).map((w) => (
                                        <span key={w.uid} title={w.name} className={cn("grid h-5 w-5 place-items-center rounded-full bg-gradient-to-br text-[8px] font-black text-white ring-1 ring-white/40", w.color || "from-slate-400 to-slate-500")}>
                                            {initialsOf(w.name)}
                                        </span>
                                    ))}
                                </div>
                                {activeWriters.length} writing now
                            </div>
                        )}
                    </div>
                </div>

                {/* Theme banner */}
                <div className="shrink-0 border-b border-slate-200 bg-white px-5 py-3 md:px-6">
                    {editingTheme ? (
                        <div className="space-y-2">
                            <Input value={themeForm.title} onChange={(e) => setThemeForm((f) => ({ ...f, title: e.target.value }))} placeholder="Theme title (e.g. The Faithfulness of God)" className="font-semibold" />
                            <Input value={themeForm.scripture} onChange={(e) => setThemeForm((f) => ({ ...f, scripture: e.target.value }))} placeholder="Scripture reference (optional)" />
                            <Textarea value={themeForm.description} onChange={(e) => setThemeForm((f) => ({ ...f, description: e.target.value }))} placeholder="A sentence or two to inspire the writers…" rows={2} />
                            <div className="flex gap-2">
                                <Button size="sm" onClick={saveTheme} className="bg-indigo-600 hover:bg-indigo-700"><Save className="mr-1.5 h-4 w-4" /> Save theme</Button>
                                <Button size="sm" variant="ghost" onClick={() => setEditingTheme(false)}>Cancel</Button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-indigo-500"><Sparkles className="h-3.5 w-3.5" /> This week's theme</div>
                                {theme ? (
                                    <>
                                        <h3 className="truncate text-lg font-extrabold text-slate-900">{theme.title}</h3>
                                        {theme.scripture && <p className="flex items-center gap-1.5 text-sm font-medium text-indigo-600"><BookOpen className="h-3.5 w-3.5" /> {theme.scripture}</p>}
                                        {theme.description && <p className="mt-0.5 text-sm text-slate-600">{theme.description}</p>}
                                    </>
                                ) : (
                                    <p className="text-sm text-slate-500">No theme yet for this week.{isAdmin ? " Set one to get the writers started." : " Anyone can still start adding ideas below!"}</p>
                                )}
                            </div>
                            {isAdmin && <Button size="sm" variant="outline" className="shrink-0" onClick={() => setEditingTheme(true)}><Pencil className="mr-1.5 h-3.5 w-3.5" /> {theme ? "Edit" : "Set theme"}</Button>}
                        </div>
                    )}
                </div>

                {/* Steps */}
                <div className="shrink-0 border-b border-slate-200 bg-white px-3 py-2.5 md:px-5">
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {STEPS.map((step, i) => {
                            const Icon = step.icon;
                            const isFocus = theme?.focus_step === step.key;
                            const isOpen = openStep === step.key;
                            return (
                                <button key={step.key} onClick={() => setOpenStep(isOpen ? null : step.key)}
                                    className={cn("flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                                        isFocus ? "border-indigo-500 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-200"
                                            : isOpen ? "border-slate-300 bg-slate-100 text-slate-800" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50")}>
                                    <span className={cn("grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold", isFocus ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-600")}>{i + 1}</span>
                                    <Icon className="h-3.5 w-3.5" />{step.label}
                                    {isFocus && <span className="ml-0.5 rounded-full bg-indigo-600 px-1.5 text-[9px] font-bold text-white">NOW</span>}
                                </button>
                            );
                        })}
                    </div>
                    {openStep && (
                        <div className="mt-2 flex items-start justify-between gap-3 rounded-xl bg-indigo-50/70 px-3 py-2 text-sm text-slate-700">
                            <p>{STEPS.find((s) => s.key === openStep)?.tip}</p>
                            {isAdmin && <Button size="sm" variant="ghost" className="h-7 shrink-0 text-indigo-600 hover:text-indigo-700" onClick={() => setFocusStep(openStep)}><Zap className="mr-1 h-3.5 w-3.5" /> Set as focus</Button>}
                        </div>
                    )}
                </div>

                {/* Tabs */}
                <Tabs defaultValue="collaborate" className="flex min-h-0 flex-1 flex-col">
                    <TabsList className="mx-auto mt-2 grid w-[92%] max-w-md shrink-0 grid-cols-2">
                        <TabsTrigger value="collaborate" className="gap-1.5"><MessageCircle className="h-4 w-4" /> Collaborate
                            {contributions.length > 0 && <span className="ml-1 rounded-full bg-indigo-100 px-1.5 text-[10px] font-bold text-indigo-700">{contributions.length}</span>}</TabsTrigger>
                        <TabsTrigger value="song" className="gap-1.5"><ListMusic className="h-4 w-4" /> The Song
                            {orderedLines.length > 0 && <span className="ml-1 rounded-full bg-violet-100 px-1.5 text-[10px] font-bold text-violet-700">{orderedLines.length}</span>}</TabsTrigger>
                    </TabsList>

                    {/* COLLABORATE */}
                    <TabsContent value="collaborate" className="m-0 flex min-h-0 flex-1 flex-col">
                        <ScrollArea className="min-h-0 flex-1 px-3 md:px-5">
                            <div className="space-y-3 py-4">
                                {loading ? (
                                    <div className="grid place-items-center py-16 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>
                                ) : contributions.length === 0 ? (
                                    <div className="mx-auto mt-10 grid max-w-xs place-items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-10 text-center">
                                        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white"><Lightbulb className="h-7 w-7" /></div>
                                        <p className="font-bold text-slate-700">Be the first to spark this week's song!</p>
                                        <p className="text-sm text-slate-500">Drop a lyric, a hook, or any idea below. Everyone can join in — no login needed.</p>
                                    </div>
                                ) : (
                                    contributions.map((c) => {
                                        const mine = c.user_id === myUid;
                                        const meta = SECTION_META[c.section] || SECTION_META.other;
                                        const parent = c.reply_to ? contributionsById[c.reply_to] : null;
                                        const likes = c.liked_by?.length || 0;
                                        const likedByMe = (c.liked_by || []).includes(myUid);
                                        const wColor = colorFor(c.user_id || c.author_name || "x");
                                        return (
                                            <div key={c.id} className={cn("flex gap-2", mine ? "flex-row-reverse" : "flex-row")}>
                                                {!mine && (
                                                    <div className={cn("mt-1 grid h-8 w-8 shrink-0 place-items-center self-end rounded-full bg-gradient-to-br text-[11px] font-black text-white", wColor)}>
                                                        {initialsOf(c.author_name)}
                                                    </div>
                                                )}
                                                <div className={cn("group max-w-[80%] rounded-2xl px-3 py-2 shadow-sm",
                                                    mine ? "rounded-br-sm bg-gradient-to-br from-indigo-500 to-violet-600 text-white" : "rounded-bl-sm border border-slate-100 bg-white text-slate-800")}>
                                                    <div className="mb-1 flex items-center gap-2">
                                                        {!mine && <span className="text-xs font-bold text-slate-700">{c.author_name || "Member"}</span>}
                                                        <span className={cn("flex items-center gap-1 rounded-full border px-1.5 py-0 text-[9px] font-bold", mine ? "border-white/30 bg-white/15 text-white" : meta.pill)}>{meta.emoji} {meta.label}</span>
                                                    </div>
                                                    {parent && (
                                                        <div className={cn("mb-1 rounded-lg border-l-2 px-2 py-1 text-[11px]", mine ? "border-white/50 bg-white/10 text-white/80" : "border-indigo-300 bg-indigo-50 text-slate-500")}>
                                                            <span className="font-semibold">{parent.author_name || "Member"}: </span>
                                                            {parent.content.length > 60 ? parent.content.slice(0, 60) + "…" : parent.content}
                                                        </div>
                                                    )}
                                                    <p className="whitespace-pre-wrap break-words text-sm leading-snug">{c.content}</p>
                                                    <div className={cn("mt-1 flex items-center gap-2.5 text-[10px]", mine ? "text-white/70" : "text-slate-400")}>
                                                        <span>{format(new Date(c.created_at), "HH:mm")}</span>
                                                        <button onClick={() => toggleLike(c)} className={cn("flex items-center gap-0.5 transition hover:opacity-100", likedByMe ? "opacity-100" : "opacity-70")}>
                                                            <Heart className={cn("h-3 w-3", likedByMe && "fill-rose-400 text-rose-400")} />{likes > 0 && likes}
                                                        </button>
                                                        <button onClick={() => setReplyTo(c)} className="flex items-center gap-0.5 opacity-70 transition hover:opacity-100"><MessageCircle className="h-3 w-3" /> Reply</button>
                                                        <button onClick={() => addToSong(c)} className="flex items-center gap-0.5 font-semibold opacity-70 transition hover:opacity-100" title="Add to the song"><Plus className="h-3 w-3" /> Add</button>
                                                        {canModify(c.user_id) && <button onClick={() => deleteContribution(c)} className="flex items-center gap-0.5 opacity-70 transition hover:opacity-100"><Trash2 className="h-3 w-3" /></button>}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                        </ScrollArea>

                        {/* Composer */}
                        <div className="shrink-0 border-t border-slate-200 bg-white p-3 md:px-5">
                            {replyTo && (
                                <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border-l-2 border-indigo-400 bg-indigo-50 px-2.5 py-1.5 text-xs text-slate-600">
                                    <span className="truncate"><span className="font-semibold">Replying to {replyTo.author_name || "Member"}: </span>{replyTo.content.slice(0, 50)}</span>
                                    <button onClick={() => setReplyTo(null)}><X className="h-3.5 w-3.5" /></button>
                                </div>
                            )}
                            <div className="mb-2"><SectionChips value={section} onChange={setSection} /></div>
                            <div className="flex items-end gap-2">
                                <Textarea value={draft} onChange={(e) => setDraft(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendContribution(); } }}
                                    placeholder={myName ? `Share a ${SECTION_META[section].label.toLowerCase()} idea…  (Enter to send)` : "Add your name above to start writing"}
                                    disabled={sending}
                                    rows={1} className="max-h-28 min-h-[44px] flex-1 resize-none rounded-2xl" />
                                <Button onClick={sendContribution} disabled={sending || !draft.trim()} className="h-11 w-11 shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 p-0 hover:opacity-90">
                                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>
                    </TabsContent>

                    {/* THE SONG */}
                    <TabsContent value="song" className="m-0 flex min-h-0 flex-1 flex-col">
                        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-2 md:px-5">
                            <p className="text-xs font-medium text-slate-500">Arrange the best ideas into a full piece.</p>
                            <div className="flex gap-1.5">
                                <Button size="sm" variant="outline" onClick={copySong} disabled={orderedLines.length === 0}><Copy className="mr-1.5 h-3.5 w-3.5" /> Copy</Button>
                                <Button size="sm" variant="outline" onClick={shareSong} disabled={orderedLines.length === 0}><Share2 className="mr-1.5 h-3.5 w-3.5" /> Share</Button>
                            </div>
                        </div>
                        <ScrollArea className="min-h-0 flex-1 px-3 md:px-6">
                            <div className="mx-auto max-w-2xl py-4">
                                {loading ? (
                                    <div className="grid place-items-center py-16 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>
                                ) : orderedLines.length === 0 ? (
                                    <div className="mx-auto mt-10 grid max-w-xs place-items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-10 text-center">
                                        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white"><ListMusic className="h-7 w-7" /></div>
                                        <p className="font-bold text-slate-700">Your song starts here</p>
                                        <p className="text-sm text-slate-500">Add lines below, or tap <Plus className="inline h-3 w-3" /> <b>Add</b> on any idea in Collaborate to build the full piece.</p>
                                    </div>
                                ) : (
                                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
                                        {orderedLines.map((line, idx) => {
                                            const meta = SECTION_META[line.section] || SECTION_META.other;
                                            const showHeader = line.section !== (idx > 0 ? orderedLines[idx - 1].section : null);
                                            const editing = editingLineId === line.id;
                                            return (
                                                <div key={line.id}>
                                                    {showHeader && (
                                                        <div className="mb-1.5 mt-4 flex items-center gap-2 first:mt-0">
                                                            <span className={cn("h-2.5 w-2.5 rounded-full", meta.dot)} />
                                                            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">{meta.emoji} {meta.label}</span>
                                                        </div>
                                                    )}
                                                    <div className="group flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-slate-50">
                                                        <div className="flex flex-col opacity-0 transition group-hover:opacity-100">
                                                            <button onClick={() => moveLine(line, -1)} disabled={idx === 0} className="text-slate-300 hover:text-slate-600 disabled:opacity-30"><ChevronUp className="h-3.5 w-3.5" /></button>
                                                            <button onClick={() => moveLine(line, 1)} disabled={idx === orderedLines.length - 1} className="text-slate-300 hover:text-slate-600 disabled:opacity-30"><ChevronDown className="h-3.5 w-3.5" /></button>
                                                        </div>
                                                        {editing ? (
                                                            <div className="flex flex-1 items-center gap-1.5">
                                                                <Input autoFocus value={lineEditDraft} onChange={(e) => setLineEditDraft(e.target.value)}
                                                                    onKeyDown={(e) => { if (e.key === "Enter") saveLineEdit(line); if (e.key === "Escape") setEditingLineId(null); }}
                                                                    className="h-8 flex-1" />
                                                                <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700" onClick={() => saveLineEdit(line)}><Check className="h-4 w-4" /></Button>
                                                            </div>
                                                        ) : (
                                                            <p className="flex-1 whitespace-pre-wrap break-words font-serif text-[15px] leading-relaxed text-slate-800">{line.content}</p>
                                                        )}
                                                        {line.added_by_name && !editing && <span className="hidden shrink-0 text-[10px] text-slate-400 md:inline">— {line.added_by_name}</span>}
                                                        {!editing && canModify(line.added_by) && (
                                                            <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100">
                                                                <button onClick={() => { setEditingLineId(line.id); setLineEditDraft(line.content); }} className="text-slate-300 hover:text-indigo-500"><Edit3 className="h-3.5 w-3.5" /></button>
                                                                <button onClick={() => deleteSongLine(line)} className="text-slate-300 hover:text-rose-500"><Trash2 className="h-3.5 w-3.5" /></button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </ScrollArea>

                        {/* Add line */}
                        <div className="shrink-0 border-t border-slate-200 bg-white p-3 md:px-5">
                            <div className="mb-2"><SectionChips value={lineSection} onChange={setLineSection} /></div>
                            <div className="flex items-end gap-2">
                                <Input value={lineDraft} onChange={(e) => setLineDraft(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSongLine(); } }}
                                    placeholder={myName ? `Add a ${SECTION_META[lineSection].label.toLowerCase()} line…` : "Add your name above to start writing"}
                                    className="h-11 flex-1 rounded-2xl" />
                                <Button onClick={addSongLine} disabled={!lineDraft.trim()} className="h-11 shrink-0 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 hover:opacity-90"><PlusCircle className="mr-1.5 h-4 w-4" /> Add</Button>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}

export default SongwritingStudio;
