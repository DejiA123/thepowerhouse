import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Trash2, Edit3, Plus, Star, Eye, EyeOff, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  created_at: string;
  updated_at?: string;
}

interface BibleNotesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  book: string;
  chapter: number;
  verse?: number;
}

const NOTE_CATEGORIES = [
  { id: 'insight', name: 'Insight', color: 'bg-blue-100 text-blue-800', icon: '💡' },
  { id: 'question', name: 'Question', color: 'bg-yellow-100 text-yellow-800', icon: '❓' },
  { id: 'prayer', name: 'Prayer', color: 'bg-purple-100 text-purple-800', icon: '🙏' },
  { id: 'application', name: 'Application', color: 'bg-green-100 text-green-800', icon: '🎯' },
  { id: 'cross-reference', name: 'Cross Reference', color: 'bg-orange-100 text-orange-800', icon: '🔗' },
  { id: 'study', name: 'Study', color: 'bg-indigo-100 text-indigo-800', icon: '📚' },
  { id: 'personal', name: 'Personal', color: 'bg-pink-100 text-pink-800', icon: '❤️' },
  { id: 'sermon', name: 'Sermon', color: 'bg-red-100 text-red-800', icon: '⛪' },
];

const DEFAULT_TAGS = [
  'Important', 'Key Verse', 'Promise', 'Command', 'Warning', 'Comfort',
  'Prophecy', 'Miracle', 'Parable', 'Prayer', 'Worship', 'Faith', 'Love',
  'Forgiveness', 'Salvation', 'Grace', 'Mercy', 'Justice', 'Wisdom'
];

