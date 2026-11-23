import React, { useEffect, useState } from 'react';
import { Bell, Check, Clock3, Dumbbell, X } from 'lucide-react';
import type { SystemAnnouncement } from '../../types/admin';
import { useAuth } from '../auth/ProtectedRoute';

const NOTICE_KEY = 'gymtracker_system_announcement';
const READ_KEY = 'gymtracker_notice_read';

interface NotificationCenterProps {
  isWorkoutActive: boolean;
  restRemaining: number;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ isWorkoutActive, restRemaining }) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notice, setNotice] = useState<SystemAnnouncement | null>(() => {
    try { return JSON.parse(localStorage.getItem(NOTICE_KEY) || 'null'); } catch { return null; }
  });
  const [readId, setReadId] = useState(() => localStorage.getItem(READ_KEY) || '');
  const [bedtime, setBedtime] = useState<{ enabled: boolean; time: string }>(() => {
    try {
      const pref = JSON.parse(localStorage.getItem(`gymtracker_user_preferences_v1_${user?.id || 'anon'}`) || '{}');
      return { enabled: Boolean(pref.sleep_reminder_enabled), time: pref.target_bedtime || '22:30' };
    } catch { return { enabled: false, time: '22:30' }; }
  });

  useEffect(() => {
    const sync = () => {
      try { setNotice(JSON.parse(localStorage.getItem(NOTICE_KEY) || 'null')); } catch { setNotice(null); }
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  const currentId = notice?.id || notice?.message || '';
  const hasNotice = Boolean(notice?.is_active && currentId);
  const unread = hasNotice && currentId !== readId;

  const open = () => {
    let latest: SystemAnnouncement | null = null;
    try { latest = JSON.parse(localStorage.getItem(NOTICE_KEY) || 'null'); } catch { latest = null; }
    setNotice(latest);
    try {
      const pref = JSON.parse(localStorage.getItem(`gymtracker_user_preferences_v1_${user?.id || 'anon'}`) || '{}');
      setBedtime({ enabled: Boolean(pref.sleep_reminder_enabled), time: pref.target_bedtime || '22:30' });
    } catch { setBedtime({ enabled: false, time: '22:30' }); }
    setIsOpen(true);
    const latestId = latest?.id || latest?.message || '';
    if (latestId) {
      localStorage.setItem(READ_KEY, latestId);
      setReadId(latestId);
    }
  };

  return <>
    <button onClick={open} aria-label={unread ? 'Notifications, unread' : 'Notifications'}
      className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-300 transition-colors hover:border-zinc-700 hover:text-white">
      <Bell className="h-[18px] w-[18px]" />
      {unread && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-zinc-900" />}
    </button>
    {isOpen && <div className="fixed inset-0 z-[70] flex items-start justify-center bg-black/60 p-3 pt-[max(5rem,env(safe-area-inset-top))] backdrop-blur-sm sm:justify-end sm:pr-6">
      <button aria-label="Close notifications" className="absolute inset-0 h-full w-full cursor-default" onClick={() => setIsOpen(false)} />
      <section role="dialog" aria-modal="true" aria-labelledby="notification-heading" className="relative z-10 w-full max-w-sm overflow-hidden rounded-3xl border border-zinc-800 bg-[#151a15] shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <div><h2 id="notification-heading" className="text-base font-bold text-white">Notifications</h2><p className="mt-0.5 text-xs text-zinc-400">Current updates and session status</p></div>
          <button onClick={() => setIsOpen(false)} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-zinc-400 hover:text-white"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3 p-4">
          {hasNotice && <article className="rounded-2xl border border-sky-900/60 bg-sky-950/30 p-4">
            <div className="flex items-start gap-3"><div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sky-400/10 text-sky-300"><Bell className="h-4 w-4" /></div><div className="min-w-0"><p className="text-sm font-semibold text-white">{notice?.title || 'Gym update'}</p><p className="mt-1 text-sm leading-relaxed text-zinc-300">{notice?.message}</p></div></div>
          </article>}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4">
            <div className="flex items-center gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300"><Dumbbell className="h-4 w-4" /></div><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-white">Workout</p><p className="text-xs text-zinc-400">{isWorkoutActive ? 'Session in progress' : 'No active session'}</p></div>{isWorkoutActive && <span className="h-2 w-2 rounded-full bg-emerald-400" />}</div>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4">
            <div className="flex items-center gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-400/10 text-amber-300"><Clock3 className="h-4 w-4" /></div><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-white">Recovery</p><p className="text-xs text-zinc-400">{restRemaining > 0 ? `Rest timer running · ${Math.floor(restRemaining / 60)}:${String(restRemaining % 60).padStart(2, '0')}` : 'No active rest timer'}</p></div>{!restRemaining && <Check className="h-4 w-4 text-zinc-600" />}</div>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4">
            <div className="flex items-center gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-400/10 text-indigo-300"><Clock3 className="h-4 w-4" /></div><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-white">Bedtime reminder</p><p className="text-xs text-zinc-400">{bedtime.enabled ? `On · ${bedtime.time}` : 'Off'}</p></div></div>
          </div>
          {!hasNotice && <p className="px-1 pt-1 text-center text-xs text-zinc-500">You’re all caught up.</p>}
        </div>
      </section>
    </div>}
  </>;
};
