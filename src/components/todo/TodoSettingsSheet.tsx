import { useEffect, useState } from 'react';
import { Sunrise } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { useIsMobile } from '@/hooks/use-mobile';
import { appAlert } from '@/lib/appAlert';
import EnableNotificationsCard from '@/components/notifications/EnableNotificationsCard';
import { saveTodoSettings, type TodoSettings } from '@/lib/todo/store';
import { SheetTop, sheetClass } from './parts';

/** The morning plan, and notifications on this phone */
const TodoSettingsSheet = ({ open, onOpenChange, userId, settings, onSaved }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  settings: TodoSettings | null;
  onSaved: (s: TodoSettings) => void;
}) => {
  const isMobile = useIsMobile();
  const [s, setS] = useState<TodoSettings>(settings ?? { morning_brief: true, brief_time: '08:00' });
  useEffect(() => {
    if (open && settings) setS(settings);
  }, [open, settings]);

  const save = async (next: TodoSettings) => {
    setS(next);
    if (await saveTodoSettings(userId, next)) onSaved(next);
    else appAlert('Couldn’t save that', 'Check your connection and try again.', 'error');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={isMobile ? 'bottom' : 'right'} className={sheetClass} onOpenAutoFocus={(e) => e.preventDefault()}>
        <SheetTop title="Reminders" onClose={() => onOpenChange(false)} />
        <SheetDescription className="sr-only">Your morning plan and notifications</SheetDescription>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-[calc(var(--sheet-safe-bottom,env(safe-area-inset-bottom))+1rem)] pt-4">
          <div className="rounded-2xl border border-border/70 p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300">
                <Sunrise className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[16px] font-semibold text-foreground">Morning plan</p>
                <p className="text-[13.5px] leading-snug text-muted-foreground">
                  One notification each morning with what’s on today and the one to start with. Only on days with something to do.
                </p>
              </div>
              <Switch checked={s.morning_brief} onCheckedChange={(v) => void save({ ...s, morning_brief: v })} aria-label="Morning plan" />
            </div>
            {s.morning_brief && (
              <label className="mt-3 flex items-center justify-between gap-3 border-t border-border/60 pt-3 text-[15px]">
                <span className="text-foreground">At</span>
                <input
                  type="time"
                  min="05:00"
                  max="20:00"
                  value={s.brief_time}
                  onChange={(e) => e.target.value && e.target.value >= '05:00' && e.target.value <= '20:00' && void save({ ...s, brief_time: e.target.value })}
                  className="h-10 rounded-xl border border-border bg-background px-3 text-[15px]"
                />
              </label>
            )}
          </div>
          <p className="px-1 text-[13.5px] leading-snug text-muted-foreground">
            You’re also reminded when it’s time to start a task you planned, and two hours before a deadline with a time.
          </p>
          <EnableNotificationsCard title="Let the app nudge you" description="Reminders reach you even when the app is closed." />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default TodoSettingsSheet;
