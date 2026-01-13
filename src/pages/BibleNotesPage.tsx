import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import {
    Plus, Search, ArrowLeft, X, Star, Edit3, Share2, BookOpen, Calendar, Trash2,
    MoreVertical, Filter, Grid, List as ListIcon, TrendingUp, Hash, Layers, Heart,
    Folder, FolderOpen, FolderPlus, ChevronRight, ChevronDown, Menu
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import DOMPurify from 'dompurify';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { bibleBooks } from "@/components/bible/BibleBookList";
import { useNavigate } from "react-router-dom";
import { useBiblePreferences } from "@/hooks/useBiblePreferences";
import RichTextEditor, { RichTextEditorHandle } from "@/components/bible/RichTextEditor";
import { bibleNotesService, BibleNoteFolder } from "@/services/bibleNotesService";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface BibleNote {
    id: string;
    user_id: string;
    book: string;
    chapter: number;
    verse?: number;
    note_text: string;
    title?: string;
    tags?: string[];
    category?: string;
    is_favorite?: boolean;
    is_private?: boolean;
    is_pinned?: boolean;
    folder_id?: string | null;
    created_at: string;
    updated_at: string;
}

const NOTE_CATEGORIES = [
    { id: 'insight', name: 'Insight', icon: '💡' },
    { id: 'question', name: 'Question', icon: '❓' },
    { id: 'prayer', name: 'Prayer', icon: '🙏' },
    { id: 'application', name: 'Application', icon: '🎯' },
    { id: 'cross-reference', name: 'Cross Reference', icon: '🔗' },
    { id: 'study', name: 'Study', icon: '📚' },
    { id: 'personal', name: 'Personal', icon: '❤️' },
    { id: 'sermon', name: 'Sermon', icon: '⛪' }
];

const BibleNotesPage = () => {
    const [notes, setNotes] = useState<BibleNote[]>([]);
    const [filteredNotes, setFilteredNotes] = useState<BibleNote[]>([]);
    const [folders, setFolders] = useState<BibleNoteFolder[]>([]);
    const [activeFolderId, setActiveFolderId] = useState<string | null | undefined>(undefined); // undefined = all notes
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [editingFolder, setEditingFolder] = useState<BibleNoteFolder | null>(null);
    const [newNote, setNewNote] = useState({
        title: '',
        note_text: '',
        book: 'genesis',
        chapter: '1',
        verse: '',
        category: 'insight',
        tags: [],
        is_favorite: false,
        is_private: false,
        is_pinned: false,
        folder_id: undefined as string | undefined
    });
    const [editingNote, setEditingNote] = useState<BibleNote | null>(null);
    const [loading, setLoading] = useState(false);
    const [globalStats, setGlobalStats] = useState({ total: 0, favourites: 0, unfiledCount: 0 });
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'date' | 'book' | 'title'>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [showNewNoteDialog, setShowNewNoteDialog] = useState(false);
    const [showNoteDialog, setShowNoteDialog] = useState(false);
    const [selectedNote, setSelectedNote] = useState<BibleNote | null>(null);
    const richTextEditorRef = useRef<RichTextEditorHandle | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [selectedNoteForDelete, setSelectedNoteForDelete] = useState<string | null>(null);
    const [isInlineEditing, setIsInlineEditing] = useState(false);
    const [showOnlyFavourites, setShowOnlyFavourites] = useState(false);

    const { user } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();

    const allBooks = [...bibleBooks["Old Testament"], ...bibleBooks["New Testament"]];

    useEffect(() => {
        if (user) {
            fetchNotes();
            fetchFolders();
        }
        window.scrollTo(0, 0);
    }, [user]);

    useEffect(() => {
        if (user) {
            fetchNotes(activeFolderId);
        }
    }, [activeFolderId, user]);

    useEffect(() => {
        filterAndSortNotes();
    }, [notes, searchTerm, selectedCategory, sortBy, sortOrder, showOnlyFavourites]);

    const openNewNote = () => {
        setEditingNote(null);
        setNewNote({
            title: '',
            note_text: '',
            book: 'genesis',
            chapter: '1',
            verse: '',
            category: 'insight',
            tags: [],
            is_favorite: false,
            is_private: false,
            is_pinned: false,
            folder_id: (typeof activeFolderId === 'string') ? activeFolderId : undefined
        });
        setShowNewNoteDialog(true);
    };

    const fetchNotes = async (folderId: string | null | undefined = activeFolderId) => {
        if (!user) return;

        try {
            setLoading(true);
            let query = supabase
                .from('bible_notes')
                .select('*')
                .eq('user_id', user.id);

            // Filter by active folder
            if (folderId === null) {
                query = query.is('folder_id', null);
            } else if (folderId) {
                query = query.eq('folder_id', folderId);
            }
            // If folderId is undefined, get all notes

            const { data, error } = await query.order('created_at', { ascending: false });

            if (error) throw error;
            setNotes(data || []);
        } catch (error) {
            console.error('Error fetching notes:', error);
            toast({
                title: "Error",
                description: "Failed to load notes",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const fetchFolders = async () => {
        if (!user) return;

        try {
            const fetchedFolders = await bibleNotesService.getFolders(user.id);
            setFolders(fetchedFolders);

            // Also update global stats while we're at it
            const stats = await bibleNotesService.getStats(user.id);
            setGlobalStats({
                total: stats.total,
                favourites: stats.favourites,
                unfiledCount: stats.byFolder['unfiled'] || 0
            });
        } catch (error) {
            console.error('Error fetching folders/stats:', error);
        }
    };

    const handleCreateFolder = async () => {
        if (!user || !newFolderName.trim()) return;

        try {
            if (editingFolder) {
                await bibleNotesService.updateFolder(editingFolder.id, { name: newFolderName.trim() });
                toast({ title: "Folder Renamed", description: "Your folder has been renamed successfully." });
            } else {
                await bibleNotesService.createFolder(user.id, newFolderName.trim());
                toast({ title: "Folder Created", description: "Your new folder is ready for your insights." });
            }
            setNewFolderName('');
            setEditingFolder(null);
            setShowNewFolderDialog(false);
            await fetchFolders();
        } catch (error) {
            console.error('Error with folder operation:', error);
            toast({
                title: "Error",
                description: "Failed to process folder operation",
                variant: "destructive",
            });
        }
    };

    const handleDeleteFolder = async (folderId: string) => {
        if (!confirm("Are you sure you want to delete this folder? Notes inside will be moved to 'All Notes'.")) return;

        try {
            await bibleNotesService.deleteFolder(folderId);
            if (activeFolderId === folderId) setActiveFolderId(undefined);
            toast({ title: "Folder Deleted", description: "The folder has been removed." });
            await fetchFolders();
            await fetchNotes(); // Refresh to see unfiled notes
        } catch (error) {
            console.error('Error deleting folder:', error);
            toast({
                title: "Error",
                description: "Failed to delete folder",
                variant: "destructive",
            });
        }
    };

    const filterAndSortNotes = () => {
        const filtered = notes.filter(note => {
            const matchesSearch =
                note.note_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (note.title && note.title.toLowerCase().includes(searchTerm.toLowerCase()));

            const matchesCategory = selectedCategory === 'all' || note.category === selectedCategory;
            const matchesFavourites = !showOnlyFavourites || note.is_favorite;

            return matchesSearch && matchesCategory && matchesFavourites;
        });

        filtered.sort((a, b) => {
            let aValue: any, bValue: any;

            switch (sortBy) {
                case 'date':
                    aValue = new Date(a.created_at);
                    bValue = new Date(b.created_at);
                    break;
                case 'book':
                    aValue = a.book;
                    bValue = b.book;
                    break;
                case 'title':
                    aValue = a.title || '';
                    bValue = b.title || '';
                    break;
                default:
                    aValue = new Date(a.created_at);
                    bValue = new Date(b.created_at);
            }

            if (sortOrder === 'asc') {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });

        setFilteredNotes(filtered);
    };

    const editNote = async (note: BibleNote) => {
        setEditingNote(note);
        setNewNote({
            title: note.title || '',
            note_text: note.note_text || '',
            book: note.book || 'genesis',
            chapter: note.chapter?.toString() || '1',
            verse: note.verse?.toString() || '',
            category: note.category || 'insight',
            tags: note.tags || [],
            is_favorite: note.is_favorite || false,
            is_private: note.is_private || false,
            is_pinned: note.is_pinned || false,
            folder_id: note.folder_id || undefined
        });
        setShowNewNoteDialog(true);
    };

    const updateNote = async () => {
        if (!user || !editingNote || !newNote.note_text.trim()) return;

        setLoading(true);
        try {
            const noteData = {
                title: newNote.title.trim() || null,
                note_text: newNote.note_text.trim(),
                book: newNote.book,
                chapter: parseInt(newNote.chapter),
                verse: newNote.verse ? parseInt(newNote.verse) : null,
                category: newNote.category || null,
                tags: newNote.tags.length > 0 ? newNote.tags : null,
                is_favorite: newNote.is_favorite,
                is_private: newNote.is_private,
                folder_id: newNote.folder_id || null
            };

            const { error } = await supabase
                .from('bible_notes')
                .update(noteData)
                .eq('id', editingNote.id);

            if (error) throw error;

            toast({
                title: "Note Updated ✨",
                description: "Your insights have been preserved beautifully.",
            });

            setNewNote({
                title: '',
                note_text: '',
                book: 'genesis',
                chapter: '1',
                verse: '',
                category: 'insight',
                tags: [],
                is_favorite: false,
                is_private: false,
                is_pinned: false
            });

            setEditingNote(null);
            setShowNewNoteDialog(false);
            await fetchNotes();
        } catch (error) {
            console.error('Error updating note:', error);
            toast({
                title: "Oops!",
                description: "Something went wrong while updating your note.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const toggleFavoriteNote = async (note: BibleNote) => {
        if (!user) return;

        try {
            const { error } = await supabase
                .from('bible_notes')
                .update({ is_favorite: !note.is_favorite })
                .eq('id', note.id);

            if (error) throw error;

            toast({
                title: !note.is_favorite ? "Added to Favourites ⭐" : "Removed from Favourites",
                description: !note.is_favorite ? "We've marked this note for you." : "The note has been removed from your favourites.",
            });

            await fetchNotes();
            await fetchFolders(); // Correctly refresh global stats
        } catch (error) {
            console.error('Error toggling favorite:', error);
            toast({
                title: "Oops!",
                description: "Failed to update your preference.",
                variant: "destructive",
            });
        }
    };

    const deleteNote = async (noteId: string) => {
        if (!user) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('bible_notes')
                .delete()
                .eq('id', noteId)
                .eq('user_id', user.id);

            if (error) throw error;

            toast({
                title: "Note Deleted",
                description: "The note has been removed from your collection.",
            });

            await fetchNotes();
            await fetchFolders(); // Correctly refresh global stats
            if (selectedNote?.id === noteId) {
                setShowNoteDialog(false);
            }
        } catch (error) {
            console.error('Error deleting note:', error);
            toast({
                title: "Error",
                description: "Failed to delete the note.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const saveNote = async () => {
        if (!user || !newNote.note_text.trim()) return;

        setLoading(true);
        try {
            const noteData = {
                user_id: user.id,
                book: newNote.book,
                chapter: parseInt(newNote.chapter),
                verse: newNote.verse ? parseInt(newNote.verse) : null,
                note_text: newNote.note_text.trim(),
                title: newNote.title.trim() || null,
                category: newNote.category || null,
                tags: newNote.tags.length > 0 ? newNote.tags : null,
                is_favorite: newNote.is_favorite,
                is_private: newNote.is_private,
                folder_id: newNote.folder_id || null
            };

            const { error } = await supabase
                .from('bible_notes')
                .insert(noteData);

            if (error) throw error;

            toast({
                title: "Insights Saved! 📖",
                description: "Your divine inspiration is now safely stored.",
            });

            setNewNote({
                title: '',
                note_text: '',
                book: 'genesis',
                chapter: '1',
                verse: '',
                category: 'insight',
                tags: [],
                is_favorite: false,
                is_private: false,
                is_pinned: false
            });

            setShowNewNoteDialog(false);
            await fetchNotes();
            await fetchFolders(); // Correctly refresh global stats
        } catch (error) {
            console.error('Error saving note:', error);
            toast({
                title: "Error",
                description: "Failed to save your note. Please try again.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSaveNote = () => {
        if (editingNote) {
            updateNote();
        } else {
            saveNote();
        }
    };

    const getBookDisplayName = (bookApiName: string) => {
        if (!bookApiName) return 'Unknown Book';
        const book = allBooks.find(b => b.apiName === bookApiName);
        return book ? book.name : bookApiName;
    };

    const getCategoryInfo = (categoryId: string) => {
        return NOTE_CATEGORIES.find(cat => cat.id === categoryId) || NOTE_CATEGORIES[0];
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString([], {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatDateTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getNotePreview = (html: string): string => {
        if (!html) return '';
        try {
            const div = document.createElement('div');
            div.innerHTML = html;
            const text = div.textContent || div.innerText || '';
            return text.substring(0, 150).trim() + (text.length > 150 ? '...' : '');
        } catch {
            return html.replace(/<[^>]*>/g, '').substring(0, 150).trim();
        }
    };

    const stats = {
        total: globalStats.total,
        favourites: globalStats.favourites,
        sermons: notes.filter(n => n.category === 'sermon').length,
        insights: notes.filter(n => n.category === 'insight').length,
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-gray-950">
            {/* Stunning Hero Section */}
            <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white pt-12 pb-24 px-4">
                <div className="absolute inset-0 bg-black/10"></div>
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
                <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute -top-24 -left-24 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"></div>

                <div className="relative z-10 container mx-auto max-w-6xl">
                    <div className="flex items-center justify-between mb-8">
                        <Button
                            variant="ghost"
                            onClick={() => navigate('/bible')}
                            className="bg-white/10 hover:bg-white/20 text-white border-none backdrop-blur-md rounded-full px-4"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Return to Bible
                        </Button>
                        <div className="flex gap-2">
                            <Button
                                onClick={openNewNote}
                                className="bg-white text-purple-600 hover:bg-white/90 font-bold px-6 rounded-full shadow-lg transition-transform hover:scale-105"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Add New Note
                            </Button>
                        </div>
                    </div>

                    <div className="max-w-2xl">
                        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 drop-shadow-sm font-outfit">
                            My Notes
                        </h1>
                        <p className="text-white/80 text-lg md:text-xl font-medium leading-relaxed mb-10">
                            Capture every moment of divine inspiration and build your personal library of biblical wisdom.
                        </p>
                    </div>

                    {/* Stats Dashboard */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                        {[
                            {
                                label: 'Total Notes',
                                value: stats.total,
                                icon: BookOpen,
                                color: 'bg-blue-500',
                                onClick: () => {
                                    setShowOnlyFavourites(false);
                                    setSearchTerm('');
                                    setSelectedCategory('all');
                                }
                            },
                            {
                                label: showOnlyFavourites ? 'Showing Favourites' : 'Favourites',
                                value: stats.favourites,
                                icon: Star,
                                color: 'bg-amber-400',
                                isActive: showOnlyFavourites,
                                onClick: () => setShowOnlyFavourites(!showOnlyFavourites)
                            },
                        ].map((stat, i) => (
                            <button
                                key={i}
                                onClick={stat.onClick}
                                className={`group flex flex-col text-left transition-all duration-300 ${stat.isActive ? 'ring-2 ring-white scale-105' : 'hover:scale-105 active:scale-95'} bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-3xl animate-in fade-in slide-in-from-bottom-4 duration-500`}
                                style={{ animationDelay: `${i * 100}ms` }}
                            >
                                <div className="flex items-center justify-between mb-2 w-full">
                                    <div className={`p-2 rounded-xl ${stat.color} bg-opacity-80 group-hover:scale-110 transition-transform`}>
                                        <stat.icon className={`w-4 h-4 text-white ${stat.label.includes('Favourites') && showOnlyFavourites ? 'fill-white' : ''}`} />
                                    </div>
                                    <span className="text-2xl font-bold">{stat.value}</span>
                                </div>
                                <span className="text-xs font-semibold uppercase tracking-wider text-white/60">{stat.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="container mx-auto max-w-7xl px-4 -mt-12 relative z-20 pb-20">
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Sidebar Folder Navigation */}
                    <div className={cn(
                        "lg:w-72 space-y-6 transition-all duration-300 shrink-0",
                        !isSidebarOpen && "lg:w-0 lg:overflow-hidden lg:opacity-0"
                    )}>
                        {/* Folder List Card */}
                        <Card className="p-4 border-none shadow-xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-[2.5rem] sticky top-24">
                            <div className="flex items-center justify-between px-2 mb-6">
                                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Layers className="w-5 h-5 text-indigo-500" />
                                    Folders
                                </h3>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => {
                                        setEditingFolder(null);
                                        setNewFolderName('');
                                        setShowNewFolderDialog(true);
                                    }}
                                    className="h-8 w-8 rounded-full text-indigo-600 hover:bg-indigo-50"
                                >
                                    <FolderPlus className="w-5 h-5" />
                                </Button>
                            </div>

                            <div className="space-y-1">
                                <button
                                    onClick={() => setActiveFolderId(undefined)}
                                    className={cn(
                                        "w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all font-medium text-sm group",
                                        activeFolderId === undefined
                                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                                            : "hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-8 h-8 rounded-xl flex items-center justify-center transition-colors",
                                            activeFolderId === undefined ? "bg-white/20" : "bg-gray-100 dark:bg-gray-800 group-hover:bg-white dark:group-hover:bg-gray-700"
                                        )}>
                                            <BookOpen className="w-4 h-4" />
                                        </div>
                                        All Notes
                                    </div>
                                    <span className="text-xs opacity-60 font-bold">{stats.total}</span>
                                </button>

                                <button
                                    onClick={() => setActiveFolderId(null)}
                                    className={cn(
                                        "w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all font-medium text-sm group",
                                        activeFolderId === null
                                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                                            : "hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-8 h-8 rounded-xl flex items-center justify-center transition-colors",
                                            activeFolderId === null ? "bg-white/20" : "bg-gray-100 dark:bg-gray-800 group-hover:bg-white dark:group-hover:bg-gray-700"
                                        )}>
                                            <Folder className="w-4 h-4" />
                                        </div>
                                        Unfiled
                                    </div>
                                    <span className="text-xs opacity-60 font-bold">
                                        {globalStats.unfiledCount}
                                    </span>
                                </button>

                                <div className="py-2 px-4">
                                    <div className="h-px bg-gray-100 dark:bg-gray-800 w-full" />
                                </div>

                                {folders.map((folder) => (
                                    <div key={folder.id} className="relative group/folder">
                                        <button
                                            onClick={() => setActiveFolderId(folder.id)}
                                            className={cn(
                                                "w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all font-medium text-sm",
                                                activeFolderId === folder.id
                                                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                                                    : "hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
                                            )}
                                        >
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className={cn(
                                                    "w-8 h-8 shrink-0 rounded-xl flex items-center justify-center transition-colors",
                                                    activeFolderId === folder.id ? "bg-white/20" : "bg-gray-100 dark:bg-gray-800 group-hover/folder:bg-white dark:group-hover/folder:bg-gray-700"
                                                )}>
                                                    <FolderOpen className="w-4 h-4" />
                                                </div>
                                                <span className="truncate">{folder.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs opacity-60 font-bold">{folder.noteCount}</span>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className={cn(
                                                                "h-6 w-6 rounded-full opacity-0 group-hover/folder:opacity-100 transition-opacity",
                                                                activeFolderId === folder.id ? "text-white hover:bg-white/20" : "text-gray-400 hover:bg-gray-100"
                                                            )}
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <MoreVertical className="w-3 h-3" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => {
                                                            setEditingFolder(folder);
                                                            setNewFolderName(folder.name);
                                                            setShowNewFolderDialog(true);
                                                        }}>
                                                            <Edit3 className="w-4 h-4 mr-2" />
                                                            Rename
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            className="text-red-600"
                                                            onClick={() => handleDeleteFolder(folder.id)}
                                                        >
                                                            <Trash2 className="w-4 h-4 mr-2" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </button>
                                    </div>
                                ))}

                                {folders.length === 0 && (
                                    <div className="p-8 text-center">
                                        <p className="text-xs text-gray-400 font-medium">No folders yet</p>
                                    </div>
                                )}
                            </div>
                        </Card>
                    </div>

                    {/* Main Content Area */}
                    <div className="flex-1 space-y-8">
                        <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
                            <DialogContent className="sm:max-w-[425px]">
                                <div className="p-6">
                                    <h3 className="text-lg font-bold mb-4">{editingFolder ? 'Rename Folder' : 'Create New Folder'}</h3>
                                    <Input
                                        placeholder="e.g. Sermon Reflections"
                                        value={newFolderName}
                                        onChange={(e) => setNewFolderName(e.target.value)}
                                        className="h-12 rounded-xl mb-6"
                                        autoFocus
                                        onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                                    />
                                    <div className="flex justify-end gap-3">
                                        <Button variant="ghost" onClick={() => setShowNewFolderDialog(false)}>Cancel</Button>
                                        <Button
                                            onClick={handleCreateFolder}
                                            className="bg-indigo-600 text-white hover:bg-indigo-700 rounded-full px-6"
                                        >
                                            {editingFolder ? 'Save Changes' : 'Create Folder'}
                                        </Button>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                        {/* Search & Filter Bar */}
                        <Card className="mb-8 p-3 border-none shadow-xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-3xl">
                            <div className="flex flex-col lg:flex-row gap-4 items-center">
                                <div className="relative flex-1 w-full">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <Input
                                        placeholder="Search your notes"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-12 h-14 bg-gray-50/50 dark:bg-gray-800/50 border-none rounded-2xl text-lg focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>
                                <div className="flex gap-2 w-full lg:w-auto">
                                    {/* Category filter removed as requested */}

                                    <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl">
                                        <Button
                                            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                                            size="icon"
                                            onClick={() => setViewMode('grid')}
                                            className="rounded-xl h-12 w-12"
                                        >
                                            <Grid className="w-5 h-5" />
                                        </Button>
                                        <Button
                                            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                                            size="icon"
                                            onClick={() => setViewMode('list')}
                                            className="rounded-xl h-12 w-12"
                                        >
                                            <ListIcon className="w-5 h-5" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* Notes Grid */}
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-24">
                                <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                                <p className="mt-6 text-gray-500 font-medium animate-pulse">Gathering your notes...</p>
                            </div>
                        ) : filteredNotes.length > 0 ? (
                            <div className={viewMode === 'grid'
                                ? "grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
                                : "flex flex-col gap-4"
                            }>
                                {filteredNotes.map((note) => {
                                    const cat = getCategoryInfo(note.category || 'insight');
                                    return (
                                        <div
                                            key={note.id}
                                            className="group relative bg-white dark:bg-gray-900 rounded-[2rem] overflow-hidden border border-gray-100 dark:border-gray-800 shadow-md hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 cursor-pointer"
                                            onClick={() => { setSelectedNote(note); setShowNoteDialog(true); }}
                                        >
                                            {/* Category Accent Line - Partially visible by default for mobile parity */}
                                            <div className="h-1.5 w-full bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-60 group-hover:opacity-100 transition-opacity"></div>

                                            <div className="p-7">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex gap-1">
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className={`h-8 w-8 rounded-full transition-all ${note.is_favorite ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' : 'text-gray-400 opacity-0 group-hover:opacity-100'}`}
                                                            onClick={(e) => { e.stopPropagation(); toggleFavoriteNote(note); }}
                                                        >
                                                            <Star className={`w-4 h-4 ${note.is_favorite ? 'fill-current' : ''}`} />
                                                        </Button>
                                                    </div>
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full text-gray-400 hover:text-amber-500" onClick={(e) => { e.stopPropagation(); editNote(note); }}>
                                                            <Edit3 className="w-4 h-4" />
                                                        </Button>
                                                        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full text-gray-400 hover:text-red-500" onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}>
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </div>

                                                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3 line-clamp-1 group-hover:text-purple-600 transition-colors">
                                                    {note.title || 'Divine Insight'}
                                                </h3>

                                                <div className="relative min-h-[100px] max-h-[180px] overflow-hidden mb-6 group/editor">
                                                    <RichTextEditor
                                                        content={note.note_text}
                                                        readOnly={true}
                                                        compact={true}
                                                        onChange={() => { }}
                                                        className="pointer-events-auto"
                                                    />
                                                    {/* Gradient fade to indicate more content */}
                                                    <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white dark:from-gray-900 to-transparent pointer-events-none"></div>
                                                </div>

                                                <div className="flex items-center justify-between pt-6 border-t border-gray-50 dark:border-gray-800">
                                                    <div className="flex items-center gap-2 text-gray-400 text-xs font-semibold">
                                                        <Calendar className="w-3.5 h-3.5" />
                                                        {formatDate(note.created_at)}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {note.is_favorite && (
                                                            <div className="bg-amber-100 dark:bg-amber-900/30 p-1.5 rounded-full">
                                                                <Star className="w-3 h-3 text-amber-500 fill-current" />
                                                            </div>
                                                        )}
                                                        <div className="flex items-center gap-1.5 text-gray-400">
                                                            <Folder className="w-3 h-3" />
                                                            <span className="text-[10px] font-bold uppercase tracking-wider">
                                                                {folders.find(f => f.id === note.folder_id)?.name || 'All Notes'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-gray-900 rounded-[3rem] p-16 text-center border-2 border-dashed border-gray-200 dark:border-gray-800">
                                <div className="w-24 h-24 bg-purple-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce transition-all duration-1000">
                                    <BookOpen className="w-10 h-10 text-purple-500" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                                    {searchTerm ? "No results found" : "Your spiritual journey awaits"}
                                </h3>
                                <p className="text-gray-500 max-w-sm mx-auto mb-10 leading-relaxed font-medium">
                                    {searchTerm
                                        ? "Adjust your search to rediscover your saved insights."
                                        : "Start capturing your reflections, prayers, and insights to build your biblical library."
                                    }
                                </p>
                                {!searchTerm && (
                                    <Button
                                        onClick={() => setShowNewNoteDialog(true)}
                                        className="bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold h-14 px-10 rounded-full shadow-xl hover:shadow-purple-500/20 transition-all hover:scale-105"
                                    >
                                        <Plus className="w-5 h-5 mr-2" />
                                        Write My First Entry
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Premium Note View Dialog */}
            {/* Premium Note View Dialog - Truly Full Screen */}
            <Dialog open={showNoteDialog} onOpenChange={(open) => {
                setShowNoteDialog(open);
                if (!open) setIsInlineEditing(false);
            }}>
                <DialogContent className="fixed inset-0 w-screen h-[100dvh] max-w-none p-0 overflow-hidden bg-white dark:bg-gray-950 rounded-none border-none shadow-none m-0 translate-x-0 translate-y-0 top-0 left-0 flex flex-col">
                    {selectedNote && (
                        <div className="flex flex-col h-full bg-white dark:bg-gray-950">
                            {/* Standard Header Bar - Clean Apple Notes Style */}
                            <div className="relative flex items-center justify-between px-6 py-3 h-auto min-h-[4rem] border-b border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md sticky top-0 z-50 pt-[calc(0.75rem+env(safe-area-inset-top,0px))]">
                                <Button
                                    variant="ghost"
                                    onClick={() => {
                                        if (isInlineEditing) {
                                            // Optional: Add "Confirm discard changes" if modified
                                            setIsInlineEditing(false);
                                        } else {
                                            setShowNoteDialog(false);
                                        }
                                    }}
                                    className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 px-4 rounded-full font-bold transition-all flex items-center gap-2 z-10"
                                >
                                    <ArrowLeft className="w-5 h-5" />
                                    {isInlineEditing ? 'Cancel' : 'Back'}
                                </Button>

                                <div className="absolute left-1/2 -translate-x-1/2 flex justify-center overflow-hidden px-4 w-full max-w-[40%] md:max-w-lg">
                                    {isInlineEditing ? (
                                        <Input
                                            value={newNote.title}
                                            onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                                            placeholder="Note Title"
                                            className="text-xl font-bold text-center bg-transparent border-none focus:ring-0 text-gray-900 dark:text-white"
                                        />
                                    ) : (
                                        <h2 className="text-xl font-bold truncate text-gray-900 dark:text-white text-center">
                                            {selectedNote.title || 'Divine Insight'}
                                        </h2>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 z-10">
                                    {isInlineEditing ? (
                                        <Button
                                            onClick={async () => {
                                                // Simplified inline save
                                                setLoading(true);
                                                try {
                                                    const { error } = await supabase
                                                        .from('bible_notes')
                                                        .update({
                                                            note_text: newNote.note_text,
                                                            title: newNote.title,
                                                            folder_id: newNote.folder_id || null
                                                        })
                                                        .eq('id', selectedNote.id);
                                                    if (error) throw error;

                                                    selectedNote.note_text = newNote.note_text;
                                                    selectedNote.title = newNote.title;
                                                    selectedNote.folder_id = newNote.folder_id || null;
                                                    setIsInlineEditing(false);
                                                    toast({ title: "Saved", description: "Your reflection has been updated." });
                                                    fetchNotes();
                                                    fetchFolders(); // Refresh stats
                                                } catch (err) {
                                                    console.error(err);
                                                    toast({ title: "Error", description: "Failed to save changes", variant: "destructive" });
                                                } finally {
                                                    setLoading(false);
                                                }
                                            }}
                                            className="bg-indigo-600 text-white hover:bg-indigo-700 font-bold px-6 rounded-full"
                                        >
                                            Save
                                        </Button>
                                    ) : (
                                        <>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => {
                                                    setEditingNote(selectedNote);
                                                    setNewNote({
                                                        title: selectedNote.title || '',
                                                        note_text: selectedNote.note_text || '',
                                                        book: selectedNote.book || 'genesis',
                                                        chapter: selectedNote.chapter?.toString() || '1',
                                                        verse: selectedNote.verse?.toString() || '',
                                                        category: selectedNote.category || 'insight',
                                                        tags: selectedNote.tags || [],
                                                        is_favorite: selectedNote.is_favorite || false,
                                                        is_private: selectedNote.is_private || false,
                                                        is_pinned: selectedNote.is_pinned || false,
                                                        folder_id: selectedNote.folder_id || undefined
                                                    });
                                                    setIsInlineEditing(true);
                                                }}
                                                className="text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full h-10 w-10"
                                            >
                                                <Edit3 className="w-5 h-5" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => {
                                                    setSelectedNoteForDelete(selectedNote.id);
                                                    deleteNote(selectedNote.id);
                                                }}
                                                className="text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full h-10 w-10"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </Button>
                                            <div className="w-px h-6 bg-gray-100 dark:bg-gray-800 mx-2"></div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setShowNoteDialog(false)}
                                                className="text-gray-400 hover:text-gray-900 rounded-full h-10 w-10"
                                            >
                                                <X className="w-5 h-5" />
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Inline Editor Folder Strip */}
                            {isInlineEditing && (
                                <div className="px-6 py-2 bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800 flex items-center gap-4">
                                    <Select
                                        value={newNote.folder_id || 'unfiled'}
                                        onValueChange={(val) => setNewNote({ ...newNote, folder_id: val === 'unfiled' ? undefined : val })}
                                    >
                                        <SelectTrigger className="w-[180px] h-8 rounded-full border-none bg-white dark:bg-gray-800 shadow-sm text-xs font-bold">
                                            <div className="flex items-center gap-2">
                                                <Folder className="w-3.5 h-3.5 text-indigo-500" />
                                                <SelectValue placeholder="Folder" />
                                            </div>
                                        </SelectTrigger>
                                        <SelectContent position="popper" sideOffset={5} className="z-[10000]">
                                            <SelectItem value="unfiled">All Notes</SelectItem>
                                            {folders.map(folder => (
                                                <SelectItem key={folder.id} value={folder.id}>{folder.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {/* Content Area - RichTextEditor handles internal scrolling */}
                            <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-white dark:bg-gray-950">
                                <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col min-h-0">
                                    {isInlineEditing ? (
                                        <div className="flex-1 flex flex-col min-h-0">
                                            <RichTextEditor
                                                content={newNote.note_text}
                                                onChange={(content) => setNewNote({ ...newNote, note_text: content })}
                                                placeholder="Speak your heart here..."
                                                toolbarPosition="bottom"
                                                className="flex-1"
                                            />
                                        </div>
                                    ) : (
                                        <div
                                            className="flex-1 flex flex-col min-h-0 cursor-text transition-all hover:bg-gray-50/50 dark:hover:bg-white/[0.02]"
                                            onClick={() => {
                                                setNewNote({
                                                    title: selectedNote.title || '',
                                                    note_text: selectedNote.note_text || '',
                                                    book: selectedNote.book || 'genesis',
                                                    chapter: selectedNote.chapter?.toString() || '1',
                                                    verse: selectedNote.verse?.toString() || '',
                                                    category: selectedNote.category || 'insight',
                                                    tags: selectedNote.tags || [],
                                                    is_favorite: selectedNote.is_favorite || false,
                                                    is_private: selectedNote.is_private || false,
                                                    is_pinned: selectedNote.is_pinned || false,
                                                    folder_id: selectedNote.folder_id || undefined
                                                });
                                                setEditingNote(selectedNote);
                                                setIsInlineEditing(true);
                                            }}
                                        >
                                            <RichTextEditor
                                                content={selectedNote.note_text}
                                                readOnly={true}
                                                onChange={async (content) => {
                                                    // Allow direct saving from preview (e.g. table edits)
                                                    try {
                                                        const { error } = await supabase
                                                            .from('bible_notes')
                                                            .update({ note_text: content })
                                                            .eq('id', selectedNote.id);
                                                        if (error) throw error;
                                                        selectedNote.note_text = content;
                                                        fetchNotes();
                                                    } catch (err) {
                                                        console.error("Preview save error:", err);
                                                    }
                                                }}
                                                className="max-w-none"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Premium Editor Dialog */}
            <Dialog open={showNewNoteDialog} onOpenChange={setShowNewNoteDialog}>
                <DialogContent className="fixed inset-0 w-screen h-[100dvh] max-w-none bg-white dark:bg-gray-950 rounded-none m-0 flex flex-col p-0 border-none translate-x-0 translate-y-0 top-0 left-0">
                    {/* Premium Navbar */}
                    <div className="flex items-center justify-between w-full px-6 py-3 h-auto min-h-[4rem] border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-0 z-30 pt-[calc(0.75rem+env(safe-area-inset-top,0px))]">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                onClick={() => setShowNewNoteDialog(false)}
                                className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-4 rounded-full font-bold"
                            >
                                <ArrowLeft className="w-5 h-5 mr-2" />
                                Back
                            </Button>
                            {/* Category selector removed as requested */}
                        </div>

                        <div className="flex items-center gap-3">
                            <Button
                                onClick={handleSaveNote}
                                disabled={loading}
                                className="bg-indigo-600 text-white hover:bg-indigo-700 font-black px-10 rounded-full shadow-lg h-10 transition-all active:scale-95"
                            >
                                {loading ? 'Saving...' : 'Save'}
                            </Button>
                        </div>
                    </div>

                    {/* Editor Content */}
                    < div className="flex-1 overflow-y-auto bg-gray-50/30 dark:bg-gray-950" >
                        <div className="bg-white dark:bg-gray-900 shadow-2xl rounded-[3rem] my-8 max-w-4xl mx-auto min-h-[calc(100vh-160px)] flex flex-col overflow-hidden border border-gray-100 dark:border-gray-800">
                            {/* Editor Header Info */}
                            <div className="p-10 pb-0 space-y-8">
                                <div className="flex flex-wrap gap-4 items-center">
                                    <div className="w-full md:w-auto">
                                        <Select
                                            value={newNote.folder_id || 'unfiled'}
                                            onValueChange={(val) => setNewNote({ ...newNote, folder_id: val === 'unfiled' ? undefined : val })}
                                        >
                                            <SelectTrigger className="w-[200px] h-11 rounded-2xl border-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm font-medium">
                                                <div className="flex items-center gap-2">
                                                    <Folder className="w-4 h-4 text-purple-500" />
                                                    <SelectValue placeholder="Add to Folder" />
                                                </div>
                                            </SelectTrigger>
                                            <SelectContent position="popper" sideOffset={5} className="z-[10000]">
                                                <SelectItem value="unfiled">All Notes</SelectItem>
                                                {folders.map(folder => (
                                                    <SelectItem key={folder.id} value={folder.id}>{folder.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex-1"></div>
                                </div>

                                <Input
                                    placeholder="Enter a title for this note"
                                    value={newNote.title}
                                    onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                                    className="text-2xl md:text-3xl font-bold border-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 rounded-[1.5rem] px-6 h-20 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all placeholder:text-gray-200 dark:placeholder:text-gray-700 text-gray-900 dark:text-white shadow-sm text-center"
                                />
                            </div>

                            {/* Rich Text Editor - Now styled premium */}
                            <div className="p-10 flex-1 flex flex-col group">
                                <div className="flex-1 rounded-[2rem] border-2 border-transparent group-focus-within:border-purple-100 dark:group-focus-within:border-purple-900/20 transition-all overflow-hidden bg-gray-50/10 backdrop-blur-sm">
                                    <RichTextEditor
                                        content={newNote.note_text}
                                        onChange={(content) => setNewNote({ ...newNote, note_text: content })}
                                        placeholder=""
                                        ref={richTextEditorRef}
                                    />
                                </div>
                            </div>
                        </div>
                    </div >
                </DialogContent >
            </Dialog>
        </div>
    );
};

export default BibleNotesPage;
