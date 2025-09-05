import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RAPIDAPI_KEY = Deno.env.get('RAPIDAPI_KEY');
const RAPIDAPI_HOST = 'iq-bible.p.rapidapi.com';
const BASE_URL = 'https://iq-bible.p.rapidapi.com';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { book, chapter, version = 'KJV' } = await req.json();
    
    if (!book || !chapter) {
      return new Response(JSON.stringify({ error: 'Book and chapter are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!RAPIDAPI_KEY) {
      console.error('RAPIDAPI_KEY not configured');
      return new Response(JSON.stringify({ error: 'API configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = `${BASE_URL}/audio?book=${encodeURIComponent(book)}&chapter=${chapter}&version=${version}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': RAPIDAPI_HOST,
      },
    });

    const data = await response.json();
    console.log('Bible API response:', { status: response.status, hasData: !!data });

    if (!response.ok) {
      const errorMsg = data?.message || `HTTP ${response.status}`;
      return new Response(JSON.stringify({ error: errorMsg }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract audio URL from various possible response formats
    let audioUrl = null;
    if (data.audioUrl) {
      audioUrl = data.audioUrl;
    } else if (data.url) {
      audioUrl = data.url;
    } else if (Array.isArray(data) && data.length > 0 && data[0].url) {
      audioUrl = data[0].url;
    }

    if (!audioUrl) {
      const errorMsg = data.error || data.message || 'No audio URL found in API response';
      return new Response(JSON.stringify({ error: errorMsg }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ audioUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in bible-api-proxy:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});