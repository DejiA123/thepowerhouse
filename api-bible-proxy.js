const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const API_BIBLE_BOOK_IDS = {
  genesis: "GEN", exodus: "EXO", leviticus: "LEV", numbers: "NUM", deuteronomy: "DEU", joshua: "JOS", judges: "JDG", ruth: "RUT", "1-samuel": "1SA", "2-samuel": "2SA", "1-kings": "1KI", "2-kings": "2KI", "1-chronicles": "1CH", "2-chronicles": "2CH", ezra: "EZR", nehemiah: "NEH", esther: "EST", job: "JOB", psalms: "PSA", proverbs: "PRO", ecclesiastes: "ECC", "song-of-solomon": "SNG", isaiah: "ISA", jeremiah: "JER", lamentations: "LAM", ezekiel: "EZK", daniel: "DAN", hosea: "HOS", joel: "JOL", amos: "AMO", obadiah: "OBA", jonah: "JON", micah: "MIC", nahum: "NAM", habakkuk: "HAB", zephaniah: "ZEP", haggai: "HAG", zechariah: "ZEC", malachi: "MAL", matthew: "MAT", mark: "MRK", luke: "LUK", john: "JHN", acts: "ACT", romans: "ROM", "1-corinthians": "1CO", "2-corinthians": "2CO", galatians: "GAL", ephesians: "EPH", philippians: "PHP", colossians: "COL", "1-thessalonians": "1TH", "2-thessalonians": "2TH", "1-timothy": "1TI", "2-timothy": "2TI", titus: "TIT", philemon: "PHM", hebrews: "HEB", james: "JAS", "1-peter": "1PE", "2-peter": "2PE", "1-john": "1JN", "2-john": "2JN", "3-john": "3JN", jude: "JUD", revelation: "REV"
};

const API_BIBLE_KEY = '22d1feb853c8bb04c2f99c8f2badb9bc';
const API_BIBLE_BASE_URL = 'https://api.scripture.api.bible/v1';

let cachedAudioBibleId = null;

async function getAudioBibleId() {
  if (cachedAudioBibleId) return cachedAudioBibleId;
  const url = `${API_BIBLE_BASE_URL}/audio-bibles`;
  const response = await fetch(url, {
    headers: {
      'api-key': API_BIBLE_KEY,
      'Content-Type': 'application/json',
    },
  });
  const data = await response.json();
  if (data.data && data.data.length > 0) {
    // Prefer ESV if available, else use the first
    const esv = data.data.find(b => b.abbreviation && b.abbreviation.toUpperCase().includes('ESV'));
    cachedAudioBibleId = esv ? esv.id : data.data[0].id;
    return cachedAudioBibleId;
  }
  throw new Error('No audio Bibles found in API.Bible');
}

const app = express();
app.use(cors());

app.get('/api/audio', async (req, res) => {
  const { book, chapter } = req.query;
  if (!book || !chapter) {
    return res.status(400).json({ error: 'Missing book or chapter parameter' });
  }
  const bookId = API_BIBLE_BOOK_IDS[book.toLowerCase()];
  if (!bookId) {
    return res.status(400).json({ error: `Book not found: ${book}` });
  }
  try {
    const audioBibleId = await getAudioBibleId();
    const chapterId = `${bookId}.${chapter}`;
    const url = `${API_BIBLE_BASE_URL}/audio-bibles/${audioBibleId}/books/${bookId}/chapters/${chapterId}`;
    const response = await fetch(url, {
      headers: {
        'api-key': API_BIBLE_KEY,
        'Content-Type': 'application/json',
      },
    });
    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data?.message || `HTTP ${response.status}` });
    }
    // The audio files are usually in data.audioFiles
    if (data.data && data.data.audioFiles && data.data.audioFiles.length > 0 && data.data.audioFiles[0].url) {
      return res.json({ audioUrl: data.data.audioFiles[0].url });
    }
    return res.status(404).json({ error: 'No audio URL found in API.Bible audio-bibles response.' });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`API.Bible proxy server running on port ${PORT}`);
}); 