/**
 * Short in-app banner (shown by NotificationProvider). App-wide toasts are
 * intentionally disabled, so features use this for feedback people must see:
 * failed calls, failed sends, confirmations of important actions.
 */
export type AppAlertKind = 'info' | 'success' | 'error';

export function appAlert(title: string, message = '', kind: AppAlertKind = 'info', url?: string) {
  window.dispatchEvent(new CustomEvent('showInAppNotification', { detail: { title, message, kind, url } }));
}

/**
 * The same banner, called the way the (switched-off) toasts are: for screens
 * whose messages people must see, such as signing in. Errors show as errors.
 */
export function alertToast({ title, description, variant }: { title?: unknown; description?: unknown; variant?: string | null }) {
  appAlert(typeof title === 'string' ? title : '', typeof description === 'string' ? description : '', variant === 'destructive' ? 'error' : 'success');
}
