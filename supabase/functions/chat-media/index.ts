// Upload link for a video (or large photo / GIF) sent in a chat.
//
// Files go to Cloudflare R2, which has no size limit to speak of and no
// download charges, so videos play smoothly. Only someone in the chat can get
// a link, and only for that chat's folder.
import { S3Client, PutObjectCommand } from 'npm:@aws-sdk/client-s3@3.540.0';
import { getSignedUrl } from 'npm:@aws-sdk/s3-request-presigner@3.540.0';
import { corsHeaders, json } from '../_shared/cors.ts';
import { getRequestUser, supabaseAdmin } from '../_shared/supabaseAdmin.ts';

const MAX_BYTES = 250 * 1024 * 1024;
const EXTENSIONS: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
  'video/3gpp': '3gp',
  'video/x-m4v': 'm4v',
  'image/gif': 'gif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const user = await getRequestUser(req);
  if (!user) return json({ error: 'Please sign in' }, 401);

  try {
    const { chatId, fileType, size } = await req.json();
    const type = String(fileType || '').toLowerCase();
    const ext = EXTENSIONS[type] ?? (type.startsWith('video/') ? 'mp4' : null);
    if (!chatId || !ext) return json({ error: 'That kind of file can’t be sent' }, 400);
    if (Number(size) > MAX_BYTES) return json({ error: 'That video is too long to send. Try a shorter clip (up to about 5 minutes).' }, 400);

    const { data: member } = await supabaseAdmin
      .from('chat_participants')
      .select('user_id')
      .eq('chat_id', chatId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (!member) return json({ error: 'You’re not in this chat' }, 403);

    const endpoint = Deno.env.get('R2_ENDPOINT');
    const accessKeyId = Deno.env.get('R2_ACCESS_KEY_ID');
    const secretAccessKey = Deno.env.get('R2_SECRET_ACCESS_KEY');
    const bucket = Deno.env.get('R2_BUCKET_NAME');
    const publicDomain = Deno.env.get('R2_PUBLIC_DOMAIN');
    if (!endpoint || !accessKeyId || !secretAccessKey || !bucket || !publicDomain) {
      return json({ error: 'Media storage is not set up', fallback: true }, 503);
    }

    const s3 = new S3Client({ region: 'auto', endpoint, credentials: { accessKeyId, secretAccessKey } });
    const key = `chat-media/${chatId}/${user.id}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const uploadUrl = await getSignedUrl(
      s3,
      // The browser must send the same Content-Type header when uploading
      new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: type }),
      { expiresIn: 3600 },
    );
    return json({ uploadUrl, publicUrl: `${publicDomain.replace(/\/$/, '')}/${key}`, contentType: type });
  } catch (error) {
    console.error('chat-media', error);
    return json({ error: error instanceof Error ? error.message : 'Something went wrong' }, 400);
  }
});
