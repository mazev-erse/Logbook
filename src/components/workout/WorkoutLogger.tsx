import React, { useState, useEffect } from 'react';
import {
  Plus,
  Check,
  Clock,
  Calendar,
  Dumbbell,
  AlertCircle,
  SlidersHorizontal,
  Flame,
  Trophy,
  Loader2,
  TrendingUp,
} from 'lucide-react';
import type { ActiveWorkout, ActiveSet, Exercise } from '../../types/database';
import { ExercisePickerModal } from './ExercisePickerModal';
import { SetDetailDrawer } from './SetDetailDrawer';
import { ExerciseProgressDrawer } from './ExerciseProgressDrawer';
import { formatTime, calculate1RM } from '../../lib/utils';
import { useWorkoutHistory } from '../../hooks/useWorkoutHistory';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../auth/ProtectedRoute';

import { WorkoutDebriefModal } from './WorkoutDebriefModal';
import type { WorkoutMood } from '../../types/database';

export interface WorkoutLoggerProps {
  workout: ActiveWorkout;
  onAddExercise: (exercise: Exercise) => void;
  onRemoveExercise: (workoutExerciseId: string) => void;
  onAddSet: (workoutExerciseId: string) => void;
  onRemoveSet: (workoutExerciseId: string, setId: string) => void;
  onUpdateSet: (
    workoutExerciseId: string,
    setId: string,
    updates: { weight?: number; reps?: number; rpe?: number | null }
  ) => void;
  onToggleCompleteSet: (workoutExerciseId: string, setId: string) => void;
  onFinishWorkout: (debrief?: {
    notes?: string;
    mood?: WorkoutMood;
    sessionRpe?: number;
    startedAt?: string;
  }) => void | Promise<void>;
  onCancelWorkout: () => void;
  onUpdateStartedAt?: (startedAt: string) => void;
  isSaving?: boolean;
}

