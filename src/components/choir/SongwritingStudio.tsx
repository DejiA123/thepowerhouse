import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
    X, Send, PenTool, Music, Users, Check,
    MessageCircle, Lightbulb, GitMerge, FileText, Plus, Trash2,
    Edit3, Crown, Clock, Heart, Star
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { choirService } from "@/services/choirService";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";

// ── Types ──────────────────────────────────────────────────────────────────────

interface SongSection {
    id: string;
    type: "verse" | "chorus" | "bridge" | "pre-chorus" | "outro" | "intro" | "ad-lib" | "hook";
    content: string;
}

interface SongwritingEntry {
    id: string;
    userId: string;
    userName: string;
    sections: SongSection[];
    title: string;
    timestamp: string;
    likes: string[];
}

interface WeeklyTheme {
    title: string;
    description: string;
    scriptures: string[];
    setBy: string;
    setAt: string;
}

interface CollabDraft {
    title: string;
    sections: { content: string; fromUser: string; type: string }[];
    lastEditedBy: string;
    lastEditedAt: string;
}

interface ArchivedSession {
    weekLabel: string;
    weekDate: string;
    archivedAt: string;
    theme: WeeklyTheme | null;
    entries: SongwritingEntry[];
}

// ── Step definitions ───────────────────────────────────────────────────────────

const STEPS = [
    { id: 1, label: "Theme", icon: Lightbulb, color: "from-amber-500 to-orange-500" },
    { id: 2, label: "Write", icon: PenTool, color: "from-violet-500 to-purple-500" },
    { id: 3, label: "Share", icon: Send, color: "from-blue-500 to-cyan-500" },
    { id: 4, label: "Collaborate", icon: Users, color: "from-emerald-500 to-green-500" },
    { id: 5, label: "Finalize", icon: Crown, color: "from-rose-500 to-pink-500" },
];

const SECTION_TYPES = [
    { value: "verse", label: "Verse", emoji: "📝" },
    { value: "chorus", label: "Chorus", emoji: "🎵" },
    { value: "pre-chorus", label: "Pre-Chorus", emoji: "🔀" },
    { value: "bridge", label: "Bridge", emoji: "🌉" },
    { value: "hook", label: "Hook", emoji: "🪝" },
    { value: "intro", label: "Intro", emoji: "🎬" },
    { value: "outro", label: "Outro", emoji: "🎭" },
    { value: "ad-lib", label: "Ad-Lib", emoji: "🗣️" },
];

// ── Component ──────────────────────────────────────────────────────────────────

interface SongwritingStudioProps {
    locationId: string;
    isOpen: boolean;
    onClose: () => void;
}

