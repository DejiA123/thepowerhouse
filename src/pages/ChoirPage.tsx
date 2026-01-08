import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
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
    CalendarIcon
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { choirService, ChoirFolder, WeeklySetSong } from "@/services/choirService";
import { toast } from "sonner"; // Assuming sonner is available based on App.tsx

const ChoirPage = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState("vocalists");
    const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // State for YouTube Player
    const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);

    // State for Setlist Date
    const [setlistDate, setSetlistDate] = useState<Date | undefined>(undefined);

    // State for Header Modals
    const [isScheduleOpen, setIsScheduleOpen] = useState(false);
    const [isRosterOpen, setIsRosterOpen] = useState(false);

    // Mock Data for Instrumentalists (Keep static or move to DB later)
    const instrumentalResources = [
        { title: "Advanced Piano Chords", type: "Tutorial", duration: "15 min", icon: Video },
        { title: "Drum Fills Breakdown", type: "Technique", duration: "10 min", icon: Video },
        { title: "Ambient Pad Sounds", type: "Resource", size: "250MB", icon: Download },
        { title: "Bass Groove Patterns", type: "Workshop", duration: "45 min", icon: Video }
    ];

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
    const [newSetSong, setNewSetSong] = useState({ title: "", key: "", artist: "", url: "" });

    // UI States for Edit Setlist Song
    const [isEditSetSongOpen, setIsEditSetSongOpen] = useState(false);
    const [editingSetSongId, setEditingSetSongId] = useState<string | null>(null);
    const [editingSetlistSongData, setEditingSetlistSongData] = useState({ title: "", key: "", artist: "", url: "" });

    // Initial Data Fetch
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [fetchedFolders, fetchedPraise, fetchedWorship, fetchedInfo] = await Promise.all([
                    choirService.getFolders(),
                    choirService.getWeeklySetlist('praise'),
                    choirService.getWeeklySetlist('worship'),
                    choirService.getAllSetlistInfo()
                ]);

                setFolders(fetchedFolders);
                setPraiseSet(fetchedPraise);
                setWorshipSet(fetchedWorship);

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
            const newFolder = await choirService.createFolder(newFolderName);
            setFolders([...folders, newFolder]);
            setNewFolderName("");
            setIsNewFolderOpen(false);
            toast.success("Folder created");
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
            }));

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
            }));

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
                url: newSetSong.url
            });

            if (activeSetType === 'praise') {
                setPraiseSet([...praiseSet, addedSong]);
            } else {
                setWorshipSet([...worshipSet, addedSong]);
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
            url: song.url || ""
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
                url: editingSetlistSongData.url
            });

            const updateList = (list: WeeklySetSong[]) => list.map(s =>
                s.id === editingSetSongId ? updatedSong : s
            );

            if (activeSetType === 'praise') {
                setPraiseSet(updateList(praiseSet));
            } else {
                setWorshipSet(updateList(worshipSet));
            }

            setIsEditSetSongOpen(false);
            setEditingSetSongId(null);
            toast.success("Setlist song updated");
        } catch (e) {
            console.error(e);
            toast.error("Failed to update song");
        }
    };


    const playVideo = (url: string) => {
        try {
            let videoId = "";
            if (url.includes("youtube.com") || url.includes("youtu.be")) {
                if (url.includes("v=")) {
                    videoId = url.split("v=")[1].split("&")[0];
                } else if (url.includes("youtu.be/")) {
                    videoId = url.split("youtu.be/")[1];
                }
                if (videoId) {
                    setCurrentVideoUrl(`https://www.youtube.com/embed/${videoId}?autoplay=1`);
                } else {
                    window.open(url, "_blank");
                }
            } else {
                window.open(url, "_blank");
            }
        } catch (e) {
            window.open(url, "_blank");
        }
    };

    const activeFolder = folders.find(f => f.id === activeFolderId);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 dark:from-slate-900 dark:via-purple-900/10 dark:to-blue-900/10">

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

            {/* Schedule Modal */}
            <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
                <DialogContent className="w-full h-full max-w-none m-0 rounded-none flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                            <Calendar className="w-6 h-6 text-purple-600" />
                            Choir Schedule
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto py-6 space-y-6 px-4 md:px-20 max-w-4xl mx-auto w-full">
                        <div className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-2xl border border-purple-100 dark:border-purple-800">
                            <div className="flex items-center gap-4 mb-2">
                                <div className="p-3 bg-purple-100 dark:bg-purple-800 rounded-full text-purple-600 dark:text-purple-300 font-bold text-xl w-14 h-14 flex items-center justify-center">
                                    Thu
                                </div>
                                <div>
                                    <h4 className="text-xl font-bold text-slate-800 dark:text-slate-100">Choir Practice</h4>
                                    <p className="text-purple-600 font-medium">6:00 PM</p>
                                </div>
                            </div>
                            <p className="text-slate-600 dark:text-slate-400 pl-[4.5rem]">
                                Main weekly rehearsal. New songs are introduced here. Please verify keys and parts beforehand.
                            </p>
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-2xl border border-blue-100 dark:border-blue-800">
                            <div className="flex items-center gap-4 mb-2">
                                <div className="p-3 bg-blue-100 dark:bg-blue-800 rounded-full text-blue-600 dark:text-blue-300 font-bold text-xl w-14 h-14 flex items-center justify-center">
                                    Fri
                                </div>
                                <div>
                                    <h4 className="text-xl font-bold text-slate-800 dark:text-slate-100">Choir Practice</h4>
                                    <p className="text-blue-600 font-medium">5:40 PM</p>
                                </div>
                            </div>
                            <p className="text-slate-600 dark:text-slate-400 pl-[4.5rem]">
                                Final run-through for Sunday service. Focused on transitions and flow.
                            </p>
                        </div>

                        <div className="bg-orange-50 dark:bg-orange-900/20 p-6 rounded-2xl border border-orange-100 dark:border-orange-800">
                            <div className="flex items-center gap-4 mb-2">
                                <div className="p-3 bg-orange-100 dark:bg-orange-800 rounded-full text-orange-600 dark:text-orange-300 font-bold text-xl w-14 h-14 flex items-center justify-center">
                                    Sun
                                </div>
                                <div>
                                    <h4 className="text-xl font-bold text-slate-800 dark:text-slate-100">Soundcheck</h4>
                                    <p className="text-orange-600 font-medium">9:30 AM</p>
                                </div>
                            </div>
                            <p className="text-slate-600 dark:text-slate-400 pl-[4.5rem]">
                                Mandatory soundcheck for all serving members. Please be on time.
                            </p>
                        </div>
                    </div>
                    <DialogFooter className="md:justify-center pb-8">
                        <Button size="lg" onClick={() => setIsScheduleOpen(false)} className="w-full md:w-auto px-12">Close Schedule</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Team Roster Modal */}
            <Dialog open={isRosterOpen} onOpenChange={setIsRosterOpen}>
                <DialogContent className="w-full h-full max-w-none m-0 rounded-none flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                            <Users className="w-6 h-6 text-purple-600" />
                            Team Roster
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto py-6 space-y-8 px-4 md:px-20 max-w-4xl mx-auto w-full">

                        {/* Praise & Worship Roster */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 border-b border-purple-100 dark:border-purple-800 pb-2">
                                <div className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded-lg text-purple-600">
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
                                            <span className="w-6 h-6 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center text-xs font-bold">
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
                        <Button onClick={saveSetInfo} className="bg-purple-600 text-white">Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add Setlist Song Dialog */}
            <Dialog open={isAddToSetOpen} onOpenChange={setIsAddToSetOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add to {activeSetType === 'praise' ? 'Praise' : 'Worship'} Set</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Song Title</Label>
                            <Input
                                placeholder="e.g. Way Maker"
                                value={newSetSong.title}
                                onChange={(e) => setNewSetSong({ ...newSetSong, title: e.target.value })}
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
                        <Button onClick={handleAddSetSong} className="bg-purple-600 text-white">Add to Set</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Setlist Song Dialog */}
            <Dialog open={isEditSetSongOpen} onOpenChange={setIsEditSetSongOpen}>
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
                        <Button onClick={handleSaveEditSetSong} className="bg-purple-600 text-white">Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Library Song Dialog */}
            <Dialog open={isEditSongOpen} onOpenChange={setIsEditSongOpen}>
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
                        <Button onClick={handleSaveEditSong} className="bg-purple-600 text-white">Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Hero Header */}
            <div className="relative h-auto md:h-[300px] overflow-hidden pb-8 pt-20 md:pt-0"> {/* Adjusted height/padding for mobile */}
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 opacity-90"></div>
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
                            <Badge className="bg-white/20 hover:bg-white/30 text-white border-none mb-3 backdrop-blur-sm">
                                Worship Ministry
                            </Badge>
                            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 tracking-tight">
                                The Power House Choir
                            </h1>
                            <p className="text-purple-100 text-lg md:text-xl font-medium max-w-2xl">
                                Leading the congregation in spirit and truth.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-3"> {/* Buttons visible on all screens */}
                            <Button
                                className="bg-white text-purple-600 hover:bg-purple-50 hover:text-purple-700 shadow-lg border-none flex-1 md:flex-none"
                                onClick={() => setIsScheduleOpen(true)}
                            >
                                <Calendar className="w-4 h-4 mr-2" />
                                Schedule
                            </Button>
                            <Button
                                className="bg-purple-500/30 text-white hover:bg-purple-500/40 backdrop-blur-md border border-white/20 flex-1 md:flex-none"
                                onClick={() => setIsRosterOpen(true)}
                            >
                                <Users className="w-4 h-4 mr-2" />
                                Team Roster
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="container mx-auto px-4 py-8 -mt-6 relative z-10">
                <Tabs defaultValue="vocalists" className="w-full" onValueChange={setActiveTab}>
                    <div className="flex justify-center mb-8">
                        <TabsList className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-1.5 rounded-full shadow-lg border border-purple-100 dark:border-purple-900/30 h-auto">
                            <TabsTrigger
                                value="vocalists"
                                className="rounded-full px-8 py-3 text-sm font-medium data-[state=active]:bg-purple-600 data-[state=active]:text-white transition-all data-[state=active]:shadow-md"
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

                    <TabsContent value="vocalists" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

                        {/* SPLIT SETLIST SECTION */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center">
                                    <ListMusic className="w-6 h-6 mr-3 text-purple-600" />
                                    This Week's Setlist
                                </h2>

                                {/* Date Picker Popover */}
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                "border-purple-200 text-purple-600 bg-purple-50 hover:bg-purple-100 pl-3 text-left font-normal",
                                                !setlistDate && "text-muted-foreground"
                                            )}
                                        >
                                            {setlistDate ? (
                                                format(setlistDate, "MMM d, yyyy")
                                            ) : (
                                                <span>Pick a date</span>
                                            )}
                                            <CalendarIcon className="ml-2 h-4 w-4 opacity-50" />
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
                                <Card className="border-none shadow-lg bg-orange-50/50 dark:bg-orange-900/10 border-t-4 border-orange-500">
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <div className="space-y-1">
                                            <CardTitle className="text-orange-700 dark:text-orange-400 flex items-center">
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
                                        <Button size="icon" variant="ghost" className="text-orange-600 hover:bg-orange-100/50" onClick={() => openAddSetSong('praise')}>
                                            <Plus className="w-5 h-5" />
                                        </Button>
                                    </CardHeader>
                                    <CardContent className="space-y-3 pt-4">
                                        {praiseSet.map((song, i) => (
                                            <div key={song.id} className="flex items-center justify-between p-3 bg-white/60 dark:bg-slate-800/60 rounded-xl shadow-sm group">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-orange-500 font-bold w-4">{i + 1}</span>
                                                    <div>
                                                        <p className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                                            {song.title}
                                                            {song.url && (
                                                                <Badge
                                                                    variant="secondary"
                                                                    className="bg-orange-100 text-orange-600 hover:bg-orange-200 cursor-pointer flex items-center gap-1 py-0 px-1.5 h-4 text-[10px]"
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
                                                    <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
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
                                        <Button size="icon" variant="ghost" className="text-blue-600 hover:bg-blue-100/50" onClick={() => openAddSetSong('worship')}>
                                            <Plus className="w-5 h-5" />
                                        </Button>
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
                                    <BookOpen className="w-6 h-6 mr-3 text-purple-600" />
                                    Vocalist Library
                                </h2>
                            </div>

                            <Card className="border-none shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-md min-h-[400px] flex flex-col">
                                <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800">
                                    <div className="flex items-center gap-2">
                                        {activeFolderId ? (
                                            <>
                                                <Button variant="ghost" size="sm" onClick={() => setActiveFolderId(null)} className="text-slate-500">
                                                    Library
                                                </Button>
                                                <span className="text-slate-300">/</span>
                                                <span className="font-semibold text-purple-600">{activeFolder?.name}</span>
                                            </>
                                        ) : (
                                            <span className="font-semibold text-slate-700 dark:text-slate-200 pl-2">My Folders</span>
                                        )}
                                    </div>

                                    <div className="flex gap-2">
                                        {activeFolderId ? (
                                            <Dialog open={isAddSongOpen} onOpenChange={setIsAddSongOpen}>
                                                <DialogTrigger asChild>
                                                    <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white shadow-md">
                                                        <Plus className="w-4 h-4 mr-2" /> Add Song
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
                                                        <Button onClick={handleAddSong} className="bg-purple-600 text-white">Save Song</Button>
                                                    </DialogFooter>
                                                </DialogContent>
                                            </Dialog>
                                        ) : (
                                            <Dialog open={isNewFolderOpen} onOpenChange={setIsNewFolderOpen}>
                                                <DialogTrigger asChild>
                                                    <Button size="sm" variant="outline" className="border-purple-200 text-purple-700 hover:bg-purple-50">
                                                        <Folder className="w-4 h-4 mr-2" /> New Folder
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent>
                                                    <DialogHeader>
                                                        <DialogTitle>Create New Folder</DialogTitle>
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
                                                        <Button onClick={handleCreateFolder} className="bg-purple-600 text-white">Create</Button>
                                                    </DialogFooter>
                                                </DialogContent>
                                            </Dialog>
                                        )}
                                    </div>
                                </div>

                                <CardContent className="p-6 flex-1">
                                    {!activeFolderId ? (
                                        // Folder Grid View
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {folders.map(folder => (
                                                <div
                                                    key={folder.id}
                                                    onClick={() => setActiveFolderId(folder.id)}
                                                    className="bg-white dark:bg-slate-700/50 p-4 rounded-xl border border-slate-200 dark:border-slate-600 hover:shadow-lg hover:border-purple-300 dark:hover:border-purple-500 transition-all cursor-pointer group flex flex-col items-center text-center gap-3 relative"
                                                >
                                                    <div className="w-16 h-16 bg-purple-50 dark:bg-purple-900/20 rounded-full flex items-center justify-center text-purple-300 group-hover:text-purple-600 group-hover:bg-purple-100 transition-colors">
                                                        <FolderOpen className="w-8 h-8" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold text-slate-800 dark:text-slate-100">{folder.name}</h3>
                                                        <p className="text-xs text-slate-400">{folder.songs.length} songs</p>
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
                                            {folders.length === 0 && (
                                                <div className="col-span-full py-12 text-center text-slate-400">
                                                    <Folder className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                                    <p>No folders yet. Create one to organize your songs!</p>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        // Songs List View
                                        <div className="space-y-4">
                                            {activeFolder?.songs.length === 0 ? (
                                                <div className="text-center py-12 text-slate-400">
                                                    <Music className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                                    <p>This folder is empty. Add your first song!</p>
                                                </div>
                                            ) : (
                                                activeFolder?.songs.map((song, i) => (
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
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                    </TabsContent>

                    <TabsContent value="instrumentalists" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {instrumentalResources.map((resource, idx) => (
                                <Card key={idx} className="group hover:shadow-xl transition-all duration-300 border-none shadow-md bg-white/80 dark:bg-slate-800/80 cursor-pointer overflow-hidden">
                                    <div className="h-32 bg-slate-100 dark:bg-slate-700 flex items-center justify-center group-hover:bg-blue-50 dark:group-hover:bg-blue-900/10 transition-colors">
                                        <resource.icon className="w-10 h-10 text-slate-400 group-hover:text-blue-500 transition-colors" />
                                    </div>
                                    <CardContent className="p-4">
                                        <Badge variant="secondary" className="mb-2 text-xs font-normal">
                                            {resource.type}
                                        </Badge>
                                        <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-1 group-hover:text-blue-600 transition-colors">
                                            {resource.title}
                                        </h3>
                                        <p className="text-xs text-slate-500">
                                            {resource.duration || resource.size}
                                        </p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        <div className="grid md:grid-cols-3 gap-6">
                            <div className="md:col-span-2">
                                <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-800/80">
                                    <CardHeader className="border-b border-slate-100 dark:border-slate-700">
                                        <CardTitle className="flex items-center text-slate-800 dark:text-slate-100">
                                            <FileMusic className="w-5 h-5 mr-2 text-blue-500" />
                                            Chord Charts & Sheets
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        {[
                                            { name: "Goodness of God (Chart)", type: "PDF", added: "2 days ago" },
                                            { name: "Flow Patterns - Worship Medley", type: "DOCX", added: "5 days ago" },
                                            { name: "Synth Patches - Firm Foundation", type: "ZIP", added: "1 week ago" }
                                        ].map((file, i) => (
                                            <div key={i} className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors border-b last:border-0 border-slate-100 dark:border-slate-700">
                                                <div className="flex items-center">
                                                    <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mr-3 text-blue-600">
                                                        <FileMusic className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-medium text-sm text-slate-700 dark:text-slate-200">{file.name}</h4>
                                                        <span className="text-xs text-slate-400">{file.added}</span>
                                                    </div>
                                                </div>
                                                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-blue-600">
                                                    <Download className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="md:col-span-1">
                                <Card className="border-none shadow-lg bg-blue-600 text-white h-full relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/50 rounded-full blur-3xl -mr-10 -mt-10"></div>
                                    <CardContent className="p-6 relative z-10 flex flex-col h-full justify-between">
                                        <div>
                                            <h3 className="text-xl font-bold mb-2">Musician's Corner</h3>
                                            <p className="text-blue-100 text-sm mb-6">
                                                "Excellence is not an act, but a habit. Keep practicing your craft for the glory of God."
                                            </p>
                                        </div>

                                        <div className="space-y-3">
                                            <Button className="w-full bg-white/20 hover:bg-white/30 border-none text-white justify-start">
                                                <Video className="w-4 h-4 mr-2" />
                                                Watch Masterclass
                                            </Button>
                                            <Button className="w-full bg-white text-blue-600 hover:bg-blue-50 border-none justify-start">
                                                <ListMusic className="w-4 h-4 mr-2" />
                                                View Tech Rider
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};

export default ChoirPage;