export const WorkoutLogger: React.FC<WorkoutLoggerProps> = ({
  workout,
  onAddExercise,
  onRemoveExercise,
  onAddSet,
  onRemoveSet,
  onUpdateSet,
  onToggleCompleteSet,
  onFinishWorkout,
  onCancelWorkout,
  onUpdateStartedAt,
  isSaving = false,
}) => {
  const { showToast, showUndoToast } = useToast();
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isDebriefOpen, setIsDebriefOpen] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [showEmptyWarning, setShowEmptyWarning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pad = (n: number) => String(n).padStart(2, '0');
  const toDatetimeLocal = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

  // Check if workout was started in the past (> 5 minutes ago)
  const [isPastWorkout, setIsPastWorkout] = useState(
    () => new Date(workout.startedAt).getTime() < Date.now() - 5 * 60 * 1000
  );
  const [workoutDateTime, setWorkoutDateTime] = useState(() =>
    toDatetimeLocal(new Date(workout.startedAt))
  );
  const [minDateTime, setMinDateTime] = useState('');
  const [maxDateTime, setMaxDateTime] = useState('');
  const [dateError, setDateError] = useState<string | null>(null);

  // Time-Restricted Date Picker: Strictly set min attribute to exactly 36 hours ago from new Date(), and max to current time
  useEffect(() => {
    const updateTimeBounds = () => {
      const now = new Date();
      const thirtySixHoursAgo = new Date(now.getTime() - 36 * 60 * 60 * 1000);

      setMinDateTime(toDatetimeLocal(thirtySixHoursAgo));
      setMaxDateTime(toDatetimeLocal(now));
    };

    updateTimeBounds();
    const interval = setInterval(updateTimeBounds, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleDateTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setWorkoutDateTime(val);
    if (!val) return;

    const chosenDate = new Date(val);
    const chosenMs = chosenDate.getTime();
    const nowMs = Date.now();
    const minMs = nowMs - 36 * 60 * 60 * 1000;

    if (chosenMs < minMs - 60000) {
      setDateError('Date cannot be older than 36 hours (grace period limit).');
      return;
    }
    if (chosenMs > nowMs + 60000) {
      setDateError('Cannot log a workout in the future.');
      return;
    }

    setDateError(null);
    const isoString = chosenDate.toISOString();
    if (onUpdateStartedAt) {
      onUpdateStartedAt(isoString);
    }
  };

  // Progressive Overload Hook: previous performances & all-time PRs
  const { getPreviousExercisePerformance } = useWorkoutHistory();

  // Exercise progression drawer state
  const [selectedExerciseForProgress, setSelectedExerciseForProgress] = useState<{
    name: string;
    category?: string;
    equipment?: string;
  } | null>(null);

  // Progressive Disclosure: Selected set for secondary tools drawer
  const [selectedSetContext, setSelectedSetContext] = useState<{
    set: ActiveSet;
    workoutExerciseId: string;
    exerciseName: string;
    isBarbell: boolean;
    previousSet?: { weight: number; reps: number } | null;
    personalRecord?: { maxWeight: number; maxRepsAtMaxWeight: number; estimated1RM: number } | null;
  } | null>(null);

  // Workout duration counter
  useEffect(() => {
    const startTime = new Date(workout.startedAt).getTime();
    const updateElapsed = () => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startTime) / 1000)));
    };
    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [workout.startedAt]);

  const totalCompletedSets = workout.exercises.reduce(
    (acc, ex) =>
      acc + ex.sets.filter((s) => s.isCompleted || (s.weight > 0 && s.reps > 0)).length,
    0
  );

  const { requireAuth } = useAuth();

  const handleCompleteWorkout = () => {
    requireAuth(() => {
      if (workout.exercises.length === 0) {
        setShowEmptyWarning(true);
        return;
      }
      setIsDebriefOpen(true);
    });
  };

  return (
    <div className="space-y-4 px-4 pb-56 pt-4 sm:px-6 lg:px-8">
      {/* Top Header: Session Time & Discard Option */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight">{workout.name}</h2>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-400 font-mono">
            <span className="flex items-center gap-1 text-emerald-400 font-bold">
              <Clock className="w-3.5 h-3.5" />
              {formatTime(elapsedSeconds)}
            </span>
            <span>•</span>
            <span className="text-zinc-300">{totalCompletedSets} sets completed</span>
          </div>
        </div>

        <button
          onClick={() => setShowDiscardConfirm(true)}
          className="text-xs text-zinc-500 hover:text-rose-400 font-semibold active-press px-2 py-1 transition-colors"
        >
          Discard
        </button>
      </div>

      {/* Discard Confirmation Dialog */}
      {showDiscardConfirm && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-900/60 flex items-start gap-3 animate-in fade-in zoom-in-95 duration-150">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="text-sm font-bold text-rose-200">Discard Workout?</div>
            <div className="text-xs text-rose-300/80 mt-0.5">
              All logged sets mid-session will be discarded.
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setShowDiscardConfirm(false)}
                className="px-3.5 py-1.5 rounded-xl bg-zinc-800 text-zinc-200 text-xs font-bold active-press"
              >
                Keep Training
              </button>
              <button
                onClick={onCancelWorkout}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold active-press"
              >
                Yes, Discard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Time-Restricted Past Workout Logger / Date Picker */}
      <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/80 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>Workout Date & Time</span>
                {isPastWorkout && (
                  <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-400/10 border border-amber-400/30 px-1.5 py-0.2 rounded-md">
                    Past Session
                  </span>
                )}
              </div>
              <p className="text-[10px] text-zinc-400">
                {isPastWorkout
                  ? 'Logging a past workout (36h grace window)'
                  : 'Currently set to live tracking'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              const nextState = !isPastWorkout;
              setIsPastWorkout(nextState);
              if (!nextState) {
                const nowIso = new Date().toISOString();
                setWorkoutDateTime(toDatetimeLocal(new Date()));
                setDateError(null);
                if (onUpdateStartedAt) onUpdateStartedAt(nowIso);
              }
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold active-press transition-colors ${
              isPastWorkout
                ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
            }`}
          >
            {isPastWorkout ? 'Live Mode' : 'Log Past Workout'}
          </button>
        </div>

        {isPastWorkout && (
          <div className="pt-2 border-t border-zinc-800/60 space-y-2 animate-in fade-in duration-150">
            <div className="flex items-center justify-between text-[11px] text-zinc-400 font-medium">
              <span>Select past date & start time:</span>
              <span className="text-amber-400 font-mono text-[10px]">Strict 36h Max</span>
            </div>
            <input
              type="datetime-local"
              min={minDateTime}
              max={maxDateTime}
              value={workoutDateTime}
              onChange={handleDateTimeChange}
              className="w-full h-12 px-3 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-amber-500 text-white font-mono text-xs focus:outline-none transition-colors"
            />
            {dateError ? (
              <p className="text-[11px] text-rose-400 font-semibold">{dateError}</p>
            ) : (
              <p className="text-[10px] text-zinc-500">
                Streak protection active: workouts can be back-logged up to 36 hours in the past.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Exercise Cards */}
      {workout.exercises.length === 0 ? (
        <div className="py-16 px-6 rounded-3xl bg-zinc-900/30 border border-dashed border-zinc-800 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-zinc-900 mx-auto flex items-center justify-center text-zinc-500">
            <Dumbbell className="w-7 h-7 text-emerald-400" />
          </div>
          <div>
            <div className="text-base font-bold text-zinc-200">Your workout is empty</div>
            <div className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
              Add an exercise to begin logging your weights, reps, and PRs with zero latency.
            </div>
          </div>
          <button
            onClick={() => setIsPickerOpen(true)}
            className="inline-flex items-center gap-1.5 px-5 py-3.5 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-black text-xs font-extrabold active-press shadow-xl shadow-emerald-950/50 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add First Exercise</span>
          </button>
        </div>
      ) : (
        workout.exercises.map((exItem) => {
          const isBarbell = exItem.exercise.equipment === 'barbell';
          const prevPerf = getPreviousExercisePerformance(exItem.exercise.name);

          return (
            <div
              key={exItem.workoutExerciseId}
              className="rounded-3xl bg-zinc-900/60 border border-zinc-800/80 overflow-hidden shadow-lg"
            >
              {/* Exercise Header with Previous PR Summary */}
              <div className="p-4 pb-2.5 flex items-center justify-between border-b border-zinc-800/50 bg-zinc-900/30">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-white tracking-tight">
                      {exItem.exercise.name}
                    </h3>
                    {prevPerf.personalRecord && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-[10px] font-bold font-mono">
                        <Trophy className="w-3 h-3 text-amber-400" />
                        <span>PR: {prevPerf.personalRecord.maxWeight}kg</span>
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedExerciseForProgress({
                          name: exItem.exercise.name,
                          category: exItem.exercise.category,
                          equipment: exItem.exercise.equipment,
                        })
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-emerald-400 text-[10px] font-bold border border-zinc-700/60 active-press transition-colors"
                      title="View 1RM trendline & session history"
                    >
                      <TrendingUp className="w-3 h-3 text-emerald-400" />
                      <span>History & 1RM</span>
                    </button>
                  </div>
                  <div className="text-[11px] text-zinc-400 font-medium capitalize mt-0.5">
                    {exItem.exercise.category} • {exItem.exercise.equipment}
                  </div>
                </div>
                <button
                  onClick={() => onRemoveExercise(exItem.workoutExerciseId)}
                  className="text-xs text-zinc-500 hover:text-rose-400 active-press p-2 transition-colors"
                  aria-label="Remove exercise"
                >
                  Remove
                </button>
              </div>

              {/* Sets Column Header */}
              <div className="px-3 pt-3 pb-1 grid grid-cols-12 text-[11px] font-bold text-zinc-500 uppercase tracking-wider text-center">
                <span className="col-span-2 text-left pl-1">Set</span>
                <span className="col-span-4">Weight (kg)</span>
                <span className="col-span-3">Reps</span>
                <span className="col-span-3 text-right pr-2">Done</span>
              </div>

              {/* Set Rows with Chunky Touch Targets & Ghost Values */}
              <div className="p-2 space-y-2">
                {exItem.sets.map((s) => {
                  const prevSet =
                    prevPerf.lastSessionSets.find((p) => p.setNumber === s.setNumber) ||
                    prevPerf.lastSessionSets[prevPerf.lastSessionSets.length - 1] ||
                    null;

                  const isNewWeightPR = Boolean(
                    prevPerf.personalRecord &&
                    s.weight > prevPerf.personalRecord.maxWeight &&
                    s.weight > 0
                  );

                  const isNew1RMPR = Boolean(
                    !isNewWeightPR &&
                    prevPerf.personalRecord &&
                    s.weight > 0 &&
                    s.reps > 0 &&
                    calculate1RM(s.weight, s.reps) > prevPerf.personalRecord.estimated1RM
                  );

                  return (
                    <div
                      key={s.id}
                      className={`grid grid-cols-12 items-center p-1.5 rounded-2xl transition-all relative ${
                        s.isCompleted
                          ? 'bg-emerald-950/20 border border-emerald-900/50'
                          : 'bg-zinc-950/80 border border-zinc-800/80'
                      }`}
                    >
                      {/* Set Number + Progressive Disclosure Trigger + PR Badge */}
                      <div className="col-span-2 pl-1 flex flex-col items-start gap-1">
                        <button
                          onClick={() =>
                            setSelectedSetContext({
                              set: s,
                              workoutExerciseId: exItem.workoutExerciseId,
                              exerciseName: exItem.exercise.name,
                              isBarbell,
                              previousSet: prevSet,
                              personalRecord: prevPerf.personalRecord,
                            })
                          }
                          className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-mono font-bold active-press transition-all ${
                            s.isCompleted
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-zinc-800 text-zinc-300 hover:border hover:border-zinc-700'
                          }`}
                          title="Tap for benchmark, plate calculator & RPE"
                        >
                          {s.setNumber}
                        </button>

                        {/* Live PR Indicator */}
                        {isNewWeightPR && (
                          <span className="text-[9px] font-black font-mono text-amber-300 bg-amber-950/70 border border-amber-600/50 px-1 py-0.2 rounded-md flex items-center gap-0.5 animate-pulse">
                            <Flame className="w-2.5 h-2.5 text-amber-400" />
                            PR
                          </span>
                        )}
                        {isNew1RMPR && (
                          <span className="text-[9px] font-black font-mono text-emerald-300 bg-emerald-950/70 border border-emerald-600/50 px-1 py-0.2 rounded-md flex items-center gap-0.5 animate-pulse">
                            ⭐ 1RM
                          </span>
                        )}
                      </div>

                      {/* Weight Input (With Ghost Placeholder from Previous Session) */}
                      <div className="col-span-4 px-1">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          inputMode="decimal"
                          value={s.weight === 0 ? '' : s.weight}
                          placeholder={prevSet ? String(prevSet.weight) : '0'}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            onUpdateSet(exItem.workoutExerciseId, s.id, {
                              weight: isNaN(val) ? 0 : Math.max(0, val),
                            });
                          }}
                          className="w-full h-13 text-center font-mono font-black text-lg bg-zinc-900 border border-zinc-800 focus:border-emerald-500 rounded-xl text-white placeholder-zinc-600 focus:outline-none transition-colors"
                        />
                      </div>

                      {/* Reps Input (With Ghost Placeholder from Previous Session) */}
                      <div className="col-span-3 px-1">
                        <input
                          type="number"
                          min="0"
                          inputMode="numeric"
                          value={s.reps === 0 ? '' : s.reps}
                          placeholder={prevSet ? String(prevSet.reps) : '0'}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            onUpdateSet(exItem.workoutExerciseId, s.id, {
                              reps: isNaN(val) ? 0 : Math.max(0, val),
                            });
                          }}
                          className="w-full h-13 text-center font-mono font-black text-lg bg-zinc-900 border border-zinc-800 focus:border-emerald-500 rounded-xl text-white placeholder-zinc-600 focus:outline-none transition-colors"
                        />
                        {prevSet && s.weight === 0 && s.reps === 0 && (
                          <button type="button" onClick={() => {
                            onUpdateSet(exItem.workoutExerciseId, s.id, { weight: prevSet.weight, reps: prevSet.reps });
                            showToast(`Previous set copied: ${prevSet.weight} kg × ${prevSet.reps}`, 'success');
                          }} className="mt-1 w-full truncate text-center text-[9px] font-semibold text-emerald-300 hover:text-emerald-200" aria-label={`Use previous set, ${prevSet.weight} kilograms for ${prevSet.reps} reps`}>
                            Use last: {prevSet.weight} kg × {prevSet.reps}
                          </button>
                        )}
                      </div>

                      {/* Completion Checkmark (Massive 52px+ touch target for sweaty hands) */}
                      <div className="col-span-3 flex justify-end pr-1">
                        <button
                          onClick={() => onToggleCompleteSet(exItem.workoutExerciseId, s.id)}
                          className={`w-13 h-13 rounded-xl flex items-center justify-center transition-all active-press ${
                            s.isCompleted
                              ? 'bg-emerald-400 text-black shadow-lg shadow-emerald-950/60 scale-102'
                              : (s.weight > 0 || s.reps > 0)
                              ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/40'
                              : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300 border border-zinc-700'
                          }`}
                          aria-label="Complete set and trigger rest timer"
                          title="Complete set and trigger rest timer"
                        >
                          <Check
                            className={`w-6 h-6 stroke-[3.5] ${
                              s.isCompleted
                                ? 'text-black'
                                : (s.weight > 0 || s.reps > 0)
                                ? 'text-emerald-400'
                                : 'text-zinc-500'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Set Actions: Add Set & Tools Trigger */}
              <div className="p-3 pt-1 flex items-center justify-between">
                <button
                  onClick={() => onAddSet(exItem.workoutExerciseId)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-zinc-800/90 hover:bg-zinc-800 text-zinc-200 text-xs font-bold active-press transition-colors"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Add Set</span>
                </button>

                <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                  <SlidersHorizontal className="w-3 h-3" />
                  <span>Tap set # for benchmark & plates</span>
                </span>
              </div>
            </div>
          );
        })
      )}

      {/* BOTTOM-HEAVY WORKOUT CONTROL DOCK (Anchored in the lower third for natural thumb reach) */}
      <div className="fixed bottom-[calc(4.5rem_+_env(safe-area-inset-bottom))] inset-x-0 z-30 bg-gradient-to-t from-[#0b0e0b] via-zinc-950/95 to-transparent p-3 pb-3 backdrop-blur-md md:bottom-4 md:left-56 md:right-0">
        <div className="mx-auto grid max-w-3xl grid-cols-2 gap-2.5">
          <button
            onClick={() => setIsPickerOpen(true)}
            className="h-14 rounded-2xl bg-zinc-900 border border-zinc-700 hover:border-zinc-500 text-zinc-100 text-sm font-bold flex items-center justify-center gap-2 active-press shadow-lg transition-all"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span>Add Exercise</span>
          </button>

          <button
            onClick={handleCompleteWorkout}
            disabled={isSaving || isSubmitting}
            className={`h-14 rounded-2xl text-sm font-black flex items-center justify-center gap-2 active-press shadow-xl transition-all ${
              workout.exercises.length === 0
                ? 'bg-zinc-800/90 hover:bg-zinc-700/90 text-zinc-400 border border-zinc-700/60'
                : 'bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 text-black shadow-emerald-950/80'
            }`}
          >
            {isSaving || isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin stroke-[2.5]" />
                <span>Saving...</span>
              </>
            ) : workout.exercises.length === 0 ? (
              <>
                <AlertCircle className="w-5 h-5 stroke-[2.5] text-amber-400" />
                <span>Finish (0 Exercises)</span>
              </>
            ) : (
              <>
                <Check className="w-5 h-5 stroke-[3.5]" />
                <span>Complete Workout</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Empty Workout Prevention Dialog */}
      {showEmptyWarning && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
              <Dumbbell className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-white">Your Workout is Empty</h3>
              <p className="text-xs text-zinc-400">
                You haven't logged any exercises yet. Add an exercise to log your sets, or discard this session.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowEmptyWarning(false);
                  setShowDiscardConfirm(true);
                }}
                className="py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-rose-300 text-xs font-bold active-press transition-colors"
              >
                Discard Session
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowEmptyWarning(false);
                  setIsPickerOpen(true);
                }}
                className="py-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black text-xs font-black active-press transition-colors shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-1"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Add Exercise</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exercise Picker Modal */}
      <ExercisePickerModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onSelectExercise={onAddExercise}
      />

      {/* Progressive Disclosure: Set Detail Drawer (Benchmark to Beat, Plates, RPE, Delete) */}
      <SetDetailDrawer
        isOpen={Boolean(selectedSetContext)}
        onClose={() => setSelectedSetContext(null)}
        set={selectedSetContext?.set || null}
        exerciseName={selectedSetContext?.exerciseName || ''}
        isBarbell={selectedSetContext?.isBarbell || false}
        previousSet={selectedSetContext?.previousSet || null}
        personalRecord={selectedSetContext?.personalRecord || null}
        onUpdateWeight={(weight) => {
          if (selectedSetContext) {
            onUpdateSet(selectedSetContext.workoutExerciseId, selectedSetContext.set.id, { weight });
            setSelectedSetContext((prev) =>
              prev ? { ...prev, set: { ...prev.set, weight } } : null
            );
          }
        }}
        onUpdateReps={(reps) => {
          if (selectedSetContext) {
            onUpdateSet(selectedSetContext.workoutExerciseId, selectedSetContext.set.id, { reps });
            setSelectedSetContext((prev) =>
              prev ? { ...prev, set: { ...prev.set, reps } } : null
            );
          }
        }}
        onUpdateRpe={(rpe) => {
          if (selectedSetContext) {
            onUpdateSet(selectedSetContext.workoutExerciseId, selectedSetContext.set.id, { rpe });
            setSelectedSetContext((prev) =>
              prev ? { ...prev, set: { ...prev.set, rpe } } : null
            );
          }
        }}
        onDeleteSet={() => {
          if (selectedSetContext) {
            const setToRestore = selectedSetContext.set;
            const exId = selectedSetContext.workoutExerciseId;
            onRemoveSet(exId, setToRestore.id);
            showUndoToast(`Set ${setToRestore.setNumber} deleted`, () => {
              onAddSet(exId);
            });
            setSelectedSetContext(null);
          }
        }}
        onViewHistory={() => {
          if (selectedSetContext) {
            setSelectedExerciseForProgress({
              name: selectedSetContext.exerciseName,
            });
          }
        }}
      />

      {/* Exercise Progress & 1RM Trendline Drawer */}
      <ExerciseProgressDrawer
        isOpen={Boolean(selectedExerciseForProgress)}
        onClose={() => setSelectedExerciseForProgress(null)}
        exerciseName={selectedExerciseForProgress?.name || ''}
        category={selectedExerciseForProgress?.category}
        equipment={selectedExerciseForProgress?.equipment}
      />

      {/* Post-Workout Debrief & Social Card Modal */}
      <WorkoutDebriefModal
        isOpen={isDebriefOpen}
        workout={workout}
        elapsedSeconds={elapsedSeconds}
        onClose={() => setIsDebriefOpen(false)}
        onFinishAndSave={async (debrief) => {
          setIsSubmitting(true);
          try {
            const finalStartedAt =
              isPastWorkout && workoutDateTime
                ? new Date(workoutDateTime).toISOString()
                : workout.startedAt;
            await onFinishWorkout({
              ...debrief,
              startedAt: finalStartedAt,
            });
            setIsDebriefOpen(false);
          } catch (err: any) {
            if (
              err?.message?.includes('Grace period expired') ||
              err?.message?.includes('check_workout_36h_grace_period') ||
              err?.code === '23514' ||
              err?.details?.includes('36')
            ) {
              showToast('Grace period expired. This workout can no longer be logged.', 'error');
            } else {
              showToast(err?.message || 'Failed to save workout', 'error');
            }
          } finally {
            setIsSubmitting(false);
          }
        }}
        isSaving={isSaving || isSubmitting}
      />
    </div>
  );
};

export default WorkoutLogger;
