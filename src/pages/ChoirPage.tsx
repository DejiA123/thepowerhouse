import { useState, useEffect, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
    Music,
    Mic,
    PlayCircle,
    ListMusic,
    FileMusic,
    Video,
    BookOpen,
    Users,
    Calendar,
    ArrowLeft,
    Download,
    Folder,
    Plus,
    MoreVertical,
    Trash2,
    FolderOpen,
    Heart,
    Pencil,
    Edit3,
    CalendarIcon,
    Zap,
    Waves,
    PlusCircle,
    Clock
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { choirService, ChoirFolder, WeeklySetSong, ChoirCalendarEvent } from "@/services/choirService";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

// --- Sub-components ---
const BandSongCard = ({ song, allLibrarySongs, onUpdate }: { song: WeeklySetSong, allLibrarySongs: any[], onUpdate: (id: string, updates: any) => void }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [notes, setNotes] = useState(song.instrumental_notes || "");
    const [chartUrl, setChartUrl] = useState(song.instrumental_url || "");

    // Sync state if props change (important for real-time updates)
    useEffect(() => {
        setNotes(song.instrumental_notes || "");
        setChartUrl(song.instrumental_url || "");
    }, [song.instrumental_notes, song.instrumental_url]);

    // Find the original library song to get fallback notes
    const librarySong = allLibrarySongs.find(s =>
        (song.library_song_id && s.id === song.library_song_id) ||
        (s.title.toLowerCase() === song.title.toLowerCase() && s.artist?.toLowerCase() === song.artist?.toLowerCase())
    );

    const displayNotes = song.instrumental_notes || (librarySong?.notes ? `[FROM LIBRARY] ${librarySong.notes}` : null);

    const handleSave = () => {
        onUpdate(song.id, { instrumental_notes: notes, instrumental_url: chartUrl });
        setIsEditing(false);
    };

    return (
        <div className="bg-white dark:bg-slate-700/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50 hover:shadow-md transition-all">
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500 font-bold shrink-0 text-xs">
                        {song.key}
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800 dark:text-slate-100">{song.title}</h4>
                        <p className="text-xs text-slate-500">{song.artist}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {song.instrumental_url && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs gap-1 border-blue-200 text-blue-600 hover:bg-blue-50"
                            onClick={() => window.open(song.instrumental_url, '_blank')}
                        >
                            <FileMusic className="w-3 h-3" /> View Chart
                        </Button>
                    )}
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setIsEditing(!isEditing)}>
                        <Pencil className="w-3 h-3 text-slate-400" />
                    </Button>
                </div>
            </div>

            {isEditing ? (
                <div className="space-y-3 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                    <div>
                        <Label className="text-[10px] uppercase text-slate-400 font-bold">Band Notes (Chords, Dynamics)</Label>
                        <Textarea
                            placeholder="e.g. Intro: G - C - D. Soft start, builds at bridge."
                            className="text-sm mt-1 min-h-[80px]"
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                        />
                    </div>
                    <div>
                        <Label className="text-[10px] uppercase text-slate-400 font-bold">Chart URL (Google Drive/PDF)</Label>
                        <Input
                            placeholder="https://drive.google.com/..."
                            className="text-sm mt-1"
                            value={chartUrl}
                            onChange={e => setChartUrl(e.target.value)}
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSave}>Save Details</Button>
                    </div>
                </div>
            ) : (
                <>
                    {displayNotes ? (
                        <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-100 dark:border-slate-800">
                            <p className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                                <strong className="text-slate-400 uppercase text-[10px] block mb-1">Band Notes:</strong>
                                {displayNotes}
                            </p>
                        </div>
                    ) : (
                        <p className="text-[10px] text-slate-400 italic mt-2">No specific band instructions yet.</p>
                    )}
                </>
            )}
        </div>
    );
};

const ChoirPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams(); // Added for deep linking
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState("vocalists");
    const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // State for YouTube Player
    const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);

    // State for Setlist Date
    const [setlistDate, setSetlistDate] = useState<Date | undefined>(new Date());

    // State for Header Modals
    const [isScheduleOpen, setIsScheduleOpen] = useState(false);
    const [isRosterOpen, setIsRosterOpen] = useState(false);

    // Dynamic Instrumental Resources from Supabase
    const [instrResources, setInstrResources] = useState<any[]>([]);

    // Calendar Events State
    const [calendarEvents, setCalendarEvents] = useState<ChoirCalendarEvent[]>([]);
    const [isAddEventOpen, setIsAddEventOpen] = useState(false);
    const [newEvent, setNewEvent] = useState({
        title: "",
        description: "",
        color: "purple"
    });
    const [editingEvent, setEditingEvent] = useState<ChoirCalendarEvent | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    // Data from Supabase
    const [folders, setFolders] = useState<ChoirFolder[]>([]);
    const [praiseSet, setPraiseSet] = useState<WeeklySetSong[]>([]);
    const [worshipSet, setWorshipSet] = useState<WeeklySetSong[]>([]);

    // Setlist Descriptions State
    const [praiseInfo, setPraiseInfo] = useState({ title: "Praise Set", desc: "" });
    const [worshipInfo, setWorshipInfo] = useState({ title: "Worship Set", desc: "" });

    // UI States for Edit Setlist Info
    const [isEditSetInfoOpen, setIsEditSetInfoOpen] = useState(false);
    const [editingSetInfoType, setEditingSetInfoType] = useState<'praise' | 'worship' | null>(null);
    const [tempSetInfo, setTempSetInfo] = useState({ title: "", desc: "" });

    // UI States for Folder/Song Management
    const [newFolderName, setNewFolderName] = useState("");
    const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
    const [isAddSongOpen, setIsAddSongOpen] = useState(false);
    const [newSong, setNewSong] = useState({ title: "", key: "", artist: "", url: "", notes: "" });

    // UI States for Edit Song (Library)
    const [isEditSongOpen, setIsEditSongOpen] = useState(false);
    const [editingSongId, setEditingSongId] = useState<string | null>(null);
    const [songToEdit, setSongToEdit] = useState({ title: "", key: "", artist: "", url: "", notes: "" });

    // UI States for Setlist Management
    const [isAddToSetOpen, setIsAddToSetOpen] = useState(false);
    const [activeSetType, setActiveSetType] = useState<'praise' | 'worship' | null>(null);
    const [newSetSong, setNewSetSong] = useState<{ title: string, key: string, artist: string, url: string, library_song_id?: string }>({
        title: "",
        key: "",
        artist: "",
        url: "",
        library_song_id: undefined
    });

    // UI States for Edit Setlist Song
    const [isEditSetSongOpen, setIsEditSetSongOpen] = useState(false);
    const [editingSetSongId, setEditingSetSongId] = useState<string | null>(null);
    const [editingSetlistSongData, setEditingSetlistSongData] = useState({
        title: "",
        key: "",
        artist: "",
        url: "",
        instrumental_url: "",
        instrumental_notes: ""
    });

    // UI States for Import Setlist
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [importText, setImportText] = useState("");
    const [importSetType, setImportSetType] = useState<'praise' | 'worship' | null>(null);

    // UI States for Import Folder Songs
    const [isImportFolderOpen, setIsImportFolderOpen] = useState(false);
    const [importFolderText, setImportFolderText] = useState("");

    // Unified YouTube ID extractor
    const extractYoutubeId = (url?: string) => {
        if (!url) return null;
        const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
        const match = url.match(regExp);
        const id = (match && match[7].length === 11) ? match[7] : null;

        if (id) return id;

        // Handle shorts
        if (url.includes('/shorts/')) {
            const parts = url.split('/shorts/');
            return parts[1]?.split(/[?&]/)[0];
        }

        return null;
    };

    // Resource Preview Helper (extracts YT thumbnail)
    const getYTThumbnail = (url?: string) => {
        const id = extractYoutubeId(url);
        if (id) return `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
        return null;
    };

    // Instrumental Resource Management States
    const [isAddInstrOpen, setIsAddInstrOpen] = useState(false);
    const [isEditInstrOpen, setIsEditInstrOpen] = useState(false);
    const [editingInstrId, setEditingInstrId] = useState<string | null>(null);
    const [newInstr, setNewInstr] = useState({ title: "", type: "Tutorial", url: "" });
    const [instrToEdit, setInstrToEdit] = useState({ title: "", type: "Tutorial", url: "" });

    // Initial Data Fetch
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [fetchedFolders, fetchedPraise, fetchedWorship, fetchedInfo, fetchedInstr, fetchedEvents] = await Promise.all([
                    choirService.getFolders(),
                    choirService.getWeeklySetlist('praise'),
                    choirService.getWeeklySetlist('worship'),
                    choirService.getAllSetlistInfo(),
                    choirService.getInstrumentalResources(),
                    choirService.getCalendarEvents()
                ]);

                setFolders(fetchedFolders as any);
                setPraiseSet(fetchedPraise as any);
                setWorshipSet(fetchedWorship as any);
                setInstrResources(fetchedInstr);
                setCalendarEvents(fetchedEvents);

                console.log("Choir Data Loaded:", {
                    folders: fetchedFolders,
                    songsTotal: fetchedFolders.reduce((acc, f) => acc + (f.songs?.length || 0), 0),
                    folderDetails: fetchedFolders.map(f => ({ name: f.name, songCount: f.songs?.length || 0, songs: f.songs }))
                });

                if (fetchedInfo['date']) setSetlistDate(new Date(fetchedInfo['date']));
                if (fetchedInfo['praise_desc']) setPraiseInfo(prev => ({ ...prev, desc: fetchedInfo['praise_desc'] }));
                if (fetchedInfo['worship_desc']) setWorshipInfo(prev => ({ ...prev, desc: fetchedInfo['worship_desc'] }));

            } catch (error) {
                console.error("Error fetching choir data:", error);
                toast.error("Failed to load choir data");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Sync state with URL params (Deep Linking)
    useEffect(() => {
        const folderId = searchParams.get('folderId');
        const tab = searchParams.get('tab');

        if (folderId) {
            setActiveFolderId(folderId);
            setActiveTab('vocalists');
        }

        if (tab) {
            if (tab === 'schedule') {
                setIsScheduleOpen(true);
            } else if (['vocalists', 'instrumentalists'].includes(tab)) {
                setActiveTab(tab);
            }
        }
    }, [searchParams]);

    // Refresh library when adding to setlist to ensure dropdown is fresh
    useEffect(() => {
        if (isAddToSetOpen) {
            const refreshLibrary = async () => {
                try {
                    const fetchedFolders = await choirService.getFolders();
                    setFolders(fetchedFolders as any);
                } catch (error) {
                    console.error("Error refreshing folders:", error);
                }
            };
            refreshLibrary();
        }
    }, [isAddToSetOpen]);


    // -- Handlers for Setlist Info --
    const openEditSetInfo = (type: 'praise' | 'worship') => {
        setEditingSetInfoType(type);
        const info = type === 'praise' ? praiseInfo : worshipInfo;
        setTempSetInfo({ ...info });
        setIsEditSetInfoOpen(true);
    };

    const saveSetInfo = async () => {
        if (!editingSetInfoType) return;
        try {
            const key = editingSetInfoType === 'praise' ? 'praise_desc' : 'worship_desc';
            await choirService.updateSetlistInfo(key, tempSetInfo.desc);

            if (editingSetInfoType === 'praise') {
                setPraiseInfo(prev => ({ ...prev, desc: tempSetInfo.desc }));
            } else {
                setWorshipInfo(prev => ({ ...prev, desc: tempSetInfo.desc }));
            }
            setIsEditSetInfoOpen(false);
            toast.success("Description updated");
        } catch (e) {
            console.error(e);
            toast.error("Failed to update description");
        }
    };

    // -- Handlers for Date --
    const handleDateSelect = async (date: Date | undefined) => {
        if (!date) return;
        try {
            setSetlistDate(date);
            await choirService.updateSetlistInfo('date', date.toISOString());
        } catch (e) {
            console.error(e);
            toast.error("Failed to save date");
        }
    };

    // -- Handlers for Folders --
    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;
        try {
            // If activeFolderId is set, this is a subfolder
            const newFolder = await choirService.createFolder(newFolderName, activeFolderId);
            setFolders([...folders, newFolder]);
            setNewFolderName("");
            setIsNewFolderOpen(false);
            toast.success(activeFolderId ? "Subfolder created" : "Folder created");
        } catch (e) {
            console.error(e);
            toast.error("Failed to create folder");
        }
    };

    const handleAddSong = async () => {
        if (!newSong.title.trim() || !activeFolderId) return;
        try {
            const addedSong = await choirService.addSongToFolder({
                folder_id: activeFolderId,
                title: newSong.title,
                key: newSong.key,
                artist: newSong.artist,
                url: newSong.url,
                notes: newSong.notes
            });

            setFolders(folders.map(f => {
                if (f.id === activeFolderId) {
                    return { ...f, songs: [...(f.songs || []), addedSong] };
                }
                return f;
            }) as any);

            setNewSong({ title: "", key: "", artist: "", url: "", notes: "" });
            setIsAddSongOpen(false);
            toast.success("Song added");
        } catch (e) {
            console.error(e);
            toast.error("Failed to add song");
        }
    };

    const deleteFolder = async (id: string) => {
        try {
            await choirService.deleteFolder(id);
            setFolders(folders.filter(f => f.id !== id));
            if (activeFolderId === id) setActiveFolderId(null);
            toast.success("Folder deleted");
        } catch (e) {
            console.error(e);
            toast.error("Failed to delete folder");
        }
    };

    // -- Handlers for Song Edit/Delete (Library) --
    const startEditSong = (song: any) => { // Type as any or Song from service
        setEditingSongId(song.id);
        setSongToEdit({
            title: song.title,
            key: song.key,
            artist: song.artist,
            url: song.url || "",
            notes: song.notes || ""
        });
        setIsEditSongOpen(true);
    };

    const handleSaveEditSong = async () => {
        if (!songToEdit.title.trim() || !activeFolderId || !editingSongId) return;

        try {
            const updatedSong = await choirService.updateSong(editingSongId, {
                title: songToEdit.title,
                key: songToEdit.key,
                artist: songToEdit.artist,
                url: songToEdit.url,
                notes: songToEdit.notes
            });

            setFolders(folders.map(f => {
                if (f.id === activeFolderId) {
                    return {
                        ...f,
                        songs: f.songs?.map(s => s.id === editingSongId ? updatedSong : s) || []
                    };
                }
                return f;
            }) as any);

            setIsEditSongOpen(false);
            setEditingSongId(null);
            toast.success("Song updated");
        } catch (e) {
            console.error(e);
            toast.error("Failed to update song");
        }
    };

    const handleDeleteSong = async (songId: string) => {
        if (!activeFolderId) return;
        try {
            await choirService.deleteSong(songId);
            setFolders(folders.map(f => {
                if (f.id === activeFolderId) {
                    return { ...f, songs: f.songs?.filter(s => s.id !== songId) || [] };
                }
                return f;
            }));
            toast.success("Song deleted");
        } catch (e) {
            console.error(e);
            toast.error("Failed to delete song");
        }
    };

    // -- Handlers for Setlists --
    const openAddSetSong = (type: 'praise' | 'worship') => {
        setActiveSetType(type);
        setNewSetSong({ title: "", key: "", artist: "", url: "" });
        setIsAddToSetOpen(true);
    };

    const handleAddSetSong = async () => {
        if (!newSetSong.title.trim() || !activeSetType) return;
        try {
            const addedSong = await choirService.addWeeklySong({
                set_type: activeSetType,
                title: newSetSong.title,
                key: newSetSong.key,
                artist: newSetSong.artist,
                url: newSetSong.url,
                library_song_id: newSetSong.library_song_id
            });

            if (activeSetType === 'praise') {
                setPraiseSet([...praiseSet, addedSong] as any);
            } else {
                setWorshipSet([...worshipSet, addedSong] as any);
            }

            setIsAddToSetOpen(false);
            toast.success("Song added to setlist");
        } catch (e) {
            console.error(e);
            toast.error("Failed to add song to setlist");
        }
    };

    const removeSetSong = async (type: 'praise' | 'worship', id: string) => {
        try {
            await choirService.deleteWeeklySong(id);
            if (type === 'praise') {
                setPraiseSet(praiseSet.filter(s => s.id !== id));
            } else {
                setWorshipSet(worshipSet.filter(s => s.id !== id));
            }
            toast.success("Song removed from setlist");
        } catch (e) {
            console.error(e);
            toast.error("Failed to remove song");
        }
    };

    // -- Handlers for Edit Setlist Song --
    const startEditSetSong = (type: 'praise' | 'worship', song: WeeklySetSong) => {
        setActiveSetType(type);
        setEditingSetSongId(song.id);
        setEditingSetlistSongData({
            title: song.title,
            key: song.key,
            artist: song.artist,
            url: song.url || "",
            instrumental_url: song.instrumental_url || "",
            instrumental_notes: song.instrumental_notes || ""
        });
        setIsEditSetSongOpen(true);
    };

    const handleSaveEditSetSong = async () => {
        if (!editingSetlistSongData.title.trim() || !activeSetType || !editingSetSongId) return;

        try {
            const updatedSong = await choirService.updateWeeklySong(editingSetSongId, {
                title: editingSetlistSongData.title,
                key: editingSetlistSongData.key,
                artist: editingSetlistSongData.artist,
                url: editingSetlistSongData.url,
                instrumental_url: editingSetlistSongData.instrumental_url,
                instrumental_notes: editingSetlistSongData.instrumental_notes
            });

            const updateList = (list: WeeklySetSong[]) => list.map(s =>
                s.id === editingSetSongId ? updatedSong : s
            );

            if (activeSetType === 'praise') {
                setPraiseSet(updateList(praiseSet) as any);
            } else {
                setWorshipSet(updateList(worshipSet) as any);
            }

            setIsEditSetSongOpen(false);
            setEditingSetSongId(null);
            toast.success("Setlist song updated");
        } catch (e) {
            console.error(e);
            toast.error("Failed to update song");
        }
    };

    const handleImportSetlist = async () => {
        if (!importText.trim() || !importSetType) return;

        const lines = importText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length === 0) return;

        let addedCount = 0;
        let matchedCount = 0;

        try {
            const results = await Promise.all(lines.map(async (line) => {
                // Try to match with library
                const match = allLibrarySongs.find(s => s.title.toLowerCase() === line.toLowerCase());

                const songData = match ? {
                    set_type: importSetType,
                    title: match.title,
                    key: match.key,
                    artist: match.artist || "",
                    url: match.url || "",
                    library_song_id: match.id
                } : {
                    set_type: importSetType,
                    title: line,
                    key: "??",
                    artist: "",
                    url: ""
                };

                if (match) matchedCount++;
                return choirService.addWeeklySong(songData);
            }));

            const newSongs = results as unknown as WeeklySetSong[];
            if (importSetType === 'praise') {
                setPraiseSet(prev => [...prev, ...newSongs]);
            } else {
                setWorshipSet(prev => [...prev, ...newSongs]);
            }

            setIsImportOpen(false);
            setImportText("");
            toast.success(`Imported ${newSongs.length} songs (${matchedCount} matched from library)`);
        } catch (e) {
            console.error(e);
            toast.error("Failed to import some songs");
        }
    };

    const handleImportFolderSongs = async () => {
        if (!importFolderText.trim() || !activeFolderId) return;

        const lines = importFolderText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length === 0) return;

        let matchedCount = 0;

        try {
            const results = await Promise.all(lines.map(async (line) => {
                // Try to match with lyrics in other folders to pre-fill details
                // Exclude current folder to avoid self-match if we were editing (but we are adding new so it's fine)
                const match = allLibrarySongs.find(s => s.title.toLowerCase() === line.toLowerCase());

                const songDetails = match ? {
                    title: match.title,
                    key: match.key || "",
                    artist: match.artist || "",
                    url: match.url || "",
                    notes: match.notes || ""
                } : {
                    title: line,
                    key: "",
                    artist: "",
                    url: "",
                    notes: ""
                };

                if (match) matchedCount++;

                return choirService.addSongToFolder({
                    folder_id: activeFolderId,
                    ...songDetails
                });
            }));

            const newSongs = results as any[]; // Type assertion for the song object

            // Update local state
            setFolders(folders.map(f => {
                if (f.id === activeFolderId) {
                    return { ...f, songs: [...(f.songs || []), ...newSongs] };
                }
                return f;
            }) as any);

            setIsImportFolderOpen(false);
            setImportFolderText("");
            toast.success(`Imported ${newSongs.length} songs to folder (${matchedCount} details matched)`);
        } catch (e) {
            console.error(e);
            toast.error("Failed to import songs to folder");
        }
    };

    // -- Handlers for Instrumental Resources --
    const handleAddInstrResource = async () => {
        if (!newInstr.title.trim()) return;
        try {
            const added = await choirService.addInstrumentalResource(newInstr);
            setInstrResources([...instrResources, added]);
            setNewInstr({ title: "", type: "Tutorial", url: "" });
            setIsAddInstrOpen(false);
            toast.success("Resource added");
        } catch (e) {
            console.error(e);
            toast.error("Failed to add resource");
        }
    };

    const startEditInstrResource = (resource: any) => {
        setEditingInstrId(resource.id);
        setInstrToEdit({ title: resource.title, type: resource.type, url: resource.url || "" });
        setIsEditInstrOpen(true);
    };

    const handleSaveEditInstrResource = async () => {
        if (!editingInstrId || !instrToEdit.title.trim()) return;
        try {
            const updated = await choirService.updateInstrumentalResource(editingInstrId, instrToEdit);
            setInstrResources(instrResources.map(r => r.id === editingInstrId ? updated : r));
            setIsEditInstrOpen(false);
            setEditingInstrId(null);
            toast.success("Resource updated");
        } catch (e) {
            console.error(e);
            toast.error("Failed to update resource");
        }
    };

    const handleDeleteInstrResource = async (id: string) => {
        try {
            await choirService.deleteInstrumentalResource(id);
            setInstrResources(instrResources.filter(r => r.id !== id));
            toast.success("Resource deleted");
        } catch (e) {
            console.error(e);
            toast.error("Failed to delete resource");
        }
    };

    const handleUpdateBandDetails = async (songId: string, updates: { instrumental_url?: string, instrumental_notes?: string }) => {
        try {
            await choirService.updateWeeklySong(songId, updates);
            // Use functional updates to avoid stale closure bugs
            const sync = (list: any[]) => list.map(s => s.id === songId ? { ...s, ...updates } : s);
            setPraiseSet(prev => sync(prev));
            setWorshipSet(prev => sync(prev));
            toast.success("Band details updated");
        } catch (e) {
            console.error(e);
            toast.error("Failed to update band details");
        }
    };

    // -- Handlers for Calendar Events --
    const handleAddCalendarEvent = async () => {
        if (!user || !newEvent.title.trim() || !setlistDate) return;
        try {
            const added = await choirService.addCalendarEvent({
                user_id: user.id,
                title: newEvent.title,
                description: newEvent.description,
                event_date: setlistDate.toISOString().split('T')[0],
                color: newEvent.color
            });
            setCalendarEvents([...calendarEvents, added]);
            setNewEvent({ title: "", description: "", color: "purple" });
            setIsAddEventOpen(false);
            toast.success("Event added to calendar");
        } catch (e) {
            console.error(e);
            toast.error("Failed to add event");
        }
    };

    const handleUpdateCalendarEvent = async () => {
        if (!editingEvent || !newEvent.title.trim()) return;
        try {
            const updated = await choirService.updateCalendarEvent(editingEvent.id, {
                title: newEvent.title,
                description: newEvent.description,
                color: newEvent.color,
                event_date: setlistDate?.toISOString().split('T')[0]
            });
            setCalendarEvents(calendarEvents.map(e => e.id === editingEvent.id ? updated : e));
            setEditingEvent(null);
            setNewEvent({ title: "", description: "", color: "purple" });
            setIsAddEventOpen(false);
            toast.success("Event updated");
        } catch (e) {
            console.error(e);
            toast.error("Failed to update event");
        }
    };

    const handleDeleteCalendarEvent = async (id: string) => {
        try {
            await choirService.deleteCalendarEvent(id);
            setCalendarEvents(calendarEvents.filter(e => e.id !== id));
            toast.success("Event deleted");
        } catch (e) {
            console.error(e);
            toast.error("Failed to delete event");
        }
    };


    const playVideo = (url: string) => {
        try {
            const videoId = extractYoutubeId(url);
            if (videoId) {
                setCurrentVideoUrl(`https://www.youtube.com/embed/${videoId}?autoplay=1`);
            } else {
                window.open(url, "_blank");
            }
        } catch (e) {
            window.open(url, "_blank");
        }
    };

    const activeFolder = folders.find(f => f.id === activeFolderId);

    // Flatten all songs from library for various lookups and selection
    const allLibrarySongs = useMemo(() => {
        return folders.flatMap(f => (f.songs || []).map(s => ({ ...s, folderName: f.name })));
    }, [folders]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-50 dark:from-slate-900 dark:via-blue-900/10 dark:to-slate-900">

            {/* Video Player Modal */}
            <Dialog open={!!currentVideoUrl} onOpenChange={(open) => !open && setCurrentVideoUrl(null)}>
                <DialogContent className="sm:max-w-[800px] p-0 bg-black overflow-hidden border-none text-white">
                    <div className="aspect-video w-full relative">
                        {currentVideoUrl && (
                            <iframe
                                src={currentVideoUrl}
                                title="Song Video"
                                className="absolute inset-0 w-full h-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        )}
                    </div>
                    <div className="p-4 flex justify-end">
                        <Button variant="ghost" className="text-white hover:bg-white/20" onClick={() => setCurrentVideoUrl(null)}>
                            Close Player
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Choir Schedule Modal */}
            <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
                <DialogContent className="w-full h-full max-w-none m-0 rounded-none flex flex-col p-0 bg-white dark:bg-slate-900 overflow-hidden">
                    <DialogHeader className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between space-y-0">
                        <DialogTitle className="text-2xl font-bold flex items-center gap-3 text-slate-900 dark:text-white">
                            <CalendarIcon className="w-6 h-6 text-blue-600" />
                            Choir Schedule
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto py-6 space-y-6 px-4 md:px-20 max-w-4xl mx-auto w-full">
                        {/* Thursday Card */}
                        <div className="bg-blue-50/50 dark:bg-blue-900/10 p-5 rounded-3xl flex gap-4 items-start border border-blue-100/50 dark:border-blue-800/30">
                            <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center shrink-0">
                                <span className="text-blue-600 dark:text-blue-400 font-bold text-sm uppercase">Thu</span>
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Choir Practice</h3>
                                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">6:00 PM</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed pt-1">
                                    Main weekly rehearsal. New songs are introduced here. Please verify keys and parts beforehand.
                                </p>
                            </div>
                        </div>

                        {/* Friday Card */}
                        <div className="bg-blue-50/50 dark:bg-blue-900/10 p-5 rounded-3xl flex gap-4 items-start border border-blue-100/50 dark:border-blue-800/30">
                            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                                <span className="text-blue-600 dark:text-blue-400 font-bold text-sm uppercase">Fri</span>
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Choir Practice</h3>
                                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">5:40 PM</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed pt-1">
                                    Final run-through for Sunday service. Focused on transitions and flow.
                                </p>
                            </div>
                        </div>

                        {/* Sunday Card */}
                        <div className="bg-orange-50/50 dark:bg-orange-900/10 p-5 rounded-3xl flex gap-4 items-start border border-orange-100/50 dark:border-orange-800/30">
                            <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center shrink-0">
                                <span className="text-orange-600 dark:text-orange-400 font-bold text-sm uppercase">Sun</span>
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Soundcheck</h3>
                                <p className="text-lg font-bold text-orange-600 dark:text-orange-400">9:30 AM</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed pt-1">
                                    Mandatory soundcheck for all serving members. Please be on time.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 md:px-20 max-w-4xl mx-auto w-full">
                        <Button
                            onClick={() => setIsScheduleOpen(false)}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-2xl py-6 text-lg font-bold shadow-xl shadow-blue-500/20"
                        >
                            Close Schedule
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>



            {/* Add / Edit Event Dialog */}
            <Dialog open={isAddEventOpen} onOpenChange={setIsAddEventOpen}>
                <DialogContent className="w-full h-full max-w-none m-0 rounded-none flex flex-col p-0 bg-white dark:bg-slate-900 overflow-hidden">
                    <DialogHeader className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between space-y-0">
                        <DialogTitle className="text-2xl font-bold flex items-center gap-3 text-slate-900 dark:text-white">
                            <CalendarIcon className="w-6 h-6 text-blue-600" />
                            {editingEvent ? 'Edit Calendar Note' : 'Add Calendar Note'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto py-4 space-y-4 px-4 md:px-20 max-w-4xl mx-auto w-full">
                        <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">
                            Organize your schedule for {setlistDate ? format(setlistDate, "do MMM yyyy") : "selected day"}.
                        </p>
                        <div className="grid gap-2">
                            <Label htmlFor="title">Title</Label>
                            <Input
                                id="title"
                                placeholder="e.g. Choir Practice"
                                value={newEvent.title}
                                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="description">Notes (Optional)</Label>
                            <Textarea
                                id="description"
                                placeholder="Details about this event..."
                                className="min-h-[100px]"
                                value={newEvent.description}
                                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label className="text-xs">Color Coordinator</Label>
                            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                                {[
                                    { name: 'purple', bg: 'bg-purple-500', label: 'Practice' },
                                    { name: 'blue', bg: 'bg-blue-500', label: 'Event' },
                                    { name: 'orange', bg: 'bg-orange-500', label: 'Urgent' },
                                    { name: 'green', bg: 'bg-green-500', label: 'Notes' },
                                    { name: 'red', bg: 'bg-red-500', label: 'Other' },
                                ].map((c) => (
                                    <button
                                        key={c.name}
                                        type="button"
                                        className={cn(
                                            "flex items-center gap-2 px-3 py-2 rounded-xl border transition-all",
                                            newEvent.color === c.name
                                                ? "bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-slate-700 ring-1 ring-blue-500/20 shadow-sm"
                                                : "border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                        )}
                                        onClick={() => setNewEvent({ ...newEvent, color: c.name })}
                                    >
                                        <div className={cn("w-3 h-3 rounded-full shrink-0", c.bg)} />
                                        <span className={cn(
                                            "text-xs font-semibold",
                                            newEvent.color === c.name ? "text-slate-900 dark:text-white" : "text-slate-500"
                                        )}>{c.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 pt-4 pb-10">
                        <Button
                            onClick={editingEvent ? handleUpdateCalendarEvent : handleAddCalendarEvent}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-4 text-sm font-bold shadow-lg shadow-blue-500/20"
                        >
                            {editingEvent ? 'Save Changes' : 'Add Note'}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setIsAddEventOpen(false)}
                            className="rounded-xl py-4 text-sm font-bold border-slate-200 dark:border-slate-700 h-auto"
                        >
                            Cancel
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Team Roster Modal */}
            <Dialog open={isRosterOpen} onOpenChange={setIsRosterOpen}>
                <DialogContent className="w-full h-full max-w-none m-0 rounded-none flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                            <Users className="w-6 h-6 text-blue-600" />
                            Team Roster
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto py-6 space-y-8 px-4 md:px-20 max-w-4xl mx-auto w-full">

                        {/* Praise & Worship Roster */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 border-b border-purple-100 dark:border-purple-800 pb-2">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg text-blue-600">
                                    <Mic className="w-5 h-5" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Praise & Worship</h3>
                            </div>
                            <div className="grid gap-3">
                                {[
                                    { name: "Rekky" },
                                    { name: "Kido" },
                                    { name: "YP Sodiq" },
                                    { name: "Merit" },
                                    { name: "RP Zainab" }
                                ].map((member, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-sm">
                                        <div className="flex items-center gap-4">
                                            <span className="w-6 h-6 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold">
                                                {i + 1}
                                            </span>
                                            <span className="font-medium text-slate-700 dark:text-slate-200">{member.name}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Prayer Roster */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between border-b border-blue-100 dark:border-blue-800 pb-2">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg text-blue-600">
                                        <Calendar className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Tuesday Prayer</h3>
                                        <p className="text-xs text-blue-600 font-medium">5:30 PM • Zoom</p>
                                    </div>
                                </div>
                                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => window.open("https://us04web.zoom.us/j/77218043569?pwd=6Aj4q1LLCjKio3x7HMod2tStiH0g7s.1", "_blank")}>
                                    <Video className="w-4 h-4 mr-2" />
                                    Join Zoom
                                </Button>
                            </div>
                            <div className="grid gap-3">
                                {[
                                    { name: "Pastor Deji" },
                                    { name: "Rekky" },
                                    { name: "Kido" },
                                    { name: "YP Sodiq" },
                                    { name: "Merit" },
                                    { name: "RP Zainab" }
                                ].map((member, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-sm">
                                        <div className="flex items-center gap-4">
                                            <span className="w-6 h-6 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold">
                                                {i + 1}
                                            </span>
                                            <span className="font-medium text-slate-700 dark:text-slate-200">{member.name}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                    <DialogFooter className="md:justify-center pb-8">
                        <Button size="lg" onClick={() => setIsRosterOpen(false)} className="w-full md:w-auto px-12">Close Roster</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Setlist Info Dialog */}
            <Dialog open={isEditSetInfoOpen} onOpenChange={setIsEditSetInfoOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit {editingSetInfoType === 'praise' ? 'Praise' : 'Worship'} Description</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Description / Subtitle</Label>
                            <Input
                                placeholder="e.g. High Energy • 140 BPM"
                                value={tempSetInfo.desc}
                                onChange={(e) => setTempSetInfo({ ...tempSetInfo, desc: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={saveSetInfo} className="bg-blue-600 text-white">Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog >

            {/* Add Setlist Song Dialog */}
            < Dialog open={isAddToSetOpen} onOpenChange={setIsAddToSetOpen} >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add to {activeSetType === 'praise' ? 'Praise' : 'Worship'} Set</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Select from Library (Optional)</Label>
                            <Select
                                onValueChange={(val) => {
                                    console.log('Selected value:', val);
                                    const song = allLibrarySongs.find(s => s.id === val);
                                    if (song) {
                                        setNewSetSong({
                                            title: song.title,
                                            key: song.key || "",
                                            artist: song.artist || "",
                                            url: song.url || "",
                                            library_song_id: song.id
                                        });
                                    }
                                }}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder={allLibrarySongs.length === 0 ? "Library is empty" : "Quick select a song..."} />
                                </SelectTrigger>
                                <SelectContent position="popper" sideOffset={5} className="max-h-[300px] z-[9999] max-w-[calc(100vw-2rem)] md:max-w-md">
                                    {allLibrarySongs.length > 0 ? (
                                        allLibrarySongs.map(s => (
                                            <SelectItem key={s.id} value={s.id} className="max-w-full">
                                                <div className="flex flex-col gap-0.5 w-full overflow-hidden">
                                                    <span className="truncate font-medium">
                                                        {s.title} {s.artist && `(${s.artist})`}
                                                    </span>
                                                    <span className="truncate text-xs text-slate-500">
                                                        {s.folderName}
                                                    </span>
                                                </div>
                                            </SelectItem>
                                        ))
                                    ) : (
                                        <div className="p-4 text-center text-xs text-slate-400">
                                            No songs found in library. Add songs to folders in the Vocalist Library section below.
                                        </div>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="relative py-2">
                            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-100 dark:border-slate-800"></span></div>
                            <div className="relative flex justify-center text-[10px] uppercase font-bold"><span className="bg-white dark:bg-slate-900 px-2 text-slate-400">Or enter manually</span></div>
                        </div>

                        <div className="space-y-2">
                            <Label>Song Title</Label>
                            <Input
                                placeholder="e.g. Way Maker"
                                value={newSetSong.title}
                                onChange={(e) => setNewSetSong({ ...newSetSong, title: e.target.value, library_song_id: undefined })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Key</Label>
                                <Input
                                    placeholder="e.g. G"
                                    value={newSetSong.key}
                                    onChange={(e) => setNewSetSong({ ...newSetSong, key: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Artist</Label>
                                <Input
                                    placeholder="e.g. Sinach"
                                    value={newSetSong.artist}
                                    onChange={(e) => setNewSetSong({ ...newSetSong, artist: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Video/Audio URL (Optional)</Label>
                            <Input
                                placeholder="https://youtube.com/..."
                                value={newSetSong.url}
                                onChange={(e) => setNewSetSong({ ...newSetSong, url: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleAddSetSong} className="bg-blue-600 text-white">Add to Set</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog >

            {/* Import Setlist Dialog */}
            <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
                <DialogContent className="w-full h-full max-w-none m-0 rounded-none flex flex-col p-0 bg-white dark:bg-slate-900 overflow-hidden">
                    <DialogHeader className="p-6 border-b border-slate-100 dark:border-slate-800">
                        <DialogTitle className="text-2xl font-bold flex items-center gap-3 text-slate-900 dark:text-white">
                            <Download className="w-6 h-6 text-blue-600" />
                            Import from Notes
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto py-6 space-y-6 px-4 md:px-20 max-w-4xl mx-auto w-full">
                        <div className="space-y-4">
                            <p className="text-slate-500 dark:text-slate-400 font-medium">
                                Paste a list of songs from your notes app (one song per line). We'll try to find matches in your library.
                            </p>
                            <Textarea
                                placeholder="Way Maker&#10;Goodness of God&#10;Agnes Dei"
                                className="min-h-[400px] font-mono text-lg p-6 rounded-3xl border-purple-100 dark:border-purple-800/50 focus-visible:ring-purple-500 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 shadow-inner"
                                value={importText}
                                onChange={(e) => setImportText(e.target.value)}
                            />
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 pt-4 pb-20">
                            <Button
                                onClick={handleImportSetlist}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl py-8 text-xl font-bold shadow-xl shadow-blue-500/20"
                                disabled={!importText.trim()}
                            >
                                Import {importText.split('\n').filter(l => l.trim()).length} Songs
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setIsImportOpen(false)}
                                className="rounded-2xl py-8 text-xl font-bold border-slate-200 dark:border-slate-700 h-auto"
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Edit Setlist Song Dialog */}
            < Dialog open={isEditSetSongOpen} onOpenChange={setIsEditSetSongOpen} >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Song</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Song Title</Label>
                            <Input
                                placeholder="e.g. Way Maker"
                                value={editingSetlistSongData.title}
                                onChange={(e) => setEditingSetlistSongData({ ...editingSetlistSongData, title: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Key</Label>
                                <Input
                                    placeholder="e.g. G"
                                    value={editingSetlistSongData.key}
                                    onChange={(e) => setEditingSetlistSongData({ ...editingSetlistSongData, key: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Artist</Label>
                                <Input
                                    placeholder="e.g. Sinach"
                                    value={editingSetlistSongData.artist}
                                    onChange={(e) => setEditingSetlistSongData({ ...editingSetlistSongData, artist: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Video/Audio URL</Label>
                            <Input
                                placeholder="https://youtube.com/..."
                                value={editingSetlistSongData.url}
                                onChange={(e) => setEditingSetlistSongData({ ...editingSetlistSongData, url: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleSaveEditSetSong} className="bg-blue-600 text-white">Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog >

            {/* Edit Library Song Dialog */}
            < Dialog open={isEditSongOpen} onOpenChange={setIsEditSongOpen} >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Song Details</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Song Title</Label>
                            <Input
                                placeholder="e.g. Goodness of God"
                                value={songToEdit.title}
                                onChange={(e) => setSongToEdit({ ...songToEdit, title: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Key</Label>
                                <Input
                                    placeholder="e.g. A"
                                    value={songToEdit.key}
                                    onChange={(e) => setSongToEdit({ ...songToEdit, key: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Artist (Optional)</Label>
                                <Input
                                    placeholder="e.g. CeCe Winans"
                                    value={songToEdit.artist}
                                    onChange={(e) => setSongToEdit({ ...songToEdit, artist: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>YouTube/Audio Link</Label>
                            <Input
                                placeholder="https://..."
                                value={songToEdit.url}
                                onChange={(e) => setSongToEdit({ ...songToEdit, url: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Notes</Label>
                            <Textarea
                                placeholder="Add notes about structure, harmonies, etc."
                                value={songToEdit.notes}
                                onChange={(e) => setSongToEdit({ ...songToEdit, notes: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleSaveEditSong} className="bg-blue-600 text-white">Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog >

            {/* Hero Header */}
            < div className="relative h-auto md:h-[300px] overflow-hidden pb-8 pt-20 md:pt-0" > {/* Adjusted height/padding for mobile */}
                < div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-blue-500 opacity-90" ></div >
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1516280440614-6697288d5d38?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center mix-blend-overlay"></div>
                <div className="absolute inset-0 bg-black/20"></div>

                <div className="relative h-full container mx-auto px-4 flex flex-col justify-end pb-8">
                    <div className="flex justify-between items-start mb-4">  {/* Back Button Container */}
                        <Button
                            variant="ghost"
                            className="text-white/80 hover:text-white hover:bg-white/10 w-fit pl-0"
                            onClick={() => navigate(-1)}
                        >
                            <ArrowLeft className="w-5 h-5 mr-2" />
                            Back to Groups
                        </Button>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6"> {/* Mobile Responsive Layout */}
                        <div>
                            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 tracking-tight">
                                The Power House Choir
                            </h1>
                            <p className="text-blue-100 text-lg md:text-xl font-medium max-w-2xl">
                                Leading the congregation in spirit and truth.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-3"> {/* Buttons visible on all screens */}
                            <Button
                                className="bg-white text-blue-600 hover:bg-blue-50 hover:text-blue-700 shadow-lg border-none flex-1 md:flex-none font-bold"
                                onClick={() => setIsScheduleOpen(true)}
                            >
                                <Calendar className="w-4 h-4 mr-2" />
                                Schedule
                            </Button>
                            <Button
                                className="bg-blue-500/30 text-white hover:bg-blue-500/40 backdrop-blur-md border border-white/20 flex-1 md:flex-none"
                                onClick={() => setIsRosterOpen(true)}
                            >
                                <Users className="w-4 h-4 mr-2" />
                                Team Roster
                            </Button>
                        </div>
                    </div>
                </div>
            </div >

            {/* Main Content */}
            < div id="main-content" className="container mx-auto px-4 py-8 -mt-6 relative z-10" >
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <div className="flex justify-center mb-8">
                        <TabsList className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-1.5 rounded-full shadow-lg border border-blue-100 dark:border-blue-900/30 h-auto">
                            <TabsTrigger
                                value="vocalists"
                                className="rounded-full px-8 py-3 text-sm font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all data-[state=active]:shadow-md"
                            >
                                <Mic className="w-4 h-4 mr-2" />
                                Vocalists
                            </TabsTrigger>
                            <TabsTrigger
                                value="instrumentalists"
                                className="rounded-full px-8 py-3 text-sm font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all data-[state=active]:shadow-md"
                            >
                                <Music className="w-4 h-4 mr-2" />
                                Instrumentalists
                            </TabsTrigger>

                        </TabsList>
                    </div>

                    <TabsContent value="vocalists" className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">



                        {/* SPLIT SETLIST SECTION */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg md:text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center">
                                    <ListMusic className="w-6 h-6 mr-3 text-blue-600" />
                                    This Week's Setlist
                                </h2>

                                {/* Date Picker Popover */}
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                "h-12 rounded-2xl border-blue-200 text-blue-600 bg-blue-50/50 hover:bg-blue-100 pl-4 text-left font-bold shadow-sm",
                                                !setlistDate && "text-muted-foreground"
                                            )}
                                        >
                                            {setlistDate ? (
                                                format(setlistDate, "do MMM yyyy")
                                            ) : (
                                                <span>Select Service Date</span>
                                            )}
                                            <CalendarIcon className="ml-3 h-5 w-5 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="end">
                                        <CalendarComponent
                                            mode="single"
                                            selected={setlistDate}
                                            onSelect={handleDateSelect}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                {/* Praise Set */}
                                <Card className="border-none shadow-lg bg-blue-50/50 dark:bg-blue-900/10 border-t-4 border-blue-500">
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <div className="space-y-1">
                                            <CardTitle className="text-blue-700 dark:text-blue-400 flex items-center">
                                                <PlayCircle className="w-5 h-5 mr-2" />
                                                {praiseInfo.title}
                                            </CardTitle>
                                            <div className="flex items-center gap-2 group cursor-pointer" onClick={() => openEditSetInfo('praise')}>
                                                <CardDescription className="cursor-pointer group-hover:text-orange-600 transition-colors">
                                                    {praiseInfo.desc}
                                                </CardDescription>
                                                <Edit3 className="w-3 h-3 text-slate-400 group-hover:text-orange-600 opacity-0 group-hover:opacity-100 transition-all" />
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button size="icon" variant="ghost" className="text-orange-600 hover:bg-orange-100/50" onClick={() => {
                                                setImportSetType('praise');
                                                setIsImportOpen(true);
                                            }}>
                                                <Download className="w-5 h-5" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="text-orange-600 hover:bg-orange-100/50" onClick={() => openAddSetSong('praise')}>
                                                <Plus className="w-5 h-5" />
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-3 pt-4">
                                        {praiseSet.map((song, i) => (
                                            <div key={song.id} className="flex items-center justify-between p-3 bg-white/60 dark:bg-slate-800/60 rounded-xl shadow-sm group">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-blue-500 font-bold w-4">{i + 1}</span>
                                                    <div>
                                                        <p className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                                            {song.title}
                                                            {song.url && (
                                                                <Badge
                                                                    variant="secondary"
                                                                    className="bg-blue-100 text-blue-600 hover:bg-blue-200 cursor-pointer flex items-center gap-1 py-0 px-1.5 h-4 text-[10px]"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        playVideo(song.url!);
                                                                    }}
                                                                >
                                                                    <PlayCircle className="w-2.5 h-2.5" /> Play
                                                                </Badge>
                                                            )}
                                                        </p>
                                                        <p className="text-xs text-slate-500">{song.artist}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                                                        {song.key}
                                                    </Badge>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <MoreVertical className="w-4 h-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent>
                                                            <DropdownMenuItem onClick={() => startEditSetSong('praise', song)}>
                                                                <Pencil className="w-4 h-4 mr-2" /> Edit
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem className="text-red-600" onClick={() => removeSetSong('praise', song.id)}>
                                                                <Trash2 className="w-4 h-4 mr-2" /> Remove
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </div>
                                        ))}
                                        {praiseSet.length === 0 && (
                                            <p className="text-center text-sm text-slate-400 py-4 italic">No songs added yet.</p>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Worship Set */}
                                <Card className="border-none shadow-lg bg-blue-50/50 dark:bg-blue-900/10 border-t-4 border-blue-500">
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <div className="space-y-1">
                                            <CardTitle className="text-blue-700 dark:text-blue-400 flex items-center">
                                                <Heart className="w-5 h-5 mr-2" />
                                                {worshipInfo.title}
                                            </CardTitle>
                                            <div className="flex items-center gap-2 group cursor-pointer" onClick={() => openEditSetInfo('worship')}>
                                                <CardDescription className="cursor-pointer group-hover:text-blue-600 transition-colors">
                                                    {worshipInfo.desc}
                                                </CardDescription>
                                                <Edit3 className="w-3 h-3 text-slate-400 group-hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-all" />
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button size="icon" variant="ghost" className="text-blue-600 hover:bg-blue-100/50" onClick={() => {
                                                setImportSetType('worship');
                                                setIsImportOpen(true);
                                            }}>
                                                <Download className="w-5 h-5" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="text-blue-600 hover:bg-blue-100/50" onClick={() => openAddSetSong('worship')}>
                                                <Plus className="w-5 h-5" />
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-3 pt-4">
                                        {worshipSet.map((song, i) => (
                                            <div key={song.id} className="flex items-center justify-between p-3 bg-white/60 dark:bg-slate-800/60 rounded-xl shadow-sm group">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-blue-500 font-bold w-4">{i + 1}</span>
                                                    <div>
                                                        <p className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                                            {song.title}
                                                            {song.url && (
                                                                <Badge
                                                                    variant="secondary"
                                                                    className="bg-blue-100 text-blue-600 hover:bg-blue-200 cursor-pointer flex items-center gap-1 py-0 px-1.5 h-4 text-[10px]"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        playVideo(song.url!);
                                                                    }}
                                                                >
                                                                    <PlayCircle className="w-2.5 h-2.5" /> Play
                                                                </Badge>
                                                            )}
                                                        </p>
                                                        <p className="text-xs text-slate-500">{song.artist}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                                                        {song.key}
                                                    </Badge>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <MoreVertical className="w-4 h-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent>
                                                            <DropdownMenuItem onClick={() => startEditSetSong('worship', song)}>
                                                                <Pencil className="w-4 h-4 mr-2" /> Edit
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem className="text-red-600" onClick={() => removeSetSong('worship', song.id)}>
                                                                <Trash2 className="w-4 h-4 mr-2" /> Remove
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </div>
                                        ))}
                                        {worshipSet.length === 0 && (
                                            <p className="text-center text-sm text-slate-400 py-4 italic">No songs added yet.</p>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </div>

                        {/* INTERACTIVE LIBRARY SECTION */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center">
                                    <BookOpen className="w-6 h-6 mr-3 text-blue-600" />
                                    Vocalist Library
                                </h2>
                            </div>

                            <Card className="border-none shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-md min-h-[400px] flex flex-col">
                                <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800">
                                    <div className="flex items-center gap-2">
                                        <FolderOpen className="w-5 h-5 text-blue-500" />
                                        {activeFolderId ? (
                                            <div className="flex items-center gap-1 overflow-hidden">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setActiveFolderId(null)}
                                                    className="text-slate-500 hover:text-blue-600 h-7 px-2 text-xs"
                                                >
                                                    Library
                                                </Button>
                                                <span className="text-slate-300">/</span>
                                                <span className="font-semibold text-blue-600 truncate max-w-[150px]">{activeFolder?.name}</span>
                                            </div>
                                        ) : (
                                            <span className="font-semibold text-slate-700 dark:text-slate-200 pl-2">Folders</span>
                                        )}
                                    </div>

                                    <div className="flex gap-2 shrink-0">
                                        <Dialog open={isNewFolderOpen} onOpenChange={setIsNewFolderOpen}>
                                            <DialogTrigger asChild>
                                                <Button size="sm" variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50">
                                                    <Folder className="w-4 h-4 sm:mr-2" />
                                                    <span className="hidden sm:inline">New Folder</span>
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>Create New {activeFolderId ? "Subfolder" : "Folder"}</DialogTitle>
                                                </DialogHeader>
                                                <div className="py-4">
                                                    <Label>Folder Name</Label>
                                                    <Input
                                                        placeholder="e.g. Wedding Set"
                                                        className="mt-2"
                                                        value={newFolderName}
                                                        onChange={(e) => setNewFolderName(e.target.value)}
                                                    />
                                                </div>
                                                <DialogFooter>
                                                    <Button onClick={handleCreateFolder} className="bg-blue-600 text-white">Create</Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>

                                        {activeFolderId && (
                                            <div className="flex gap-2">
                                                <Dialog open={isImportFolderOpen} onOpenChange={setIsImportFolderOpen}>
                                                    <DialogTrigger asChild>
                                                        <Button size="sm" variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50">
                                                            <Download className="w-4 h-4 sm:mr-2" />
                                                            <span className="hidden sm:inline">Import</span>
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="w-full h-full max-w-none m-0 rounded-none flex flex-col p-0 bg-white dark:bg-slate-900 overflow-hidden">
                                                        <DialogHeader className="p-6 border-b border-slate-100 dark:border-slate-800">
                                                            <DialogTitle className="text-2xl font-bold flex items-center gap-3 text-slate-900 dark:text-white">
                                                                <Download className="w-6 h-6 text-blue-600" />
                                                                Import Songs to Folder
                                                            </DialogTitle>
                                                        </DialogHeader>

                                                        <div className="flex-1 overflow-y-auto py-6 space-y-6 px-4 md:px-20 max-w-4xl mx-auto w-full">
                                                            <div className="space-y-4">
                                                                <p className="text-slate-500 dark:text-slate-400 font-medium">
                                                                    Paste a list of songs (one song per line). We'll try to find matches in your library to pre-fill details.
                                                                </p>
                                                                <Textarea
                                                                    placeholder="Way Maker&#10;Goodness of God&#10;Agnes Dei"
                                                                    className="min-h-[400px] font-mono text-lg p-6 rounded-3xl border-blue-100 dark:border-blue-800/50 focus-visible:ring-blue-500 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 shadow-inner"
                                                                    value={importFolderText}
                                                                    onChange={(e) => setImportFolderText(e.target.value)}
                                                                />
                                                            </div>

                                                            <div className="flex flex-col sm:flex-row gap-4 pt-4 pb-20">
                                                                <Button
                                                                    onClick={handleImportFolderSongs}
                                                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl py-8 text-xl font-bold shadow-xl shadow-blue-500/20"
                                                                    disabled={!importFolderText.trim()}
                                                                >
                                                                    Import {importFolderText.split('\n').filter(l => l.trim()).length} Songs
                                                                </Button>
                                                                <Button
                                                                    variant="outline"
                                                                    onClick={() => setIsImportFolderOpen(false)}
                                                                    className="rounded-2xl py-8 text-xl font-bold border-slate-200 dark:border-slate-700 h-auto"
                                                                >
                                                                    Cancel
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </DialogContent>
                                                </Dialog>

                                                <Dialog open={isAddSongOpen} onOpenChange={setIsAddSongOpen}>
                                                    <DialogTrigger asChild>
                                                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white shadow-md">
                                                            <Plus className="w-4 h-4 sm:mr-2" />
                                                            <span className="hidden sm:inline">Add Song</span>
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent>
                                                        <DialogHeader>
                                                            <DialogTitle>Add Song to {activeFolder?.name}</DialogTitle>
                                                        </DialogHeader>
                                                        <div className="space-y-4 py-4">
                                                            <div className="space-y-2">
                                                                <Label>Song Title</Label>
                                                                <Input
                                                                    placeholder="e.g. Goodness of God"
                                                                    value={newSong.title}
                                                                    onChange={(e) => setNewSong({ ...newSong, title: e.target.value })}
                                                                />
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div className="space-y-2">
                                                                    <Label>Key</Label>
                                                                    <Input
                                                                        placeholder="e.g. A"
                                                                        value={newSong.key}
                                                                        onChange={(e) => setNewSong({ ...newSong, key: e.target.value })}
                                                                    />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <Label>Artist (Optional)</Label>
                                                                    <Input
                                                                        placeholder="e.g. CeCe Winans"
                                                                        value={newSong.artist}
                                                                        onChange={(e) => setNewSong({ ...newSong, artist: e.target.value })}
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label>YouTube/Audio Link</Label>
                                                                <Input
                                                                    placeholder="https://..."
                                                                    value={newSong.url}
                                                                    onChange={(e) => setNewSong({ ...newSong, url: e.target.value })}
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label>Notes</Label>
                                                                <Textarea
                                                                    placeholder="Add notes about structure, harmonies, etc."
                                                                    value={newSong.notes}
                                                                    onChange={(e) => setNewSong({ ...newSong, notes: e.target.value })}
                                                                />
                                                            </div>
                                                        </div>
                                                        <DialogFooter>
                                                            <Button onClick={handleAddSong} className="bg-blue-600 text-white">Save Song</Button>
                                                        </DialogFooter>
                                                    </DialogContent>
                                                </Dialog>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <CardContent className="p-6 flex-1 overflow-y-auto">
                                    {!activeFolderId ? (
                                        // Folder Grid View (Root only)
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {folders.filter(f => !f.parent_id).map(folder => (
                                                <div
                                                    key={folder.id}
                                                    onClick={() => setActiveFolderId(folder.id)}
                                                    className="bg-white dark:bg-slate-700/50 p-4 rounded-xl border border-slate-200 dark:border-slate-600 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-500 transition-all cursor-pointer group flex flex-col items-center text-center gap-3 relative"
                                                >
                                                    <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center text-blue-300 group-hover:text-blue-600 group-hover:bg-blue-100 transition-colors">
                                                        <FolderOpen className="w-8 h-8" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold text-slate-800 dark:text-slate-100">{folder.name}</h3>
                                                        <p className="text-xs text-slate-400">
                                                            {(folder.songs?.length || 0) + (folders.filter(f => f.parent_id === folder.id).length)} items
                                                        </p>
                                                    </div>

                                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button size="icon" variant="ghost" className="h-6 w-6">
                                                                    <MoreVertical className="w-4 h-4 text-slate-400" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent>
                                                                <DropdownMenuItem className="text-red-600" onClick={() => deleteFolder(folder.id)}>
                                                                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                </div>
                                            ))}
                                            {folders.filter(f => !f.parent_id).length === 0 && (
                                                <div className="col-span-full py-12 text-center text-slate-400">
                                                    <Folder className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                                    <p>No folders yet. Create one to organize your songs!</p>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        // Active Folder View: Show Subfolders AND Songs
                                        <div className="space-y-6">
                                            {/* Subfolders if any */}
                                            {folders.filter(f => f.parent_id === activeFolderId).length > 0 && (
                                                <div className="space-y-3">
                                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Subfolders</h4>
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                        {folders.filter(f => f.parent_id === activeFolderId).map(folder => (
                                                            <div
                                                                key={folder.id}
                                                                onClick={() => setActiveFolderId(folder.id)}
                                                                className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group flex flex-col items-center text-center gap-2 relative"
                                                            >
                                                                <FolderOpen className="w-8 h-8 text-blue-400 group-hover:text-blue-600" />
                                                                <div>
                                                                    <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-100">{folder.name}</h3>
                                                                    <p className="text-[10px] text-slate-400">
                                                                        {(folder.songs?.length || 0) + (folders.filter(f => f.parent_id === folder.id).length)} items
                                                                    </p>
                                                                </div>
                                                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                                                    <DropdownMenu>
                                                                        <DropdownMenuTrigger asChild>
                                                                            <Button size="icon" variant="ghost" className="h-5 w-5">
                                                                                <MoreVertical className="w-3 h-3 text-slate-400" />
                                                                            </Button>
                                                                        </DropdownMenuTrigger>
                                                                        <DropdownMenuContent>
                                                                            <DropdownMenuItem className="text-red-600" onClick={() => deleteFolder(folder.id)}>
                                                                                <Trash2 className="w-4 h-4 mr-2" /> Delete
                                                                            </DropdownMenuItem>
                                                                        </DropdownMenuContent>
                                                                    </DropdownMenu>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Songs List */}
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Songs</h4>
                                                </div>
                                                {!activeFolder?.songs || activeFolder.songs.length === 0 ? (
                                                    <div className="text-center py-12 text-slate-400">
                                                        <Music className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                                        <p>This folder is empty. Add your first song!</p>
                                                    </div>
                                                ) : (
                                                    activeFolder.songs.map((song) => (
                                                        <div key={song.id} className="bg-white dark:bg-slate-700/30 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50 hover:shadow-md transition-all flex items-start justify-between group">
                                                            <div className="flex items-start gap-4">
                                                                <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500 font-bold shrink-0 mt-1">
                                                                    {song.key}
                                                                </div>
                                                                <div>
                                                                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">{song.title}</h3>
                                                                    <div className="flex items-center gap-2 text-sm text-slate-500">
                                                                        <span className="font-medium">{song.artist}</span>
                                                                        {song.url && (
                                                                            <Badge
                                                                                variant="secondary"
                                                                                className="bg-red-50 text-red-600 hover:bg-red-100 cursor-pointer flex items-center gap-1 py-0 px-2 h-5"
                                                                                onClick={() => playVideo(song.url!)}
                                                                            >
                                                                                <PlayCircle className="w-3 h-3" /> Play
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                    {song.notes && (
                                                                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 bg-yellow-50 dark:bg-yellow-900/10 p-2 rounded-lg border border-yellow-100 dark:border-yellow-900/30">
                                                                            📝 {song.notes}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <DropdownMenu>
                                                                    <DropdownMenuTrigger asChild>
                                                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400">
                                                                            <MoreVertical className="w-4 h-4" />
                                                                        </Button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent>
                                                                        <DropdownMenuItem onClick={() => {
                                                                            setNewSetSong({
                                                                                title: song.title,
                                                                                key: song.key || "",
                                                                                artist: song.artist || "",
                                                                                url: song.url || "",
                                                                                library_song_id: song.id
                                                                            });
                                                                            setIsAddToSetOpen(true);
                                                                            setActiveSetType('praise'); // Default or let them choose
                                                                        }}>
                                                                            <PlusCircle className="w-4 h-4 mr-2" /> Add to Setlist
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuItem onClick={() => startEditSong(song)}>
                                                                            <Pencil className="w-4 h-4 mr-2" /> Edit
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteSong(song.id)}>
                                                                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                                                                        </DropdownMenuItem>
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                    </TabsContent>

                    <TabsContent value="instrumentalists" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Tutorials & Resources</h2>
                            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setIsAddInstrOpen(true)}>
                                <Plus className="w-4 h-4 mr-2" /> Add Resource
                            </Button>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {instrResources.length === 0 ? (
                                <div className="col-span-full py-12 text-center text-slate-400 bg-white/50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                                    <Video className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                    <p>No resources yet. Add tutorials for the band!</p>
                                </div>
                            ) : (
                                instrResources.map((resource) => (
                                    <Card key={resource.id} className="group hover:shadow-xl transition-all duration-300 border-none shadow-md bg-white/80 dark:bg-slate-800/80 overflow-hidden relative">
                                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button size="icon" variant="secondary" className="h-8 w-8 bg-white/90 dark:bg-slate-800/90 shadow-sm">
                                                        <MoreVertical className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent>
                                                    <DropdownMenuItem onClick={() => startEditInstrResource(resource)}>
                                                        <Pencil className="w-4 h-4 mr-2" /> Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteInstrResource(resource.id)}>
                                                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>

                                        <div
                                            className="h-32 bg-slate-100 dark:bg-slate-700 flex items-center justify-center group-hover:bg-blue-50 dark:group-hover:bg-blue-900/10 transition-colors cursor-pointer relative"
                                            onClick={() => resource.url && playVideo(resource.url)}
                                        >
                                            {getYTThumbnail(resource.url) ? (
                                                <div className="w-full h-full relative">
                                                    <img src={getYTThumbnail(resource.url)!} alt="" className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" />
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <PlayCircle className="w-12 h-12 text-white drop-shadow-lg" />
                                                    </div>
                                                </div>
                                            ) : (
                                                <Video className="w-10 h-10 text-slate-400 group-hover:text-blue-500 transition-colors" />
                                            )}
                                        </div>
                                        <CardContent className="p-4">
                                            <Badge variant="secondary" className="mb-2 text-xs font-normal">
                                                {resource.type}
                                            </Badge>
                                            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-1 group-hover:text-blue-600 transition-colors truncate">
                                                {resource.title}
                                            </h3>
                                            <p className="text-xs text-slate-500">
                                                {new Date(resource.created_at).toLocaleDateString()}
                                            </p>
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </div>

                        {/* Band Weekly Setlist Section */}
                        <div className="space-y-4">
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                <ListMusic className="w-6 h-6 text-blue-500" />
                                Band Setlist View
                            </h2>
                            <p className="text-slate-500 text-sm">Chord charts, dynamics, and band-specific instructions for this week.</p>

                            <div className="grid lg:grid-cols-2 gap-6">
                                {/* Praise Set for Band */}
                                <Card className="border-none shadow-lg bg-white/90 dark:bg-slate-800/90 overflow-hidden">
                                    <div className="bg-blue-600 p-4 text-white">
                                        <h3 className="font-bold flex items-center gap-2">
                                            <Zap className="w-5 h-5 fill-current" /> Praise Set
                                        </h3>
                                    </div>
                                    <CardContent className="p-4 space-y-4">
                                        {praiseSet.length === 0 ? (
                                            <p className="text-center py-8 text-slate-400">No songs in praise set</p>
                                        ) : (
                                            praiseSet.map((song) => (
                                                <BandSongCard key={song.id} song={song} allLibrarySongs={allLibrarySongs} onUpdate={handleUpdateBandDetails} />
                                            ))
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Worship Set for Band */}
                                <Card className="border-none shadow-lg bg-white/90 dark:bg-slate-800/90 overflow-hidden">
                                    <div className="bg-indigo-700 p-4 text-white">
                                        <h3 className="font-bold flex items-center gap-2">
                                            <Waves className="w-5 h-5" /> Worship Set
                                        </h3>
                                    </div>
                                    <CardContent className="p-4 space-y-4">
                                        {worshipSet.length === 0 ? (
                                            <p className="text-center py-8 text-slate-400">No songs in worship set</p>
                                        ) : (
                                            worshipSet.map((song) => (
                                                <BandSongCard key={song.id} song={song} allLibrarySongs={allLibrarySongs} onUpdate={handleUpdateBandDetails} />
                                            ))
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </div>

                    </TabsContent>

                </Tabs>

                {/* SHARED STRATEGIC PLANNER SECTION */}
                <div className="mt-20 pt-12 border-t border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <section className="space-y-8">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <h2 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center">
                                    <Calendar className="w-8 h-8 mr-3 text-amber-500" />
                                    Planner
                                </h2>
                                <p className="text-slate-500 font-medium">Strategic goals and daily coordination for the entire team.</p>
                            </div>
                            <Button
                                onClick={() => {
                                    setEditingEvent(null);
                                    setNewEvent({ title: "", description: "", color: "purple" });
                                    setIsAddEventOpen(true);
                                }}
                                className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl px-8 py-6 h-auto shadow-xl shadow-blue-500/20 font-bold"
                            >
                                <Plus className="w-5 h-5 mr-2" /> Add New Note
                            </Button>
                        </div>

                        <Card className="border-none shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] overflow-hidden bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/20 dark:border-slate-800 rounded-[3rem]">
                            <div className="grid md:grid-cols-12 gap-0 overflow-hidden">
                                {/* Sidebar Calendar */}
                                <div className="md:col-span-5 p-10 bg-slate-50/50 dark:bg-slate-800/40 border-r border-slate-100 dark:border-slate-800 flex flex-col items-center justify-start">
                                    <CalendarComponent
                                        mode="single"
                                        selected={setlistDate}
                                        onSelect={setSetlistDate}
                                        className="rounded-3xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl p-6 mx-auto scale-110 origin-top"
                                        modifiers={{
                                            hasEvent: (date) => calendarEvents.some(e => e.event_date === format(date, "yyyy-MM-dd"))
                                        }}
                                        modifiersStyles={{
                                            hasEvent: {
                                                fontWeight: 'bold',
                                                textDecoration: 'underline'
                                            }
                                        }}
                                        components={{
                                            DayContent: ({ date, ...props }) => {
                                                const dayEvents = calendarEvents.filter(e => e.event_date === format(date, "yyyy-MM-dd"));
                                                return (
                                                    <div className="relative w-full h-full flex items-center justify-center">
                                                        <span className="relative z-10">{date.getDate()}</span>
                                                        {dayEvents.length > 0 && (
                                                            <div className="absolute bottom-1 flex gap-0.5 justify-center w-full">
                                                                {dayEvents.slice(0, 3).map((e, i) => (
                                                                    <div
                                                                        key={i}
                                                                        className={cn(
                                                                            "w-1 h-1 rounded-full",
                                                                            e.color === 'purple' ? 'bg-purple-500' :
                                                                                e.color === 'blue' ? 'bg-blue-500' :
                                                                                    e.color === 'green' ? 'bg-green-500' :
                                                                                        e.color === 'orange' ? 'bg-orange-500' :
                                                                                            'bg-red-500'
                                                                        )}
                                                                    />
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            }
                                        }}
                                    />

                                    <div className="mt-12 space-y-6 w-full max-w-[280px]">
                                        <h4 className="text-xs font-black uppercase text-slate-600 dark:text-slate-300 tracking-[0.2em] text-center">Categories</h4>
                                        <div className="flex flex-wrap gap-3 justify-center">
                                            <button
                                                onClick={() => setSelectedCategory(selectedCategory === 'purple' ? null : 'purple')}
                                                className={cn(
                                                    "flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all",
                                                    selectedCategory === 'purple'
                                                        ? "bg-purple-600 border-purple-600 text-white shadow-lg shadow-purple-500/20 scale-105"
                                                        : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-purple-300"
                                                )}
                                            >
                                                <div className={cn("w-2 h-2 rounded-full", selectedCategory === 'purple' ? "bg-white" : "bg-purple-500")} />
                                                <span className="text-[10px] font-bold uppercase tracking-wider">Practice</span>
                                            </button>
                                            <button
                                                onClick={() => setSelectedCategory(selectedCategory === 'blue' ? null : 'blue')}
                                                className={cn(
                                                    "flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all",
                                                    selectedCategory === 'blue'
                                                        ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20 scale-105"
                                                        : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-300"
                                                )}
                                            >
                                                <div className={cn("w-2 h-2 rounded-full", selectedCategory === 'blue' ? "bg-white" : "bg-blue-500")} />
                                                <span className="text-[10px] font-bold uppercase tracking-wider">Event</span>
                                            </button>
                                            <button
                                                onClick={() => setSelectedCategory(selectedCategory === 'orange' ? null : 'orange')}
                                                className={cn(
                                                    "flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all",
                                                    selectedCategory === 'orange'
                                                        ? "bg-orange-600 border-orange-600 text-white shadow-lg shadow-orange-500/20 scale-105"
                                                        : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-orange-300"
                                                )}
                                            >
                                                <div className={cn("w-2 h-2 rounded-full", selectedCategory === 'orange' ? "bg-white" : "bg-orange-500")} />
                                                <span className="text-[10px] font-bold uppercase tracking-wider">Urgent</span>
                                            </button>
                                            <button
                                                onClick={() => setSelectedCategory(selectedCategory === 'green' ? null : 'green')}
                                                className={cn(
                                                    "flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all",
                                                    selectedCategory === 'green'
                                                        ? "bg-green-600 border-green-600 text-white shadow-lg shadow-green-500/20 scale-105"
                                                        : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-green-300"
                                                )}
                                            >
                                                <div className={cn("w-2 h-2 rounded-full", selectedCategory === 'green' ? "bg-white" : "bg-green-500")} />
                                                <span className="text-[10px] font-bold uppercase tracking-wider">Notes</span>
                                            </button>
                                            <button
                                                onClick={() => setSelectedCategory(selectedCategory === 'red' ? null : 'red')}
                                                className={cn(
                                                    "flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all",
                                                    selectedCategory === 'red'
                                                        ? "bg-red-600 border-red-600 text-white shadow-lg shadow-red-500/20 scale-105"
                                                        : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-red-300"
                                                )}
                                            >
                                                <div className={cn("w-2 h-2 rounded-full", selectedCategory === 'red' ? "bg-white" : "bg-red-500")} />
                                                <span className="text-[10px] font-bold uppercase tracking-wider">Other</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Events Feed */}
                                <div className="md:col-span-7 p-10 flex flex-col h-full min-h-[600px] bg-white/40 dark:bg-slate-900/40">
                                    <div className="mb-10 flex justify-between items-end">
                                        <div>
                                            <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                                                {setlistDate ? format(setlistDate, "EEEE, MMMM do yyyy") : "Daily Schedule"}
                                            </h3>
                                            <p className="text-slate-400 font-bold text-[10px] mt-1 uppercase tracking-widest">
                                                {calendarEvents.filter(e => setlistDate && e.event_date === format(setlistDate, "yyyy-MM-dd") && (!selectedCategory || e.color === selectedCategory)).length > 0
                                                    ? `${calendarEvents.filter(e => setlistDate && e.event_date === format(setlistDate, "yyyy-MM-dd") && (!selectedCategory || e.color === selectedCategory)).length} Strategic Items`
                                                    : "Strategic Focus Clear"}
                                            </p>
                                        </div>
                                        <div className="text-right hidden sm:block">
                                            <Badge variant="outline" className="text-[10px] font-black tracking-[0.2em] uppercase border-slate-200 text-slate-400 px-3 py-1 rounded-full">
                                                Live TPH Planner
                                            </Badge>
                                        </div>
                                    </div>

                                    <div className="space-y-5 flex-1 overflow-y-auto pr-4 max-h-[500px] custom-scrollbar">
                                        {calendarEvents
                                            .filter(e => setlistDate && e.event_date === format(setlistDate, "yyyy-MM-dd") && (!selectedCategory || e.color === selectedCategory))
                                            .map(event => (
                                                <div
                                                    key={event.id}
                                                    className={cn(
                                                        "p-6 rounded-[2rem] shadow-sm transition-all group relative border border-transparent hover:shadow-xl hover:scale-[1.02]",
                                                        event.color === 'purple' ? 'bg-purple-50/50 dark:bg-purple-900/10 border-purple-100 dark:border-purple-800/50' :
                                                            event.color === 'blue' ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800/50' :
                                                                event.color === 'green' ? 'bg-green-50/50 dark:bg-green-900/10 border-green-100 dark:border-green-800/50' :
                                                                    event.color === 'orange' ? 'bg-orange-50/50 dark:bg-orange-900/10 border-orange-100 dark:border-orange-800/50' :
                                                                        'bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-800/50'
                                                    )}
                                                >
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex gap-5">
                                                            <div className={cn(
                                                                "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg",
                                                                event.color === 'purple' ? 'bg-purple-600 text-white shadow-purple-500/30' :
                                                                    event.color === 'blue' ? 'bg-blue-600 text-white shadow-blue-500/30' :
                                                                        event.color === 'green' ? 'bg-green-600 text-white shadow-green-500/30' :
                                                                            event.color === 'orange' ? 'bg-orange-600 text-white shadow-orange-500/30' :
                                                                                'bg-red-600 text-white shadow-red-500/30'
                                                            )}>
                                                                <CalendarIcon className="w-7 h-7" />
                                                            </div>
                                                            <div>
                                                                <h4 className="font-black text-lg text-slate-800 dark:text-slate-100 group-hover:text-purple-600 transition-colors uppercase tracking-tight">{event.title}</h4>
                                                                {event.description && (
                                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed font-medium">
                                                                        {event.description}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col gap-2 items-end">
                                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-9 w-9 rounded-xl bg-white dark:bg-slate-800 shadow-md hover:scale-110"
                                                                    onClick={() => {
                                                                        setEditingEvent(event);
                                                                        setNewEvent({
                                                                            title: event.title,
                                                                            description: event.description || "",
                                                                            color: event.color
                                                                        });
                                                                        setIsAddEventOpen(true);
                                                                    }}
                                                                >
                                                                    <Pencil className="w-4 h-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-9 w-9 rounded-xl bg-white dark:bg-slate-800 shadow-md hover:bg-red-50 hover:text-red-500 hover:scale-110"
                                                                    onClick={() => handleDeleteCalendarEvent(event.id)}
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </div>
                                                            <span className="text-[10px] uppercase font-black text-slate-300 tracking-[0.2em] mt-2">
                                                                TPH COMMAND
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}

                                        {calendarEvents.filter(e => setlistDate && e.event_date === format(setlistDate, "yyyy-MM-dd") && (!selectedCategory || e.color === selectedCategory)).length === 0 && (
                                            <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                                                <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-[2.5rem] flex items-center justify-center mb-8 rotate-12 group-hover:rotate-0 transition-transform">
                                                    <Zap className="w-12 h-12 text-slate-300" />
                                                </div>
                                                <h4 className="text-slate-500 font-black uppercase tracking-[0.2em] text-lg">Operational Calm</h4>
                                                <p className="text-sm text-slate-400 mt-3 max-w-[280px] font-bold">The day is strategically clear. Ready for spontaneous inspiration!</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </section>
                </div>
            </div >

            {/* Dialogs for Instrumental Resources */}
            < Dialog open={isAddInstrOpen} onOpenChange={setIsAddInstrOpen} >
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Add Instrumental Resource</DialogTitle>
                        <DialogDescription>Add a tutorial or technical guide for the band.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Title</Label>
                            <Input placeholder="e.g. Advanced Piano Chords" value={newInstr.title} onChange={e => setNewInstr({ ...newInstr, title: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>Type</Label>
                            <Select value={newInstr.type} onValueChange={v => setNewInstr({ ...newInstr, type: v })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Tutorial">Tutorial</SelectItem>
                                    <SelectItem value="Technique">Technique</SelectItem>
                                    <SelectItem value="Resource">Resource</SelectItem>
                                    <SelectItem value="Workshop">Workshop</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>URL (YouTube/Link)</Label>
                            <Input placeholder="https://..." value={newInstr.url} onChange={e => setNewInstr({ ...newInstr, url: e.target.value })} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleAddInstrResource} className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto">Add Resource</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog >

            <Dialog open={isEditInstrOpen} onOpenChange={setIsEditInstrOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Edit Instrumental Resource</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Title</Label>
                            <Input placeholder="e.g. Advanced Piano Chords" value={instrToEdit.title} onChange={e => setInstrToEdit({ ...instrToEdit, title: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>Type</Label>
                            <Select value={instrToEdit.type} onValueChange={v => setInstrToEdit({ ...instrToEdit, type: v })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Tutorial">Tutorial</SelectItem>
                                    <SelectItem value="Technique">Technique</SelectItem>
                                    <SelectItem value="Resource">Resource</SelectItem>
                                    <SelectItem value="Workshop">Workshop</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>URL (YouTube/Link)</Label>
                            <Input placeholder="https://..." value={instrToEdit.url} onChange={e => setInstrToEdit({ ...instrToEdit, url: e.target.value })} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleSaveEditInstrResource} className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto">Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    );
};

export default ChoirPage;
