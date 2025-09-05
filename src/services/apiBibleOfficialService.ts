export interface ApiBiblePassageResponse {
  data?: {
    id: string;
    content?: string;
    reference?: string;
  };
}

const API_BASE = 'https://api.scripture.api.bible/v1';

export const apiBibleOfficialService = {
  async fetchPassage(bibleId: string, bookName: string, chapter: number, apiKey: string): Promise<string | null> {
    try {
      const reference = `${bookName} ${chapter}`;
      const url = `${API_BASE}/bibles/${encodeURIComponent(bibleId)}/passages?reference=${encodeURIComponent(reference)}&contentType=text&includeVerseNumbers=true&includeVerseSpans=true&useOrgId=false`;
      const resp = await fetch(url, {
        headers: {
          'accept': 'application/json',
          'api-key': apiKey,
        },
      });
      if (!resp.ok) {
        console.warn('api.bible HTTP', resp.status, await safeText(resp));
        return null;
      }
      const json: ApiBiblePassageResponse = await resp.json();
      return (json?.data?.content || '').trim() || null;
    } catch (e) {
      console.error('apiBibleOfficialService.fetchPassage error', e);
      return null;
    }
  },
};

async function safeText(r: Response): Promise<string> {
  try { return (await r.text()).slice(0, 200); } catch { return ''; }
}

