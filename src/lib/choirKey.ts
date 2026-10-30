/**
 * The National choir's passcode. The database checks it (choir_unlock, and
 * choir_can_edit on every change), so it's never written in the app. Branch
 * choirs don't need it.
 */
import { passcodeKey, rpcYes } from './passcodeKey';

const key = passcodeKey({
  storageKey: 'choir_admin_key',
  header: 'x-choir-key',
  check: (passcode) => rpcYes('choir_unlock', { _location: 'national', _passcode: passcode }),
});

/** Unlocked in this tab */
export const choirUnlocked = key.unlocked;

/** Check the passcode with the database; if it's right, use it from now on. */
export const unlockChoir = (_location: 'national', passcode: string) => key.unlock(passcode);

export const lockChoir = key.lock;
