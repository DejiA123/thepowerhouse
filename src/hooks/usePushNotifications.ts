import { useCallback, useEffect, useState } from 'react';
import { disablePush, enablePush, getPushState, pushErrorMessage, sendPush, type PushState } from '@/lib/push';

export function usePushNotifications() {
  const [state, setState] = useState<PushState | 'loading'>('loading');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setState(await getPushState());
  }, []);

  useEffect(() => {
    refresh();
    const onChange = () => refresh();
    window.addEventListener('push:changed', onChange);
    document.addEventListener('visibilitychange', onChange);
    return () => {
      window.removeEventListener('push:changed', onChange);
      document.removeEventListener('visibilitychange', onChange);
    };
  }, [refresh]);

  const enable = useCallback(async (topics: string[] = []) => {
    setBusy(true);
    setError(null);
    try {
      const next = await enablePush(topics);
      setState(next);
      if (next === 'on') sendPush({ type: 'test' });
      return next;
    } catch (e) {
      setError(pushErrorMessage(e));
      await refresh();
      return 'default' as PushState;
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  const disable = useCallback(async () => {
    setBusy(true);
    try {
      await disablePush();
    } finally {
      await refresh();
      setBusy(false);
    }
  }, [refresh]);

  const test = useCallback(() => sendPush({ type: 'test' }), []);

  return { state, busy, error, enable, disable, test, refresh };
}
