/**
 * Short in-app banner (shown by NotificationProvider). App-wide toasts are
 * intentionally disabled, so features use this for feedback people must see:
 * failed calls, failed sends, confirmations of important actions.
 */
export type AppAlertKind = 'info' | 'success' | 'error';

export function appAlert(title: string, message = '', kind: AppAlertKind = 'info', url?: string) {
  window.dispatchEvent(new CustomEvent('showInAppNotification', { detail: { title, message, kind, url } }));
}
