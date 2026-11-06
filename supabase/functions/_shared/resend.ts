// Sending through Resend from the church's own address, falling back to an address
// on a domain the Resend account has already verified while the church's domain
// isn't verified yet (Resend answers 403 "domain is not verified"). Switches to the
// church's own address by itself the moment Resend verifies it.
import { church } from './church.ts';

const KEY = Deno.env.get('RESEND_API_KEY') ?? '';

export async function sendEmail(msg: { to: string[]; subject: string; html: string }): Promise<{ id?: string; from: string }> {
  const attempt = (from: string) =>
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
      body: JSON.stringify({ from, ...msg }),
    });
  let from: string = church.email.from;
  let res = await attempt(from);
  if (!res.ok && church.email.fallbackFrom && res.status === 403) {
    const text = await res.text();
    if (!/not verified|verify/i.test(text)) throw new Error(`Resend 403: ${text.slice(0, 300)}`);
    from = church.email.fallbackFrom;
    res = await attempt(from);
  }
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json().catch(() => ({}));
  return { id: data?.id, from };
}

/** The church's sending domain as Resend sees it: status and the DNS records it needs */
export async function resendDomain(action: 'status' | 'add' | 'verify') {
  const name = church.email.from.match(/@([^>\s]+)/)?.[1] ?? '';
  const call = (path: string, init?: RequestInit) =>
    fetch(`https://api.resend.com${path}`, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` } }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }));
  const list = await call('/domains');
  let found = (list.body?.data ?? []).find((d: { name: string }) => d.name === name);
  if (!found && action === 'add') {
    const made = await call('/domains', { method: 'POST', body: JSON.stringify({ name, region: 'eu-west-1' }) });
    if (made.status >= 300) return { name, error: made.body };
    found = made.body;
  }
  if (!found) return { name, status: 'not added' };
  if (action === 'verify') await call(`/domains/${found.id}/verify`, { method: 'POST' });
  const detail = await call(`/domains/${found.id}`);
  const d = detail.body ?? {};
  return {
    name,
    status: d.status,
    records: (d.records ?? []).map((r: Record<string, unknown>) => ({ type: r.type, name: r.name, value: r.value, priority: r.priority, status: r.status })),
  };
}
