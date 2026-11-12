import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarPlus, Check, Clock, MapPin, Play, Users } from "lucide-react";
import { useLiveRefresh } from "@/hooks/useLiveRefresh";
import { useAuth } from "@/contexts/AuthContext";
import { serviceAttendanceService } from "@/services/serviceAttendanceService";
import { appAlert } from "@/lib/appAlert";
import { church } from '@/config/church';

/**
 * Home's next-service card (redesigned Nov 2026): a deep blue card with a live countdown
 * on glass tiles, "I'm coming" (counted live for everyone, `service_attendance`), Add to
 * calendar (an .ics file the phone's calendar opens), and while the service is on, "We're
 * live" with Watch now. Sunday at 10:00, the church's main service.
 */
const SERVICE_HOUR = 10;
const SERVICE_MINUTES = 90;

/** The next Sunday service (today's, until it has finished) */
function nextService(now = new Date()) {
  const d = new Date(now);
  d.setHours(SERVICE_HOUR, 0, 0, 0);
  const daysAhead = (7 - now.getDay()) % 7;
  d.setDate(d.getDate() + daysAhead);
  if (now.getTime() > d.getTime() + SERVICE_MINUTES * 60_000) d.setDate(d.getDate() + 7);
  return d;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** An .ics file for the phone's calendar (local time, with a 30-minute reminder) */
function addToCalendar(start: Date) {
  const stamp = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
  const end = new Date(start.getTime() + SERVICE_MINUTES * 60_000);
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Church Space//EN', 'BEGIN:VEVENT',
    `UID:${stamp(start)}-sunday@churchspace`, `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`,
    `SUMMARY:Sunday Service · ${church.name}`, `LOCATION:${church.name}`,
    'BEGIN:VALARM', 'TRIGGER:-PT30M', 'ACTION:DISPLAY', 'DESCRIPTION:Sunday Service in 30 minutes', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Sunday Service.ics';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

const Tile = ({ value, label }: { value: number; label: string }) => (
  <div className="flex flex-col items-center rounded-2xl border border-white/15 bg-white/10 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-md">
    <span key={value} className="font-outfit text-[34px] font-bold leading-none tabular-nums text-white animate-in fade-in duration-300">{pad(value)}</span>
    <span className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-100/80">{label}</span>
  </div>
);

const EventCountdown = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [now, setNow] = useState(() => new Date());
  const [coming, setComing] = useState(false);
  const [attendees, setAttendees] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const start = nextService(now);
  const serviceDate = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
  const serviceTime = `${pad(SERVICE_HOUR)}:00:00`;
  const left = Math.max(0, start.getTime() - now.getTime());
  const live = now.getTime() >= start.getTime() && now.getTime() < start.getTime() + SERVICE_MINUTES * 60_000;
  const days = Math.floor(left / 86_400_000);
  const hours = Math.floor((left % 86_400_000) / 3_600_000);
  const minutes = Math.floor((left % 3_600_000) / 60_000);
  const seconds = Math.floor((left % 60_000) / 1000);
  const whenLabel = days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : 'This Sunday';

  // How many are coming, and whether I am (live as people tap "I'm coming")
  const loadAttendance = async () => {
    try {
      setAttendees(await serviceAttendanceService.getAttendanceCount(serviceDate, serviceTime));
      if (user) setComing(await serviceAttendanceService.isUserAttending(user.id, serviceDate, serviceTime));
    } catch {
      /* quietly keep what's shown */
    }
  };
  useEffect(() => {
    void loadAttendance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, serviceDate]);
  useLiveRefresh([{ table: 'service_attendance', filter: `service_date=eq.${serviceDate}` }], loadAttendance);

  const toggleComing = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (busy) return;
    setBusy(true);
    const was = coming;
    setComing(!was);
    setAttendees((n) => Math.max(0, n + (was ? -1 : 1)));
    const ok = was
      ? await serviceAttendanceService.removeAttendance(user.id, serviceDate, serviceTime).catch(() => false)
      : await serviceAttendanceService.setAttendance(user.id, serviceDate, serviceTime).catch(() => false);
    setBusy(false);
    if (!ok) {
      setComing(was);
      setAttendees((n) => Math.max(0, n + (was ? 1 : -1)));
      appAlert("Couldn't save that", 'Check your connection and try again.', 'error');
    }
  };

  return (
    <section
      aria-label="Next service"
      data-testid="next-service"
      className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#0b1640] via-[#1e3a8a] to-[#4c1d95] p-5 text-white shadow-xl shadow-indigo-900/20"
    >
      {/* Soft light */}
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-blue-400/30 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-fuchsia-500/25 blur-3xl" />

      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11.5px] font-bold uppercase tracking-[0.14em] text-blue-50 ring-1 ring-white/15">
            <span className={`h-2 w-2 rounded-full ${live ? 'animate-pulse bg-red-500' : 'bg-emerald-400'}`} />
            {live ? "We're live" : 'Next service'}
          </span>
          <span className="text-[13px] font-semibold text-blue-100/85">{live ? 'Happening now' : whenLabel}</span>
        </div>

        <h2 className="mt-3 font-outfit text-[30px] font-bold leading-tight tracking-tight">Sunday Service</h2>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14.5px] text-blue-100/90">
          <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4" /> {SERVICE_HOUR}:00 AM</span>
          <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {church.name}</span>
        </p>

        {live ? (
          <button
            type="button"
            onClick={() => navigate('/services?watch=1')}
            className="mt-5 flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-red-500 text-[16px] font-bold text-white shadow-lg shadow-red-900/30 transition active:scale-[0.98]"
          >
            <Play className="h-5 w-5 fill-current" /> Watch now
          </button>
        ) : (
          <div className="mt-5 grid grid-cols-4 gap-2.5" aria-label={`${days} days, ${hours} hours, ${minutes} minutes to go`}>
            <Tile value={days} label="Days" />
            <Tile value={hours} label="Hours" />
            <Tile value={minutes} label="Mins" />
            <Tile value={seconds} label="Secs" />
          </div>
        )}

        <p className="mt-4 flex items-center gap-2 text-[14px] text-blue-50/90" data-testid="coming-count">
          <Users className="h-4 w-4" />
          {attendees > 0 ? (
            <span><b className="font-bold text-white">{attendees}</b> {attendees === 1 ? 'person is' : 'people are'} coming{coming ? ', including you' : ''}</span>
          ) : (
            <span>Be the first to say you're coming</span>
          )}
        </p>

        <div className="mt-4 flex gap-2.5">
          <button
            type="button"
            onClick={toggleComing}
            disabled={busy}
            aria-pressed={coming}
            className={`flex h-[50px] flex-1 items-center justify-center gap-2 rounded-2xl text-[15.5px] font-bold transition active:scale-[0.98] ${
              coming ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-900/30' : 'bg-white text-slate-900 shadow-lg shadow-black/20'
            }`}
            data-testid="im-coming"
          >
            {coming ? <><Check className="h-5 w-5" /> You're coming</> : user ? "I'm coming 🙌" : "Sign in · I'm coming"}
          </button>
          <button
            type="button"
            onClick={() => addToCalendar(start)}
            aria-label="Add to calendar"
            className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white ring-1 ring-white/20 backdrop-blur transition active:scale-95"
          >
            <CalendarPlus className="h-5 w-5" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default EventCountdown;
