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
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}
