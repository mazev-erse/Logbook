import React, { useState } from 'react';
import { Target, Calendar, TrendingUp, TrendingDown, Minus, Edit3, Sparkles } from 'lucide-react';
import { useFitnessGoal } from '../../hooks/useFitnessGoal';
import { SetGoalModal } from './SetGoalModal';
import type { GoalType } from '../../types/database';

export const GoalTrackerCard: React.FC = () => {
  const {
    activeGoal,
    latestWeight,
    isLoading,
    progressPercent,
    weightRemainingText,
    daysRemaining,
    updateGoal,
  } = useFitnessGoal();

  const [isModalOpen, setIsModalOpen] = useState(false);

  // Format date helper
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Semantic styles based on goal type
  const getSemanticTheme = (type?: GoalType) => {
    switch (type) {
      case 'Bulking':
        return {
          border: 'border-sky-500/40',
          bg: 'bg-sky-950/20',
          badgeBg: 'bg-sky-500/10',
          badgeBorder: 'border-sky-500/30',
          badgeText: 'text-sky-400',
          icon: TrendingUp,
          progressGradient: 'bg-gradient-to-r from-sky-500 to-blue-500',
          accentText: 'text-sky-400',
        };
      case 'Cutting':
        return {
          border: 'border-rose-500/40',
          bg: 'bg-rose-950/20',
          badgeBg: 'bg-rose-500/10',
          badgeBorder: 'border-rose-500/30',
          badgeText: 'text-rose-400',
          icon: TrendingDown,
          progressGradient: 'bg-gradient-to-r from-rose-500 to-amber-500',
          accentText: 'text-rose-400',
        };
      case 'Maintaining':
      default:
        return {
          border: 'border-zinc-700/60',
          bg: 'bg-zinc-900/40',
          badgeBg: 'bg-zinc-800/80',
          badgeBorder: 'border-zinc-700',
          badgeText: 'text-zinc-300',
          icon: Minus,
          progressGradient: 'bg-gradient-to-r from-zinc-500 to-emerald-400',
          accentText: 'text-emerald-400',
        };
    }
  };

  const theme = getSemanticTheme(activeGoal?.goal_type);
  const GoalIcon = theme.icon;

  if (isLoading) {
    return (
      <div className="rounded-3xl bg-zinc-900/60 border border-zinc-800/80 p-5 animate-pulse text-center">
        <div className="h-4 w-32 bg-zinc-800 rounded-md mx-auto mb-2" />
        <div className="h-8 w-48 bg-zinc-800 rounded-lg mx-auto" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
          <Target className="w-3.5 h-3.5 text-emerald-400" />
          <span>Current Goal</span>
        </span>
        {activeGoal && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 active-press transition-colors"
          >
            <Edit3 className="w-3 h-3" />
            <span>Update Goal</span>
          </button>
        )}
      </div>

      {activeGoal ? (
        <div
          className={`rounded-3xl ${theme.bg} border ${theme.border} p-5 space-y-4 shadow-xl transition-all`}
        >
          {/* Top Row: Goal Type Badge & Target Date */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${theme.badgeBg} ${theme.badgeBorder} ${theme.badgeText}`}
              >
                <GoalIcon className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{activeGoal.goal_type}</span>
              </span>
            </div>

            <div className="text-right">
              <div className="text-[11px] text-zinc-400 flex items-center gap-1 justify-end font-medium">
                <Calendar className="w-3 h-3 text-zinc-500" />
                <span>Target: {formatDate(activeGoal.target_date)}</span>
              </div>
              <div className="text-[10px] font-mono text-zinc-500 mt-0.5">
                {daysRemaining > 0
                  ? `${daysRemaining} days left`
                  : daysRemaining === 0
                  ? 'Due today'
                  : `${Math.abs(daysRemaining)} days past`}
              </div>
            </div>
          </div>

          {/* Middle Row: Weight Comparison & "X kg to go" */}
          <div className="flex items-baseline justify-between pt-1">
            <div className="space-y-0.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Latest Weight
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-white font-mono tracking-tight">
                  {latestWeight !== null ? latestWeight : activeGoal.start_weight}
                </span>
                <span className="text-xs font-mono text-zinc-400 font-semibold">kg</span>
              </div>
            </div>

            <div className="text-right space-y-0.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Target Weight
              </div>
              <div className="flex items-baseline gap-1.5 justify-end">
                <span className="text-2xl font-black text-zinc-200 font-mono tracking-tight">
                  {activeGoal.target_weight}
                </span>
                <span className="text-xs font-mono text-zinc-400 font-semibold">kg</span>
              </div>
            </div>
          </div>

          {/* Static Tailwind Progress Bar */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className={`font-bold ${theme.accentText}`}>
                {weightRemainingText}
              </span>
              <span className="text-zinc-400 font-semibold">{progressPercent}%</span>
            </div>

            <div className="h-3 w-full bg-zinc-950/80 rounded-full overflow-hidden border border-zinc-800/80 p-0.5">
              <div
                className={`h-full ${theme.progressGradient} rounded-full transition-all duration-500 ease-out`}
                style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
              />
            </div>
          </div>

          {/* BMR / TDEE & Target Nutrition Summary */}
          {(activeGoal.tdee || activeGoal.daily_calorie_goal) && (
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/60">
              <div className="rounded-2xl bg-zinc-950/60 border border-zinc-800/80 p-2.5">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block tracking-wider">
                  Daily Target
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-base font-black font-mono text-emerald-400">
                    {activeGoal.daily_calorie_goal || activeGoal.tdee}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500">kcal</span>
                </div>
                {activeGoal.tdee && (
                  <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">
                    TDEE: {activeGoal.tdee} kcal
                  </span>
                )}
              </div>

              <div className="rounded-2xl bg-zinc-950/60 border border-zinc-800/80 p-2.5">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block tracking-wider">
                  Macros (P / C / F)
                </span>
                <div className="text-xs font-black font-mono text-white mt-1 flex items-center gap-1.5">
                  <span className="text-sky-400">{activeGoal.protein_goal ?? 180}g</span>
                  <span className="text-zinc-600">•</span>
                  <span className="text-emerald-400">{activeGoal.carbs_goal ?? 250}g</span>
                  <span className="text-zinc-600">•</span>
                  <span className="text-amber-400">{activeGoal.fats_goal ?? 70}g</span>
                </div>
                {activeGoal.bmr && (
                  <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">
                    BMR: {activeGoal.bmr} kcal
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Bottom Action: Update Goal button */}
          <div className="pt-1">
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full py-3 px-4 rounded-2xl bg-zinc-900/90 hover:bg-zinc-850 border border-zinc-700/60 text-xs font-black text-zinc-200 hover:text-white flex items-center justify-center gap-2 active-press transition-colors shadow-md"
            >
              <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Update Goal</span>
            </button>
          </div>
        </div>
      ) : (
        /* Empty State: Prompt to set first goal */
        <div className="rounded-3xl bg-zinc-900/40 border border-dashed border-zinc-800 p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-zinc-900 mx-auto flex items-center justify-center text-zinc-500">
            <Target className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-black text-zinc-200">No active goal set</h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
              Set a target for bulking, cutting, or maintaining to track your weight trajectory.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-black font-black text-xs shadow-lg shadow-emerald-950/60 active-press transition-all"
          >
            <Sparkles className="w-4 h-4 stroke-[3]" />
            <span>Set Your Goal</span>
          </button>
        </div>
      )}

      {/* Set Goal Modal */}
      <SetGoalModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentGoal={activeGoal}
        latestWeight={latestWeight}
        onSaveGoal={updateGoal}
      />
    </div>
  );
};

export default GoalTrackerCard;
