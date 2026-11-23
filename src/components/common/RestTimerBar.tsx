import React from 'react';
import { Timer, Plus, Minus, X, Bell, BellOff } from 'lucide-react';
import { formatTime } from '../../lib/utils';

interface RestTimerBarProps {
  remainingSeconds: number;
  initialSeconds: number;
  isActive: boolean;
  notificationPermission?: NotificationPermission | 'unsupported';
  onEnableNotifications?: () => void;
  onAddTime: (seconds: number) => void;
  onReset: () => void;
}

export const RestTimerBar: React.FC<RestTimerBarProps> = ({
  remainingSeconds,
  initialSeconds,
  isActive,
  notificationPermission,
  onEnableNotifications,
  onAddTime,
  onReset,
}) => {
  if (!isActive || remainingSeconds <= 0) return null;

  const progressPercent = Math.min(100, Math.max(0, (remainingSeconds / initialSeconds) * 100));

  return (
    <div className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] inset-x-2 sm:inset-x-4 max-w-md md:max-w-2xl lg:max-w-3xl mx-auto z-40 animate-in fade-in slide-in-from-bottom-3 duration-150">
      <div className="relative overflow-hidden rounded-2xl bg-[#101410] border border-emerald-400/70 shadow-2xl shadow-black p-2.5 sm:p-3.5 flex items-center justify-between gap-2">
        {/* Progress background fill in neon emerald */}
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-0 bg-emerald-500/20 transition-all duration-300 ease-linear pointer-events-none"
          style={{ width: progressPercent + '%' }}
        />

        <div className="relative flex items-center gap-2.5 sm:gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-400 flex items-center justify-center text-black shrink-0">
            <Timer className="w-6 h-6 animate-pulse stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                RESTING
              </span>
              {notificationPermission === 'granted' ? (
                <span
                  title="Background notifications active"
                  className="inline-flex items-center text-emerald-400"
                >
                  <Bell className="w-3 h-3 stroke-[2.5]" />
                </span>
              ) : notificationPermission === 'default' && onEnableNotifications ? (
                <button
                  type="button"
                  onClick={onEnableNotifications}
                  title="Click to enable background lock-screen notifications"
                  className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-400 bg-amber-950/60 border border-amber-800/80 px-1.5 py-0.5 rounded-md active-press"
                >
                  <BellOff className="w-2.5 h-2.5 stroke-[2.5]" />
                  <span>Notify</span>
                </button>
              ) : null}
            </div>
            <div className="text-2xl font-black font-mono tabular-nums text-white tracking-tight leading-none mt-0.5">
              {formatTime(remainingSeconds)}
            </div>
          </div>
        </div>

        <div className="relative flex items-center gap-1.5">
          <button
            onClick={() => onAddTime(-30)}
            className="min-w-11 h-11 px-2 sm:px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 active-press border border-zinc-700 text-zinc-100 text-xs font-black flex items-center justify-center gap-1"
            title="Subtract 30 seconds"
            aria-label="Subtract 30 seconds"
          >
            <Minus className="w-3.5 h-3.5 stroke-[3]" />
            <span className="hidden min-[370px]:inline">30s</span>
          </button>
          <button
            onClick={() => onAddTime(30)}
            className="min-w-11 h-11 px-2 sm:px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 active-press border border-zinc-700 text-zinc-100 text-xs font-black flex items-center justify-center gap-1"
            title="Add 30 seconds (Space)"
            aria-label="Add 30 seconds (Space)"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span className="hidden min-[370px]:inline">30s</span>
            <kbd className="kbd-hint hidden sm:inline-flex text-[8px] px-1 ml-0.5 opacity-80">
              Space
            </kbd>
          </button>
          <button
            onClick={onReset}
            className="min-w-11 h-11 px-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 active-press border border-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center gap-1"
            aria-label="Skip rest timer (Esc)"
            title="Skip rest timer (Esc)"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
            <kbd className="kbd-hint hidden sm:inline-flex text-[8px] px-1 opacity-80">
              Esc
            </kbd>
          </button>
        </div>
      </div>
    </div>
  );
};
