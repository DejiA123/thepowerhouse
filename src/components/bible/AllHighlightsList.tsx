import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { bibleBooks } from './BibleBookList';
import { normalizeBookApiName } from './bookUtils';
import { Button } from '@/components/ui/button';

interface AllHighlightsListProps {
  onNavigate: (bookApiName: string, chapter: number) => void;
}

interface HighlightRow {
  id: string;
  book: string;
  chapter: number;
  verse: number | null;
  highlight_color: string | null;
}

const formatBookName = (api: string) => {
  const all = [...bibleBooks['Old Testament'], ...bibleBooks['New Testament']];
  return all.find(b => b.apiName === api)?.name || api.replace(/_/g, ' ');
};

export const AllHighlightsList = ({ onNavigate }: AllHighlightsListProps) => {
  const { user } = useAuth();
  const [highlights, setHighlights] = useState<HighlightRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('bible_highlights')
        .select('id, book, chapter, verse, highlight_color')
        .eq('user_id', user.id)
        .order('book', { ascending: true })
        .order('chapter', { ascending: true })
        .order('verse', { ascending: true });
      if (!error) setHighlights((data || []) as any);
      setLoading(false);
    };
    load();
  }, [user]);

  if (!user) {
    return <div className="text-sm text-muted-foreground">Please login to view your highlights.</div>;
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading highlights...</div>;
  }

  if (!highlights.length) {
    return <div className="text-sm text-muted-foreground">You have no highlights yet.</div>;
  }

  return (
    <div className="space-y-2">
      {highlights.map(h => {
        const api = normalizeBookApiName(h.book);
        const label = `${formatBookName(api)} ${h.chapter}${h.verse ? ':' + h.verse : ''}`;
        return (
          <Button
            key={h.id}
            variant="outline"
            className="w-full justify-start"
            onClick={() => onNavigate(api, h.chapter)}
          >
            <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ backgroundColor: `var(--${h.highlight_color || 'yellow'}-500, #eab308)` }} />
            {label}
          </Button>
        );
      })}
    </div>
  );
};

export default AllHighlightsList;