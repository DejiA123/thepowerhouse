
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Plus, Save, Trash2, Edit, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { formatBookDisplayName } from "./bookUtils";

interface BibleNote {
  id: string;
  book: string;
  chapter: number;
  verse?: number;
  note_text: string;
  created_at: string;
}

interface BibleNotesProps {
  book: string;
  chapter: number;
  verse?: number;
  onBackToChapters?: () => void;
}

const BibleNotes = ({ book, chapter, verse, onBackToChapters }: BibleNotesProps) => {
  const [notes, setNotes] = useState<BibleNote[]>([]);
  const [newNote, setNewNote] = useState("");
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchNotes();
    }
  }, [user, book, chapter, verse]);

  const fetchNotes = async () => {
    let query = supabase
      .from('bible_notes')
      .select('*')
      .eq('book', book)
      .eq('chapter', chapter)
      .order('created_at', { ascending: false });

    if (verse) {
      query = query.eq('verse', verse);
    }

    const { data, error } = await query;

    if (error) {
      toast({ title: "Error", description: "Failed to load notes", variant: "destructive" });
    } else {
      setNotes(data || []);
    }
  };

  const saveNote = async () => {
    if (!newNote.trim() || !user) return;

    const { error } = await supabase
      .from('bible_notes')
      .insert({
        user_id: user.id,
        book,
        chapter,
        verse,
        note_text: newNote.trim()
      });

    if (error) {
      toast({ title: "Error", description: "Failed to save note", variant: "destructive" });
    } else {
      setNewNote("");
      fetchNotes();

    }
  };

  const updateNote = async (noteId: string) => {
    if (!editText.trim()) return;

    const { error } = await supabase
      .from('bible_notes')
      .update({
        note_text: editText.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', noteId);

    if (error) {
      toast({ title: "Error", description: "Failed to update note", variant: "destructive" });
    } else {
      setEditingNote(null);
      setEditText("");
      fetchNotes();

    }
  };

  const deleteNote = async (noteId: string) => {
    const { error } = await supabase
      .from('bible_notes')
      .delete()
      .eq('id', noteId);

    if (error) {
      toast({ title: "Error", description: "Failed to delete note", variant: "destructive" });
    } else {
      fetchNotes();

    }
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Please log in to take notes</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="bg-background">
      <div className="px-1 py-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-indigo-500" />
            <h2 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              My Notes - {formatBookDisplayName(book)} {chapter}{verse ? `:${verse}` : ''}
            </h2>
          </div>
          {onBackToChapters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBackToChapters}
              className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-full font-semibold transition-all"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Chapter
            </Button>
          )}
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <Textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Write your note here..."
              className="min-h-[120px] rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 transition-all text-base"
            />
            <Button
              onClick={saveNote}
              className="w-full h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-500/20 transition-all active:scale-[0.98]"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Note
            </Button>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            {notes.map((note) => (
              <div key={note.id} className="bg-slate-50/50 dark:bg-slate-900/50 p-5 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
                {editingNote === note.id ? (
                  <div className="space-y-3">
                    <Textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="min-h-[100px] rounded-xl border-slate-200 dark:border-slate-800"
                    />
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        onClick={() => updateNote(note.id)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-4"
                      >
                        <Save className="w-3 h-3 mr-1" />
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingNote(null)}
                        className="rounded-full px-4"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-4 select-text">{note.note_text}</p>
                    <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                      <span className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                        {new Date(note.created_at).toLocaleDateString()}
                      </span>
                      <div className="flex space-x-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingNote(note.id);
                            setEditText(note.note_text);
                          }}
                          className="h-8 w-8 p-0 rounded-full hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-indigo-600"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteNote(note.id)}
                          className="h-8 w-8 p-0 rounded-full hover:bg-red-50 text-red-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BibleNotes;
