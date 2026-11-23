import React, { useState } from 'react';
import { AlertTriangle, X, Moon, ChevronRight } from 'lucide-react';
import { useSleepTracker } from '../../hooks/useSleepTracker';

interface RecoveryWarningBannerProps {
  onOpenSleepModal?: () => void;
}

export const RecoveryWarningBanner: React.FC<RecoveryWarningBannerProps> = ({
  onOpenSleepModal,
}) => {
  const { latestSleep, isRecoveryWarningActive } = useSleepTracker();
  const [isDismissed, setIsDismissed] = useState(false);

  if (!isRecoveryWarningActive || isDismissed || !latestSleep) {
    return null;
  }

  const hours = Math.floor(latestSleep.duration_minutes / 60);
  const mins = latestSleep.duration_minutes % 60;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-950/70 via-amber-900/40 to-zinc-950 border border-amber-500/50 p-3.5 shadow-lg shadow-amber-950/20 text-amber-200">
      <div className="flex items-start justify-between gap-3">
        {/* Left Warning Icon */}
        <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
          <AlertTriangle className="w-4 h-4 stroke-[2.5]" />
        </div>

        {/* Center Content */}
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-black text-amber-300 uppercase tracking-tight">
              Recovery Warning: Prioritize sleep today
            </span>
          </div>
          <p className="text-[11px] text-amber-200/90 leading-relaxed">
            You logged only <strong className="text-amber-100 font-mono font-bold">{hours}h {mins}m</strong> of sleep following yesterday’s workout. Central nervous system fatigue is elevated—prioritize extra hydration, consider lowering training volume, and schedule an early bedtime tonight.
          </p>

          {onOpenSleepModal && (
            <button
              type="button"
              onClick={onOpenSleepModal}
              className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 hover:text-amber-200 underline active-press"
            >
              <Moon className="w-3 h-3" />
              <span>Update sleep logs or reminder</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          className="w-6 h-6 rounded-lg bg-amber-950/60 border border-amber-800/60 text-amber-400 hover:text-white flex items-center justify-center shrink-0 active-press transition-colors"
          aria-label="Dismiss warning"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default RecoveryWarningBanner;
