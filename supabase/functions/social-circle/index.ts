// Social Circle: finding other members and managing friend requests.
//
// Member profiles are private in the database (each person can only read their
// own), so this function is the one place that lists other members. It only
// ever hands out a name and a photo, never email addresses or phone numbers,
// and it only acts on friendships the signed-in person is part of.
import { corsHeaders, json } from '../_shared/cors.ts';
import { getRequestUser, supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { sendToSubscriptions, subscriptionsForUsers } from '../_shared/webpush.ts';

const PAGE = 30;

interface Person {
  id: string;
  name: string;
  avatar: string | null;
}

interface FriendshipRow {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'blocked';
  created_at: string;
  updated_at: string;
}

type Relation =
  | { kind: 'none' }
  | { kind: 'friends'; friendshipId: string }
  | { kind: 'sent'; friendshipId: string }
  | { kind: 'received'; friendshipId: string };

/** The name to show: never an email address. */
function displayName(fullName?: string | null, email?: string | null) {
  const name = (fullName ?? '').trim();
  if (name && name !== 'Unknown User') return name.includes('@') ? name.split('@')[0] : name;
  return email ? email.split('@')[0] : 'Member';
}

const toPerson = (p: { id: string; full_name: string | null; email?: string | null; avatar_url: string | null }): Person => ({
  id: p.id,
  name: displayName(p.full_name, p.email),
  avatar: p.avatar_url || null,
});

/**
 * Everyone with an account should be findable. Accounts made before profiles
 * were created automatically may not have one, and Google photos were never
 * copied across: fill those gaps once per server instance.
 */
let filledIn: Promise<void> | null = null;
function fillInProfiles() {
  filledIn ??= (async () => {
    const users: { id: string; email?: string; user_metadata?: Record<string, unknown> }[] = [];
    for (let page = 1; page <= 20; page++) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error || !data?.users?.length) break;
      users.push(...data.users);
      if (data.users.length < 1000) break;
    }
    if (!users.length) return;

    const existing = new Map<string, { avatar_url: string | null }>();
    for (let i = 0; i < users.length; i += 500) {
      const ids = users.slice(i, i + 500).map((u) => u.id);
      const { data } = await supabaseAdmin.from('profiles').select('id, avatar_url').in('id', ids);
      (data ?? []).forEach((p) => existing.set(p.id, p));
    }

    const meta = (u: (typeof users)[number], key: string) => {
      const value = u.user_metadata?.[key];
      return typeof value === 'string' && value.trim() ? value.trim() : null;
    };
    const missing = users
      .filter((u) => !existing.has(u.id))
      .map((u) => ({
        id: u.id,
        email: u.email ?? null,
        full_name: meta(u, 'full_name') || meta(u, 'name') || (u.email ? u.email.split('@')[0] : 'Member'),
        avatar_url: meta(u, 'avatar_url') || meta(u, 'picture'),
      }));
    if (missing.length) await supabaseAdmin.from('profiles').upsert(missing, { onConflict: 'id', ignoreDuplicates: true });

    const photos = users
      .filter((u) => existing.has(u.id) && !existing.get(u.id)!.avatar_url && (meta(u, 'avatar_url') || meta(u, 'picture')))
      .map((u) => ({ id: u.id, avatar_url: meta(u, 'avatar_url') || meta(u, 'picture') }));
    for (const p of photos) await supabaseAdmin.from('profiles').update({ avatar_url: p.avatar_url }).eq('id', p.id);
  })().catch((error) => {
    console.error('Filling in profiles failed', error);
    filledIn = null;
  });
  return filledIn;
}

async function myFriendships(me: string): Promise<FriendshipRow[]> {
  const { data, error } = await supabaseAdmin
    .from('friendships')
    .select('*')
    .or(`user_id.eq.${me},friend_id.eq.${me}`);
  if (error) throw error;
  return (data ?? []) as FriendshipRow[];
}

const other = (f: FriendshipRow, me: string) => (f.user_id === me ? f.friend_id : f.user_id);

function relationTo(personId: string, me: string, rows: FriendshipRow[]): Relation {
  const f = rows.find((r) => other(r, me) === personId && r.status !== 'declined' && r.status !== 'blocked');
  if (!f) return { kind: 'none' };
  if (f.status === 'accepted') return { kind: 'friends', friendshipId: f.id };
  return f.user_id === me ? { kind: 'sent', friendshipId: f.id } : { kind: 'received', friendshipId: f.id };
}

async function peopleById(ids: string[]): Promise<Map<string, Person>> {
  const map = new Map<string, Person>();
  if (!ids.length) return map;
  const { data } = await supabaseAdmin.from('profiles').select('id, full_name, email, avatar_url').in('id', ids);
  (data ?? []).forEach((p) => map.set(p.id, toPerson(p)));
  return map;
}

