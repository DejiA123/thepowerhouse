import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2';

export const supabaseAdmin: SupabaseClient = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

/**
 * Resolve the signed-in user from the request's bearer token.
 * Returns null for anonymous callers (e.g. requests made with the anon key).
 */
export async function getRequestUser(req: Request): Promise<User | null> {
  const header = req.headers.get('Authorization') ?? '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  // A hiccup reaching Auth (no status, or 5xx) is tried again, so a signed-in member
  // isn't told to sign in; a refused token (401/403) is final
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (data?.user) return data.user;
    const status = (error as { status?: number } | null)?.status;
    if (status && status < 500) return null;
    await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
  }
  return null;
}
