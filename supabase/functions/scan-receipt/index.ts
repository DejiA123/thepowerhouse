import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

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
        const { image } = await req.json()

        if (!image) {
            throw new Error('No image provided')
        }

        const openAiApiKey = Deno.env.get('OPENAI_API_KEY')
        if (!openAiApiKey) {
            throw new Error('OpenAI API key not configured')
        }

        // Call OpenAI API
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openAiApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: `You are an expense extraction assistant. Extract the following from the receipt image:
            1. Item Name (short description)
            2. Total Amount (number only)
            3. Category (one of: Equipment, Software, Event, Transport, Catering, Other)
            4. Date (YYYY-MM-DD format if visible, otherwise null)
            
            Return ONLY a valid JSON object with keys: itemName, amount, category, date.
            Do not include markdown formatting or backticks.`
                    },
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: 'Scan this receipt.' },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: image
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 300
            })
        })

        const data = await response.json()

        if (data.error) {
            console.error('OpenAI Error:', data.error);
            throw new Error(`OpenAI API Error: ${data.error.message}`);
        }

        let result;
        try {
            const content = data.choices[0].message.content.trim();
            // Remove markdown code blocks if present (though system prompt says not to)
            const cleanContent = content.replace(/^```json\s*|\s*```$/g, '');
            result = JSON.parse(cleanContent);
        } catch (e) {
            console.error('Parse Error:', e, data.choices[0]?.message?.content);
            throw new Error('Failed to parse response from OpenAI');
        }

        return new Response(
            JSON.stringify(result),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        )
    }
})
