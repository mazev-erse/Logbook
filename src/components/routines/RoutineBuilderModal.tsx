import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Dumbbell,
  Search,
  Check,
} from 'lucide-react';
import { useExercises } from '../../hooks/useExercises';
import type { Routine, Exercise } from '../../types/database';
import { useSwipeToDismiss } from '../../hooks/useSwipeToDismiss';
import { SheetHandle } from '../common/SheetHandle';

interface RoutineBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  routineToEdit: Routine | null;
  onSave: (
    name: string,
    description: string,
    exercises: {
      exercise_name: string;
      exercise_id?: string;
      target_sets: number;
      target_reps: number;
    }[]
  ) => Promise<void>;
}

interface BuilderExerciseItem {
  id: string;
  exercise_name: string;
  exercise_id?: string;
  target_sets: number;
  target_reps: number;
}

export const RoutineBuilderModal: React.FC<RoutineBuilderModalProps> = ({
  isOpen,
  onClose,
  routineToEdit,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [exercises, setExercises] = useState<BuilderExerciseItem[]>([]);
  const [isExercisePickerOpen, setIsExercisePickerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { sheetRef, handleProps } = useSwipeToDismiss({ onDismiss: onClose, isOpen });
  const [error, setError] = useState<string | null>(null);

  const { allExercises } = useExercises();

  // Initialize or reset form
  useEffect(() => {
    if (routineToEdit) {
      setName(routineToEdit.name);
      setDescription(routineToEdit.description || '');
      setExercises(
        routineToEdit.exercises.map((e) => ({
          id: e.id,
          exercise_name: e.exercise_name,
          exercise_id: e.exercise_id || undefined,
          target_sets: e.target_sets || 3,
          target_reps: e.target_reps || 10,
        }))
      );
    } else {
      setName('');
      setDescription('');
      setExercises([]);
    }
    setError(null);
  }, [routineToEdit, isOpen]);

  // Filter and deduplicate exercises in picker
  const filteredExercises = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    const seen = new Set<string>();
    const list: Exercise[] = [];

    for (const ex of allExercises) {
      if (!ex || !ex.name) continue;
      const key = ex.name.toLowerCase().trim();
      if (!seen.has(key)) {
        seen.add(key);
        if (!query || key.includes(query)) {
          list.push(ex);
        }
      }
    }
    return list;
  }, [allExercises, searchQuery]);

  if (!isOpen) return null;

  // Move exercise up in sequence
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setExercises((prev) => {
      const copy = [...prev];
      const temp = copy[index - 1];
      copy[index - 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  // Move exercise down in sequence
  const handleMoveDown = (index: number) => {
    if (index === exercises.length - 1) return;
    setExercises((prev) => {
      const copy = [...prev];
      const temp = copy[index + 1];
      copy[index + 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  // Remove exercise
  const handleRemoveExercise = (index: number) => {
    setExercises((prev) => prev.filter((_, i) => i !== index));
  };

  // Update target sets
  const handleUpdateSets = (index: number, sets: number) => {
    setExercises((prev) =>
      prev.map((ex, i) => (i === index ? { ...ex, target_sets: Math.max(1, sets) } : ex))
    );
  };

  // Update target reps
  const handleUpdateReps = (index: number, reps: number) => {
    setExercises((prev) =>
      prev.map((ex, i) => (i === index ? { ...ex, target_reps: Math.max(1, reps) } : ex))
    );
  };

  // Add exercise from picker
  const handleSelectExercise = (ex: Exercise) => {
    const newItem: BuilderExerciseItem = {
      id: `be-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      exercise_name: ex.name,
      exercise_id: ex.id,
      target_sets: 3,
      target_reps: 10,
    };
    setExercises((prev) => [...prev, newItem]);
    setIsExercisePickerOpen(false);
    setSearchQuery('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a routine name');
      return;
    }

    if (exercises.length === 0) {
      setError('Please add at least one exercise to the routine');
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      await onSave(
        name.trim(),
        description.trim(),
        exercises.map((ex) => ({
          exercise_name: ex.exercise_name,
          exercise_id: ex.exercise_id,
          target_sets: ex.target_sets,
          target_reps: ex.target_reps,
        }))
      );
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save routine');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Full-Screen Mobile Modal Container */}
      <div
        ref={sheetRef}
        className="relative w-full max-w-md h-[95vh] sm:h-[88vh] bg-zinc-950 border-t sm:border border-zinc-800 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden z-10 animate-in slide-in-from-bottom-5 duration-200 pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:pb-0 will-change-transform"
      >
        <SheetHandle handleProps={handleProps} />
        {/* Header */}
        <div {...handleProps} className="p-4 pt-2 pb-3 border-b border-zinc-800/80 flex items-center justify-between shrink-0 cursor-grab">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-400/10 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-tight">
                {routineToEdit ? 'Edit Custom Routine' : 'Create Custom Routine'}
              </h2>
              <p className="text-[11px] text-zinc-400">Sequence exercises, sets & reps</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white active-press"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-900/60 text-xs text-rose-300 font-semibold">
              {error}
            </div>
          )}

          {/* Routine Name Input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Routine Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g., Heavy Push & Shoulders"
              className="w-full h-13 px-4 rounded-2xl bg-zinc-900 border border-zinc-800 focus:border-emerald-500 text-white text-sm font-bold focus:outline-none transition-colors"
            />
          </div>

          {/* Routine Description Input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Description / Focus <span className="text-zinc-600 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Chest hypertrophy, delt width & triceps"
              className="w-full h-12 px-4 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-emerald-500 text-white text-xs font-medium focus:outline-none transition-colors"
            />
          </div>

          {/* Exercises Section */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Exercises ({exercises.length})
              </label>
              <button
                type="button"
                onClick={() => setIsExercisePickerOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-400/10 hover:bg-emerald-400/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold active-press transition-colors"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>Add Exercise</span>
              </button>
            </div>

            {exercises.length === 0 ? (
              <div className="py-8 px-4 rounded-2xl bg-zinc-900/30 border border-dashed border-zinc-800 text-center space-y-2">
                <Dumbbell className="w-8 h-8 text-zinc-600 mx-auto" />
                <div className="text-xs font-bold text-zinc-300">No exercises added yet</div>
                <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">
                  Tap "Add Exercise" to select movements and configure target sets and reps.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {exercises.map((item, index) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800/80 space-y-2.5 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      {/* Left: Sequence Number & Name */}
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <span className="w-6 h-6 rounded-lg bg-zinc-800 flex items-center justify-center text-xs font-mono font-black text-emerald-400 shrink-0">
                          {index + 1}
                        </span>
                        <span className="text-xs font-bold text-white tracking-tight truncate">
                          {item.exercise_name}
                        </span>
                      </div>

                      {/* Right: Tactile Reordering Up/Down Buttons + Delete */}
                      <div className="flex items-center gap-1 shrink-0">
                        {/* Up Arrow (min 44px touch target) */}
                        <button
                          type="button"
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0}
                          className="w-10 h-10 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-zinc-300 active-press transition-colors"
                          title="Move up"
                          aria-label="Move exercise up"
                        >
                          <ChevronUp className="w-5 h-5 stroke-[2.5]" />
                        </button>

                        {/* Down Arrow (min 44px touch target) */}
                        <button
                          type="button"
                          onClick={() => handleMoveDown(index)}
                          disabled={index === exercises.length - 1}
                          className="w-10 h-10 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-zinc-300 active-press transition-colors"
                          title="Move down"
                          aria-label="Move exercise down"
                        >
                          <ChevronDown className="w-5 h-5 stroke-[2.5]" />
                        </button>

                        {/* Remove Button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveExercise(index)}
                          className="w-10 h-10 rounded-xl bg-zinc-800 hover:bg-rose-950/60 border border-transparent hover:border-rose-900/60 flex items-center justify-center text-zinc-400 hover:text-rose-400 active-press transition-colors ml-0.5"
                          title="Remove exercise"
                          aria-label="Remove exercise from routine"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Bottom: Target Sets & Reps Inputs */}
                    <div className="grid grid-cols-2 gap-2.5 pt-1 border-t border-zinc-800/60">
                      {/* Sets Input */}
                      <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80">
                        <span className="text-[10px] uppercase font-bold text-zinc-400">Sets</span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="1"
                            max="20"
                            value={item.target_sets}
                            onChange={(e) =>
                              handleUpdateSets(index, parseInt(e.target.value, 10) || 1)
                            }
                            className="w-12 text-center font-mono font-black text-sm bg-zinc-900 border border-zinc-800 rounded-lg text-white py-1 focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>

                      {/* Reps Input */}
                      <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80">
                        <span className="text-[10px] uppercase font-bold text-zinc-400">Reps</span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={item.target_reps}
                            onChange={(e) =>
                              handleUpdateReps(index, parseInt(e.target.value, 10) || 1)
                            }
                            className="w-12 text-center font-mono font-black text-sm bg-zinc-900 border border-zinc-800 rounded-lg text-white py-1 focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Action Button */}
          <div className="pt-3">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full h-14 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-black font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-950/80 active-press transition-all disabled:opacity-50"
            >
              <Check className="w-5 h-5 stroke-[3]" />
              <span>{isSaving ? 'Saving Routine...' : 'Save Routine'}</span>
            </button>
          </div>
        </form>

        {/* Nested Searchable Exercise Picker Modal */}
        {isExercisePickerOpen && (
          <div className="absolute inset-0 z-20 bg-zinc-950 flex flex-col p-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-sm font-black text-white">Select Exercise</h3>
              <button
                type="button"
                onClick={() => setIsExercisePickerOpen(false)}
                className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative my-3">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                autoFocus
                placeholder="Search exercises..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-12 pl-10 pr-4 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Exercise List */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {filteredExercises.map((ex) => (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => handleSelectExercise(ex)}
                  className="w-full text-left p-3 rounded-xl bg-zinc-900/60 hover:bg-zinc-850 border border-zinc-800/80 hover:border-emerald-500/50 flex items-center justify-between group active-press transition-all"
                >
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
                      {ex.name}
                    </div>
                    <div className="text-[10px] text-zinc-500 capitalize mt-0.5">
                      {ex.category} • {ex.equipment}
                    </div>
                  </div>
                  <Plus className="w-4 h-4 text-zinc-600 group-hover:text-emerald-400 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoutineBuilderModal;
