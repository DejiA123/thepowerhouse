/**
 * Common slips in an email address's provider ("yaho.com", "gmial.com",
 * "hotmail.con"). A sign-up email sent to a misspelt address never arrives,
 * and the person thinks the app is broken, so the form offers the fix.
 */
const KNOWN: Record<string, string> = {
  // Yahoo
  'yaho.com': 'yahoo.com', 'yahooo.com': 'yahoo.com', 'yhoo.com': 'yahoo.com', 'yahho.com': 'yahoo.com',
  'yahoo.co': 'yahoo.com', 'yahoo.con': 'yahoo.com', 'yahoo.cm': 'yahoo.com', 'yahoo.om': 'yahoo.com', 'yahoo.comm': 'yahoo.com',
  'yaoo.com': 'yahoo.com', 'tahoo.com': 'yahoo.com', 'uahoo.com': 'yahoo.com', 'yahoo.co.uj': 'yahoo.co.uk', 'yaho.co.uk': 'yahoo.co.uk',
  // Gmail
  'gmial.com': 'gmail.com', 'gmal.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gamil.com': 'gmail.com', 'gnail.com': 'gmail.com',
  'gmaill.com': 'gmail.com', 'gmail.co': 'gmail.com', 'gmail.con': 'gmail.com', 'gmail.cm': 'gmail.com', 'gmail.om': 'gmail.com',
  'gmail.comm': 'gmail.com', 'gmaul.com': 'gmail.com', 'gmsil.com': 'gmail.com', 'fmail.com': 'gmail.com',
  // Microsoft
  'hotmial.com': 'hotmail.com', 'hotmai.com': 'hotmail.com', 'hotmal.com': 'hotmail.com', 'hotamil.com': 'hotmail.com',
  'hotmail.co': 'hotmail.com', 'hotmail.con': 'hotmail.com', 'hotmail.cm': 'hotmail.com', 'hotmil.com': 'hotmail.com',
  'outlok.com': 'outlook.com', 'outllok.com': 'outlook.com', 'outloo.com': 'outlook.com', 'outlook.co': 'outlook.com', 'outlook.con': 'outlook.com',
  'oulook.com': 'outlook.com', 'live.con': 'live.com',
  // Apple
  'iclod.com': 'icloud.com', 'icoud.com': 'icloud.com', 'iclould.com': 'icloud.com', 'icloud.co': 'icloud.com', 'icloud.con': 'icloud.com',
  'iclodu.com': 'icloud.com',
};

/** The address as it was probably meant, or null when it looks right */
export function suggestEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  const at = email.lastIndexOf('@');
  if (at < 1 || at === email.length - 1) return null;
  const domain = email.slice(at + 1);
  let fixed = KNOWN[domain];
  // Any provider ending in ".con" / ".cmo" is almost always ".com"
  if (!fixed && /\.(con|cmo|vom|xom)$/.test(domain)) fixed = domain.replace(/\.(con|cmo|vom|xom)$/, '.com');
  return fixed && fixed !== domain ? `${email.slice(0, at)}@${fixed}` : null;
}