async function notify(userId: string, title: string, body: string, url: string, tag: string) {
  try {
    await sendToSubscriptions(await subscriptionsForUsers([userId]), { kind: 'general', title, body, url, tag, renotify: true });
  } catch (error) {
    console.error('Push failed', error);
  }
}

/** Friends, requests to me, and requests I've sent: with names and photos. */
async function circle(me: string) {
  const rows = await myFriendships(me);
  const people = await peopleById([...new Set(rows.map((r) => other(r, me)))]);
  const entry = (r: FriendshipRow) => ({
    friendshipId: r.id,
    since: r.status === 'accepted' ? r.updated_at : r.created_at,
    person: people.get(other(r, me)) ?? { id: other(r, me), name: 'Member', avatar: null },
  });
  const byNewest = (a: FriendshipRow, b: FriendshipRow) => b.updated_at.localeCompare(a.updated_at);
  return {
    friends: rows.filter((r) => r.status === 'accepted').sort((a, b) => entry(a).person.name.localeCompare(entry(b).person.name)).map(entry),
    incoming: rows.filter((r) => r.status === 'pending' && r.friend_id === me).sort(byNewest).map(entry),
    outgoing: rows.filter((r) => r.status === 'pending' && r.user_id === me).sort(byNewest).map(entry),
  };
}

