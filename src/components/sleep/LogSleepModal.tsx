import React, { useState, useEffect } from 'react';
import {
  X,
  Moon,
  Sun,
  Clock,
  Bell,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import type { SleepQuality } from '../../types/database';
import { useSleepTracker } from '../../hooks/useSleepTracker';
import { requestNotificationPermission } from '../../utils/sleepNotificationUtils';
import { useSwipeToDismiss } from '../../hooks/useSwipeToDismiss';
import { SheetHandle } from '../common/SheetHandle';

interface LogSleepModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultBedtime?: string;
  defaultWakeTime?: string;
}

const QUALITY_OPTIONS: {
  value: SleepQuality;
  label: string;
  desc: string;
  activeClass: string;
}[] = [
  {
    value: 'Poor',
    label: 'Poor',
    desc: 'Restless, interrupted',
    activeClass: 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-lg shadow-rose-950/40 ring-1 ring-rose-500/30',
  },
  {
    value: 'Fair',
    label: 'Fair',
    desc: 'Light, insufficient',
    activeClass: 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-lg shadow-amber-950/40 ring-1 ring-amber-500/30',
  },
  {
    value: 'Good',
    label: 'Good',
    desc: 'Refreshed, restful',
    activeClass: 'bg-indigo-500/20 border-indigo-500 text-indigo-300 shadow-lg shadow-indigo-950/40 ring-1 ring-indigo-500/30',
  },
  {
    value: 'Excellent',
    label: 'Excellent',
    desc: 'Deep, peak recovery',
    activeClass: 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-500/30',
  },
];

