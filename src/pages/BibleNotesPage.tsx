import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Card } from "@/components/ui/card";
import {
    Plus, Search, ArrowLeft, X, Star, Edit3, Share2, BookOpen, Calendar, Trash2,
    MoreVertical, Filter, Grid, List as ListIcon, TrendingUp, Hash, Layers, Heart,
    Folder, FolderOpen, FolderPlus, ChevronRight, ChevronDown, Menu, Download
} from "lucide-react";
import html2pdf from 'html2pdf.js';
import { saveAs } from 'file-saver';
import { useAuth } from "@/contexts/AuthContext";
import DOMPurify from 'dompurify';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { bibleBooks } from "@/components/bible/BibleBookList";
import { useNavigate, useLocation } from "react-router-dom";
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
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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

interface SortableFolderItemProps {
    folder: BibleNoteFolder;
    activeFolderId: string | null | undefined;
    setActiveFolderId: (id: string | null | undefined) => void;
    setEditingFolder: (folder: BibleNoteFolder) => void;
    setNewFolderName: (name: string) => void;
    setShowNewFolderDialog: (show: boolean) => void;
    handleDeleteFolder: (id: string) => void;
}

const SortableFolderItem = ({
    folder,
    activeFolderId,
    setActiveFolderId,
    setEditingFolder,
    setNewFolderName,
    setShowNewFolderDialog,
    handleDeleteFolder,
}: SortableFolderItemProps) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: folder.id });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : undefined,
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "relative group/folder transition-all",
                isDragging ? "opacity-50 scale-105" : "opacity-100"
            )}
        >
            <div
                {...attributes}
                {...listeners}
                className={cn(
                    "w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all font-medium text-sm cursor-pointer select-none touch-pan-y",
                    activeFolderId === folder.id
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                        : "hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
                )}
                style={{ touchAction: 'pan-y' }}
                onClick={() => setActiveFolderId(folder.id)}
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
                                    "h-6 w-6 rounded-full transition-opacity md:opacity-0 md:group-hover/folder:opacity-100",
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
            </div>
        </div>
    );
};

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

    // Refs
    const backButtonRef = useRef<HTMLButtonElement>(null);

    // Initial loading, setLoading] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [globalStats, setGlobalStats] = useState({ total: 0, favourites: 0, unfiledCount: 0 });
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'date' | 'book' | 'title' | 'last_edited'>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [showNewNoteDialog, setShowNewNoteDialog] = useState(false);
    const [showNoteDialog, setShowNoteDialog] = useState(false);
    const [selectedNote, setSelectedNote] = useState<BibleNote | null>(null);
    const richTextEditorRef = useRef<RichTextEditorHandle | null>(null);
    const noteContentRef = useRef('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [selectedNoteForDelete, setSelectedNoteForDelete] = useState<string | null>(null);
    const [isInlineEditing, setIsInlineEditing] = useState(false);
    const [showOnlyFavourites, setShowOnlyFavourites] = useState(false);

    const { user } = useAuth();

    const { toast } = useToast();
    const { preferences } = useBiblePreferences();
    const navigate = useNavigate();
    const location = useLocation();

    const allBooks = [...bibleBooks["Old Testament"], ...bibleBooks["New Testament"]];
    const [isScrolled, setIsScrolled] = useState(false);

    // DND Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                delay: 250,
                tolerance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = folders.findIndex((f) => f.id === active.id);
            const newIndex = folders.findIndex((f) => f.id === over.id);

            const newFolders = arrayMove(folders, oldIndex, newIndex);
            setFolders(newFolders);

            // Persist to database
            try {
                const folderOrders = newFolders.map((folder, index) => ({
                    id: folder.id,
                    sort_order: index + 1,
                }));
                await bibleNotesService.updateFolderOrder(folderOrders);
            } catch (error) {
                console.error('Error updating folder order:', error);
                toast({
                    title: "Error",
                    description: "Failed to save folder order",
                    variant: "destructive",
                });
                // Revert on error
                fetchFolders();
            }
        }
    };

    useEffect(() => {
        if (user) {
            fetchNotes();
            fetchFolders();
        }

        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.scrollTo(0, 0);
        }

        const handleScroll = () => {
            if (mainContent) {
                setIsScrolled(mainContent.scrollTop > 100);
            }
        };

        if (mainContent) {
            mainContent.addEventListener('scroll', handleScroll);
            return () => mainContent.removeEventListener('scroll', handleScroll);
        }
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
        noteContentRef.current = ''; // Reset for new note
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

            } else {
                await bibleNotesService.createFolder(user.id, newFolderName.trim());

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
            // First priority: Pinned notes always stay at the top
            if (a.is_pinned && !b.is_pinned) return -1;
            if (!a.is_pinned && b.is_pinned) return 1;

            let comparison = 0;

            switch (sortBy) {
                case 'date':
                    comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                    break;
                case 'last_edited':
                    comparison = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
                    break;
                case 'book':
                    comparison = a.book.localeCompare(b.book);
                    break;
                case 'title': {
                    const titleA = (a.title || getNoteTitleFallback(a.note_text)).trim();
                    const titleB = (b.title || getNoteTitleFallback(b.note_text)).trim();
                    comparison = titleA.localeCompare(titleB, undefined, { sensitivity: 'base', numeric: true });
                    break;
                }
                default:
                    comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            }

            return sortOrder === 'asc' ? comparison : -comparison;
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
        noteContentRef.current = note.note_text || ''; // Set for editing
        setShowNewNoteDialog(true);
    };

    const updateNote = async () => {
        if (!user || !newNote.note_text.trim()) return;

        setIsSaving(true);
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
                folder_id: newNote.folder_id || null,
                updated_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('bible_notes')
                .update(noteData)
                .eq('id', editingNote.id);

            if (error) throw error;



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
                folder_id: undefined
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
            setIsSaving(false);
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

        setIsSaving(true);
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
                folder_id: newNote.folder_id || null,
                updated_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('bible_notes')
                .insert(noteData);

            if (error) throw error;



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
                folder_id: undefined
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
            setIsSaving(false);
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

    const getNoteTitleFallback = (html: string): string => {
        if (!html) return 'Divine Insight';
        try {
            const div = document.createElement('div');
            div.innerHTML = html;
            const firstParagraph = div.querySelector('p');
            const text = firstParagraph ? firstParagraph.textContent : div.textContent;

            if (!text || text.trim().length === 0) return 'Divine Insight';
            const cleanText = text.trim();
            return cleanText.substring(0, 40) + (cleanText.length > 40 ? '...' : '');
        } catch {
            const cleanText = html.replace(/<[^>]*>/g, '').trim();
            if (!cleanText) return 'Divine Insight';
            return cleanText.substring(0, 40) + (cleanText.length > 40 ? '...' : '');
        }
    };

    // Download note as PDF
    const downloadNoteAsPDF = async (note: BibleNote) => {
        try {
            const title = note.title || getNoteTitleFallback(note.note_text);
            const fileName = `${title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`;

            // Create formatted HTML content
            const htmlContent = `
                <div style="font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto;">
                    <h1 style="color: #1e40af; border-bottom: 3px solid #3b82f6; padding-bottom: 10px; margin-bottom: 20px;">${title}</h1>
                    <div style="color: #6b7280; margin-bottom: 30px; font-size: 14px;">
                        <p><strong>Created:</strong> ${formatDateTime(note.created_at)}</p>
                    </div>
                    <div style="line-height: 1.8; color: #1f2937;">
                        ${note.note_text}
                    </div>
                </div>
            `;

            const element = document.createElement('div');
            element.innerHTML = htmlContent;

            const opt = {
                margin: 10,
                filename: fileName,
                image: { type: 'jpeg' as const, quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
            };

            await html2pdf().set(opt).from(element).save();


        } catch (error) {
            console.error('Error generating PDF:', error);
            toast({
                title: "Error",
                description: "Failed to generate PDF",
                variant: "destructive"
            });
        }
    };

    // Download note as Word document
    const downloadNoteAsWord = async (note: BibleNote) => {
        try {
            const title = note.title || getNoteTitleFallback(note.note_text);
            const fileName = `${title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.docx`;

            const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } = await import('docx');

            // Helper to clean HTML and split into lines/paragraphs
            const cleanText = (html: string) => {
                const doc = new DOMParser().parseFromString(html, 'text/html');
                return doc.body.innerText || doc.body.textContent || '';
            };

            const doc = new Document({
                sections: [{
                    properties: {},
                    children: [
                        new Paragraph({
                            text: title,
                            heading: HeadingLevel.HEADING_1,
                            spacing: { after: 200 },
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({ text: "Created: ", bold: true }),
                                new TextRun(formatDateTime(note.created_at)),
                            ],
                            spacing: { after: 400 },
                        }),
                        new Paragraph({
                            text: "",
                            border: {
                                bottom: { color: "auto", space: 1, style: BorderStyle.SINGLE, size: 6 }
                            }
                        }),
                        ...cleanText(note.note_text).split('\n').filter(line => line.trim()).map(line =>
                            new Paragraph({
                                text: line,
                                spacing: { before: 200, after: 200 }
                            })
                        )
                    ],
                }],
            });

            const blob = await Packer.toBlob(doc);
            saveAs(blob, fileName);


        } catch (error) {
            console.error('Error generating Word document:', error);
            toast({
                title: "Error",
                description: "Failed to generate .docx document",
                variant: "destructive"
            });
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
            {/* Premium Sticky Navigation Bar - Between header and My Notes */}
            <div className="sticky top-0 z-50">
                <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl border-b border-gray-100 dark:border-gray-800 shadow-lg">
                    <div className="container mx-auto max-w-6xl px-4 py-3 pt-[0.75rem]">
                        <div className="flex items-center justify-between">
                            <Button
                                variant="ghost"
                                onClick={() => {
                                    // Prioritize navigation state over preferences
                                    const returnState = location.state as { returnBook?: string; returnChapter?: number } | null;
                                    const book = returnState?.returnBook || preferences.preferredBook || 'genesis';
                                    const chapter = returnState?.returnChapter || preferences.preferredChapter || 1;
                                    navigate(`/bible?book=${book}&chapter=${chapter}`);
                                }}
                                className="group flex items-center gap-2 text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-2xl px-5 py-2.5 font-semibold transition-all duration-300 hover:scale-105 active:scale-95"
                            >
                                <ArrowLeft className="w-5 h-5 text-indigo-600 transition-transform group-hover:-translate-x-1" />
                                <span className="text-indigo-600 dark:text-indigo-400">Return to Bible</span>
                            </Button>
                            <Button
                                onClick={openNewNote}
                                className="group relative flex items-center gap-2 bg-gradient-to-r from-blue-800 via-blue-700 to-blue-600 text-white hover:from-blue-900 hover:via-blue-800 hover:to-blue-700 font-bold px-6 py-2.5 rounded-2xl shadow-xl shadow-blue-900/20 hover:shadow-2xl hover:shadow-blue-900/30 transition-all duration-300 hover:scale-105 active:scale-95 overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                                <Plus className="w-5 h-5 relative z-10" />
                                <span className="relative z-10">Add New Note</span>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stunning Hero Section */}
            <div className="relative overflow-hidden bg-gradient-to-br from-blue-900 via-blue-800 to-blue-600 text-white pb-24 px-4 pt-12">
                <div className="absolute inset-0 bg-black/10"></div>
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
                <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl"></div>


                <div className="relative z-10 container mx-auto max-w-6xl">
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
                        <Card className="p-4 border-none shadow-xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-[2.5rem] sticky top-24 lg:flex lg:flex-col lg:max-h-[70vh]">
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

                            <div className="space-y-1 lg:overflow-y-auto lg:flex-1 pr-1 lg:pb-20 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent lg:min-h-0">
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

                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragEnd={handleDragEnd}
                                >
                                    <SortableContext
                                        items={folders.map(f => f.id)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        {folders.map((folder) => (
                                            <SortableFolderItem
                                                key={folder.id}
                                                folder={folder}
                                                activeFolderId={activeFolderId}
                                                setActiveFolderId={setActiveFolderId}
                                                setEditingFolder={setEditingFolder}
                                                setNewFolderName={setNewFolderName}
                                                setShowNewFolderDialog={setShowNewFolderDialog}
                                                handleDeleteFolder={handleDeleteFolder}
                                            />
                                        ))}
                                    </SortableContext>
                                </DndContext>

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
                            <DialogContent className="max-w-full w-full h-screen flex flex-col p-0 gap-0 rounded-none m-0 border-none bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl">
                                <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12">
                                    <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in-95 duration-300">
                                        <div className="text-center space-y-2">
                                            <div className="inline-flex p-4 rounded-3xl bg-indigo-50 dark:bg-indigo-900/30 mb-4">
                                                <FolderPlus className="w-10 h-10 text-indigo-600" />
                                            </div>
                                            <h3 className="text-3xl font-black text-gray-900 dark:text-white">
                                                {editingFolder ? 'Rename Folder' : 'Create New Folder'}
                                            </h3>
                                            <p className="text-gray-500 font-medium">
                                                {editingFolder ? 'Give your collection a new name' : 'Organise your reflections into a collection'}
                                            </p>
                                        </div>

                                        <div className="space-y-4">
                                            <Input
                                                placeholder="e.g. Sermon Reflections"
                                                value={newFolderName}
                                                onChange={(e) => setNewFolderName(e.target.value)}
                                                className="h-16 rounded-2xl text-xl px-6 bg-gray-50 dark:bg-gray-900 border-none shadow-inner focus-visible:ring-2 focus-visible:ring-indigo-500 transition-all"
                                                autoFocus
                                                onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                                            />
                                        </div>

                                        <div className="flex flex-col gap-3">
                                            <Button
                                                onClick={handleCreateFolder}
                                                className="h-14 bg-indigo-600 text-white hover:bg-indigo-700 rounded-2xl text-lg font-bold shadow-xl shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-95"
                                            >
                                                {editingFolder ? 'Save Changes' : 'Create Folder'}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                onClick={() => {
                                                    setShowNewFolderDialog(false);
                                                    setEditingFolder(null);
                                                    setNewFolderName('');
                                                }}
                                                className="h-12 text-gray-400 hover:text-gray-600 font-semibold"
                                            >
                                                Cancel
                                            </Button>
                                        </div>
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
                                        className="pl-12 h-14 bg-gray-50/50 dark:bg-gray-800/50 border-none rounded-2xl text-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="flex flex-wrap items-center gap-3 w-full border-t border-gray-100 dark:border-gray-800 pt-3 mt-1">
                                    <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest px-1">
                                        <Filter className="w-3.5 h-3.5" />
                                        Sort By
                                    </div>
                                    <div className="flex gap-2 flex-1 sm:flex-none">
                                        {[
                                            { id: 'date', name: 'Date Created' },
                                            { id: 'last_edited', name: 'Last Edited' },
                                            { id: 'title', name: 'Name' }
                                        ].map((option) => (
                                            <Button
                                                key={option.id}
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    if (sortBy === option.id) {
                                                        setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                                                    } else {
                                                        setSortBy(option.id as any);
                                                        // Default to Alphabetical (asc) for Name, Newest (desc) for dates
                                                        setSortOrder(option.id === 'title' ? 'asc' : 'desc');
                                                    }
                                                }}
                                                className={cn(
                                                    "h-9 px-4 rounded-xl text-xs font-bold transition-all",
                                                    sortBy === option.id
                                                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700"
                                                        : "bg-gray-50 dark:bg-gray-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                )}
                                            >
                                                {option.name}
                                                {sortBy === option.id && (
                                                    <span className="ml-1 opacity-60">
                                                        {sortOrder === 'desc' ? '↓' : '↑'}
                                                    </span>
                                                )}
                                            </Button>
                                        ))}
                                    </div>

                                    <div className="flex-1"></div>

                                    <div className="flex p-1 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                        <Button
                                            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                                            size="icon"
                                            onClick={() => setViewMode('grid')}
                                            className="rounded-lg h-9 w-9"
                                        >
                                            <Grid className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                                            size="icon"
                                            onClick={() => setViewMode('list')}
                                            className="rounded-lg h-9 w-9"
                                        >
                                            <ListIcon className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* Notes Grid */}
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-24">
                                <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
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
                                            className="group relative bg-white dark:bg-gray-900 rounded-[2rem] overflow-hidden border border-gray-100 dark:border-gray-800 shadow-md md:hover:shadow-2xl transition-all duration-500 md:hover:-translate-y-2 cursor-pointer"
                                            onClick={() => { setSelectedNote(note); setShowNoteDialog(true); }}
                                        >
                                            {/* Category Accent Line - Partially visible by default for mobile parity */}
                                            <div className="h-1.5 w-full bg-gradient-to-r from-transparent via-blue-600 to-transparent opacity-60 md:group-hover:opacity-100 transition-opacity"></div>

                                            <div className="p-7">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex gap-1">
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className={`h-8 w-8 rounded-full transition-all ${note.is_favorite ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' : 'text-gray-400 md:opacity-0 md:group-hover:opacity-100'}`}
                                                            onClick={(e) => { e.stopPropagation(); toggleFavoriteNote(note); }}
                                                        >
                                                            <Star className={`w-4 h-4 ${note.is_favorite ? 'fill-current' : ''}`} />
                                                        </Button>
                                                    </div>
                                                    <div className="flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full text-gray-400 hover:text-amber-500" onClick={(e) => { e.stopPropagation(); editNote(note); }}>
                                                            <Edit3 className="w-4 h-4" />
                                                        </Button>
                                                        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full text-gray-400 hover:text-red-500" onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}>
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </div>

                                                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3 line-clamp-1 md:group-hover:text-blue-600 transition-colors">
                                                    {note.title || getNoteTitleFallback(note.note_text)}
                                                </h3>

                                                <div className="relative min-h-[100px] max-h-[180px] overflow-hidden mb-6 group/editor">
                                                    <RichTextEditor
                                                        content={note.note_text}
                                                        readOnly={true}
                                                        compact={true}
                                                        onChange={() => { }}
                                                        className="pointer-events-none"
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
                                <div className="w-24 h-24 bg-blue-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce transition-all duration-1000">
                                    <BookOpen className="w-10 h-10 text-blue-500" />
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
                                        className="bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold h-14 px-10 rounded-full shadow-xl hover:shadow-blue-500/20 transition-all hover:scale-105"
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
                <DialogPrimitive.Portal>
                    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
                    <DialogPrimitive.Content
                        onOpenAutoFocus={(e) => {
                            e.preventDefault();
                            // Explicitly focus a non-input element to prevent keyboard
                            if (backButtonRef.current) {
                                backButtonRef.current.focus();
                            }
                        }}
                        className="fixed top-0 left-0 right-0 bottom-0 w-screen h-[100dvh] max-w-none p-0 overflow-hidden bg-white dark:bg-gray-950 z-50 outline-none transform-none shadow-none border-none"
                    >
                        {selectedNote && (
                            <div className="flex flex-col h-full bg-white dark:bg-gray-950">
                                {/* Standard Header Bar - Clean Apple Notes Style */}
                                <div className="relative flex items-center justify-between px-4 h-auto min-h-[4rem] border-b border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-950/95 backdrop-blur-md z-50 pt-4 pb-4">
                                    <div className="flex-none z-10">
                                        <Button
                                            ref={backButtonRef}
                                            variant="ghost"
                                            onClick={() => {
                                                if (isInlineEditing) {
                                                    setIsInlineEditing(false);
                                                } else {
                                                    setShowNoteDialog(false);
                                                }
                                            }}
                                            className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 px-3 rounded-full font-bold transition-all flex items-center gap-1.5"
                                        >
                                            <ArrowLeft className="w-5 h-5" />
                                            <span className="hidden xs:inline">{isInlineEditing ? 'Cancel' : 'Back'}</span>
                                        </Button>
                                    </div>

                                    {/* Perfectly Centered Title with absolute positioning */}
                                    <div className="absolute inset-x-0 flex justify-center items-center px-12 pointer-events-none">
                                        <div className="w-full max-w-[65%] sm:max-w-md pointer-events-auto">
                                            {isInlineEditing ? (
                                                <Input
                                                    value={newNote.title}
                                                    onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                                                    placeholder="Note Title"
                                                    autoFocus={false}
                                                    className="text-base sm:text-lg md:text-xl font-bold text-center bg-transparent border-none focus:ring-0 text-gray-900 dark:text-white w-full"
                                                />
                                            ) : (
                                                <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-white text-center truncate whitespace-nowrap px-1">
                                                    {selectedNote.title || getNoteTitleFallback(selectedNote.note_text)}
                                                </h2>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex-none flex items-center gap-2 z-10">
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
                                                                folder_id: newNote.folder_id || null,
                                                                updated_at: new Date().toISOString()
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
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full h-10 w-10 flex-none"
                                                        >
                                                            <MoreVertical className="w-5 h-5" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 shadow-xl border-gray-100">
                                                        <DropdownMenuItem
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
                                                            className="rounded-xl focus:bg-indigo-50 cursor-pointer py-2.5 px-3 flex items-center gap-3 transition-colors"
                                                        >
                                                            <div className="bg-indigo-50 p-2 rounded-lg">
                                                                <Edit3 className="w-4 h-4 text-indigo-600" />
                                                            </div>
                                                            <span className="font-semibold text-sm">Edit Note</span>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => downloadNoteAsPDF(selectedNote)}
                                                            className="rounded-xl focus:bg-blue-50 cursor-pointer py-2.5 px-3 flex items-center gap-3 transition-colors mt-1"
                                                        >
                                                            <div className="bg-blue-50 p-2 rounded-lg">
                                                                <Download className="w-4 h-4 text-blue-600" />
                                                            </div>
                                                            <span className="font-semibold text-sm">Download as PDF</span>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => downloadNoteAsWord(selectedNote)}
                                                            className="rounded-xl focus:bg-green-50 cursor-pointer py-2.5 px-3 flex items-center gap-3 transition-colors"
                                                        >
                                                            <div className="bg-green-50 p-2 rounded-lg">
                                                                <Download className="w-4 h-4 text-green-600" />
                                                            </div>
                                                            <span className="font-semibold text-sm">Download as Word</span>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => {
                                                                setSelectedNoteForDelete(selectedNote.id);
                                                                deleteNote(selectedNote.id);
                                                            }}
                                                            className="rounded-xl focus:bg-red-50 text-red-600 focus:text-red-600 cursor-pointer py-2.5 px-3 flex items-center gap-3 transition-colors mt-1"
                                                        >
                                                            <div className="bg-red-50 p-2 rounded-lg">
                                                                <Trash2 className="w-4 h-4 text-red-600" />
                                                            </div>
                                                            <span className="font-semibold text-sm">Delete Note</span>
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
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

                                <div className="flex-1 flex flex-col min-h-0 overflow-y-auto bg-white dark:bg-gray-950">
                                    <div className="flex-1 flex flex-col min-h-0">
                                        <div className="px-4 md:px-6 mt-6 flex-1 flex flex-col min-h-0 overflow-visible">
                                            {isInlineEditing ? (
                                                <div className="flex-1 flex flex-col min-h-0">
                                                    <RichTextEditor
                                                        content={newNote.note_text}
                                                        onChange={(content) => {
                                                            newNote.note_text = content;
                                                            noteContentRef.current = content;
                                                        }}
                                                        placeholder="Start writing your reflection..."
                                                        toolbarPosition="bottom"
                                                        className="h-full"
                                                        autoFocus={false}
                                                    />
                                                </div>
                                            ) : (
                                                <div
                                                    className="flex-1 flex flex-col min-h-0 cursor-text overflow-visible select-text touch-callout-default"
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
                                                        noteContentRef.current = selectedNote.note_text || ''; // Set for inline edit
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
                            </div>
                        )}
                    </DialogPrimitive.Content>
                </DialogPrimitive.Portal>
            </Dialog>

            {/* Premium Editor Overlay - Fixed div to resolve iOS selection issues */}
            {showNewNoteDialog && createPortal(
                <div className="fixed top-0 left-0 right-0 bottom-0 w-screen h-[100dvh] bg-white dark:bg-gray-950 z-[9999] overflow-hidden flex flex-col shadow-none border-none">
                    {/* Focus Dummy Trap at the top of the overlay */}
                    <div tabIndex={0} className="w-0 h-0 opacity-0 overflow-hidden outline-none pointer-events-none absolute top-0" aria-hidden="true">
                        Focus Trap
                    </div>
                    <div className="flex-1 flex flex-col w-full relative bg-gray-50 dark:bg-black overflow-hidden">
                        {/* Premium Navbar - Streamlined and safe-area aware */}
                        <div className="flex items-center justify-between w-full px-6 min-h-[4rem] border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 pt-4 pb-4">
                            <div className="flex items-center gap-4">
                                <Button
                                    variant="ghost"
                                    onClick={() => setShowNewNoteDialog(false)}
                                    className="text-gray-600 dark:text-gray-400 hover:text-indigo-600 px-0 rounded-full font-bold h-10 w-10"
                                >
                                    <ArrowLeft className="w-6 h-6" />
                                </Button>

                                <div>
                                    <Select
                                        value={newNote.folder_id || 'unfiled'}
                                        onValueChange={(val) => setNewNote({ ...newNote, folder_id: val === 'unfiled' ? undefined : val })}
                                    >
                                        <SelectTrigger className="w-auto min-w-[130px] h-8 rounded-full border-none bg-gray-100 dark:bg-gray-800 shadow-sm font-bold text-[10px] px-3">
                                            <div className="flex items-center gap-1.5">
                                                <Folder className="w-3 h-3 text-blue-500" />
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
                            </div>

                            <div className="flex items-center gap-3">
                                <Button
                                    onClick={handleSaveNote}
                                    disabled={isSaving}
                                    className="bg-indigo-600 text-white hover:bg-indigo-700 font-black px-8 rounded-full shadow-lg h-10 transition-all active:scale-95"
                                >
                                    {isSaving ? 'Saving...' : 'Save'}
                                </Button>
                            </div>
                        </div>

                        {/* Editor Content */}
                        <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-gray-950 overflow-visible">
                            <div className="flex-1 flex flex-col min-h-0">
                                <div className="px-6 py-4 bg-white dark:bg-gray-950">
                                    <Input
                                        placeholder="Note Title"
                                        value={newNote.title}
                                        onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                                        autoFocus={false}
                                        className="text-2xl sm:text-3xl font-black border-none bg-transparent p-0 h-auto focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 outline-none placeholder:text-gray-200 dark:placeholder:text-gray-800 text-gray-900 dark:text-white shadow-none text-left ios-input-fix select-text"
                                    />
                                </div>
                                {/* Rich Text Editor - Instant Component Version */}
                                <div className="flex-1 flex flex-col group min-h-0">
                                    <RichTextEditor
                                        content={newNote.note_text}
                                        onChange={(content) => {
                                            newNote.note_text = content; // Direct mutation for performance in this state object
                                            noteContentRef.current = content;
                                        }}
                                        placeholder="Start writing your note here..."
                                        toolbarPosition="bottom"
                                        className="h-full"
                                        autoFocus={false}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default BibleNotesPage;
