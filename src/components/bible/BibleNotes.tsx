
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Plus, Save, Trash2, Edit, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

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
      toast({ title: "Success", description: "Note saved successfully" });
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
      toast({ title: "Success", description: "Note updated successfully" });
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
      toast({ title: "Success", description: "Note deleted successfully" });
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Plus className="w-5 h-5" />
            <span>My Notes - {book} {chapter}{verse ? `:${verse}` : ''}</span>
          </CardTitle>
          {onBackToChapters && (
            <Button variant="outline" size="sm" onClick={onBackToChapters}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Chapter
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Write your note here..."
            className="min-h-[100px]"
          />
          <Button onClick={saveNote} className="w-full">
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
        </div>

        <div className="space-y-3">
          {notes.map((note) => (
            <div key={note.id} className="bg-accent p-3 rounded-lg">
              {editingNote === note.id ? (
                <div className="space-y-2">
                  <Textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="min-h-[80px]"
                  />
                  <div className="flex space-x-2">
                    <Button size="sm" onClick={() => updateNote(note.id)}>
                      <Save className="w-3 h-3 mr-1" />
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingNote(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-sm mb-2">{note.note_text}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{new Date(note.created_at).toLocaleDateString()}</span>
                    <div className="flex space-x-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingNote(note.id);
                          setEditText(note.note_text);
                        }}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteNote(note.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default BibleNotes;
