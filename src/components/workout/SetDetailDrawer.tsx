import React from 'react';
import { X, Trash2, Disc, Gauge, Zap, Copy, Trophy, History, TrendingUp } from 'lucide-react';
import type { ActiveSet } from '../../types/database';
import { calculatePlates } from '../../lib/plateCalculator';
import { useSwipeToDismiss } from '../../hooks/useSwipeToDismiss';
import { SheetHandle } from '../common/SheetHandle';

interface SetDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  set: ActiveSet | null;
  exerciseName: string;
  isBarbell: boolean;
  previousSet?: { weight: number; reps: number } | null;
  personalRecord?: { maxWeight: number; maxRepsAtMaxWeight: number; estimated1RM: number } | null;
  onUpdateWeight: (weight: number) => void;
  onUpdateReps: (reps: number) => void;
  onUpdateRpe: (rpe: number | null) => void;
  onDeleteSet: () => void;
  onViewHistory?: () => void;
}

const RPE_OPTIONS = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];
const QUICK_ADJUSTS = [-10, -5, -2.5, 2.5, 5, 10];

export const SetDetailDrawer: React.FC<SetDetailDrawerProps> = ({
  isOpen,
  onClose,
  set,
  exerciseName,
  isBarbell,
  previousSet,
  personalRecord,
  onUpdateWeight,
  onUpdateReps,
  onUpdateRpe,
  onDeleteSet,
  onViewHistory,
}) => {
  const { sheetRef, handleProps } = useSwipeToDismiss({ onDismiss: onClose, isOpen: isOpen && Boolean(set) });

  if (!isOpen || !set) return null;

  const plateData = isBarbell ? calculatePlates(set.weight) : null;

  const handleCopyPrevious = () => {
    if (previousSet) {
      onUpdateWeight(previousSet.weight);
      onUpdateReps(previousSet.reps);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        ref={sheetRef}
        className="bg-zinc-950 border-t border-zinc-800 rounded-t-3xl max-w-md w-full mx-auto p-5 pt-2 pb-[max(2rem,calc(env(safe-area-inset-bottom,0px)+1rem))] space-y-4 shadow-2xl max-h-[85dvh] overflow-y-auto will-change-transform"
      >
        <SheetHandle handleProps={handleProps} />
        {/* Drawer Header */}
        <div {...handleProps} className="flex items-center justify-between cursor-grab">
          <div>
            <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
              Set {set.setNumber} • {exerciseName}
            </div>
            <div className="text-xl font-black text-white mt-0.5 font-mono">
              {set.weight} kg × {set.reps} reps
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 active-press"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progressive Overload Benchmark Card */}
        {(previousSet || personalRecord) && (
          <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-emerald-400" />
                <span>Benchmark to Beat</span>
              </span>

              {previousSet && (
                <button
                  onClick={handleCopyPrevious}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold active-press"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy Last</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {previousSet && (
                <div className="p-2.5 rounded-xl bg-black/40 border border-zinc-800">
                  <div className="text-[10px] text-zinc-500 font-medium">Last Session</div>
                  <div className="font-mono font-bold text-white text-sm mt-0.5">
                    {previousSet.weight} kg × {previousSet.reps}
                  </div>
                </div>
              )}

              {personalRecord && (
                <div className="p-2.5 rounded-xl bg-black/40 border border-zinc-800">
                  <div className="text-[10px] text-amber-400/80 font-medium flex items-center gap-1">
                    <Trophy className="w-3 h-3 text-amber-400" />
                    <span>All-Time PR</span>
                  </div>
                  <div className="font-mono font-bold text-amber-300 text-sm mt-0.5">
                    {personalRecord.maxWeight} kg × {personalRecord.maxRepsAtMaxWeight}
                  </div>
                </div>
              )}
            </div>

            {onViewHistory && (
              <button
                type="button"
                onClick={onViewHistory}
                className="w-full py-2 px-3 rounded-xl bg-zinc-950/80 border border-zinc-800 hover:border-emerald-500/50 text-zinc-300 hover:text-emerald-400 text-xs font-bold flex items-center justify-center gap-1.5 active-press transition-colors"
              >
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span>View 1RM Trendline & Past Sessions</span>
              </button>
            )}
          </div>
        )}

        {/* Quick Weight Adjust Stepper Chips */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span>Quick Weight Adjust</span>
          </div>
          <div className="grid grid-cols-6 gap-1.5">
            {QUICK_ADJUSTS.map((adj) => (
              <button
                key={adj}
                onClick={() => onUpdateWeight(Math.max(0, set.weight + adj))}
                className="py-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs font-bold font-mono text-zinc-200 active-press"
              >
                {adj > 0 ? `+${adj}` : adj}
              </button>
            ))}
          </div>
        </div>

        {/* Barbell Plate Calculator (if applicable) */}
        {plateData && set.weight >= 20 && (
          <div className="p-3.5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-zinc-300 flex items-center gap-1.5">
                <Disc className="w-4 h-4 text-emerald-400" />
                <span>Plate Calculator (20kg bar)</span>
              </span>
              <span className="font-mono text-emerald-400 font-semibold">
                {plateData.weightPerSide} kg / side
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {plateData.platesPerSide.length > 0 ? (
                plateData.platesPerSide.map((p, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-xs font-mono font-bold text-zinc-200"
                  >
                    {p.count} × {p.weight}kg
                  </span>
                ))
              ) : (
                <span className="text-xs text-zinc-500">Empty bar (20kg)</span>
              )}
            </div>
          </div>
        )}

        {/* RPE Selector */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
            <Gauge className="w-3.5 h-3.5 text-emerald-400" />
            <span>Rate of Perceived Exertion (RPE)</span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {RPE_OPTIONS.map((rpe) => (
              <button
                key={rpe}
                onClick={() => onUpdateRpe(set.rpe === rpe ? null : rpe)}
                className={`flex-shrink-0 w-11 h-11 rounded-xl text-xs font-bold font-mono active-press transition-colors ${
                  set.rpe === rpe
                    ? 'bg-emerald-500 text-black shadow-md shadow-emerald-950'
                    : 'bg-zinc-900 border border-zinc-800 text-zinc-300'
                }`}
              >
                {rpe}
              </button>
            ))}
          </div>
        </div>

        {/* Bottom Actions: Delete Set */}
        <div className="pt-2 border-t border-zinc-900 flex justify-between items-center">
          <button
            onClick={() => {
              onDeleteSet();
              onClose();
            }}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-rose-950/40 border border-rose-900/60 text-rose-400 hover:bg-rose-900/30 text-xs font-bold active-press"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Set</span>
          </button>

          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold active-press"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
