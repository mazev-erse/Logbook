import React, { useState } from 'react';
import {
  Plus,
  Play,
  Edit3,
  Trash2,
  Sparkles,
  Dumbbell,
  Bookmark,
  ArrowLeft,
} from 'lucide-react';
import { useRoutines } from '../../hooks/useRoutines';
import { RoutineBuilderModal } from './RoutineBuilderModal';
import { RoutineCardSkeleton } from '../common/Skeleton';
import type { Routine } from '../../types/database';
import { transitionView } from '../../lib/utils';
import { useToast } from '../../context/ToastContext';

interface RoutinesProps {
  onStartRoutine: (routine: Routine) => void;
  onBack?: () => void;
}

export const Routines: React.FC<RoutinesProps> = ({ onStartRoutine, onBack }) => {
  const [activeTab, setActiveTab] = useState<'my_routines' | 'templates'>('templates');
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [routineToEdit, setRoutineToEdit] = useState<Routine | null>(null);

  const {
    userRoutines,
    systemTemplates,
    isLoading,
    createRoutine,
    updateRoutine,
    deleteRoutine,
  } = useRoutines();
  const { showUndoToast } = useToast();

  const handleEditRoutine = (routine: Routine) => {
    setRoutineToEdit(routine);
    setIsBuilderOpen(true);
  };

  const handleCreateNew = () => {
    setRoutineToEdit(null);
    setIsBuilderOpen(true);
  };

  const handleSaveRoutine = async (
    name: string,
    description: string,
    exercises: {
      exercise_name: string;
      exercise_id?: string;
      target_sets: number;
      target_reps: number;
    }[]
  ) => {
    if (routineToEdit) {
      await updateRoutine(routineToEdit.id, name, description, exercises);
    } else {
      await createRoutine(name, description, exercises);
    }
  };

  return (
    <div className="pb-36 px-4 pt-4 space-y-5">
      {/* 1. Top Header */}
      <div className="px-1 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {onBack && (
            <button
              onClick={onBack}
              className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white active-press"
              aria-label="Go back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <h2 className="text-xl font-black text-white tracking-tight">Workout Routines</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Pre-configured splits & custom routines
            </p>
          </div>
        </div>
        <button
          onClick={handleCreateNew}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black text-xs font-black active-press shadow-lg shadow-emerald-950/60 transition-all"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>New Routine</span>
        </button>
      </div>

      {/* 2. Dual-Tab Switcher: "Quick Templates" vs "My Routines" */}
      <div className="grid grid-cols-2 p-1 rounded-2xl bg-zinc-900/90 border border-zinc-800">
        <button
          type="button"
          onClick={() => transitionView(() => setActiveTab('templates'))}
          className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
            activeTab === 'templates'
              ? 'bg-zinc-800 text-sky-400 shadow-md border border-sky-500/20'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <span className="flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Templates ({systemTemplates.length})</span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => transitionView(() => setActiveTab('my_routines'))}
          className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
            activeTab === 'my_routines'
              ? 'bg-zinc-800 text-emerald-400 shadow-md border border-emerald-500/20'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <span className="flex items-center justify-center gap-1.5">
            <Bookmark className="w-3.5 h-3.5" />
            <span>My Routines ({userRoutines.length})</span>
          </span>
        </button>
      </div>

      {/* 3. Routine List Content */}
      {isLoading ? (
        <div className="space-y-3.5">
          <RoutineCardSkeleton />
          <RoutineCardSkeleton />
          <RoutineCardSkeleton />
        </div>
      ) : activeTab === 'templates' ? (
        /* QUICK TEMPLATES TAB */
        <div className="space-y-3.5">
          {systemTemplates.map((template) => (
            <div
              key={template.id}
              className="rounded-3xl bg-zinc-900/70 border border-sky-500/30 p-5 space-y-4 shadow-xl transition-all hover:border-sky-500/50"
            >
              {/* Template Header */}
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-300 text-[10px] font-black uppercase tracking-wider">
                      <Sparkles className="w-3 h-3 text-sky-400" />
                      <span>Template</span>
                    </span>
                    <span className="text-[11px] text-zinc-500 font-mono">
                      {template.exercises.length} exercises
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-white tracking-tight pt-0.5">
                    {template.name}
                  </h3>
                  {template.description && (
                    <p className="text-xs text-zinc-400 font-medium leading-relaxed">
                      {template.description}
                    </p>
                  )}
                </div>

                <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
                  <Dumbbell className="w-5 h-5" />
                </div>
              </div>

              {/* Exercises Preview */}
              <div className="p-3 rounded-2xl bg-zinc-950/70 border border-zinc-850 space-y-1.5">
                {template.exercises.map((ex, idx) => (
                  <div
                    key={ex.id}
                    className="flex items-center justify-between text-xs py-1 px-1.5 border-b border-zinc-900 last:border-0"
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <span className="w-5 h-5 rounded-md bg-zinc-900 text-zinc-500 flex items-center justify-center text-[10px] font-mono font-bold shrink-0">
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-zinc-200 truncate">
                        {ex.exercise_name}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-zinc-400 shrink-0 font-medium">
                      {ex.target_sets} sets × {ex.target_reps} reps
                    </span>
                  </div>
                ))}
              </div>

              {/* Action Button: Start Routine */}
              <button
                onClick={() => onStartRoutine(template)}
                className="w-full h-13 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-emerald-950/60 active-press transition-all"
              >
                <Play className="w-4 h-4 fill-black" />
                <span>Start {template.name}</span>
              </button>
            </div>
          ))}
        </div>
      ) : (
        /* MY ROUTINES TAB */
        <div className="space-y-3.5">
          {userRoutines.length === 0 ? (
            <div className="py-16 px-6 rounded-3xl bg-zinc-900/40 border border-dashed border-zinc-800 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-zinc-900 mx-auto flex items-center justify-center text-zinc-500">
                <Bookmark className="w-7 h-7 text-emerald-400" />
              </div>
              <div>
                <div className="text-base font-bold text-zinc-200">No custom routines yet</div>
                <div className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto leading-relaxed">
                  Build your personalized workout splits with custom exercises, sequences, target sets, and reps.
                </div>
              </div>
              <button
                onClick={handleCreateNew}
                className="inline-flex items-center gap-1.5 px-5 py-3 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-black text-xs font-black shadow-lg shadow-emerald-950/60 active-press transition-all"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Create Your First Routine</span>
              </button>
            </div>
          ) : (
            userRoutines.map((routine) => (
              <div
                key={routine.id}
                className="rounded-3xl bg-zinc-900/70 border border-zinc-800/90 p-5 space-y-4 shadow-xl transition-all hover:border-zinc-700"
              >
                {/* Routine Header with Edit/Delete */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-black uppercase tracking-wider">
                        <span>Custom</span>
                      </span>
                      <span className="text-[11px] text-zinc-500 font-mono">
                        {routine.exercises.length} exercises
                      </span>
                    </div>
                    <h3 className="text-lg font-black text-white tracking-tight pt-0.5">
                      {routine.name}
                    </h3>
                    {routine.description && (
                      <p className="text-xs text-zinc-400 font-medium leading-relaxed">
                        {routine.description}
                      </p>
                    )}
                  </div>

                  {/* Edit and Delete Actions */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleEditRoutine(routine)}
                      className="w-9 h-9 rounded-xl bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 flex items-center justify-center text-zinc-300 hover:text-white active-press transition-colors"
                      title="Edit routine"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        const routineToRestore = routine;
                        deleteRoutine(routine.id);
                        showUndoToast(`Deleted ${routineToRestore.name}`, async () => {
                          await createRoutine(
                            routineToRestore.name,
                            routineToRestore.description || '',
                            routineToRestore.exercises?.map((e) => ({
                              exercise_id: e.exercise_id || undefined,
                              exercise_name: e.exercise_name,
                              target_sets: e.target_sets,
                              target_reps: e.target_reps,
                            })) || []
                          );
                        });
                      }}
                      className="w-9 h-9 rounded-xl bg-zinc-800 hover:bg-rose-950/60 border border-zinc-700 hover:border-rose-900 flex items-center justify-center text-zinc-400 hover:text-rose-400 active-press transition-colors"
                      title="Delete routine"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Exercises Preview */}
                <div className="p-3 rounded-2xl bg-zinc-950/70 border border-zinc-850 space-y-1.5">
                  {routine.exercises.map((ex, idx) => (
                    <div
                      key={ex.id}
                      className="flex items-center justify-between text-xs py-1 px-1.5 border-b border-zinc-900 last:border-0"
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <span className="w-5 h-5 rounded-md bg-zinc-900 text-zinc-500 flex items-center justify-center text-[10px] font-mono font-bold shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-zinc-200 truncate">
                          {ex.exercise_name}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-zinc-400 shrink-0 font-medium">
                        {ex.target_sets} sets × {ex.target_reps} reps
                      </span>
                    </div>
                  ))}
                </div>

                {/* Action Button: Start Routine */}
                <button
                  onClick={() => onStartRoutine(routine)}
                  className="w-full h-13 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-emerald-950/60 active-press transition-all"
                >
                  <Play className="w-4 h-4 fill-black" />
                  <span>Start {routine.name}</span>
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* 4. Routine Builder Modal */}
      <RoutineBuilderModal
        isOpen={isBuilderOpen}
        onClose={() => setIsBuilderOpen(false)}
        routineToEdit={routineToEdit}
        onSave={handleSaveRoutine}
      />
    </div>
  );
};

export default Routines;
