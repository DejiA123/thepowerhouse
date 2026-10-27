import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useIsAdmin } from '@/lib/admin';

/** Admin pages: only for church admins (anyone else goes to Me). */
const AdminGate = ({ children }: { children: ReactNode }) => {
  const admin = useIsAdmin();
  if (admin === null) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  }
  return admin ? <>{children}</> : <Navigate to="/me" replace />;
};

export default AdminGate;

/** Shown while the database part hasn't been set up yet */
export const NotSetUp = () => (
  <div className="rounded-[22px] border border-amber-200 bg-amber-50 p-4 text-[14px] leading-relaxed text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
    This isn't switched on yet. Ask Lovable to apply the migration
    <b> 20261027120000_feedback_and_activity.sql</b>, then come back.
  </div>
);
