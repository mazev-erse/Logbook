import React, { useState } from 'react';
import { Flame, Clock, X, ChevronRight, AlertTriangle } from 'lucide-react';

interface StreakRescueBannerProps {
  isGracePeriodActive: boolean;
  hoursRemaining: number;
  streakDays: number;
  onLogPastSession: () => void;
}

export const StreakRescueBanner: React.FC<StreakRescueBannerProps> = ({
  isGracePeriodActive,
  hoursRemaining,
  streakDays,
  onLogPastSession,
}) => {
  const [isDismissed, setIsDismissed] = useState(false);

  if (!isGracePeriodActive || isDismissed) {
    return null;
  }

  const hoursLabel = hoursRemaining === 1 ? '1 hour' : `${hoursRemaining} hours`;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-950 via-orange-950/90 to-zinc-950 border-2 border-amber-500 shadow-2xl shadow-amber-950/50 p-4 text-amber-100 animate-in fade-in slide-in-from-top-3 duration-200">
      {/* Background ambient glow */}
      <div className="absolute -right-8 -top-8 w-28 h-28 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />

      <div className="relative flex items-start justify-between gap-3">
        {/* Left Glowing Warning Icon */}
        <div className="w-10 h-10 rounded-2xl bg-amber-500/25 border border-amber-400/60 flex items-center justify-center text-amber-400 shrink-0 mt-0.5 shadow-inner">
          <Flame className="w-5 h-5 fill-amber-400 animate-pulse" />
        </div>

        {/* Center Content */}
        <div className="flex-1 space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-[10px] font-black uppercase tracking-wider text-amber-300">
            <AlertTriangle className="w-3 h-3 stroke-[2.5]" />
            <span>36h Grace Period Active</span>
          </div>

          <h3 className="text-sm font-black text-amber-300 tracking-tight leading-tight">
            Streak in danger! You have {hoursLabel} left to log yesterday's session.
          </h3>

          <p className="text-[11px] text-amber-200/90 font-medium leading-relaxed">
            {streakDays > 0 ? (
              <>
                Your <strong className="text-white font-mono">{streakDays}-day streak</strong> is
                temporarily protected. Log your completed session now before the 36-hour grace
                window expires and resets your streak to 0.
              </>
            ) : (
              <>
                You have {hoursLabel} left to log your session within the 36-hour grace window.
              </>
            )}
          </p>

          <div className="pt-1 flex items-center gap-2">
            <button
              type="button"
              onClick={onLogPastSession}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-black shadow-lg shadow-amber-950/60 active-press transition-colors"
            >
              <Clock className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Log Session Now</span>
              <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          className="w-7 h-7 rounded-xl bg-amber-950/80 border border-amber-700/60 text-amber-400 hover:text-white flex items-center justify-center shrink-0 active-press transition-colors"
          aria-label="Dismiss streak alert"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default StreakRescueBanner;