export const BibleNotesDialog = ({ open, onOpenChange, book, chapter, verse }: BibleNotesDialogProps) => {
  const [notes, setNotes] = useState<BibleNote[]>([]);
  const [newNote, setNewNote] = useState({
    title: '',
    note_text: '',
    category: 'none',
    tags: [] as string[],
    is_favorite: false,
    is_private: false
  });
  const [editingNote, setEditingNote] = useState<BibleNote | null>(null);
  const [loading, setLoading] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user && open) {
      fetchNotes();
    }
  }, [user, book, chapter, verse, open]);

  const fetchNotes = async () => {
    if (!user) return;

    try {
      const query = supabase
        .from('bible_notes')
        .select('*')
        .eq('user_id', user.id)
        .eq('book', book)
        .eq('chapter', chapter);

      if (verse) {
        query.eq('verse', verse);
      }

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
    }
  };

  const saveNote = async () => {
    if (!user || !newNote.note_text.trim()) return;

    setLoading(true);
    try {
      const noteData = {
        user_id: user.id,
        book,
        chapter,
        verse,
        note_text: newNote.note_text.trim(),
        title: newNote.title.trim() || null,
        category: (newNote.category && newNote.category !== 'none') ? newNote.category : null,
        tags: newNote.tags.length > 0 ? newNote.tags : null,
        is_favorite: newNote.is_favorite,
        is_private: newNote.is_private,
      };

      const { error } = await supabase
        .from('bible_notes')
        .insert(noteData);

      if (error) throw error;

      toast({
        title: "Note Saved",
        description: "Your note has been saved successfully",
      });

      // Reset form
      setNewNote({
        title: '',
        note_text: '',
        category: 'none',
        tags: [],
        is_favorite: false,
        is_private: false
      });

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

  const updateNote = async () => {
    if (!editingNote || !editingNote.note_text.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('bible_notes')
        .update({
          note_text: editingNote.note_text.trim(),
          title: editingNote.title || null,
          category: (editingNote.category && editingNote.category !== 'none') ? editingNote.category : null,
          tags: editingNote.tags || null,
          is_favorite: editingNote.is_favorite,
          is_private: editingNote.is_private,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingNote.id);

      if (error) throw error;

      toast({
        title: "Note Updated",
        description: "Your note has been updated successfully",
      });

      setEditingNote(null);
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
    if (!confirm('Are you sure you want to delete this note? This action cannot be undone.')) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('bible_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;

      toast({
        title: "Note Deleted",
        description: "Your note has been deleted",
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

  const toggleFavorite = async (note: BibleNote) => {
    try {
      const { error } = await supabase
        .from('bible_notes')
        .update({ is_favorite: !note.is_favorite })
        .eq('id', note.id);

      if (error) throw error;
      await fetchNotes();
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const addTag = (tag: string) => {
    if (tag.trim() && !newNote.tags.includes(tag.trim())) {
      setNewNote(prev => ({
        ...prev,
        tags: [...prev.tags, tag.trim()]
      }));
    }
    setTagInput('');
    setShowTagSuggestions(false);
  };

  const removeTag = (tagToRemove: string) => {
    setNewNote(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const getCategoryInfo = (categoryId: string) => {
    return NOTE_CATEGORIES.find(cat => cat.id === categoryId) || NOTE_CATEGORIES[0];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getLocationText = () => {
    // Replace hyphens/underscores and handle title casing (e.g., 1-john -> 1 John)
    const formattedBook = book.replace(/[-_]/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    if (verse) {
      return `${formattedBook} ${chapter}:${verse}`;
    }
    return `${formattedBook} ${chapter}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            My Notes - {getLocationText()}
          </DialogTitle>
          <DialogDescription>
            Create, edit, and manage your Bible study notes for this chapter or verse.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Add New Note */}
          <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
            <h3 className="text-lg font-semibold">Add New Note</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Title (Optional)</label>
                <Input
                  value={newNote.title}
                  onChange={(e) => setNewNote(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Give your note a title..."
                />
              </div>

              <div>
                <label className="text-sm font-medium">Category</label>
                <Select value={newNote.category} onValueChange={(value) => setNewNote(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Category</SelectItem>
                    {NOTE_CATEGORIES.map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.icon} {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Note Content *</label>
              <Textarea
                value={newNote.note_text}
                onChange={(e) => setNewNote(prev => ({ ...prev, note_text: e.target.value }))}
                placeholder="Write your note here... You can include insights, questions, prayers, applications, or any thoughts about this passage."
                className="min-h-[100px]"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Tags</label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => {
                      setTagInput(e.target.value);
                      setShowTagSuggestions(e.target.value.length > 0);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && tagInput.trim()) {
                        e.preventDefault();
                        addTag(tagInput);
                      }
                    }}
                    placeholder="Add tags..."
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => addTag(tagInput)}
                    disabled={!tagInput.trim()}
                  >
                    Add
                  </Button>
                </div>

                {showTagSuggestions && (
                  <div className="border rounded-lg p-2 max-h-32 overflow-y-auto">
                    <div className="text-xs text-muted-foreground mb-2">Suggestions:</div>
                    <div className="flex flex-wrap gap-1">
                      {DEFAULT_TAGS
                        .filter(tag => tag.toLowerCase().includes(tagInput.toLowerCase()))
                        .map(tag => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                            onClick={() => addTag(tag)}
                          >
                            {tag}
                          </Badge>
                        ))}
                    </div>
                  </div>
                )}

                {newNote.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {newNote.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="cursor-pointer hover:bg-red-100 hover:text-red-800"
                        onClick={() => removeTag(tag)}
                      >
                        {tag} <X className="w-3 h-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newNote.is_favorite}
                  onChange={(e) => setNewNote(prev => ({ ...prev, is_favorite: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">Mark as favorite</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newNote.is_private}
                  onChange={(e) => setNewNote(prev => ({ ...prev, is_private: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">Private note</span>
              </label>
            </div>

            <Button
              onClick={saveNote}
              disabled={!newNote.note_text.trim() || loading}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              {loading ? 'Saving...' : 'Save Note'}
            </Button>
          </div>

          {/* Existing Notes */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Your Notes ({notes.length})</h3>
            <ScrollArea className="h-[400px] border rounded-lg p-4">
              {notes.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No notes yet for this passage</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {notes.map((note) => (
                    <div key={note.id} className="border rounded-lg p-4 space-y-3 bg-background">
                      {editingNote?.id === note.id ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="text-sm font-medium">Title</label>
                              <Input
                                value={editingNote.title || ''}
                                onChange={(e) => setEditingNote(prev => prev ? { ...prev, title: e.target.value } : null)}
                                placeholder="Note title..."
                              />
                            </div>

                            <div>
                              <label className="text-sm font-medium">Category</label>
                              <Select
                                value={editingNote.category || 'none'}
                                onValueChange={(value) => setEditingNote(prev => prev ? { ...prev, category: value } : null)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">No Category</SelectItem>
                                  {NOTE_CATEGORIES.map(category => (
                                    <SelectItem key={category.id} value={category.id}>
                                      {category.icon} {category.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div>
                            <label className="text-sm font-medium">Note Content</label>
                            <Textarea
                              value={editingNote.note_text}
                              onChange={(e) => setEditingNote(prev => prev ? { ...prev, note_text: e.target.value } : null)}
                              className="min-h-[80px]"
                            />
                          </div>

                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={editingNote.is_favorite || false}
                                onChange={(e) => setEditingNote(prev => prev ? { ...prev, is_favorite: e.target.checked } : null)}
                                className="rounded"
                              />
                              <span className="text-sm">Mark as favorite</span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={editingNote.is_private || false}
                                onChange={(e) => setEditingNote(prev => prev ? { ...prev, is_private: e.target.checked } : null)}
                                className="rounded"
                              />
                              <span className="text-sm">Private note</span>
                            </label>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              onClick={updateNote}
                              disabled={loading}
                              size="sm"
                            >
                              Save
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => setEditingNote(null)}
                              size="sm"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between items-start gap-3">
                            <div className="flex-1">
                              {note.title && (
                                <h4 className="font-medium text-foreground mb-1">{note.title}</h4>
                              )}
                              <p className="text-sm leading-relaxed text-muted-foreground">{note.note_text}</p>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleFavorite(note)}
                                className={`h-8 w-8 p-0 ${note.is_favorite ? 'text-yellow-500' : 'text-muted-foreground'}`}
                              >
                                <Star className={`w-4 h-4 ${note.is_favorite ? 'fill-current' : ''}`} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingNote(note)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit3 className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteNote(note.id)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {note.category && (
                              <Badge variant="secondary" className={getCategoryInfo(note.category).color}>
                                {getCategoryInfo(note.category).icon} {getCategoryInfo(note.category).name}
                              </Badge>
                            )}
                            {note.tags && note.tags.map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>

                          <div className="flex justify-between items-center text-xs text-muted-foreground pt-2 border-t">
                            <div className="flex items-center gap-2">
                              {note.verse && (
                                <Badge variant="secondary" className="text-xs">
                                  Verse {note.verse}
                                </Badge>
                              )}
                              {note.is_private && <EyeOff className="w-3 h-3" />}
                            </div>
                            <span>{formatDate(note.created_at)}</span>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BibleNotesDialog;
