// Returns ICE servers (STUN + TURN) for WebRTC calls.
// A TURN relay is what makes calls connect between different networks
// (mobile data ↔ Wi-Fi, strict routers, corporate networks). Configure ONE of:
//   • Cloudflare Calls TURN:  CLOUDFLARE_TURN_KEY_ID + CLOUDFLARE_TURN_KEY_API_TOKEN
//   • Metered.ca TURN:        METERED_DOMAIN (e.g. yourapp.metered.live) + METERED_API_KEY
//   • Your own coturn:        TURN_URLS (comma separated) + TURN_USERNAME + TURN_CREDENTIAL
import { corsHeaders, json } from '../_shared/cors.ts';
import { getRequestUser } from '../_shared/supabaseAdmin.ts';

type IceServer = { urls: string | string[]; username?: string; credential?: string };

const STUN: IceServer[] = [
  { urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302'] },
];

async function cloudflare(): Promise<IceServer[] | null> {
  const keyId = Deno.env.get('CLOUDFLARE_TURN_KEY_ID');
  const token = Deno.env.get('CLOUDFLARE_TURN_KEY_API_TOKEN');
  if (!keyId || !token) return null;
  const res = await fetch(
    `https://rtc.live.cloudflare.com/v1/turn/keys/${keyId}/credentials/generate-ice-servers`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ttl: 60 * 60 * 6 }),
    },
  );
  if (!res.ok) throw new Error(`Cloudflare TURN ${res.status}`);
  const data = await res.json();
  const servers = Array.isArray(data.iceServers) ? data.iceServers : [data.iceServers];
  return servers.filter(Boolean);
}

async function metered(): Promise<IceServer[] | null> {
  const domain = Deno.env.get('METERED_DOMAIN');
  const apiKey = Deno.env.get('METERED_API_KEY');
  if (!domain || !apiKey) return null;
  const res = await fetch(`https://${domain}/api/v1/turn/credentials?apiKey=${encodeURIComponent(apiKey)}`);
  if (!res.ok) throw new Error(`Metered TURN ${res.status}`);
  return await res.json();
}

function staticTurn(): IceServer[] | null {
  const urls = Deno.env.get('TURN_URLS');
  if (!urls) return null;
  return [{
    urls: urls.split(',').map((u) => u.trim()).filter(Boolean),
    username: Deno.env.get('TURN_USERNAME') ?? undefined,
    credential: Deno.env.get('TURN_CREDENTIAL') ?? undefined,
  }];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const user = await getRequestUser(req);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  for (const provider of [cloudflare, metered]) {
    try {
      const servers = await provider();
      if (servers?.length) return json({ iceServers: [...STUN, ...servers], relay: true });
    } catch (error) {
      console.error('TURN provider failed', error);
    }
  }

  const own = staticTurn();
  if (own) return json({ iceServers: [...STUN, ...own], relay: true });

  return json({ iceServers: STUN, relay: false });
});
