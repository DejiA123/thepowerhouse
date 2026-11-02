import { useEffect, useState } from 'react';
import { isEncryptedFile, openEncryptedFile } from '@/lib/chatCrypto';

/**
 * A chat photo's address, ready for <img>: an end-to-end encrypted photo is
 * downloaded and opened on the phone first (kept for the session).
 * `attempt` changes to try again.
 */
export function useOpenedImage(url: string | null | undefined, attempt = 0): { src: string | null; failed: boolean } {
  const encrypted = isEncryptedFile(url);
  const [state, setState] = useState<{ src: string | null; failed: boolean }>({ src: encrypted ? null : url ?? null, failed: false });

  useEffect(() => {
    if (!url || !isEncryptedFile(url)) {
      setState({ src: url ?? null, failed: false });
      return;
    }
    let stale = false;
    setState({ src: null, failed: false });
    openEncryptedFile(url)
      .then((src) => !stale && setState({ src, failed: false }))
      .catch(() => !stale && setState({ src: null, failed: true }));
    return () => {
      stale = true;
    };
  }, [url, attempt]);

  return state;
}

/** A small picture (quotes, the reply bar) that may be end-to-end encrypted */
const SecureImg = ({ url, className, alt = '' }: { url: string; className?: string; alt?: string }) => {
  const { src } = useOpenedImage(url);
  return src ? <img src={src} alt={alt} className={className} /> : <span className={`block bg-muted ${className ?? ''}`} aria-hidden />;
};

export default SecureImg;
