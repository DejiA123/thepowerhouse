import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Check, Copy, Printer, Share } from 'lucide-react';
import { cn } from '@/lib/utils';
import { appAlert } from '@/lib/appAlert';
import { PLATFORM, profileFromRow, type ChurchRow } from '@/config/church';
import { paletteFor, rgbToHex } from '@/lib/churchSpace';

/** A church's logo, or its initials on its colour when it has none */
export const ChurchLogo = ({ row, className }: { row: ChurchRow; className?: string }) => {
  const profile = profileFromRow(row);
  const hasLogo = !!row.profile?.logo || row.id === PLATFORM.defaultChurchId;
  if (hasLogo) return <img src={profile.brand.logo} alt="" className={cn('shrink-0 rounded-[13px] bg-white object-cover', className)} />;
  return (
    <span
      className={cn('flex shrink-0 items-center justify-center rounded-[13px] font-outfit font-bold text-white', className)}
      style={{ background: rgbToHex(paletteFor(profile.colour)['600']) }}
    >
      {profile.initials}
    </span>
  );
};

/** The church's link on the Church Space address */
export const churchLink = (slug: string) => `${PLATFORM.url}/${slug}`;

/** QR code of a link, drawn on a canvas */
export const QrCode = ({ text, size = 160 }: { text: string; size?: number }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) QRCode.toCanvas(ref.current, text, { width: size, margin: 0, color: { dark: '#0f172a', light: '#ffffff' } }).catch(() => undefined);
  }, [text, size]);
  return <canvas ref={ref} width={size} height={size} className="mx-auto" style={{ width: size, height: size }} />;
};

/** "Show this on the screen on Sunday": link, QR code and join code, to share or print */
export const ChurchShareCard = ({ name, slug, joinCode }: { name: string; slug: string; joinCode: string }) => {
  const link = churchLink(slug);
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const text = `Join ${name} on the app: ${link}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: name, text: `Join ${name} on the app`, url: link });
        return;
      }
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* closed the share sheet */
    }
  };

  const printPoster = async () => {
    const qr = await QRCode.toDataURL(link, { width: 600, margin: 1 });
    const win = window.open('', '_blank');
    if (!win) {
      appAlert("Couldn't open the poster", 'Allow pop-ups for this app, then try again.', 'error');
      return;
    }
    const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
    win.document.write(`<!doctype html><html><head><title>${esc(name)}</title>
      <style>body{font-family:system-ui,sans-serif;text-align:center;padding:48px;color:#0f172a}
      h1{font-size:44px;margin:0 0 8px}p{font-size:22px;color:#475569;margin:0}img{width:360px;margin:36px auto}
      .code{font-size:52px;font-weight:800;letter-spacing:.15em;margin:8px 0 24px}.link{font-size:20px}</style></head>
      <body><h1>${esc(name)}</h1><p>Get our church's app: scan with your phone's camera</p>
      <img src="${qr}" alt=""><p>or open the link and type the join code</p>
      <div class="code">${esc(joinCode)}</div><div class="link">${esc(link)}</div>
      <script>onload=()=>setTimeout(()=>print(),300)</script></body></html>`);
    win.document.close();
  };

  return (
    <>
      <div className="mx-auto w-[220px] rounded-[22px] border border-slate-200/70 bg-white p-4 text-center shadow-sm">
        <QrCode text={link} size={170} />
        <p className="mt-2.5 text-[12px] text-slate-500">Join code</p>
        <p className="font-outfit text-[24px] font-bold tracking-[.18em] text-slate-900">{joinCode}</p>
      </div>
      <p className="mt-2 truncate text-center text-[13px] text-muted-foreground">{link.replace('https://', '')}</p>
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <button onClick={share} className="flex h-12 items-center justify-center gap-2 rounded-full bg-blue-50 text-[15px] font-semibold text-blue-700 active:scale-[0.98] dark:bg-blue-950/50 dark:text-blue-300">
          {copied ? <Check className="h-5 w-5" /> : navigator.share ? <Share className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
          {copied ? 'Copied' : 'Share link'}
        </button>
        <button onClick={printPoster} className="flex h-12 items-center justify-center gap-2 rounded-full bg-blue-50 text-[15px] font-semibold text-blue-700 active:scale-[0.98] dark:bg-blue-950/50 dark:text-blue-300">
          <Printer className="h-5 w-5" /> Print poster
        </button>
      </div>
    </>
  );
};

/** "Anyone with the link" / "I approve new members" */
export const JoinModePicker = ({ value, onChange }: { value: 'open' | 'approval'; onChange: (mode: 'open' | 'approval') => void }) => (
  <div className="overflow-hidden rounded-[22px] border border-slate-200/70 bg-card shadow-sm dark:border-slate-800">
    {(
      [
        ['open', 'Anyone with the link', 'Members join straight away'],
        ['approval', 'I approve new members', 'They wait until an admin says yes'],
      ] as const
    ).map(([mode, title, subtitle], i) => (
      <button
        key={mode}
        onClick={() => onChange(mode)}
        className={cn('flex w-full items-center gap-3 px-4 py-3 text-left', i > 0 && 'border-t border-slate-100 dark:border-slate-800')}
      >
        <span className={cn('h-5 w-5 shrink-0 rounded-full', value === mode ? 'border-[6px] border-blue-600' : 'border-2 border-slate-300')} />
        <span className="flex-1">
          <b className="block text-[14.5px] text-foreground">{title}</b>
          <span className="text-[12.5px] text-muted-foreground">{subtitle}</span>
        </span>
      </button>
    ))}
  </div>
);
