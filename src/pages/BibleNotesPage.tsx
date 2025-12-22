import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
    Plus, Search, ArrowLeft, X, Star, Edit3, Share2, BookOpen, Calendar
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import DOMPurify from 'dompurify';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { bibleBooks } from "@/components/bible/BibleBookList";
import { useNavigate } from "react-router-dom";
import { useBiblePreferences } from "@/hooks/useBiblePreferences";
import RichTextEditor, { RichTextEditorHandle } from "@/components/bible/RichTextEditor";

interface BibleNote {
    id: string;
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
        is_pinned: false
    });
    const [editingNote, setEditingNote] = useState<BibleNote | null>(null);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'date' | 'book' | 'title'>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [showNewNoteDialog, setShowNewNoteDialog] = useState(false);
    const [showNoteDialog, setShowNoteDialog] = useState(false);
    const [selectedNote, setSelectedNote] = useState<BibleNote | null>(null);
    const richTextEditorRef = useRef<RichTextEditorHandle | null>(null);

    const { user } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();

    const allBooks = [...bibleBooks["Old Testament"], ...bibleBooks["New Testament"]];

    useEffect(() => {
        if (user) {
            fetchNotes();
        }
        window.scrollTo(0, 0);
    }, [user]);

    useEffect(() => {
        filterAndSortNotes();
    }, [notes, searchTerm, selectedCategory, sortBy, sortOrder]);

    const fetchNotes = async () => {
        if (!user) return;

        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('bible_notes')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

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

    const filterAndSortNotes = () => {
        const filtered = notes.filter(note => {
            const matchesSearch =
                note.note_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (note.title && note.title.toLowerCase().includes(searchTerm.toLowerCase()));

            const matchesCategory = selectedCategory === 'all' || note.category === selectedCategory;

            return matchesSearch && matchesCategory;
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
            is_pinned: note.is_pinned || false
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
                is_private: newNote.is_private
            };

            const { error } = await supabase
                .from('bible_notes')
                .update(noteData)
                .eq('id', editingNote.id);

            if (error) throw error;

            toast({
                title: "Note Updated",
                description: "Your note has been updated successfully",
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
                title: "Error",
                description: "Failed to update note",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const deleteNote = async (noteId: string) => {
        if (!user || !confirm('Are you sure you want to delete this note?')) return;

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
                description: "Your note has been deleted successfully",
            });

            await fetchNotes();
        } catch (error) {
            console.error('Error deleting note:', error);
            toast({
                title: "Error",
                description: "Failed to delete note",
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
                is_private: newNote.is_private
            };

            const { error } = await supabase
                .from('bible_notes')
                .insert(noteData);

            if (error) throw error;

            toast({
                title: "Note Saved",
                description: "Your note has been saved successfully",
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
        } catch (error) {
            console.error('Error saving note:', error);
            toast({
                title: "Error",
                description: "Failed to save note",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
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
        const day = date.getDate();
        const month = date.toLocaleString([], { month: 'long' });
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${day} ${month} ${year} at ${hours}:${minutes}`;
    };

    const getNotePreview = (html: string): string => {
        if (!html) return '';
        try {
            let text = html
                .replace(/<\s*br\s*\/?>/gi, '\n')
                .replace(/<\s*\/p\s*>/gi, '\n\n')
                .replace(/<\s*p\s*>/gi, '')
                .replace(/<\s*li\s*>/gi, '• ')
                .replace(/<\s*\/li\s*>/gi, '\n')
                .replace(/<\s*\/ul\s*>/gi, '\n')
                .replace(/<\s*\/ol\s*>/gi, '\n');

            text = text.replace(/<[^>]*>/g, '');

            text = text
                .replace(/\s+\n/g, '\n')
                .replace(/\n{3,}/g, '\n\n')
                .trim();

            return text;
        } catch {
            return html.replace(/<[^>]*>/g, '').trim();
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="container mx-auto px-4 py-6 max-w-6xl">
                {/* Clean Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-6">
                        <Button
                            variant="ghost"
                            onClick={() => navigate('/bible')}
                            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span>Bible</span>
                        </Button>
                        <Button
                            onClick={() => setShowNewNoteDialog(true)}
                            className="bg-amber-500 hover:bg-amber-600 text-white shadow-sm"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            New Note
                        </Button>
                    </div>

                    <div>
                        <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                            Bible Notes
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 text-base">
                            Capture insights and reflections from your study
                        </p>
                    </div>
                </div>

                {/* Clean Search & Filters */}
                <div className="mb-6">
                    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Search notes..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 h-10 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 rounded-lg"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                <SelectTrigger className="w-36 h-10 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-lg text-sm">
                                    <SelectValue placeholder="Category" />
                                </SelectTrigger>
                                <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                                    <SelectItem value="all">All</SelectItem>
                                    {NOTE_CATEGORIES.map((category) => (
                                        <SelectItem key={category.id} value={category.id}>
                                            <span className="flex items-center gap-2">
                                                <span>{category.icon}</span>
                                                {category.name}
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={sortBy} onValueChange={(value: 'date' | 'book' | 'title') => setSortBy(value)}>
                                <SelectTrigger className="w-28 h-10 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-lg text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                                    <SelectItem value="date">Date</SelectItem>
                                    <SelectItem value="book">Book</SelectItem>
                                    <SelectItem value="title">Title</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {/* Notes Content */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <div className="relative">
                                <div className="w-12 h-12 border-3 border-gray-200 dark:border-gray-700 rounded-full animate-spin"></div>
                                <div className="absolute top-0 left-0 w-12 h-12 border-3 border-transparent border-t-amber-500 rounded-full animate-spin"></div>
                            </div>
                            <p className="mt-4 text-gray-500 dark:text-gray-400 text-sm">Loading notes...</p>
                        </div>
                    ) : filteredNotes.length > 0 ? (
                        <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
                            {filteredNotes.map((note) => (
                                <div
                                    key={note.id}
                                    className="group relative bg-white dark:bg-gray-800 rounded-lg p-5 cursor-pointer hover:shadow-md transition-all duration-200 border border-gray-200 dark:border-gray-700 hover:border-amber-300 dark:hover:border-amber-600"
                                    onClick={() => { setSelectedNote(note); setShowNoteDialog(true); }}
                                >
                                    <div className="mb-3">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                                {getCategoryInfo(note.category || 'insight').name}
                                            </span>
                                            {note.is_favorite && (
                                                <Star className="w-4 h-4 text-amber-500 fill-current" />
                                            )}
                                        </div>

                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 line-clamp-2">
                                            {note.title || 'Untitled Note'}
                                        </h3>
                                    </div>

                                    <p className="font-serif text-gray-600 dark:text-gray-300 line-clamp-3 mb-3 leading-relaxed text-[15px]">
                                        {getNotePreview(note.note_text)}
                                    </p>

                                    <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
                                        <span>{formatDate(note.created_at)}</span>
                                        {note.tags && note.tags.length > 0 && (
                                            <span>{note.tags.length} {note.tags.length === 1 ? 'tag' : 'tags'}</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 px-8">
                            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mb-4">
                                <BookOpen className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                                {searchTerm ? 'No notes found' : 'No notes yet'}
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 text-center max-w-sm text-sm mb-6">
                                {searchTerm
                                    ? 'Try adjusting your search or filters'
                                    : 'Start capturing your thoughts and insights'
                                }
                            </p>
                            {!searchTerm && (
                                <Button
                                    onClick={() => setShowNewNoteDialog(true)}
                                    className="bg-amber-500 hover:bg-amber-600 text-white shadow-sm"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Create Note
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Note View Dialog */}
            <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
                <DialogContent className="w-screen h-[100dvh] max-w-none bg-gray-50 dark:bg-gray-900 rounded-none m-0 flex flex-col p-0">
                    {/* Header */}
                    <div className="bg-white dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                        <Button
                            variant="ghost"
                            onClick={() => setShowNoteDialog(false)}
                            className="text-amber-500 hover:bg-gray-100 dark:hover:bg-gray-700 p-2"
                        >
                            <ArrowLeft className="w-5 h-5 mr-2" />
                            <span className="text-base">Notes</span>
                        </Button>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                                onClick={() => {
                                    if (selectedNote) {
                                        setShowNoteDialog(false);
                                        editNote(selectedNote);
                                    }
                                }}
                            >
                                <Edit3 className="w-5 h-5 text-amber-500" />
                            </Button>
                            <Button
                                variant="ghost"
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                                onClick={() => setShowNoteDialog(false)}
                                aria-label="Close"
                            >
                                <X className="w-7 h-7 text-gray-900 dark:text-gray-100 stroke-[2.5]" />
                            </Button>
                        </div>
                    </div>

                    {/* Note Content */}
                    <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-900 px-4 pt-4 pb-6">
                        {selectedNote && (
                            <div
                                className="max-w-3xl mx-auto cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg p-4 transition-colors duration-200"
                                onClick={() => {
                                    setShowNoteDialog(false);
                                    editNote(selectedNote);
                                }}
                            >
                                {/* Date with Close Button */}
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex-1"></div>
                                    <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                                        {formatDateTime(selectedNote.created_at)}
                                    </div>
                                    <div className="flex-1 flex justify-end">
                                        <Button
                                            variant="ghost"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowNoteDialog(false);
                                            }}
                                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800"
                                            aria-label="Close"
                                        >
                                            <X className="w-6 h-6 text-gray-900 dark:text-gray-100" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Title */}
                                <div className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
                                    {selectedNote.title || 'Bible Note'}
                                </div>

                                {/* Content with serif font */}
                                <div
                                    className="font-serif prose prose-base max-w-none dark:prose-invert text-gray-900 dark:text-gray-100 leading-relaxed text-[17px]"
                                    dangerouslySetInnerHTML={{
                                        __html: DOMPurify.sanitize(selectedNote.note_text, {
                                            ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li', 'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote'],
                                            ALLOWED_ATTR: ['class', 'style']
                                        })
                                    }}
                                />
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Note Editor Dialog */}
            <Dialog open={showNewNoteDialog} onOpenChange={setShowNewNoteDialog}>
                <DialogContent className="w-screen h-[100dvh] max-w-none bg-gray-50 dark:bg-gray-900 rounded-none m-0 flex flex-col p-0">
                    {/* Header */}
                    <div className="bg-white dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                        <Button
                            variant="ghost"
                            onClick={() => setShowNewNoteDialog(false)}
                            className="text-amber-500 hover:bg-gray-100 dark:hover:bg-gray-700 p-2"
                        >
                            <ArrowLeft className="w-5 h-5 mr-2" />
                            <span className="text-base">Notes</span>
                        </Button>
                        <Button
                            onClick={editingNote ? updateNote : saveNote}
                            disabled={loading || !newNote.note_text.trim()}
                            className="bg-amber-500 hover:bg-amber-600 text-white font-medium px-6 py-2 rounded-lg shadow-sm"
                        >
                            {editingNote ? 'Save' : 'Done'}
                        </Button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto">
                        <div className="bg-white dark:bg-gray-900 px-4 pt-4 pb-4 max-w-3xl mx-auto">
                            {/* Date */}
                            <div className="text-center text-sm text-gray-500 dark:text-gray-400 mb-4">
                                {new Date().toLocaleDateString('en-US', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </div>

                            {/* Title */}
                            <Input
                                placeholder="Title"
                                value={newNote.title}
                                onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                                className="text-2xl font-semibold border-none bg-transparent focus:ring-0 px-0 placeholder:text-gray-400 text-gray-900 dark:text-gray-100 mb-4"
                            />

                            {/* Rich Text Editor with serif font */}
                            <div className="font-serif text-[17px]">
                                <RichTextEditor
                                    content={newNote.note_text}
                                    onChange={(content) => setNewNote({ ...newNote, note_text: content })}
                                    placeholder="Start writing..."
                                    ref={richTextEditorRef}
                                />
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default BibleNotesPage;
