import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' } })
    }

    try {
        const { enjoyed_most, want_more_of, didnt_work_well, suggestions, concerns } = await req.json()

        const emailHtml = `
      <h2>New Service Feedback Received</h2>
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <div style="margin-bottom: 20px;">
          <h3 style="color: #7c3aed;">What did you enjoy most?</h3>
          <p>${enjoyed_most || 'N/A'}</p>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3 style="color: #3b82f6;">What would you love more of?</h3>
          <p>${want_more_of || 'N/A'}</p>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3 style="color: #f97316;">What could be improved?</h3>
          <p>${didnt_work_well || 'N/A'}</p>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3 style="color: #22c55e;">Suggestions or encouragement?</h3>
          <p>${suggestions || 'N/A'}</p>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3 style="color: #ef4444;">Other concerns?</h3>
          <p>${concerns || 'N/A'}</p>
        </div>
      </div>
    `

        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`
            },
            body: JSON.stringify({
                from: 'The Powerhouse <noreply@thepowerhouse.ie>',
                to: ['youths.powerhouse@gmail.com'],
                subject: 'New Service Feedback',
                html: emailHtml
            })
        })

        const data = await res.json()

        return new Response(
            JSON.stringify(data),
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                status: res.ok ? 200 : 400
            }
        )
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return new Response(
            JSON.stringify({ error: errorMessage }),
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                status: 500
            }
        )
    }
})
