import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { 
  FileText, Trash2, Edit3, Plus, Search, Filter, Tag, BookOpen, Calendar,
  Star, Download, Upload, Bookmark, Lightbulb, Heart, MessageCircle, Link,
  Copy, Eye, EyeOff, SortAsc, SortDesc, Archive, RefreshCw, Save, X,
  Pin, Share2, Lock, Unlock, Image, Video, Music, File, Folder,
  TrendingUp, Clock, Target, Zap, ArrowLeft, CheckCircle, AlertCircle,
  Highlighter, Underline, Bold, Italic, List, ListOrdered, Quote, Code,
  Sparkles, PenTool
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
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
  color?: string;
  mood?: string;
  priority?: 'low' | 'medium' | 'high';
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showNewNoteDialog, setShowNewNoteDialog] = useState(false);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [selectedNote, setSelectedNote] = useState<BibleNote | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const richTextEditorRef = useRef<RichTextEditorHandle | null>(null);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { preferences } = useBiblePreferences();

  const allBooks = [...bibleBooks["Old Testament"], ...bibleBooks["New Testament"]];

  useEffect(() => {
    if (user) {
      fetchNotes();
    }
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
      // Type cast the priority field to ensure compatibility
      const typedNotes = (data || []).map(note => ({
        ...note,
        priority: note.priority as 'low' | 'medium' | 'high'
      }));
      
      // Debug: Check if all notes have the same book value
      console.log('Fetched notes:', typedNotes.map(note => ({ 
        id: note.id, 
        book: note.book, 
        chapter: note.chapter, 
        title: note.title 
      })));
      
      setNotes(typedNotes);
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
    if (!bookApiName) {
      console.warn('No book API name provided');
      return 'Unknown Book';
    }
    
    const book = allBooks.find(b => b.apiName === bookApiName);
    if (!book) {
      console.warn(`Book not found for API name: ${bookApiName}`);
      return bookApiName; // Return the API name as fallback
    }
    return book.name;
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

  // Example: "6 July 2025 at 16:54"
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString([], { month: 'long' });
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day} ${month} ${year} at ${hours}:${minutes}`;
  };

  const getLocationText = (note: BibleNote) => {
    // Ensure we have valid book and chapter data
    if (!note.book || !note.chapter) {
      return 'Unknown Location';
    }
    
    const bookName = getBookDisplayName(note.book);
    if (note.verse) {
      return `${bookName} ${note.chapter}:${note.verse}`;
    }
    return `${bookName} ${note.chapter}`;
  };

  // Create a readable preview from rich-text HTML by preserving basic line breaks
  const getNotePreview = (html: string): string => {
    if (!html) return '';
    try {
      // Preserve line breaks for paragraphs and <br> tags
      let text = html
        .replace(/<\s*br\s*\/?>/gi, '\n')
        .replace(/<\s*\/p\s*>/gi, '\n\n')
        .replace(/<\s*p\s*>/gi, '')
        .replace(/<\s*li\s*>/gi, '• ')
        .replace(/<\s*\/li\s*>/gi, '\n')
        .replace(/<\s*\/ul\s*>/gi, '\n')
        .replace(/<\s*\/ol\s*>/gi, '\n');

      // Strip remaining tags
      text = text.replace(/<[^>]*>/g, '');

      // Collapse excessive blank lines
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Hero Header */}
        <div className="relative mb-12 overflow-hidden rounded-3xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-white/20 dark:border-gray-700/20 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-indigo-600/10 dark:from-blue-400/5 dark:to-indigo-400/5"></div>
          <div className="relative p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
              <Button
                variant="outline"
                onClick={() => navigate('/bible')}
                className="flex items-center gap-2 self-start bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm border-white/30 dark:border-gray-600/30 hover:bg-white dark:hover:bg-gray-700 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back to Bible</span>
                <span className="sm:hidden">Back</span>
              </Button>
              <Button 
                onClick={() => setShowNewNoteDialog(true)}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 self-start sm:self-auto"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Note
              </Button>
            </div>
            
            <div className="text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-4 mb-6">
                <div className="relative p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl shadow-2xl">
                  <div className="absolute inset-0 bg-white/20 rounded-3xl"></div>
                  <BookOpen className="w-8 h-8 text-white relative z-10" />
                </div>
                <div>
                  <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
                    Bible Notes
                  </h1>
                  <div className="h-1 w-20 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"></div>
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-300 text-xl max-w-3xl mx-auto sm:mx-0 leading-relaxed">
                Capture divine insights, spiritual reflections, and profound discoveries as you journey through the sacred pages of God's Word
              </p>
            </div>
          </div>
        </div>

        {/* Enhanced Search & Filters */}
        <div className="mb-8">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20 dark:border-gray-700/20">
            <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-500" />
                <Input
                  placeholder="Search through your spiritual insights..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 h-12 bg-white/90 dark:bg-gray-700/90 border-blue-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent rounded-xl shadow-lg"
                />
              </div>
              <div className="flex gap-2">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-40 h-12 bg-white/90 dark:bg-gray-700/90 border-blue-200 dark:border-gray-600 rounded-xl shadow-lg">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-800 border-blue-200 dark:border-gray-600">
                    <SelectItem value="all">All Categories</SelectItem>
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
                  <SelectTrigger className="w-32 h-12 bg-white/90 dark:bg-gray-700/90 border-blue-200 dark:border-gray-600 rounded-xl shadow-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-800 border-blue-200 dark:border-gray-600">
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="book">Book</SelectItem>
                    <SelectItem value="title">Title</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Notes Content */}
        <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl border border-white/20 dark:border-gray-700/20 shadow-xl overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-blue-200 dark:border-gray-600 rounded-full animate-spin"></div>
                <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-blue-500 rounded-full animate-spin"></div>
              </div>
              <p className="mt-4 text-gray-600 dark:text-gray-400 font-medium">Loading your sacred notes...</p>
            </div>
          ) : filteredNotes.length > 0 ? (
            <div className="grid gap-6 p-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredNotes.map((note, index) => (
                <div
                  key={note.id}
                  className="group relative bg-white/90 dark:bg-gray-700/90 backdrop-blur-sm rounded-2xl p-6 cursor-pointer hover:bg-white dark:hover:bg-gray-700 transition-all duration-300 shadow-lg hover:shadow-2xl border border-gray-200/50 dark:border-gray-600/50 hover:border-blue-300 dark:hover:border-blue-500 transform hover:-translate-y-2"
                  onClick={() => { setSelectedNote(note); setShowNoteDialog(true); }}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  
                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                          <BookOpen className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                            {getCategoryInfo(note.category || 'insight').name}
                          </span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {getLocationText(note)}
                          </span>
                        </div>
                      </div>
                      {note.is_favorite && (
                        <Star className="w-5 h-5 text-yellow-500 fill-current" />
                      )}
                    </div>
                    
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                      {note.title || 'Untitled Note'}
                    </h3>
                    
                    <p className="text-gray-600 dark:text-gray-300 line-clamp-3 mb-4 leading-relaxed">
                      {getNotePreview(note.note_text)}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(note.created_at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      </div>
                    </div>
                    
                    {note.tags && note.tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {note.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700">
                            {tag}
                          </Badge>
                        ))}
                        {note.tags.length > 3 && (
                          <Badge variant="secondary" className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                            +{note.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 px-8">
              <div className="relative mb-8">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-gray-700 dark:to-gray-600 rounded-3xl flex items-center justify-center shadow-2xl">
                  <BookOpen className="w-12 h-12 text-blue-500 dark:text-blue-400" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                  <Plus className="w-4 h-4 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                {searchTerm ? 'No matching insights found' : 'Begin Your Spiritual Journey'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-center max-w-md leading-relaxed mb-8">
                {searchTerm 
                  ? 'Try adjusting your search terms or explore different categories to find your spiritual insights.'
                  : 'Start capturing your divine revelations, profound thoughts, and spiritual discoveries as you study God\'s Word.'
                }
              </p>
              {!searchTerm && (
                <Button 
                  onClick={() => setShowNewNoteDialog(true)}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Create Your First Note
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* iOS Style Note View Dialog */}
      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent className="w-screen h-[100dvh] max-w-none bg-gray-50 dark:bg-gray-900 rounded-none m-0 flex flex-col p-0 safe-area-inset">
          {/* iOS Style Header */}
          <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 pt-safe border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => setShowNoteDialog(false)}
              className="text-orange-500 hover:bg-gray-100 dark:hover:bg-gray-700 p-2"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              <span className="text-lg">All iCloud</span>
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Share2 className="w-5 h-5 text-orange-500" />
              </Button>
              <Button
                variant="ghost"
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => {
                  if (selectedNote) {
                    setShowNoteDialog(false);
                    editNote(selectedNote);
                  }
                }}
                title="Edit note"
              >
                <div className="w-8 h-8 rounded-full border-2 border-orange-500 flex items-center justify-center">
                  <Edit3 className="w-4 h-4 text-orange-500" />
                </div>
              </Button>
            </div>
          </div>

          {/* Note Content */}
          <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-900 px-4 pt-4 pb-6">
            {selectedNote && (
              <div 
                className="max-w-none cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg p-4 transition-colors duration-200"
                onClick={() => {
                  setShowNoteDialog(false);
                  editNote(selectedNote);
                }}
                title="Click anywhere to edit this note"
              >
                {/* Date with Close */}
                <div className="relative mb-4 mt-safe">
                  <div className="text-center text-sm text-gray-500 dark:text-gray-400 mb-2">
                    {formatDateTime(selectedNote.created_at)}
                  </div>
                  <Button
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowNoteDialog(false);
                    }}
                    className="absolute right-0 top-0 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 z-10"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </Button>
                </div>
                
                {/* Title */}
                <div className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
                  {selectedNote.title || 'Bible notes'}
                </div>
                
                {/* Content */}
                <div 
                  className="prose prose-base max-w-none dark:prose-invert text-gray-900 dark:text-gray-100 leading-relaxed [&_p]:mb-0 [&_p:last-child]:mb-0 [&_p+p]:mt-4 [&_br]:block [&_br]:content-[''] [&_br]:mt-0 [&_br]:mb-0"
                  dangerouslySetInnerHTML={{ __html: selectedNote.note_text }}
                />
              </div>
            )}
          </div>

          {/* Simplified Bottom Toolbar */}
          <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center justify-around">
            <Button 
              variant="ghost" 
              className="p-3"
              onClick={() => {
                if (selectedNote) {
                  setShowNoteDialog(false);
                  editNote(selectedNote);
                }
              }}
            >
              <div className="flex flex-col items-center">
                <Edit3 className="w-6 h-6 text-orange-500 mb-1" />
              </div>
            </Button>
            <Button variant="ghost" className="p-3" onClick={() => setShowNoteDialog(false)}>
              <div className="flex flex-col items-center">
                <X className="w-6 h-6 text-gray-400 mb-1" />
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* iOS Style New/Edit Note Dialog */}
      <Dialog open={showNewNoteDialog} onOpenChange={setShowNewNoteDialog}>
        <DialogContent className="w-screen h-[100dvh] max-w-none bg-gray-50 dark:bg-gray-900 rounded-none m-0 flex flex-col p-0 safe-area-inset">
          {/* iOS Style Header */}
          <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 pt-safe border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => setShowNewNoteDialog(false)}
              className="text-orange-500 hover:bg-gray-100 dark:hover:bg-gray-700 p-2"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              <span className="text-lg">All iCloud</span>
            </Button>
            <div className="flex items-center gap-4">
              <Button variant="ghost" className="p-2">
                <div className="w-6 h-6 border-2 border-gray-400 rounded-full flex items-center justify-center">
                  <ArrowLeft className="w-3 h-3 text-gray-400" />
                </div>
              </Button>
              <Button variant="ghost" className="p-2">
                <div className="w-6 h-6 border-2 border-gray-400 rounded-full flex items-center justify-center">
                  <ArrowLeft className="w-3 h-3 text-gray-400 rotate-180" />
                </div>
              </Button>
              <Button variant="ghost" className="p-2">
                <Share2 className="w-5 h-5 text-orange-500" />
              </Button>
              <Button variant="ghost" className="p-2">
                <div className="w-8 h-8 rounded-full border-2 border-orange-500 flex items-center justify-center">
                  <span className="text-orange-500 text-lg">⋯</span>
                </div>
              </Button>
              <Button
                onClick={editingNote ? updateNote : saveNote}
                disabled={loading || !newNote.note_text.trim()}
                className="bg-orange-500 hover:bg-orange-600 text-white font-medium px-6 py-2 rounded-lg shadow-sm"
                variant="default"
              >
                {editingNote ? 'Save' : 'Save'}
              </Button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Date and Title Section */}
            <div className="bg-white dark:bg-gray-900 px-4 pt-4 pb-4">
              <div className="relative mb-4">
                <div className="text-center text-sm text-gray-500 dark:text-gray-400 mb-2">
                  {new Date().toLocaleDateString('en-US', { 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
                <Button
                  variant="ghost"
                  onClick={() => setShowNewNoteDialog(false)}
                  className="absolute right-0 top-0 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 z-10"
                  aria-label="Close"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </Button>
              </div>

              <Input
                placeholder="Title"
                value={newNote.title}
                onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                className="text-2xl font-semibold border-none bg-transparent focus:ring-0 px-0 placeholder:text-gray-400 text-gray-900 dark:text-gray-100 mb-4"
              />
              
              {/* Bible Location Selection */}
              <div className="space-y-4 mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Bible Reference</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Book</label>
                    <Select value={newNote.book} onValueChange={(value) => setNewNote({ ...newNote, book: value })}>
                      <SelectTrigger className="h-10 bg-white dark:bg-gray-700">
                        <SelectValue placeholder="Select book" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-gray-800 max-h-60">
                        <div className="px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-400">Old Testament</div>
                        {bibleBooks["Old Testament"].map((book) => (
                          <SelectItem key={book.apiName} value={book.apiName}>
                            {book.name}
                          </SelectItem>
                        ))}
                        <div className="px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 mt-2">New Testament</div>
                        {bibleBooks["New Testament"].map((book) => (
                          <SelectItem key={book.apiName} value={book.apiName}>
                            {book.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Chapter</label>
                    <Input
                      type="number"
                      placeholder="Chapter"
                      value={newNote.chapter}
                      onChange={(e) => setNewNote({ ...newNote, chapter: e.target.value })}
                      className="h-10 bg-white dark:bg-gray-700"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Verse (optional)</label>
                    <Input
                      type="number"
                      placeholder="Verse"
                      value={newNote.verse}
                      onChange={(e) => setNewNote({ ...newNote, verse: e.target.value })}
                      className="h-10 bg-white dark:bg-gray-700"
                      min="1"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="bg-white dark:bg-gray-900 px-4">
              <RichTextEditor
                content={newNote.note_text}
                onChange={(content) => setNewNote({ ...newNote, note_text: content })}
                placeholder="Start writing..."
                ref={richTextEditorRef}
              />
              
              {/* Save Button in Content Area */}
              <div className="mt-6 pb-4">
                <Button
                  onClick={editingNote ? updateNote : saveNote}
                  disabled={loading || !newNote.note_text.trim()}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-3 rounded-lg shadow-sm"
                  size="lg"
                >
                  {loading ? 'Saving...' : (editingNote ? 'Save Changes' : 'Save Note')}
                </Button>
              </div>
            </div>
          </div>

          {/* iOS Style Bottom Toolbar */}
          <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center justify-around">
            <Button variant="ghost" className="p-3">
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center mb-1">
                  <span className="text-white text-xs">●</span>
                </div>
              </div>
            </Button>
            <Button variant="ghost" className="p-3">
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 border-2 border-gray-400 rounded grid grid-cols-3 gap-px p-1">
                  {[...Array(9)].map((_, i) => (
                    <div key={i} className="bg-gray-400 rounded-full w-1 h-1"></div>
                  ))}
                </div>
              </div>
            </Button>
            <Button variant="ghost" className="p-3" onClick={() => document.getElementById('note-attachment-input')?.click()}>
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 border-2 border-orange-500 rounded flex items-center justify-center mb-1">
                  <span className="text-orange-500 text-xs">📎</span>
                </div>
              </div>
            </Button>
            <Button variant="ghost" className="p-3">
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 border-2 border-orange-500 rounded-full flex items-center justify-center mb-1">
                  <span className="text-orange-500 text-sm">Aa</span>
                </div>
              </div>
            </Button>
            <input id="note-attachment-input" type="file" accept="image/*" className="hidden" onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file || !user) return;
              try {
                const fileExt = file.name.split('.').pop();
                const filePath = `bible-notes/${user.id}/${Date.now()}.${fileExt}`;
                const { data, error } = await supabase.storage.from('attachments').upload(filePath, file, { upsert: false });
                if (error) throw error;
                const { data: publicUrl } = supabase.storage.from('attachments').getPublicUrl(data.path);
                const url = publicUrl.publicUrl;
                richTextEditorRef.current?.insertImage(url, file.name);
                toast({ title: 'Image attached', description: 'Your image has been added to the note.' });
              } catch (err) {
                console.error('Attachment upload failed', err);
                toast({ title: 'Upload failed', description: 'Could not upload attachment', variant: 'destructive' });
              } finally {
                (e.target as HTMLInputElement).value = '';
              }
            }} />
            <Button
              onClick={editingNote ? updateNote : saveNote}
              disabled={loading || !newNote.note_text.trim()}
              className="ml-2 bg-orange-500 text-white hover:bg-orange-600 px-6 py-2 rounded-lg shadow-sm font-medium"
            >
              {loading ? 'Saving...' : (editingNote ? 'Save Changes' : 'Save Note')}
            </Button>
            <Button variant="ghost" className="p-3">
              <div className="flex flex-col items-center">
                <X className="w-6 h-6 text-gray-400 mb-1" />
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BibleNotesPage;