// Sends the app's sign-in emails (confirm sign-up, Passcode code, password reset,
// email change, invite) through Resend, instead of Supabase's built-in sender, which
// only reaches the project team's own addresses, 2 an hour.
//
// Supabase Auth calls this as its "Send Email" hook (Authentication → Hooks), signed
// with SEND_EMAIL_HOOK_SECRET ("v1,whsec_…", Standard Webhooks). Uses RESEND_API_KEY
// and church.email.from (a sender on a domain verified in Resend). Returns 200 {} once
// Resend has the email; any error goes back to Auth, which shows it to the person.
//
// A signed request with {"check": true} instead asks Resend which sending domains it
// has, so the setup can be checked without sending anything.
import { church } from '../_shared/church.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const HOOK_SECRET = Deno.env.get('SEND_EMAIL_HOOK_SECRET') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** Standard Webhooks: HMAC-SHA256 of "id.timestamp.body", within 5 minutes */
async function verified(req: Request, body: string): Promise<boolean> {
  const id = req.headers.get('webhook-id');
  const ts = req.headers.get('webhook-timestamp');
  const sigs = req.headers.get('webhook-signature');
  if (!id || !ts || !sigs || !HOOK_SECRET) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;
  const raw = HOOK_SECRET.replace(/^v1,/, '').replace(/^whsec_/, '');
  const keyBytes = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${id}.${ts}.${body}`)));
  const expected = btoa(String.fromCharCode(...mac));
  // The header may hold several "v1,<sig>" separated by spaces
  return sigs.split(' ').some((s) => {
    const sig = s.replace(/^v1,/, '');
    if (sig.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
    return diff === 0;
  });
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

const page = (title: string, inner: string) => `<!doctype html><html><body style="margin:0;background:#f1f5f9">
<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:28px 20px;color:#0f172a">
<div style="background:#ffffff;border-radius:18px;padding:28px 24px">
<p style="margin:0 0 6px;color:#64748b;font-size:13px">${esc(church.name)}</p>
<h2 style="margin:0 0 14px;font-size:22px">${title}</h2>
${inner}
</div>
<p style="margin:16px 4px 0;color:#94a3b8;font-size:12px">If you didn't ask for this, you can ignore this email.</p>
</div></body></html>`;

const button = (href: string, label: string) =>
  `<p style="margin:22px 0"><a href="${esc(href)}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-weight:600;padding:13px 22px;border-radius:12px">${label}</a></p>`;
const code = (token: string) =>
  `<p style="font-size:32px;font-weight:700;letter-spacing:8px;margin:6px 0 18px">${esc(token)}</p>`;

interface EmailData {
  token: string;
  token_hash: string;
  redirect_to: string;
  email_action_type: string;
  site_url: string;
  token_new?: string;
  token_hash_new?: string;
}

/** Supabase's own link that checks the email and then opens the app */
const verifyLink = (hash: string, type: string, redirect: string, site: string) =>
  `${SUPABASE_URL}/auth/v1/verify?token=${encodeURIComponent(hash)}&type=${encodeURIComponent(type)}&redirect_to=${encodeURIComponent(redirect || site)}`;

function compose(d: EmailData, newEmail?: string): { subject: string; html: string } {
  const t = d.email_action_type;
  if (t === 'signup') {
    return {
      subject: `Confirm your email for ${church.name}`,
      html: page('Confirm your email', `<p style="margin:0">Tap the button to finish creating your account.</p>${button(verifyLink(d.token_hash, 'signup', d.redirect_to, d.site_url), 'Confirm my email')}<p style="margin:0;color:#64748b;font-size:13px">Then sign in with your email and the password you chose.</p>`),
    };
  }
  if (t === 'magiclink') {
    return {
      subject: 'Your sign-in code',
      html: page('Your sign-in code', `<p style="margin:0 0 6px">Type this code in the app to sign in:</p>${code(d.token)}<p style="margin:0">Or open this email on the same phone and ${`<a href="${esc(verifyLink(d.token_hash, 'magiclink', d.redirect_to, d.site_url))}">tap here to sign in</a>`}.</p><p style="margin:14px 0 0;color:#64748b;font-size:13px">The code works once.</p>`),
    };
  }
  if (t === 'recovery') {
    return {
      subject: `Reset your ${church.name} password`,
      html: page('Reset your password', `<p style="margin:0">Tap the button to choose a new password.</p>${button(verifyLink(d.token_hash, 'recovery', d.redirect_to, d.site_url), 'Choose a new password')}`),
    };
  }
  if (t === 'invite') {
    return {
      subject: `You're invited to ${church.name}`,
      html: page(`Join ${esc(church.name)}`, `<p style="margin:0">You've been invited to the app.</p>${button(verifyLink(d.token_hash, 'invite', d.redirect_to, d.site_url), 'Accept the invitation')}`),
    };
  }
  if (t === 'email_change') {
    // Supabase names these the other way round: token_hash is for the NEW address,
    // token_hash_new (secure change only) for the CURRENT one
    const hash = newEmail ? d.token_hash : d.token_hash_new || d.token_hash;
    return {
      subject: 'Confirm your new email address',
      html: page('Confirm your new email', `<p style="margin:0">Tap the button to confirm this change of email address.</p>${button(verifyLink(hash, 'email_change', d.redirect_to, d.site_url), 'Confirm the change')}`),
    };
  }
  // reauthentication and anything newer: a code
  return {
    subject: 'Your confirmation code',
    html: page('Your confirmation code', `<p style="margin:0 0 6px">Enter this code in the app:</p>${code(d.token)}`),
  };
}

async function send(to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({ from: church.email.from, to: [to], subject, html }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  const body = await req.text();
  if (!(await verified(req, body))) return json({ error: { http_code: 401, message: 'Not a signed request from Supabase Auth' } }, 401);
  let payload: { check?: boolean; user?: { email?: string; new_email?: string }; email_data?: EmailData };
  try {
    payload = JSON.parse(body);
  } catch {
    return json({ error: { http_code: 400, message: 'Bad request' } }, 400);
  }

  if (payload.check) {
    const res = await fetch('https://api.resend.com/domains', { headers: { Authorization: `Bearer ${RESEND_API_KEY}` } });
    const text = await res.text();
    let domains: unknown = text.slice(0, 300);
    try {
      domains = (JSON.parse(text).data ?? []).map((d: { name: string; status: string }) => ({ name: d.name, status: d.status }));
    } catch { /* keep the text */ }
    return json({ key_set: !!RESEND_API_KEY, from: church.email.from, resend_status: res.status, domains });
  }

  const to = payload.user?.email;
  const d = payload.email_data;
  if (!to || !d) return json({ error: { http_code: 400, message: 'Missing user or email data' } }, 400);
  try {
    const newEmail = payload.user?.new_email;
    if (d.email_action_type === 'email_change' && newEmail) {
      // The new address always confirms; the current one too when both must agree
      const toNew = compose(d, newEmail);
      await send(newEmail, toNew.subject, toNew.html);
      if (d.token_hash_new) {
        const toCurrent = compose(d);
        await send(to, toCurrent.subject, toCurrent.html);
      }
    } else {
      const { subject, html } = compose(d);
      await send(to, subject, html);
    }
    return json({});
  } catch (e) {
    console.error('[auth-send-email]', String(e));
    return json({ error: { http_code: 500, message: "The email couldn't be sent. Please try again in a moment." } }, 500);
  }
});