/** Members to discover: everyone (A–Z), or those matching a name or an exact email. */
async function discover(me: string, query: string, offset: number) {
  await fillInProfiles();
  const rows = await myFriendships(me);
  const blocked = new Set(rows.filter((r) => r.status === 'blocked').map((r) => other(r, me)));

  const typed = query.trim();
  let request = supabaseAdmin
    .from('profiles')
    .select('id, full_name, email, avatar_url')
    .neq('id', me)
    .order('full_name', { ascending: true })
    .range(offset, offset + PAGE);
  if (typed.includes('@')) {
    // An email only finds someone when it's typed in full
    request = request.ilike('email', typed.replace(/[\\%_]/g, (c) => `\\${c}`));
  } else if (typed) {
    // Every word of the name has to match ("john sm" finds John Smith)
    const words = typed.replace(/[%_,()*\\"]/g, ' ').split(/\s+/).filter(Boolean).slice(0, 4);
    request = words.reduce((r, w) => r.ilike('full_name', `%${w}%`), request);
  }
  const { data, error } = await request;
  if (error) throw error;

  const found = (data ?? []).filter((p) => !blocked.has(p.id));
  return {
    people: found.slice(0, PAGE).map((p) => ({ person: toPerson(p), relation: relationTo(p.id, me, rows) })),
    hasMore: (data ?? []).length > PAGE,
    nextOffset: offset + PAGE,
  };
}

async function sendRequest(me: string, myName: string, personId: string) {
  if (!personId || personId === me) throw new Error('Choose someone to add');
  const { data: target } = await supabaseAdmin.from('profiles').select('id').eq('id', personId).maybeSingle();
  if (!target) throw new Error("That person's account wasn't found");

  const rows = (await myFriendships(me)).filter((r) => other(r, me) === personId);
  if (rows.some((r) => r.status === 'blocked')) throw new Error("You can't add this person");
  const accepted = rows.find((r) => r.status === 'accepted');
  if (accepted) return { kind: 'friends', friendshipId: accepted.id } as Relation;
  const mine = rows.find((r) => r.status === 'pending' && r.user_id === me);
  if (mine) return { kind: 'sent', friendshipId: mine.id } as Relation;

  // They've already asked me: that's a yes from both sides
  const theirs = rows.find((r) => r.status === 'pending' && r.friend_id === me);
  if (theirs) return accept(me, myName, theirs.id);

  // A declined request can be sent again
  const old = rows.filter((r) => r.status === 'declined').map((r) => r.id);
  if (old.length) await supabaseAdmin.from('friendships').delete().in('id', old);

  const { data, error } = await supabaseAdmin
    .from('friendships')
    .insert({ user_id: me, friend_id: personId, status: 'pending' })
    .select()
    .single();
  if (error) throw error;
  await notify(personId, 'New friend request', `${myName} wants to add you to their Social Circle.`, '/social?tab=requests', `friend-${data.id}`);
  return { kind: 'sent', friendshipId: data.id } as Relation;
}

async function accept(me: string, myName: string, friendshipId: string): Promise<Relation> {
  const { data: row } = await supabaseAdmin.from('friendships').select('*').eq('id', friendshipId).maybeSingle();
  if (!row || row.friend_id !== me || row.status !== 'pending') throw new Error('That request is no longer waiting');
  const { error } = await supabaseAdmin
    .from('friendships')
    .update({ status: 'accepted', updated_at: new Date().toISOString() })
    .eq('id', friendshipId);
  if (error) throw error;
  await notify(row.user_id, 'Friend request accepted', `${myName} is now in your Social Circle.`, '/social', `friend-${friendshipId}`);
  return { kind: 'friends', friendshipId };
}

async function decline(me: string, friendshipId: string) {
  const { error } = await supabaseAdmin
    .from('friendships')
    .update({ status: 'declined', updated_at: new Date().toISOString() })
    .eq('id', friendshipId)
    .eq('friend_id', me)
    .eq('status', 'pending');
  if (error) throw error;
}

/** Unfriend, or cancel a request I sent. */
async function remove(me: string, friendshipId: string) {
  const { error } = await supabaseAdmin
    .from('friendships')
    .delete()
    .eq('id', friendshipId)
    .or(`user_id.eq.${me},friend_id.eq.${me}`)
    .neq('status', 'blocked');
  if (error) throw error;
}

/** Block someone: they disappear from each other's lists and can't send requests. */
async function block(me: string, personId: string) {
  const rows = (await myFriendships(me)).filter((r) => other(r, me) === personId);
  if (rows.length) await supabaseAdmin.from('friendships').delete().in('id', rows.map((r) => r.id));
  const { error } = await supabaseAdmin.from('friendships').insert({ user_id: me, friend_id: personId, status: 'blocked' });
  if (error) throw error;
}

/** A private chat with a friend: the existing one, or a new one. */
async function privateChat(me: string, myName: string, personId: string) {
  const rows = await myFriendships(me);
  if (!rows.some((r) => other(r, me) === personId && r.status === 'accepted')) throw new Error('You can message friends in your circle');

  const { data: mineRows } = await supabaseAdmin.from('chat_participants').select('chat_id').eq('user_id', me);
  const { data: theirRows } = await supabaseAdmin.from('chat_participants').select('chat_id').eq('user_id', personId);
  const theirs = new Set((theirRows ?? []).map((r) => r.chat_id));
  const shared = [...new Set((mineRows ?? []).map((r) => r.chat_id).filter((id) => theirs.has(id)))];
  if (shared.length) {
    const { data: chats } = await supabaseAdmin
      .from('group_chats')
      .select('id')
      .in('id', shared)
      .eq('is_custom', true)
      .eq('is_active', true)
      .eq('description', 'Private chat');
    for (const chat of chats ?? []) {
      const { count } = await supabaseAdmin.from('chat_participants').select('user_id', { count: 'exact', head: true }).eq('chat_id', chat.id);
      if (count === 2) return { chatId: chat.id };
    }
  }

  const theirName = (await peopleById([personId])).get(personId)?.name ?? 'Friend';
  const { data: chat, error } = await supabaseAdmin
    .from('group_chats')
    .insert({ name: `${myName} & ${theirName}`, description: 'Private chat', is_custom: true, created_by_user: me, created_by: me })
    .select('id')
    .single();
  if (error) throw error;
  await supabaseAdmin.from('chat_participants').insert([{ chat_id: chat.id, user_id: me }, { chat_id: chat.id, user_id: personId }]);
  await supabaseAdmin.from('group_admins').insert([me, personId].map((user_id) => ({
    chat_id: chat.id, user_id, can_add_members: false, can_remove_members: false, can_edit_info: true,
  })));
  return { chatId: chat.id };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const user = await getRequestUser(req);
  if (!user) return json({ error: 'Please sign in' }, 401);

  try {
    const body = await req.json().catch(() => ({}));
    const me = user.id;
    const { data: myProfile } = await supabaseAdmin.from('profiles').select('full_name, email').eq('id', me).maybeSingle();
    const myName = displayName(myProfile?.full_name ?? (user.user_metadata?.full_name as string | undefined), user.email);

    switch (body.action) {
      case 'circle':
        return json(await circle(me));
      case 'discover':
        return json(await discover(me, String(body.query ?? ''), Math.max(0, Number(body.offset) || 0)));
      case 'request':
        return json({ relation: await sendRequest(me, myName, String(body.personId ?? '')) });
      case 'accept':
        return json({ relation: await accept(me, myName, String(body.friendshipId ?? '')) });
      case 'decline':
        await decline(me, String(body.friendshipId ?? ''));
        return json({ ok: true });
      case 'remove':
        await remove(me, String(body.friendshipId ?? ''));
        return json({ ok: true });
      case 'block':
        await block(me, String(body.personId ?? ''));
        return json({ ok: true });
      case 'chat':
        return json(await privateChat(me, myName, String(body.personId ?? '')));
      default:
        return json({ error: 'Unknown action' }, 400);
    }
  } catch (error) {
    console.error('social-circle', error);
    return json({ error: error instanceof Error ? error.message : 'Something went wrong' }, 400);
  }
});