// Helper to format ISO string for <input type="datetime-local">
function toLocalDatetimeInput(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export const LogSleepModal: React.FC<LogSleepModalProps> = ({
  isOpen,
  onClose,
  defaultBedtime,
  defaultWakeTime,
}) => {
  const { logSleep, preferences, updatePreferences } = useSleepTracker();
  const { sheetRef, handleProps } = useSwipeToDismiss({ onDismiss: onClose, isOpen });

  // Active Tab: 'log' | 'reminders'
  const [activeTab, setActiveTab] = useState<'log' | 'reminders'>('log');

  // Input states
  const [bedtime, setBedtime] = useState<string>(() => {
    if (defaultBedtime) return defaultBedtime;
    // Default: Yesterday 11:00 PM
    const d = new Date();
    d.setDate(d.getDate() - 1);
    d.setHours(23, 0, 0, 0);
    return toLocalDatetimeInput(d);
  });

  const [wakeTime, setWakeTime] = useState<string>(() => {
    if (defaultWakeTime) return defaultWakeTime;
    // Default: Today 7:00 AM
    const d = new Date();
    d.setHours(7, 0, 0, 0);
    return toLocalDatetimeInput(d);
  });

  const [quality, setQuality] = useState<SleepQuality>('Good');
  const [notes, setNotes] = useState<string>('');
  const [durationMinutes, setDurationMinutes] = useState<number>(480);
  const [durationDisplay, setDurationDisplay] = useState<string>('8 hours 0 mins');
  const [timeError, setTimeError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reminder settings states
  const [targetBedtime, setTargetBedtime] = useState<string>(preferences.target_bedtime || '22:30');
  const [sleepReminderEnabled, setSleepReminderEnabled] = useState<boolean>(
    preferences.sleep_reminder_enabled
  );
  const [notificationPermission, setNotificationPermission] = useState<string>(() => {
    return typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'unsupported';
  });

  // Keep reminder states synced with hook preferences
  useEffect(() => {
    setTargetBedtime(preferences.target_bedtime || '22:30');
    setSleepReminderEnabled(preferences.sleep_reminder_enabled);
  }, [preferences]);

  // Real-time calculation of duration_minutes between bedtime and wake_time
  useEffect(() => {
    if (!bedtime || !wakeTime) return;

    try {
      const start = new Date(bedtime).getTime();
      const end = new Date(wakeTime).getTime();

      if (isNaN(start) || isNaN(end)) {
        setTimeError('Invalid date or time');
        return;
      }

      const diffMs = end - start;
      if (diffMs <= 0) {
        setTimeError('Wake time must be after bedtime');
        setDurationMinutes(0);
        setDurationDisplay('0 hours 0 mins');
        return;
      }

      setTimeError(null);
      const totalMins = Math.round(diffMs / (1000 * 60));
      setDurationMinutes(totalMins);

      const hours = Math.floor(totalMins / 60);
      const mins = totalMins % 60;
      setDurationDisplay(`${hours} hour${hours !== 1 ? 's' : ''} ${mins} min${mins !== 1 ? 's' : ''}`);
    } catch {
      setTimeError('Error computing sleep duration');
    }
  }, [bedtime, wakeTime]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (timeError || durationMinutes <= 0) return;

    setIsSubmitting(true);
    try {
      await logSleep({
        bedtime: new Date(bedtime).toISOString(),
        wake_time: new Date(wakeTime).toISOString(),
        duration_minutes: durationMinutes,
        quality,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err) {
      console.error('Error logging sleep:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleReminder = async (enabled: boolean) => {
    if (enabled && notificationPermission !== 'granted') {
      const perm = await requestNotificationPermission();
      setNotificationPermission(perm);
      if (perm !== 'granted') {
        alert('Please allow notification permissions in your browser to receive bedtime alerts.');
        return;
      }
    }

    setSleepReminderEnabled(enabled);
    await updatePreferences(targetBedtime, enabled);
  };

  const handleSavePreferences = async () => {
    await updatePreferences(targetBedtime, sleepReminderEnabled);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        ref={sheetRef}
        className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-t-3xl sm:rounded-3xl p-5 pt-2 pb-[max(1.5rem,calc(env(safe-area-inset-bottom,0px)+1rem))] space-y-4 max-h-[92dvh] overflow-y-auto shadow-2xl relative will-change-transform"
        onClick={(e) => e.stopPropagation()}
      >
        <SheetHandle handleProps={handleProps} />
        {/* Header */}
        <div {...handleProps} className="flex items-center justify-between pb-1 border-b border-zinc-900 cursor-grab">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Moon className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base font-black text-white tracking-tight">Sleep & Recovery</h3>
              <p className="text-[11px] text-zinc-400">Log nightly rest & manage wind-down schedule</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center active-press"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex p-1 rounded-2xl bg-zinc-900/80 border border-zinc-800">
          <button
            type="button"
            onClick={() => setActiveTab('log')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'log'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Log Sleep
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('reminders')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'reminders'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Reminder Settings</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: LOG SLEEP FORM */}
        {/* ========================================================================= */}
        {activeTab === 'log' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Live Duration Display Pill */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-sky-950/50 via-cyan-950/30 to-zinc-950 border border-sky-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Clock className="w-5 h-5 text-indigo-400" />
                <div>
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    Calculated Rest Duration
                  </div>
                  <div className="text-base font-black text-indigo-300 font-mono mt-0.5">
                    {durationDisplay}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span
                  className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                    durationMinutes >= 420
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : durationMinutes >= 360
                      ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                      : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                  }`}
                >
                  {durationMinutes >= 420 ? 'Optimal' : durationMinutes >= 360 ? 'Moderate' : 'Under 6h'}
                </span>
              </div>
            </div>

            {/* Error Banner */}
            {timeError && (
              <div className="p-3 rounded-2xl bg-rose-950/40 border border-rose-900/80 flex items-center gap-2 text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{timeError}</span>
              </div>
            )}

            {/* Native <input type="datetime-local"> fields (Min 48px height) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Bedtime */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Moon className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Bedtime</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={bedtime}
                  onChange={(e) => setBedtime(e.target.value)}
                  className="w-full h-12 px-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-white font-semibold text-xs sm:text-sm focus:outline-none focus:border-indigo-500 active-press [color-scheme:dark]"
                />
              </div>

              {/* Wake Time */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>Wake Time</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={wakeTime}
                  onChange={(e) => setWakeTime(e.target.value)}
                  className="w-full h-12 px-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-white font-semibold text-xs sm:text-sm focus:outline-none focus:border-indigo-500 active-press [color-scheme:dark]"
                />
              </div>
            </div>

            {/* Large Segmented Toggle Buttons for Quality */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                Sleep Quality
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {QUALITY_OPTIONS.map((opt) => {
                  const isSelected = quality === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setQuality(opt.value)}
                      className={`h-14 p-2 rounded-2xl border text-center flex flex-col items-center justify-center transition-all active:scale-95 ${
                        isSelected
                          ? opt.activeClass
                          : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <span className="text-xs font-black tracking-tight">{opt.label}</span>
                      <span className="text-[9px] text-zinc-400 line-clamp-1">{opt.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optional Notes */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                Sleep Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Magnesium taken, felt groggy upon waking"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={100}
                className="w-full h-12 px-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Submit Button (Oversized >= 48px touch target) */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={Boolean(timeError) || isSubmitting || durationMinutes <= 0}
                className="w-full h-13 rounded-2xl bg-indigo-500 hover:bg-indigo-400 text-white font-black text-sm flex items-center justify-center gap-2 active-press shadow-xl shadow-indigo-950/60 disabled:opacity-50 transition-all"
              >
                <Sparkles className="w-4 h-4 stroke-[2.5]" />
                <span>{isSubmitting ? 'Logging Sleep...' : 'Save Sleep Entry'}</span>
              </button>
            </div>
          </form>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: REMINDER SETTINGS */}
        {/* ========================================================================= */}
        {activeTab === 'reminders' && (
          <div className="space-y-4 py-1">
            <div className="p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-800/40 text-xs text-indigo-300 space-y-1 leading-relaxed">
              <div className="font-bold flex items-center gap-1.5 text-indigo-200">
                <Bell className="w-4 h-4 text-indigo-400" />
                <span>Wind-Down Recovery Protocol</span>
              </div>
              <p className="text-[11px] text-zinc-400">
                We will schedule a local push notification <strong>45 minutes prior</strong> to your target bedtime to remind you to disconnect and optimize nervous system recovery.
              </p>
            </div>

            {/* Target Bedtime Input (Min 48px height) */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>Target Bedtime</span>
              </label>
              <input
                type="time"
                value={targetBedtime}
                onChange={(e) => {
                  setTargetBedtime(e.target.value);
                  updatePreferences(e.target.value, sleepReminderEnabled);
                }}
                className="w-full h-12 px-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-white font-bold text-sm focus:outline-none focus:border-indigo-500 active-press [color-scheme:dark]"
              />
            </div>

            {/* Toggle Sleep Reminder */}
            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
              <div className="space-y-0.5 pr-2">
                <div className="text-xs font-black text-white">45-Minute Wind-Down Alert</div>
                <div className="text-[11px] text-zinc-400">
                  Notify me 45m before {targetBedtime || '22:30'}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleToggleReminder(!sleepReminderEnabled)}
                className={`w-12 h-7 rounded-full transition-colors relative flex items-center px-0.5 active-press ${
                  sleepReminderEnabled ? 'bg-indigo-600' : 'bg-zinc-800'
                }`}
                aria-label="Toggle Bedtime Reminder"
              >
                <div
                  className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform ${
                    sleepReminderEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Notification Permission Status */}
            <div className="p-3 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-zinc-400">
                <span className="text-[11px]">Browser Permissions:</span>
                <span
                  className={`font-mono font-bold capitalize ${
                    notificationPermission === 'granted'
                      ? 'text-emerald-400'
                      : notificationPermission === 'denied'
                      ? 'text-rose-400'
                      : 'text-amber-400'
                  }`}
                >
                  {notificationPermission}
                </span>
              </div>

              {notificationPermission !== 'granted' && (
                <button
                  type="button"
                  onClick={async () => {
                    const perm = await requestNotificationPermission();
                    setNotificationPermission(perm);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 text-[11px] font-bold hover:bg-indigo-500/30 transition-colors"
                >
                  Enable
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={async () => {
                await handleSavePreferences();
                onClose();
              }}
              className="w-full h-12 rounded-2xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-white font-bold text-xs active-press transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LogSleepModal;
