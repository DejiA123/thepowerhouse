import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { method, url } = req
    const urlObj = new URL(url)
    const path = urlObj.pathname.replace('/bible-brain-api', '')
    const searchParams = urlObj.searchParams

    // Bible Brain API configuration
    const BIBLE_BRAIN_API_KEY = '56e1f369-6e9b-4f68-aa20-5f51c1111eef'
    const BIBLE_BRAIN_BASE_URL = 'https://4.dbt.io/api'

    // Book mapping for Bible Brain API
    const BIBLE_BRAIN_BOOK_MAP: Record<string, string> = {
      'genesis': 'GEN', 'exodus': 'EXO', 'leviticus': 'LEV', 'numbers': 'NUM',
      'deuteronomy': 'DEU', 'joshua': 'JOS', 'judges': 'JDG', 'ruth': 'RUT',
      '1-samuel': '1SA', '2-samuel': '2SA', '1-kings': '1KI', '2-kings': '2KI',
      '1-chronicles': '1CH', '2-chronicles': '2CH', 'ezra': 'EZR', 'nehemiah': 'NEH',
      'esther': 'EST', 'job': 'JOB', 'psalms': 'PSA', 'proverbs': 'PRO',
      'ecclesiastes': 'ECC', 'song-of-solomon': 'SNG', 'isaiah': 'ISA', 'jeremiah': 'JER',
      'lamentations': 'LAM', 'ezekiel': 'EZK', 'daniel': 'DAN', 'hosea': 'HOS',
      'joel': 'JOL', 'amos': 'AMO', 'obadiah': 'OBA', 'jonah': 'JON',
      'micah': 'MIC', 'nahum': 'NAM', 'habakkuk': 'HAB', 'zephaniah': 'ZEP',
      'haggai': 'HAG', 'zechariah': 'ZEC', 'malachi': 'MAL', 'matthew': 'MAT',
      'mark': 'MRK', 'luke': 'LUK', 'john': 'JHN', 'acts': 'ACT', 'romans': 'ROM',
      '1-corinthians': '1CO', '2-corinthians': '2CO', 'galatians': 'GAL', 'ephesians': 'EPH',
      'philippians': 'PHP', 'colossians': 'COL', '1-thessalonians': '1TH', '2-thessalonians': '2TH',
      '1-timothy': '1TI', '2-timothy': '2TI', 'titus': 'TIT', 'philemon': 'PHM',
      'hebrews': 'HEB', 'james': 'JAS', '1-peter': '1PE', '2-peter': '2PE',
      '1-john': '1JN', '2-john': '2JN', '3-john': '3JN', 'jude': 'JUD', 'revelation': 'REV'
    }

    // Route handlers
    if (path === '/versions' && method === 'GET') {
      return await getVersions(BIBLE_BRAIN_BASE_URL, BIBLE_BRAIN_API_KEY)
    }

    if (path === '/chapter' && method === 'GET') {
      const version = searchParams.get('version')
      const book = searchParams.get('book')
      const chapter = searchParams.get('chapter')
      
      if (!version || !book || !chapter) {
        return new Response(
          JSON.stringify({ error: 'Missing required parameters: version, book, chapter' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      return await getChapter(BIBLE_BRAIN_BASE_URL, BIBLE_BRAIN_API_KEY, version, book, parseInt(chapter), BIBLE_BRAIN_BOOK_MAP)
    }

    if (path === '/audio' && method === 'GET') {
      const version = searchParams.get('version')
      const book = searchParams.get('book')
      const chapter = searchParams.get('chapter')
      
      if (!version || !book || !chapter) {
        return new Response(
          JSON.stringify({ error: 'Missing required parameters: version, book, chapter' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      return await getAudio(BIBLE_BRAIN_BASE_URL, BIBLE_BRAIN_API_KEY, version, book, parseInt(chapter), BIBLE_BRAIN_BOOK_MAP)
    }

    if (path === '/verse' && method === 'GET') {
      const version = searchParams.get('version')
      const book = searchParams.get('book')
      const chapter = searchParams.get('chapter')
      const verse = searchParams.get('verse')
      
      if (!version || !book || !chapter || !verse) {
        return new Response(
          JSON.stringify({ error: 'Missing required parameters: version, book, chapter, verse' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      return await getVerse(BIBLE_BRAIN_BASE_URL, BIBLE_BRAIN_API_KEY, version, book, parseInt(chapter), parseInt(verse), BIBLE_BRAIN_BOOK_MAP)
    }

    if (path === '/search' && method === 'GET') {
      const version = searchParams.get('version')
      const query = searchParams.get('query')
      
      if (!version || !query) {
        return new Response(
          JSON.stringify({ error: 'Missing required parameters: version, query' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      return await search(BIBLE_BRAIN_BASE_URL, BIBLE_BRAIN_API_KEY, version, query)
    }

    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Bible Brain API Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function getVersions(baseUrl: string, apiKey: string) {
  try {
    const response = await fetch(`${baseUrl}/bibles?key=${apiKey}&v=4`)
    
    if (!response.ok) {
      throw new Error(`Bible Brain API error: ${response.status}`)
    }
    
    const data = await response.json()
    const bibles = data.data || []
    
    const versions = bibles.map((bible: any) => ({
      name: bible.name || bible.vernacular_title || bible.language?.name || 'Unknown',
      abbreviation: bible.abbr || bible.id || '',
      language: bible.language?.name || 'Unknown',
      version: bible.id,
      source: 'bible-brain'
    }))
    
    return new Response(
      JSON.stringify({ success: true, data: versions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Get versions error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to fetch versions' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function getChapter(baseUrl: string, apiKey: string, version: string, book: string, chapter: number, bookMap: Record<string, string>) {
  try {
    const bibleBrainBook = bookMap[book.toLowerCase()]
    if (!bibleBrainBook) {
      return new Response(
        JSON.stringify({ success: false, error: `Book "${book}" not supported` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const response = await fetch(
      `${baseUrl}/bibles/${version}/books/${bibleBrainBook}/chapters/${chapter}?key=${apiKey}&v=4`
    )
    
    if (!response.ok) {
      throw new Error(`Bible Brain API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (!data.data || !Array.isArray(data.data)) {
      throw new Error('Invalid response format')
    }
    
    const verses = data.data.map((verse: any) => ({
      book,
      chapter,
      verse: String(verse.verse_start || verse.verse || 1),
      text: verse.verse_text || verse.text || '',
      reference: `${book} ${chapter}:${verse.verse_start || verse.verse || 1}`,
      version
    }))
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        data: {
          book,
          chapter,
          verses
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Get chapter error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to fetch chapter' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function getAudio(baseUrl: string, apiKey: string, version: string, book: string, chapter: number, bookMap: Record<string, string>) {
  try {
    const bibleBrainBook = bookMap[book.toLowerCase()]
    if (!bibleBrainBook) {
      return new Response(
        JSON.stringify({ success: false, error: `Book "${book}" not supported for audio` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Try to get audio URL from the chapter endpoint first
    const chapterResponse = await fetch(
      `${baseUrl}/bibles/${version}/books/${bibleBrainBook}/chapters/${chapter}?key=${apiKey}&v=4`
    )
    
    if (!chapterResponse.ok) {
      throw new Error(`Bible Brain API error: ${chapterResponse.status}`)
    }
    
    const chapterData = await chapterResponse.json()
    let audioUrl = null
    
    if (chapterData.data && Array.isArray(chapterData.data)) {
      const audioData = chapterData.data.find((item: any) => item.path || item.audio_url || item.audio)
      if (audioData) {
        audioUrl = audioData.path || audioData.audio_url || audioData.audio
      }
    }
    
    // If no audio found in chapter data, try the audio endpoint
    if (!audioUrl) {
      const audioResponse = await fetch(
        `${baseUrl}/bibles/${version}/books/${bibleBrainBook}/chapters/${chapter}/audio?key=${apiKey}&v=4`
      )
      
      if (audioResponse.ok) {
        const audioData = await audioResponse.json()
        audioUrl = audioData.data?.[0]?.path || audioData.data?.[0]?.audio_url || null
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        data: {
          audioUrl,
          book,
          chapter,
          version
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Get audio error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to fetch audio' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function getVerse(baseUrl: string, apiKey: string, version: string, book: string, chapter: number, verse: number, bookMap: Record<string, string>) {
  try {
    const chapterResponse = await getChapter(baseUrl, apiKey, version, book, chapter, bookMap)
    const chapterData = await chapterResponse.json()
    
    if (!chapterData.success) {
      return new Response(
        JSON.stringify(chapterData),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const foundVerse = chapterData.data.verses.find((v: any) => parseInt(v.verse) === verse)
    
    if (!foundVerse) {
      return new Response(
        JSON.stringify({ success: false, error: 'Verse not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        data: foundVerse
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Get verse error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to fetch verse' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function search(baseUrl: string, apiKey: string, version: string, query: string) {
  try {
    // Bible Brain API search endpoint
    const response = await fetch(
      `${baseUrl}/bibles/${version}/search?key=${apiKey}&v=4&q=${encodeURIComponent(query)}`
    )
    
    if (!response.ok) {
      throw new Error(`Bible Brain Search API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (!data.data || !Array.isArray(data.data)) {
      throw new Error('Invalid search response format')
    }
    
    const searchResults = data.data.map((result: any) => ({
      book: result.book_name || result.book || 'Unknown',
      chapter: result.chapter || 1,
      verse: String(result.verse_start || result.verse || 1),
      text: result.verse_text || result.text || '',
      reference: `${result.book_name || result.book} ${result.chapter}:${result.verse_start || result.verse}`,
      version
    }))
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        data: searchResults
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Search error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to search' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}