/**
 * The Follow-up team's passcode (visitors' names, phone numbers and notes). The
 * database checks it (follow_up_unlock, and follow_up_access on every read and
 * change of team_follow_ups), so it's never written in the app.
 */
import { passcodeKey, rpcYes } from './passcodeKey';

const key = passcodeKey({
  storageKey: 'follow_up_team_key',
  header: 'x-follow-up-key',
  check: (passcode) => rpcYes('follow_up_unlock', { _passcode: passcode }),
});

export const followUpUnlocked = key.unlocked;
export const unlockFollowUp = key.unlock;
export const lockFollowUp = key.lock;
