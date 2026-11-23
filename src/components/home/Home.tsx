import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Play,
  Flame,
  Calendar,
  Trophy,
  Dumbbell,
  ChevronRight,
  Sparkles,
  Award,
  X,
  Plus,
  Clock,
} from 'lucide-react';
import type { ActiveWorkout } from '../../types/database';
import { useWorkoutHistory } from '../../hooks/useWorkoutHistory';
import { SportsRecoverySection } from './SportsRecoverySection';
import { RecoveryWarningBanner } from './RecoveryWarningBanner';
import { StreakRescueBanner } from './StreakRescueBanner';
import { LogSleepModal } from '../sleep/LogSleepModal';

export interface HomeProps {
  activeWorkout: ActiveWorkout | null;
  onStartWorkout: (name?: string, customStartedAt?: string) => void;
  onResumeWorkout: () => void;
  onNavigateToProgress: () => void;
  onNavigateToRoutines?: () => void;
}

export const Home: React.FC<HomeProps> = ({
  activeWorkout,
  onStartWorkout,
  onResumeWorkout,
  onNavigateToProgress,
  onNavigateToRoutines,
}) => {
  const [showStartModal, setShowStartModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<{ name: string; focus: string } | null>(null);
  const pointerDownOnBackdropRef = useRef(false);
  const [isSleepModalOpen, setIsSleepModalOpen] = useState(false);
  const { homeMetrics, isLoading } = useWorkoutHistory();

  const routineTemplates = [
    { name: 'Push Day', focus: 'Chest, Shoulders & Triceps' },
    { name: 'Pull Day', focus: 'Back, Rear Delts & Biceps' },
    { name: 'Leg Day', focus: 'Quads, Hamstrings & Calves' },
    { name: 'Full Body', focus: 'Compound Strength' },
  ];

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 pb-32 pt-5 sm:px-6 sm:pt-6 lg:px-10">
      <section aria-label="Today" className="flex items-end justify-between px-0.5">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-400">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <h2 className="mt-1 text-[28px] leading-none font-black tracking-tight text-zinc-100">
            Make it count<span className="text-emerald-400">.</span>
          </h2>
          <p className="mt-2 text-sm text-zinc-400">Your training, one set at a time.</p>
        </div>
        <div className="mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-zinc-700/80 bg-zinc-900 text-emerald-400 shadow-lg shadow-black/20">
          <Dumbbell className="h-5 w-5" aria-hidden="true" />
        </div>
      </section>

      {/* 0. STREAK RESCUE WARNING BANNER (36-Hour Grace Period) */}
      <StreakRescueBanner
        isGracePeriodActive={Boolean(homeMetrics.isGracePeriodActive)}
        hoursRemaining={homeMetrics.gracePeriodHoursRemaining || 0}
        streakDays={homeMetrics.streakDays}
        onLogPastSession={() => {
          const yesterdayTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
          onStartWorkout("Yesterday's Workout", yesterdayTime);
        }}
      />

      {/* 0.1 RECOVERY WARNING BANNER (Under 6h sleep & worked out yesterday) */}
      <RecoveryWarningBanner onOpenSleepModal={() => setIsSleepModalOpen(true)} />

      {/* 1. HERO ACTION: Start Today's Workout / Resume Active Workout */}
      {activeWorkout ? (
        <div className="relative overflow-hidden rounded-[28px] bg-zinc-900 p-5 shadow-xl shadow-black/30 text-white border border-emerald-400/40 animate-in fade-in duration-200">
          <div className="absolute -right-8 -top-12 h-36 w-36 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-400/10 text-emerald-300 text-[10px] uppercase tracking-wider font-black border border-emerald-400/25">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                Workout In Progress
              </div>
              <h2 className="text-xl font-black tracking-tight mt-1">{activeWorkout.name}</h2>
              <p className="text-xs text-zinc-400 font-medium">
                {activeWorkout.exercises.length} exercise
                {activeWorkout.exercises.length !== 1 ? 's' : ''} currently logged
              </p>
            </div>
            <button
              onClick={onResumeWorkout}
              className="min-h-14 flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-emerald-400 text-[#10130d] font-black text-sm shadow-lg shadow-emerald-950/40 active-press hover:bg-emerald-300 transition-colors"
            >
              <span>Resume</span>
              <kbd className="kbd-hint hidden sm:inline-flex text-[9px] text-emerald-950 bg-emerald-300 border-emerald-500 border-b-emerald-700">N</kbd>
              <ChevronRight className="w-4 h-4 stroke-[3]" />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowStartModal(true)}
          className="w-full min-h-32 group relative overflow-hidden rounded-[28px] bg-emerald-400 p-5 text-left shadow-xl shadow-emerald-950/30 active-press transition-colors hover:bg-emerald-300 border border-emerald-300/80"
        >
          {/* Subtle decorative glow overlay */}
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/25 rounded-full blur-2xl pointer-events-none" />

          <div className="relative flex items-center justify-between">
            <div className="space-y-1 pr-2">
              <div className="inline-flex items-center gap-1.5 text-emerald-950 text-xs font-black uppercase tracking-wider bg-emerald-300/60 px-2.5 py-0.5 rounded-full">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Today's session</span>
              </div>
              <h2 className="text-[23px] font-black text-[#10130d] tracking-tight leading-tight pt-1 flex items-center gap-2">
                <span>Start a workout</span>
                <kbd className="kbd-hint hidden sm:inline-flex text-[9px] text-emerald-950 bg-emerald-300/80 border-emerald-500 border-b-emerald-700">N</kbd>
              </h2>
              <p className="text-xs text-[#28300e] font-semibold">
                Log your lifts and keep your momentum.
              </p>
            </div>

            <div className="w-14 h-14 rounded-2xl bg-[#10130d] flex items-center justify-center text-emerald-400 shadow-xl shrink-0">
              <Play className="w-7 h-7 fill-emerald-400 ml-0.5" />
            </div>
          </div>
        </button>
      )}

      {/* 2. COMPACT TRAINING SUMMARY */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Training Consistency
          </span>
          {isLoading && (
            <span className="text-[10px] text-zinc-500 font-mono animate-pulse">
              Syncing stats...
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:max-w-xl">
          {/* Stat Card 1: Current Streak */}
          <div className="rounded-2xl bg-zinc-900/90 border border-zinc-800/80 p-3.5 flex flex-col justify-between shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Streak
              </span>
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
              </div>
            </div>
            <div className="mt-2.5">
              <div className="text-2xl font-black text-white font-mono tracking-tight leading-none">
                {isLoading ? (
                  <span className="inline-block w-8 h-6 bg-zinc-800 rounded animate-pulse" />
                ) : (
                  homeMetrics.streakDays
                )}
              </div>
              <p className="text-[10px] text-zinc-400 font-medium mt-1">
                {homeMetrics.streakDays === 1 ? 'day' : 'days'} in a row
              </p>
            </div>
          </div>

          {/* Stat Card 2: Workouts This Week */}
          <div className="rounded-2xl bg-zinc-900/90 border border-zinc-800/80 p-3.5 flex flex-col justify-between shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Weekly
              </span>
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              </div>
            </div>
            <div className="mt-2.5">
              <div className="text-2xl font-black text-white font-mono tracking-tight leading-none">
                {isLoading ? (
                  <span className="inline-block w-8 h-6 bg-zinc-800 rounded animate-pulse" />
                ) : (
                  homeMetrics.workoutsThisWeek
                )}
              </div>
              <p className="text-[10px] text-zinc-400 font-medium mt-1">
                {homeMetrics.workoutsThisWeek === 1 ? 'session' : 'sessions'}
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* 3. RECENT PRs SECTION */}
      <div className="rounded-3xl bg-zinc-900/80 border border-zinc-800/80 p-4 space-y-3.5 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-400">
            <div className="w-7 h-7 rounded-xl bg-amber-400/10 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-200">
                Recent PRs
              </h3>
              <p className="text-[10px] text-zinc-500 font-medium">
                Highest weight logged per exercise
              </p>
            </div>
          </div>
          <button
            onClick={onNavigateToProgress}
            className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5 active-press transition-colors"
          >
            <span>Analytics</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {homeMetrics.recentPRs.length > 0 ? (
          <div className="space-y-2">
            {homeMetrics.recentPRs.slice(0, 3).map((pr) => (
              <div
                key={pr.exerciseId}
                className="flex items-center justify-between py-2.5 px-3.5 rounded-2xl bg-zinc-950/80 border border-zinc-800/60 hover:border-zinc-700 transition-colors"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white tracking-tight">
                      {pr.exerciseName}
                    </span>
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[9px] font-black font-mono">
                      <Award className="w-2.5 h-2.5" />
                      PR
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-400 font-mono">
                    {pr.maxRepsAtMaxWeight} reps • Est. 1RM:{' '}
                    <span className="text-emerald-400 font-bold">{pr.estimated1RM}kg</span>
                    {pr.achievedAt && (
                      <span className="text-zinc-600 ml-1.5">• {formatDate(pr.achievedAt)}</span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-base font-black text-white font-mono tracking-tight leading-none">
                    {pr.maxWeight}{' '}
                    <span className="text-[11px] text-zinc-400 font-sans font-semibold">kg</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 px-4 rounded-2xl bg-zinc-950/40 border border-dashed border-zinc-800/60 text-center space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-zinc-900 mx-auto flex items-center justify-center text-zinc-600">
              <Trophy className="w-5 h-5" />
            </div>
            <div className="text-xs font-bold text-zinc-300">No PRs recorded yet</div>
            <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">
              Complete your first workout session to benchmark your lifts and track your personal
              records here!
            </p>
          </div>
        )}
      </div>

      {/* 4. SPORTS & ACTIVE RECOVERY SECTION */}
      <SportsRecoverySection />

      {/* 5. QUICK ROUTINE TEMPLATES */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400">
            Quick Routine Templates
          </h3>
          {onNavigateToRoutines && (
            <button
              onClick={onNavigateToRoutines}
              className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 active-press transition-colors"
            >
              <span>View All & Custom</span>
              <kbd className="kbd-hint hidden sm:inline-flex text-[9px] px-1 py-0">R</kbd>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {routineTemplates.map((template) => (
            <button
              key={template.name}
              onClick={() => setSelectedTemplate(template)}
              className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 text-left active-press transition-colors group shadow-md"
            >
              <div className="font-bold text-xs text-zinc-100 group-hover:text-emerald-400 transition-colors flex items-center justify-between">
                <span>{template.name}</span>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-emerald-400 transition-colors" />
              </div>
              <div className="text-[10px] text-zinc-400 mt-1 leading-snug">{template.focus}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Quick Workout Picker Modal */}
      {showStartModal && typeof document !== 'undefined' && createPortal(
        <div
        onPointerDown={(e) => {
          pointerDownOnBackdropRef.current = e.target === e.currentTarget;
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget && pointerDownOnBackdropRef.current) {
            setShowStartModal(false);
          }
          pointerDownOnBackdropRef.current = false;
        }}
        className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl animate-in slide-in-from-bottom-4 duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-white">Start Workout</h3>
                <p className="text-xs text-zinc-400 mt-0.5">Select a pre-configured split or empty session</p>
              </div>
              <button
                type="button"
                onClick={() => setShowStartModal(false)}
                className="min-w-8 h-8 px-2 rounded-full bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center gap-1 active-press"
                title="Close (Esc)"
              >
                <X className="w-4 h-4" />
                <kbd className="kbd-hint hidden sm:inline-flex text-[8px] px-1 py-0">Esc</kbd>
              </button>
            </div>

            <div className="space-y-2 pt-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Recommended Splits (Exercises Pre-loaded)
              </span>
              <div className="space-y-1.5">
                {routineTemplates.map((template) => (
                  <button
                    key={template.name}
                    type="button"
                    onClick={() => {
                      setShowStartModal(false);
                      setSelectedTemplate(template);
                    }}
                    className="w-full p-3 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 hover:border-emerald-500/40 text-left active-press transition-colors group flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-black text-white group-hover:text-emerald-400 transition-colors">
                        {template.name}
                      </div>
                      <div className="text-[10px] text-zinc-400 mt-0.5">{template.focus}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-emerald-400 transition-colors" />
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-800/80 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Custom / Blank Session
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowStartModal(false);
                  onStartWorkout("Today's Workout");
                }}
                className="w-full p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-300 text-xs font-bold active-press transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-emerald-400 stroke-[3]" />
                  <span>Quick Blank Session</span>
                </div>
                <span className="text-[10px] text-emerald-400/80 font-mono">Pick exercises live</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowStartModal(false);
                  const yesterdayTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
                  onStartWorkout("Yesterday's Workout", yesterdayTime);
                }}
                className="w-full p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-300 text-xs font-bold active-press transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400 stroke-[2.5]" />
                  <span>Log Past Workout (36h Grace)</span>
                </div>
                <span className="text-[10px] text-amber-400 font-mono">Yesterday's session</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {selectedTemplate && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[65] flex items-end justify-center bg-black/80 p-3 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] backdrop-blur-sm sm:items-center" onClick={() => setSelectedTemplate(null)}>
          <section role="dialog" aria-modal="true" aria-labelledby="routine-preview-title" onClick={(event) => event.stopPropagation()} className="w-full max-w-md space-y-5 rounded-3xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-300">Routine preview</p><h2 id="routine-preview-title" className="mt-1 text-xl font-black text-white">{selectedTemplate.name}</h2><p className="mt-1 text-sm text-zinc-400">{selectedTemplate.focus}</p></div>
              <button type="button" onClick={() => setSelectedTemplate(null)} aria-label="Close routine preview" className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-800 text-zinc-300"><X className="h-4 w-4" /></button>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4"><p className="text-sm font-semibold text-zinc-100">Ready when you are</p><p className="mt-1 text-xs leading-relaxed text-zinc-400">This routine preloads its exercises and target sets. You can change the plan as you log your workout.</p></div>
            <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setSelectedTemplate(null)} className="min-h-12 rounded-xl border border-zinc-700 bg-zinc-800 text-sm font-bold text-zinc-200">Back</button><button type="button" onClick={() => { const name = selectedTemplate.name; setSelectedTemplate(null); onStartWorkout(name); }} className="min-h-12 rounded-xl bg-emerald-400 text-sm font-black text-black">Start routine</button></div>
          </section>
        </div>, document.body
      )}

      {/* Log Sleep Modal */}
      <LogSleepModal
        isOpen={isSleepModalOpen}
        onClose={() => setIsSleepModalOpen(false)}
      />
    </div>
  );
};

export default Home;