export const SongwritingStudio = ({ locationId, isOpen, onClose }: SongwritingStudioProps) => {
    const { user } = useAuth();
    const feedEndRef = useRef<HTMLDivElement>(null);

    const [activeView, setActiveView] = useState<"write" | "feed" | "collab" | "archive">("feed");

    // Theme
    const [theme, setTheme] = useState<WeeklyTheme | null>(null);
    const [isEditingTheme, setIsEditingTheme] = useState(false);
    const [themeForm, setThemeForm] = useState({ title: "", description: "", scriptures: "" });

    // Writing
    const [myEntry, setMyEntry] = useState<SongwritingEntry | null>(null);
    const [sections, setSections] = useState<SongSection[]>([
        { id: Math.random().toString(36).substring(2, 15), type: "verse", content: "" },
    ]);
    const [songTitle, setSongTitle] = useState("");

    // Feed
    const [allEntries, setAllEntries] = useState<SongwritingEntry[]>([]);

    // Collab Draft
    const [collabDraft, setCollabDraft] = useState<CollabDraft | null>(null);
    const [isEditingDraft, setIsEditingDraft] = useState(false);
    const [draftSections, setDraftSections] = useState<CollabDraft["sections"]>([]);
    const [draftTitle, setDraftTitle] = useState("");

    // Loading
    const [isLoading, setIsLoading] = useState(true);

    // Guest name prompt state
    const [isNamePromptOpen, setIsNamePromptOpen] = useState(false);
    const [tempName, setTempName] = useState("");

    // Archives
    const [archiveSessions, setArchiveSessions] = useState<ArchivedSession[]>([]);
    const [expandedArchiveId, setExpandedArchiveId] = useState<string | null>(null);
    const [isArchiving, setIsArchiving] = useState(false);
    const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);

    // Deletion state
    const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);
    const [deletePasswordInput, setDeletePasswordInput] = useState("");
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

    const getEffectiveUserId = useCallback(() => {
        if (user?.id) return user.id;
        let guestId = localStorage.getItem("choir_guest_user_id");
        if (!guestId) {
            guestId = `guest_${Math.random().toString(36).substring(2, 15)}`;
            localStorage.setItem("choir_guest_user_id", guestId);
        }
        return guestId;
    }, [user?.id]);

    const getUserName = useCallback(() => {
        if (user) {
            return user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Anonymous";
        }
        return localStorage.getItem("choir_guest_user_name") || "Guest";
    }, [user]);

    // ── Load Data ──────────────────────────────────────────────────────────────
    const loadData = useCallback(async () => {
        if (!locationId) return;
        setIsLoading(true);
        try {
            const themeRecord = await choirService.getSetlistInfo("songwriting_theme", locationId);
            if (themeRecord?.value) {
                setTheme(JSON.parse(themeRecord.value));
            }

            const entriesRecord = await choirService.getSetlistInfo("songwriting_entries", locationId);
            if (entriesRecord?.value) {
                const entries: SongwritingEntry[] = JSON.parse(entriesRecord.value);
                setAllEntries(entries);
                const mine = entries.find((e) => e.userId === getEffectiveUserId());
                if (mine) {
                    setMyEntry(mine);
                    setSections(mine.sections);
                    setSongTitle(mine.title);
                }
            }

            const draftRecord = await choirService.getSetlistInfo("songwriting_collab_draft", locationId);
            if (draftRecord?.value) {
                setCollabDraft(JSON.parse(draftRecord.value));
            }
        } catch (err) {
            console.error("Error loading songwriting data:", err);
        } finally {
            setIsLoading(false);
        }
    }, [locationId, getEffectiveUserId]);

    // ── Load Archives ──────────────────────────────────────────────────────────
    const loadArchives = useCallback(async () => {
        if (!locationId) return;
        try {
            const index = await choirService.getArchiveIndex(locationId);
            if (!index.length) { setArchiveSessions([]); return; }
            const sessions = await Promise.all(
                index.map(async (weekDate) => {
                    const session = await choirService.getArchiveSession(locationId, weekDate);
                    return session as ArchivedSession | null;
                })
            );
            setArchiveSessions(
                (sessions.filter(Boolean) as ArchivedSession[]).sort(
                    (a, b) => new Date(b.archivedAt).getTime() - new Date(a.archivedAt).getTime()
                )
            );
        } catch (err) {
            console.error("Failed to load archives", err);
        }
    }, [locationId]);

    // ── Archive Current Week ───────────────────────────────────────────────────
    const archiveCurrentWeek = async () => {
        if (!locationId) return;
        setIsArchiving(true);
        try {
            const now = new Date();
            const weekDate = now.toISOString().split("T")[0];
            const weekLabel = `Week of ${now.toLocaleDateString("en-IE", { month: "long", day: "numeric", year: "numeric" })}`;
            const session: ArchivedSession = {
                weekLabel,
                weekDate,
                archivedAt: now.toISOString(),
                theme,
                entries: allEntries,
            };
            await choirService.saveArchiveSession(session, locationId, weekDate);
            const index = await choirService.getArchiveIndex(locationId);
            if (!index.includes(weekDate)) {
                await choirService.updateArchiveIndex([...index, weekDate], locationId);
            }
            // Clear current session
            await choirService.updateSetlistInfo("songwriting_theme", JSON.stringify(null), locationId);
            await choirService.updateSetlistInfo("songwriting_entries", JSON.stringify([]), locationId);
            setTheme(null);
            setAllEntries([]);
            setMyEntry(null);
            setSongTitle("");
            setSections([{ id: Math.random().toString(36).substring(2, 15), type: "verse", content: "" }]);
            await loadArchives();
            setIsArchiveConfirmOpen(false);
            setActiveView("archive");
            toast.success("This week has been archived! 📚");
        } catch (err) {
            console.error("Archive failed", err);
            toast.error("Failed to archive this week");
        } finally {
            setIsArchiving(false);
        }
    };

    useEffect(() => {
        if (isOpen) { loadData(); loadArchives(); }
    }, [isOpen, loadData, loadArchives]);

    useEffect(() => {
        if (activeView === "feed") {
            feedEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [allEntries, activeView]);

    // ── Theme Handlers ─────────────────────────────────────────────────────────
    const saveTheme = async () => {
        const newTheme: WeeklyTheme = {
            title: themeForm.title,
            description: themeForm.description,
            scriptures: themeForm.scriptures.split(",").map((s) => s.trim()).filter(Boolean),
            setBy: getUserName(),
            setAt: new Date().toISOString(),
        };
        try {
            await choirService.updateSetlistInfo("songwriting_theme", JSON.stringify(newTheme), locationId);
            setTheme(newTheme);
            setIsEditingTheme(false);
            toast.success("Weekly theme updated!");
        } catch (err) {
            toast.error("Failed to save theme");
        }
    };

    // ── Section Handlers ───────────────────────────────────────────────────────
    const addSection = () => {
        setSections((prev) => [...prev, { id: Math.random().toString(36).substring(2, 15), type: "verse", content: "" }]);
    };

    const removeSection = (id: string) => {
        if (sections.length <= 1) return;
        setSections((prev) => prev.filter((s) => s.id !== id));
    };

    const updateSection = (id: string, field: keyof SongSection, value: string) => {
        setSections((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
    };

    // ── Submit Entry ───────────────────────────────────────────────────────────
    const submitEntry = async (forcedName?: any) => {
        const hasContent = sections.some((s) => s.content.trim().length > 0);
        if (!hasContent) {
            toast.error("Please write at least one section");
            return;
        }

        const nameParam = typeof forcedName === "string" ? forcedName : undefined;

        // If not logged in and we don't have a guest name saved yet, prompt for it
        if (!user && !localStorage.getItem("choir_guest_user_name") && !nameParam) {
            setIsNamePromptOpen(true);
            return;
        }

        const activeName = nameParam || getUserName();
        const activeUserId = getEffectiveUserId();

        const entry: SongwritingEntry = {
            id: myEntry?.id || Math.random().toString(36).substring(2, 15),
            userId: activeUserId,
            userName: activeName,
            sections: sections.filter((s) => s.content.trim().length > 0),
            title: songTitle.trim() || "Untitled",
            timestamp: new Date().toISOString(),
            likes: myEntry?.likes || [],
        };

        try {
            const updatedEntries = myEntry
                ? allEntries.map((e) => (e.id === myEntry.id ? entry : e))
                : [...allEntries, entry];

            await choirService.updateSetlistInfo("songwriting_entries", JSON.stringify(updatedEntries), locationId);
            setAllEntries(updatedEntries);
            setMyEntry(entry);
            setActiveView("feed");
            toast.success(myEntry ? "Contribution updated!" : "Contribution shared! 🎵");
        } catch (err) {
            toast.error("Failed to save contribution");
        }
    };

    const handleNameSubmit = async () => {
        if (!tempName.trim()) {
            toast.error("Please enter your name");
            return;
        }
        localStorage.setItem("choir_guest_user_name", tempName.trim());
        setIsNamePromptOpen(false);
        await submitEntry(tempName.trim());
    };

    // ── Like Handler ───────────────────────────────────────────────────────────
    const toggleLike = async (entryId: string) => {
        const activeUserId = getEffectiveUserId();
        const updatedEntries = allEntries.map((e) => {
            if (e.id !== entryId) return e;
            const alreadyLiked = e.likes.includes(activeUserId);
            return { ...e, likes: alreadyLiked ? e.likes.filter((uid) => uid !== activeUserId) : [...e.likes, activeUserId] };
        });
        setAllEntries(updatedEntries);
        try {
            await choirService.updateSetlistInfo("songwriting_entries", JSON.stringify(updatedEntries), locationId);
        } catch (err) {
            console.error("Failed to update likes", err);
        }
    };

    const handleDeleteEntry = async () => {
        if (deletePasswordInput !== "2026") {
            toast.error("Incorrect password");
            return;
        }
        if (!deletingEntryId) return;

        const updatedEntries = allEntries.filter((e) => e.id !== deletingEntryId);
        try {
            await choirService.updateSetlistInfo("songwriting_entries", JSON.stringify(updatedEntries), locationId);
            setAllEntries(updatedEntries);
            if (myEntry?.id === deletingEntryId) {
                setMyEntry(null);
                setSongTitle("");
                setSections([{ id: Math.random().toString(36).substring(2, 15), type: "verse", content: "" }]);
            }
            toast.success("Contribution deleted successfully");
            setIsDeleteConfirmOpen(false);
            setDeletingEntryId(null);
            setDeletePasswordInput("");
        } catch (err) {
            toast.error("Failed to delete contribution");
        }
    };

    // ── Collab Draft Handlers ──────────────────────────────────────────────────
    const addToCollabDraft = (entry: SongwritingEntry, section: SongSection) => {
        const newSection = { content: section.content, fromUser: entry.userName, type: section.type };
        const updatedSections = [...(collabDraft?.sections || []), newSection];
        setDraftSections(updatedSections);

        const draft: CollabDraft = {
            title: collabDraft?.title || theme?.title || "Collaborative Song",
            sections: updatedSections,
            lastEditedBy: getUserName(),
            lastEditedAt: new Date().toISOString(),
        };
        setCollabDraft(draft);
        choirService.updateSetlistInfo("songwriting_collab_draft", JSON.stringify(draft), locationId);
        toast.success(`Added ${section.type} from ${entry.userName} to draft`);
    };

    const saveCollabDraft = async () => {
        const draft: CollabDraft = {
            title: draftTitle || collabDraft?.title || "Collaborative Song",
            sections: draftSections,
            lastEditedBy: getUserName(),
            lastEditedAt: new Date().toISOString(),
        };
        try {
            await choirService.updateSetlistInfo("songwriting_collab_draft", JSON.stringify(draft), locationId);
            setCollabDraft(draft);
            setIsEditingDraft(false);
            toast.success("Collaborative draft saved!");
        } catch (err) {
            toast.error("Failed to save draft");
        }
    };

    const removeDraftSection = (index: number) => {
        setDraftSections((prev) => prev.filter((_, i) => i !== index));
    };

    // ── Render ─────────────────────────────────────────────────────────────────
    if (!isOpen) return null;

    const currentStep = !theme ? 1 : !myEntry ? 2 : allEntries.length < 2 ? 3 : !collabDraft ? 4 : 5;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-5xl p-0 h-[100dvh] w-full md:h-[92vh] overflow-hidden bg-slate-950 border-none rounded-none md:rounded-[2rem] shadow-2xl z-[201] [&>button]:hidden" aria-describedby="songwriting-studio-desc">
                <div className="relative w-full h-full flex flex-col overflow-hidden">

                    {/* Animated Background */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute -top-[40%] -left-[20%] w-[80%] h-[80%] bg-gradient-to-br from-violet-600/20 via-purple-600/10 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDuration: "8s" }} />
                        <div className="absolute -bottom-[30%] -right-[15%] w-[70%] h-[70%] bg-gradient-to-tl from-blue-600/20 via-cyan-600/10 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDuration: "10s", animationDelay: "2s" }} />
                        <div className="absolute top-[20%] right-[10%] w-[40%] h-[40%] bg-gradient-to-bl from-amber-500/10 via-orange-500/5 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDuration: "12s", animationDelay: "4s" }} />
                    </div>

                    {/* Header */}
                    <div className="relative z-10 shrink-0">
                        <div className="flex items-center justify-between p-4 md:p-6 pt-[calc(1rem+env(safe-area-inset-top))] md:pt-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                                    <PenTool className="w-5 h-5 md:w-6 md:h-6 text-white" />
                                </div>
                                <div>
                                    <DialogTitle className="text-lg md:text-xl font-black text-white tracking-tight">
                                        Songwriting Studio
                                    </DialogTitle>
                                    <p id="songwriting-studio-desc" className="text-xs md:text-sm text-white/50 font-medium">
                                        Create • Collaborate • Compose
                                    </p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 md:p-2.5 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white rounded-xl transition-all backdrop-blur-sm">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Steps Tracker */}
                        <div className="px-4 md:px-6 pb-3">
                            <div className="flex items-center justify-between gap-1 md:gap-0">
                                {STEPS.map((step, i) => {
                                    const isActive = currentStep >= step.id;
                                    const isCurrent = currentStep === step.id;
                                    const StepIcon = step.icon;
                                    return (
                                        <div key={step.id} className="flex items-center flex-1 last:flex-none">
                                            <motion.div
                                                initial={{ scale: 0.8, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                transition={{ delay: i * 0.1 }}
                                                className={cn("flex flex-col items-center gap-1 relative", isCurrent && "scale-110")}
                                            >
                                                <div className={cn(
                                                    "w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center transition-all duration-500",
                                                    isActive ? `bg-gradient-to-br ${step.color} shadow-lg` : "bg-white/5 border border-white/10"
                                                )}>
                                                    {isActive && currentStep > step.id ? (
                                                        <Check className="w-4 h-4 text-white" strokeWidth={3} />
                                                    ) : (
                                                        <StepIcon className={cn("w-4 h-4", isActive ? "text-white" : "text-white/30")} />
                                                    )}
                                                </div>
                                                <span className={cn("text-[10px] md:text-xs font-bold transition-colors", isActive ? "text-white/90" : "text-white/30")}>
                                                    {step.label}
                                                </span>
                                            </motion.div>
                                            {i < STEPS.length - 1 && (
                                                <div className={cn("flex-1 h-[2px] mx-1 md:mx-2 rounded-full transition-all duration-500 hidden md:block", currentStep > step.id ? "bg-gradient-to-r from-white/30 to-white/10" : "bg-white/5")} />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* View Tabs */}
                        <div className="px-4 md:px-6 pb-4">
                            <div className="flex gap-1.5 bg-white/5 rounded-2xl p-1.5 backdrop-blur-sm border border-white/5">
                                {[
                                    { id: "feed" as const, label: "Feed", icon: MessageCircle, count: allEntries.length },
                                    { id: "write" as const, label: "Write", icon: PenTool, count: undefined },
                                    { id: "collab" as const, label: "Collab", icon: GitMerge, count: undefined },
                                    { id: "archive" as const, label: "Past", icon: Clock, count: archiveSessions.length || undefined },
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveView(tab.id)}
                                        className={cn(
                                            "flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl text-[11px] md:text-xs font-bold transition-all duration-300",
                                            activeView === tab.id
                                                ? tab.id === "archive"
                                                    ? "bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/20"
                                                    : "bg-white text-slate-900 shadow-lg shadow-white/10"
                                                : "text-white/50 hover:text-white/80 hover:bg-white/5"
                                        )}
                                    >
                                        <tab.icon className="w-3.5 h-3.5" />
                                        {tab.label}
                                        {tab.count !== undefined && tab.count > 0 && (
                                            <span className={cn(
                                                "min-w-[16px] h-[16px] flex items-center justify-center rounded-full text-[9px] font-black px-1",
                                                activeView === tab.id ? "bg-white/20 text-white" : "bg-white/10 text-white/60"
                                            )}>
                                                {tab.count}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="relative z-10 flex-1 overflow-y-auto px-4 md:px-6 pb-[calc(1rem+env(safe-area-inset-bottom))] no-scrollbar">

                        {/* Theme Card */}
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
                            {!isEditingTheme ? (
                                <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent backdrop-blur-md">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-400/10 to-transparent rounded-bl-full pointer-events-none" />
                                    <div className="p-4 md:p-5 relative z-10">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Lightbulb className="w-4 h-4 text-amber-400 shrink-0" />
                                                    <span className="text-[10px] md:text-xs text-amber-300/80 font-bold uppercase tracking-widest">This Week's Theme</span>
                                                </div>
                                                {theme ? (
                                                    <>
                                                        <h3 className="text-lg md:text-xl font-black text-white mb-1 truncate">{theme.title}</h3>
                                                        <p className="text-sm text-white/60 line-clamp-2">{theme.description}</p>
                                                        {theme.scriptures.length > 0 && (
                                                            <div className="flex flex-wrap gap-1.5 mt-3">
                                                                {theme.scriptures.map((s, i) => (
                                                                    <Badge key={i} variant="outline" className="bg-amber-500/10 text-amber-200 border-amber-500/20 text-[10px] font-bold">
                                                                        📖 {s}
                                                                    </Badge>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </>
                                                ) : (
                                                    <p className="text-sm text-white/40 italic">No theme set yet — tap edit to set one!</p>
                                                )}
                                            </div>
                                            <Button size="sm" variant="ghost" onClick={() => { setThemeForm({ title: theme?.title || "", description: theme?.description || "", scriptures: theme?.scriptures?.join(", ") || "" }); setIsEditingTheme(true); }} className="text-amber-300/60 hover:text-amber-300 hover:bg-amber-500/10 shrink-0 rounded-xl">
                                                <Edit3 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-transparent backdrop-blur-md p-4 md:p-5 space-y-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Lightbulb className="w-4 h-4 text-amber-400" />
                                        <span className="text-xs text-amber-300 font-bold uppercase tracking-widest">Set Weekly Theme</span>
                                    </div>
                                    <Input placeholder="Theme title (e.g., Grace & Renewal)" value={themeForm.title} onChange={(e) => setThemeForm((p) => ({ ...p, title: e.target.value }))} className="bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl focus-visible:ring-amber-500/50" />
                                    <Textarea placeholder="Brief description or direction for the songwriting..." value={themeForm.description} onChange={(e) => setThemeForm((p) => ({ ...p, description: e.target.value }))} className="bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl resize-none min-h-[60px] focus-visible:ring-amber-500/50" />
                                    <Input placeholder="Scripture references (comma-separated, e.g. Psalm 23:1, John 3:16)" value={themeForm.scriptures} onChange={(e) => setThemeForm((p) => ({ ...p, scriptures: e.target.value }))} className="bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl focus-visible:ring-amber-500/50" />
                                    <div className="flex gap-2 pt-1">
                                        <Button size="sm" onClick={saveTheme} disabled={!themeForm.title.trim()} className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold shadow-lg shadow-amber-500/20 flex-1">
                                            <Check className="w-4 h-4 mr-1.5" /> Save Theme
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={() => setIsEditingTheme(false)} className="text-white/50 hover:text-white hover:bg-white/5 rounded-xl">Cancel</Button>
                                    </div>
                                </div>
                            )}
                        </motion.div>

                        {/* Archive & Start New Week */}
                        {activeView !== "archive" && (
                            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
                                <button
                                    onClick={() => setIsArchiveConfirmOpen(true)}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-amber-500/30 text-amber-400/70 hover:text-amber-300 hover:border-amber-400/50 hover:bg-amber-500/5 text-xs font-bold transition-all duration-200"
                                >
                                    <Clock className="w-3.5 h-3.5" />
                                    Archive This Week & Start Fresh
                                </button>
                            </motion.div>
                        )}

                        {/* Loading */}
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center animate-pulse">
                                    <Music className="w-6 h-6 text-white" />
                                </div>
                                <p className="text-white/40 text-sm font-medium">Loading studio...</p>
                            </div>
                        ) : (
                            <AnimatePresence mode="wait">

                                {/* ── FEED VIEW ──────────────────────────── */}
                                {activeView === "feed" && (
                                    <motion.div key="feed" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-3">
                                        {allEntries.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-16 gap-4">
                                                <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center">
                                                    <MessageCircle className="w-8 h-8 text-white/20" />
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-white/50 font-bold">No contributions yet</p>
                                                    <p className="text-white/30 text-sm mt-1">Be the first to write something!</p>
                                                </div>
                                                <Button onClick={() => setActiveView("write")} className="bg-violet-500 hover:bg-violet-600 text-white rounded-xl font-bold shadow-lg shadow-violet-500/20 mt-2">
                                                    <PenTool className="w-4 h-4 mr-2" /> Start Writing
                                                </Button>
                                            </div>
                                        ) : (
                                            <>
                                                {allEntries.map((entry, idx) => {
                                                    const isOwn = entry.userId === getEffectiveUserId();
                                                    const isLiked = entry.likes.includes(getEffectiveUserId());
                                                    return (
                                                        <motion.div key={entry.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} className={cn("flex gap-3", isOwn ? "flex-row-reverse" : "flex-row")}>
                                                            {/* Avatar */}
                                                            <div className={cn("w-9 h-9 rounded-xl shrink-0 flex items-center justify-center font-black text-sm", isOwn ? "bg-gradient-to-br from-violet-500 to-purple-600 text-white" : "bg-gradient-to-br from-blue-500 to-cyan-500 text-white")}>
                                                                {entry.userName.charAt(0).toUpperCase()}
                                                            </div>
                                                            {/* Bubble */}
                                                            <div className={cn("max-w-[85%] md:max-w-[75%]", isOwn ? "items-end" : "items-start")}>
                                                                <div className={cn("rounded-2xl border overflow-hidden", isOwn ? "bg-gradient-to-br from-violet-500/20 to-purple-600/10 border-violet-500/20 rounded-tr-md" : "bg-white/5 border-white/10 rounded-tl-md")}>
                                                                    <div className="px-4 pt-3 pb-1 flex items-center justify-between gap-3">
                                                                        <span className={cn("text-xs font-black", isOwn ? "text-violet-300" : "text-blue-300")}>{isOwn ? "You" : entry.userName}</span>
                                                                        <span className="text-[10px] text-white/30">{format(new Date(entry.timestamp), "MMM d, h:mm a")}</span>
                                                                    </div>
                                                                    {entry.title && entry.title !== "Untitled" && (
                                                                        <div className="px-4 py-1">
                                                                            <span className="text-sm font-bold text-white/90 flex items-center gap-1.5">
                                                                                <Music className="w-3.5 h-3.5 text-white/40" />{entry.title}
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                    <div className="px-4 py-2 space-y-2">
                                                                        {entry.sections.map((section) => {
                                                                            const sectionMeta = SECTION_TYPES.find((s) => s.value === section.type);
                                                                            return (
                                                                                <div key={section.id} className="space-y-1">
                                                                                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-1">
                                                                                        {sectionMeta?.emoji} {sectionMeta?.label || section.type}
                                                                                    </span>
                                                                                    <p className="text-sm text-white/80 whitespace-pre-wrap leading-relaxed">{section.content}</p>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                    <div className="px-4 py-2 flex items-center gap-3 border-t border-white/5">
                                                                        <button onClick={() => toggleLike(entry.id)} className={cn("flex items-center gap-1 text-xs font-bold transition-all", isLiked ? "text-rose-400" : "text-white/30 hover:text-white/60")}>
                                                                            <Heart className={cn("w-3.5 h-3.5", isLiked && "fill-current")} />
                                                                            {entry.likes.length > 0 && entry.likes.length}
                                                                        </button>
                                                                        {!isOwn && (
                                                                            <button onClick={() => { entry.sections.forEach((s) => addToCollabDraft(entry, s)); }} className="flex items-center gap-1 text-xs font-bold text-white/30 hover:text-emerald-400 transition-all">
                                                                                <GitMerge className="w-3.5 h-3.5" />Add to Draft
                                                                            </button>
                                                                        )}
                                                                        {isOwn && (
                                                                            <button onClick={() => setActiveView("write")} className="flex items-center gap-1 text-xs font-bold text-white/30 hover:text-violet-400 transition-all">
                                                                                <Edit3 className="w-3.5 h-3.5" />Edit
                                                                            </button>
                                                                        )}
                                                                        <button
                                                                            onClick={() => {
                                                                                setDeletingEntryId(entry.id);
                                                                                setDeletePasswordInput("");
                                                                                setIsDeleteConfirmOpen(true);
                                                                            }}
                                                                            className="ml-auto flex items-center gap-1 text-xs font-bold text-white/20 hover:text-rose-400 transition-all"
                                                                        >
                                                                            <Trash2 className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    );
                                                })}
                                                <div ref={feedEndRef} />
                                            </>
                                        )}
                                    </motion.div>
                                )}

                                {/* ── ARCHIVE VIEW ────────────────────────── */}
                                {activeView === "archive" && (
                                    <motion.div key="archive" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-4 pb-4">
                                        {archiveSessions.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-16 gap-4">
                                                <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/10 flex items-center justify-center">
                                                    <Clock className="w-8 h-8 text-amber-400/30" />
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-white/50 font-bold">No past sessions yet</p>
                                                    <p className="text-white/30 text-sm mt-1">Archived weeks will appear here once you close a session.</p>
                                                </div>
                                            </div>
                                        ) : (
                                            archiveSessions.map((session, idx) => {
                                                const isExpanded = expandedArchiveId === session.weekDate;
                                                return (
                                                    <motion.div
                                                        key={session.weekDate}
                                                        initial={{ opacity: 0, y: 12 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: idx * 0.06 }}
                                                        className="rounded-2xl border border-white/8 overflow-hidden"
                                                        style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.07) 0%, rgba(15,15,30,0.6) 100%)" }}
                                                    >
                                                        {/* Session Header */}
                                                        <button
                                                            onClick={() => setExpandedArchiveId(isExpanded ? null : session.weekDate)}
                                                            className="w-full flex items-center gap-3 p-4 text-left group"
                                                        >
                                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/30 to-orange-500/20 flex items-center justify-center shrink-0">
                                                                <span className="text-lg">📚</span>
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-black text-white/90 truncate">{session.theme?.title || "Untitled Session"}</p>
                                                                <p className="text-xs text-amber-300/60 font-medium mt-0.5">{session.weekLabel}</p>
                                                            </div>
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                <span className="text-[10px] font-bold bg-white/5 border border-white/10 text-white/40 rounded-full px-2 py-0.5">
                                                                    {session.entries.length} songs
                                                                </span>
                                                                <motion.div
                                                                    animate={{ rotate: isExpanded ? 180 : 0 }}
                                                                    transition={{ duration: 0.2 }}
                                                                    className="text-white/30 group-hover:text-white/60 transition-colors"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                                                </motion.div>
                                                            </div>
                                                        </button>

                                                        {/* Scripture badges */}
                                                        {session.theme?.scriptures && session.theme.scriptures.length > 0 && (
                                                            <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                                                                {session.theme.scriptures.map((s, i) => (
                                                                    <Badge key={i} variant="outline" className="bg-amber-500/10 text-amber-200 border-amber-500/20 text-[10px] font-bold">📖 {s}</Badge>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* Expanded entries */}
                                                        <AnimatePresence>
                                                            {isExpanded && (
                                                                <motion.div
                                                                    key="expanded"
                                                                    initial={{ height: 0, opacity: 0 }}
                                                                    animate={{ height: "auto", opacity: 1 }}
                                                                    exit={{ height: 0, opacity: 0 }}
                                                                    transition={{ duration: 0.25 }}
                                                                    className="overflow-hidden"
                                                                >
                                                                    <div className="border-t border-white/5 px-4 py-3 space-y-3">
                                                                        {session.theme?.description && (
                                                                            <p className="text-xs text-white/40 italic pb-1">{session.theme.description}</p>
                                                                        )}
                                                                        {session.entries.length === 0 ? (
                                                                            <p className="text-white/30 text-xs italic text-center py-3">No songs were shared this week.</p>
                                                                        ) : (
                                                                            session.entries.map((entry) => (
                                                                                <div key={entry.id} className="rounded-xl bg-white/3 border border-white/6 overflow-hidden">
                                                                                    <div className="px-3 pt-3 pb-1.5 flex items-center justify-between">
                                                                                        <div className="flex items-center gap-2">
                                                                                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-xs font-black text-white">
                                                                                                {entry.userName.charAt(0).toUpperCase()}
                                                                                            </div>
                                                                                            <div>
                                                                                                <span className="text-xs font-black text-white/80">{entry.userName}</span>
                                                                                                {entry.title && entry.title !== "Untitled" && (
                                                                                                    <span className="ml-2 text-[10px] text-white/40">· {entry.title}</span>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                        <div className="flex items-center gap-1 text-rose-400/60 text-[10px] font-bold">
                                                                                            <Heart className="w-3 h-3 fill-current" />
                                                                                            {entry.likes.length}
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="px-3 pb-3 space-y-2">
                                                                                        {entry.sections.map((section) => {
                                                                                            const meta = SECTION_TYPES.find((s) => s.value === section.type);
                                                                                            return (
                                                                                                <div key={section.id}>
                                                                                                    <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">{meta?.emoji} {meta?.label}</span>
                                                                                                    <p className="text-xs text-white/70 whitespace-pre-wrap leading-relaxed mt-0.5">{section.content}</p>
                                                                                                </div>
                                                                                            );
                                                                                        })}
                                                                                    </div>
                                                                                </div>
                                                                            ))
                                                                        )}
                                                                    </div>
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </motion.div>
                                                );
                                            })
                                        )}
                                    </motion.div>
                                )}

                                {/* ── WRITE VIEW ─────────────────────────── */}
                                {activeView === "write" && (
                                    <motion.div key="write" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-white/40 uppercase tracking-widest flex items-center gap-1.5">
                                                <Star className="w-3.5 h-3.5" />Song Title (optional)
                                            </label>
                                            <Input placeholder="Give your piece a name..." value={songTitle} onChange={(e) => setSongTitle(e.target.value)} className="bg-white/5 border-white/10 text-white placeholder:text-white/20 rounded-xl h-12 text-base font-medium focus-visible:ring-violet-500/50" />
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-bold text-white/40 uppercase tracking-widest flex items-center gap-1.5">
                                                    <FileText className="w-3.5 h-3.5" />Sections
                                                </label>
                                                <Button size="sm" variant="ghost" onClick={addSection} className="text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 rounded-xl text-xs font-bold">
                                                    <Plus className="w-4 h-4 mr-1" /> Add Section
                                                </Button>
                                            </div>

                                            {sections.map((section) => {
                                                const sectionMeta = SECTION_TYPES.find((s) => s.value === section.type);
                                                return (
                                                    <motion.div key={section.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
                                                        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-base">{sectionMeta?.emoji}</span>
                                                                <Select value={section.type} onValueChange={(v) => updateSection(section.id, "type", v as SongSection["type"])}>
                                                                    <SelectTrigger className="w-auto bg-transparent border-none text-white/80 text-xs font-bold h-7 gap-1 px-1 focus:ring-0">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent className="bg-slate-800 border-white/10 rounded-xl z-[202]">
                                                                        {SECTION_TYPES.map((st) => (
                                                                            <SelectItem key={st.value} value={st.value} className="text-white focus:bg-white/10 focus:text-white rounded-lg">
                                                                                {st.emoji} {st.label}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                            {sections.length > 1 && (
                                                                <button onClick={() => removeSection(section.id)} className="text-white/20 hover:text-rose-400 transition-colors p-1 rounded-lg hover:bg-white/5">
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                        <Textarea placeholder={`Write your ${sectionMeta?.label?.toLowerCase() || "section"} lyrics here...`} value={section.content} onChange={(e) => updateSection(section.id, "content", e.target.value)} className="bg-transparent border-none text-white/90 placeholder:text-white/20 rounded-none resize-none min-h-[100px] text-sm leading-relaxed focus-visible:ring-0 px-4" />
                                                    </motion.div>
                                                );
                                            })}
                                        </div>

                                        <div className="pt-2 pb-4">
                                            <Button onClick={() => submitEntry()} className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white rounded-2xl h-14 font-black text-base shadow-lg shadow-violet-500/20 transition-all active:scale-[0.98]">
                                                <Send className="w-5 h-5 mr-2" />{myEntry ? "Update Contribution" : "Share Contribution"}
                                            </Button>
                                        </div>
                                    </motion.div>
                                )}

                                {/* ── COLLAB VIEW ────────────────────────── */}
                                {activeView === "collab" && (
                                    <motion.div key="collab" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-4">
                                        <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-transparent backdrop-blur-md p-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <GitMerge className="w-4 h-4 text-emerald-400" />
                                                <span className="text-xs text-emerald-300 font-bold uppercase tracking-widest">Collaborative Draft</span>
                                            </div>
                                            <p className="text-sm text-white/50">Merge the best parts from everyone's contributions into one final piece. Tap "Add to Draft" on any message in the feed.</p>
                                        </div>

                                        {collabDraft && collabDraft.sections.length > 0 ? (
                                            <div className="space-y-3">
                                                {!isEditingDraft ? (
                                                    <div className="flex items-center justify-between">
                                                        <h3 className="text-lg font-black text-white flex items-center gap-2">
                                                            <Crown className="w-5 h-5 text-amber-400" />{collabDraft.title}
                                                        </h3>
                                                        <Button size="sm" variant="ghost" onClick={() => { setDraftTitle(collabDraft.title); setDraftSections([...collabDraft.sections]); setIsEditingDraft(true); }} className="text-white/40 hover:text-white hover:bg-white/5 rounded-xl">
                                                            <Edit3 className="w-4 h-4 mr-1.5" /> Edit
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <Input value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} placeholder="Song title..." className="bg-white/5 border-white/10 text-white placeholder:text-white/20 rounded-xl font-bold focus-visible:ring-emerald-500/50" />
                                                )}

                                                {(isEditingDraft ? draftSections : collabDraft.sections).map((section, idx) => {
                                                    const sectionMeta = SECTION_TYPES.find((s) => s.value === section.type);
                                                    return (
                                                        <motion.div key={idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
                                                            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5">
                                                                <span className="text-xs font-bold text-white/50 flex items-center gap-1.5">
                                                                    {sectionMeta?.emoji} {sectionMeta?.label || section.type}
                                                                    <span className="text-white/20">•</span>
                                                                    <span className="text-white/30 font-medium">by {section.fromUser}</span>
                                                                </span>
                                                                {isEditingDraft && (
                                                                    <button onClick={() => removeDraftSection(idx)} className="text-white/20 hover:text-rose-400 transition-colors p-1 rounded-lg hover:bg-white/5">
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                            {isEditingDraft ? (
                                                                <Textarea value={draftSections[idx]?.content || ""} onChange={(e) => { const updated = [...draftSections]; updated[idx] = { ...updated[idx], content: e.target.value }; setDraftSections(updated); }} className="bg-transparent border-none text-white/90 rounded-none resize-none min-h-[80px] text-sm leading-relaxed focus-visible:ring-0 px-4" />
                                                            ) : (
                                                                <p className="px-4 py-3 text-sm text-white/80 whitespace-pre-wrap leading-relaxed">{section.content}</p>
                                                            )}
                                                        </motion.div>
                                                    );
                                                })}

                                                {isEditingDraft && (
                                                    <div className="flex gap-2 pt-2">
                                                        <Button onClick={saveCollabDraft} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/20">
                                                            <Check className="w-4 h-4 mr-1.5" /> Save Draft
                                                        </Button>
                                                        <Button variant="ghost" onClick={() => setIsEditingDraft(false)} className="text-white/50 hover:text-white hover:bg-white/5 rounded-xl">Cancel</Button>
                                                    </div>
                                                )}

                                                {collabDraft.lastEditedAt && !isEditingDraft && (
                                                    <p className="text-[10px] text-white/20 text-center pt-2 flex items-center justify-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        Last edited by {collabDraft.lastEditedBy} • {format(new Date(collabDraft.lastEditedAt), "MMM d, h:mm a")}
                                                    </p>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-12 gap-4">
                                                <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center">
                                                    <GitMerge className="w-8 h-8 text-white/20" />
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-white/50 font-bold">No collaborative draft yet</p>
                                                    <p className="text-white/30 text-sm mt-1 max-w-xs">Go to the Feed and tap "Add to Draft" on contributions you'd like to merge together.</p>
                                                </div>
                                                <Button onClick={() => setActiveView("feed")} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/20 mt-2">
                                                    <MessageCircle className="w-4 h-4 mr-2" /> Go to Feed
                                                </Button>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        )}
                    </div>
                </div>
                {/* Contributor Name Prompt Dialog */}
                <Dialog open={isNamePromptOpen} onOpenChange={setIsNamePromptOpen}>
                    <DialogContent className="max-w-md p-6 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-[210] text-white">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                                    <Users className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <DialogTitle className="text-lg font-black text-white">
                                        Tell Us Your Name
                                    </DialogTitle>
                                    <p className="text-xs text-white/50">
                                        You are sharing as a guest. Please enter your name.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-white/40 uppercase tracking-widest">
                                    Your Name
                                </label>
                                <Input
                                    placeholder="Enter your name (e.g. Samuel)..."
                                    value={tempName}
                                    onChange={(e) => setTempName(e.target.value)}
                                    className="bg-white/5 border-white/10 text-white placeholder:text-white/20 rounded-xl h-12 focus-visible:ring-violet-500/50 text-white"
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            handleNameSubmit();
                                        }
                                    }}
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <Button
                                    onClick={handleNameSubmit}
                                    className="flex-1 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white rounded-xl h-11 font-bold"
                                >
                                    Share Contribution
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={() => setIsNamePromptOpen(false)}
                                    className="text-white/50 hover:text-white hover:bg-white/5 rounded-xl h-11"
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Delete Confirmation Dialog */}
                <Dialog open={isDeleteConfirmOpen} onOpenChange={(open) => { setIsDeleteConfirmOpen(open); if (!open) { setDeletingEntryId(null); setDeletePasswordInput(""); } }}>
                    <DialogContent className="max-w-md p-6 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-[210] text-white">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center">
                                    <Trash2 className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <DialogTitle className="text-lg font-black text-white">
                                        Delete Contribution
                                    </DialogTitle>
                                    <p className="text-xs text-white/50">
                                        Enter the password to permanently delete this song.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-white/40 uppercase tracking-widest">
                                    Password
                                </label>
                                <Input
                                    type="password"
                                    placeholder="Enter password..."
                                    value={deletePasswordInput}
                                    onChange={(e) => setDeletePasswordInput(e.target.value)}
                                    className="bg-white/5 border-white/10 text-white placeholder:text-white/20 rounded-xl h-12 focus-visible:ring-rose-500/50"
                                    onKeyDown={(e) => { if (e.key === "Enter") handleDeleteEntry(); }}
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <Button
                                    onClick={handleDeleteEntry}
                                    className="flex-1 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white rounded-xl h-11 font-bold"
                                >
                                    Delete
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={() => { setIsDeleteConfirmOpen(false); setDeletingEntryId(null); setDeletePasswordInput(""); }}
                                    className="text-white/50 hover:text-white hover:bg-white/5 rounded-xl h-11"
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Archive Confirmation Dialog */}
                <Dialog open={isArchiveConfirmOpen} onOpenChange={setIsArchiveConfirmOpen}>
                    <DialogContent className="max-w-md p-6 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-[210] text-white">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                                    <Clock className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <DialogTitle className="text-lg font-black text-white">
                                        Archive This Week?
                                    </DialogTitle>
                                    <p className="text-xs text-white/50">
                                        This will save all songs to Past Sessions and start fresh.
                                    </p>
                                </div>
                            </div>

                            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 space-y-1">
                                <p className="text-xs font-bold text-amber-300">What will happen:</p>
                                <ul className="text-xs text-amber-200/70 space-y-1 list-disc list-inside">
                                    <li>Current theme &amp; all {allEntries.length} contributions will be saved</li>
                                    <li>The studio will reset for a new week</li>
                                    <li>You can view this week in the Past Sessions tab anytime</li>
                                </ul>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <Button
                                    onClick={archiveCurrentWeek}
                                    disabled={isArchiving}
                                    className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl h-11 font-bold disabled:opacity-60"
                                >
                                    {isArchiving ? "Archiving..." : "📚 Archive & Start Fresh"}
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={() => setIsArchiveConfirmOpen(false)}
                                    className="text-white/50 hover:text-white hover:bg-white/5 rounded-xl h-11"
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </DialogContent>
        </Dialog>
    );
};
