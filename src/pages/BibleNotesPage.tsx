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
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Modern Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <Button
              variant="outline"
              onClick={() => navigate('/bible')}
              className="flex items-center gap-2 self-start hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to Bible</span>
              <span className="sm:hidden">Back</span>
            </Button>
            <Button 
              onClick={() => setShowNewNoteDialog(true)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Note
            </Button>
          </div>
          
          <div className="text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-3 mb-3">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
                <span className="text-xl">📖</span>
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Bible Notes
                </h1>
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-lg max-w-2xl mx-auto sm:mx-0">
              Capture your insights, reflections, and spiritual discoveries as you journey through God's Word
            </p>
          </div>
        </div>

        {/* Enhanced Search */}
        <div className="mb-6">
          <div className="relative max-w-md mx-auto sm:mx-0">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
            <Input
              placeholder="Search your notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-12 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 rounded-xl"
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white dark:bg-gray-900 min-h-screen">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-orange-500"></div>
            </div>
          ) : filteredNotes.length > 0 ? (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredNotes.map((note) => (
                <div
                  key={note.id}
                  className="px-4 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 active:bg-gray-100 dark:active:bg-gray-750"
                  onClick={() => { setSelectedNote(note); setShowNoteDialog(true); }}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                      <Folder className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1 line-clamp-1">
                        {note.title || 'Bible notes'}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                        {formatDate(note.created_at)} {getNotePreview(note.note_text).substring(0, 50)}...
                      </div>
                      <div className="flex items-center text-xs text-gray-400 dark:text-gray-500">
                        <Folder className="w-3 h-3 mr-1" />
                        <span>Notes</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 px-4">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-center">
                {searchTerm ? 'No matching notes found' : 'No notes yet'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* iOS Style Note View Dialog */}
      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent className="w-screen h-[100dvh] max-w-none bg-gray-50 dark:bg-gray-900 rounded-none m-0 flex flex-col p-0">
          {/* iOS Style Header */}
          <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
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
                <div className="relative mb-4">
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
                  className="prose prose-base max-w-none dark:prose-invert text-gray-900 dark:text-gray-100 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: selectedNote.note_text }}
                />
                
                {/* Edit hint */}
                <div className="mt-6 text-center">
                  <div className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-full">
                    <Edit3 className="w-4 h-4" />
                    <span>Tap anywhere to edit</span>
                  </div>
                </div>
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
        <DialogContent className="w-screen h-[100dvh] max-w-none bg-gray-50 dark:bg-gray-900 rounded-none m-0 flex flex-col p-0">
          {/* iOS Style Header */}
          <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
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
                className="text-2xl font-semibold border-none bg-transparent focus:ring-0 px-0 placeholder:text-gray-400 text-gray-900 dark:text-gray-100"
              />
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