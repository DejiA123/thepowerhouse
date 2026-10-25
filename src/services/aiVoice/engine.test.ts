import { describe, expect, mock, test } from 'bun:test';

// Stand-ins for the browser
const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => store.set(k, v),
  removeItem: (k: string) => store.delete(k),
};
(globalThis as any).window = Object.assign(globalThis as any, { dispatchEvent: () => true });
let workersStarted = 0;
(globalThis as any).Worker = class {
  constructor() {
    workersStarted++;
  }
  postMessage() {}
  terminate() {}
};
mock.module('@/integrations/supabase/client', () => ({ supabase: { auth: { getSession: async () => ({ data: { session: null } }) } } }));

const { aiVoice } = await import('./engine');

describe('AI voice with the online (cloud) voice', () => {
  test('getting ready to read never starts the on-device voice', async () => {
    aiVoice.setMode('cloud');
    await aiVoice.ready();
    await aiVoice.load();
    expect(workersStarted).toBe(0);
  });

  test('the online voice is always ready, with nothing to download', () => {
    aiVoice.setMode('cloud');
    expect(aiVoice.status).toBe('ready');
  });
});
