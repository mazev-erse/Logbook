import React, { useState, useMemo } from 'react';
import { Search, X, Plus, Dumbbell } from 'lucide-react';
import type { Exercise, ExerciseCategory, EquipmentType } from '../../types/database';
import { useExercises } from '../../hooks/useExercises';
import { useSwipeToDismiss } from '../../hooks/useSwipeToDismiss';
import { SheetHandle } from '../common/SheetHandle';

interface ExercisePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectExercise: (exercise: Exercise) => void;
}

const CATEGORIES: { id: ExerciseCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'chest', label: 'Chest' },
  { id: 'back', label: 'Back' },
  { id: 'legs', label: 'Legs' },
  { id: 'shoulders', label: 'Shoulders' },
  { id: 'arms', label: 'Arms' },
  { id: 'core', label: 'Core' },
];

export const ExercisePickerModal: React.FC<ExercisePickerModalProps> = ({
  isOpen,
  onClose,
  onSelectExercise,
}) => {
  const {
    exercises,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    addCustomExercise,
  } = useExercises();

  const [isCreatingCustom, setIsCreatingCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customCategory, setCustomCategory] = useState<ExerciseCategory>('chest');
  const [customEquipment, setCustomEquipment] = useState<EquipmentType>('barbell');
  const { sheetRef, handleProps } = useSwipeToDismiss({ onDismiss: onClose, isOpen });

  const displayedExercises = useMemo(() => {
    const seen = new Set<string>();
    return exercises.filter((ex) => {
      if (!ex || !ex.name) return false;
      const key = ex.name.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [exercises]);

  if (!isOpen) return null;

  const handleCreateCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    const newEx = await addCustomExercise(customName.trim(), customCategory, customEquipment);
    setCustomName('');
    setIsCreatingCustom(false);
    onSelectExercise(newEx);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        ref={sheetRef}
        className="bg-slate-900 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-3xl max-w-md w-full mx-auto max-h-[88dvh] flex flex-col shadow-2xl overflow-hidden pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:pb-0 will-change-transform"
      >
        <SheetHandle handleProps={handleProps} />
        {/* Modal Header */}
        <div {...handleProps} className="p-4 pt-2 border-b border-slate-800 flex items-center justify-between cursor-grab">
          <div>
            <h2 className="text-lg font-bold text-white">Select Exercise</h2>
            <p className="text-xs text-slate-400">Choose an exercise or create your own</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white active-press"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 pb-2 space-y-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search exercise (e.g. Bench Press)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap active-press transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Exercise Drawer */}
        {isCreatingCustom ? (
          <form onSubmit={handleCreateCustom} className="p-4 bg-slate-950/80 border-y border-slate-800 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              New Custom Exercise
            </div>
            <input
              type="text"
              required
              placeholder="Exercise name"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:border-emerald-500 focus:outline-none"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value as ExerciseCategory)}
                className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none"
              >
                <option value="chest">Chest</option>
                <option value="back">Back</option>
                <option value="legs">Legs</option>
                <option value="shoulders">Shoulders</option>
                <option value="arms">Arms</option>
                <option value="core">Core</option>
                <option value="other">Other</option>
              </select>

              <select
                value={customEquipment}
                onChange={(e) => setCustomEquipment(e.target.value as EquipmentType)}
                className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none"
              >
                <option value="barbell">Barbell</option>
                <option value="dumbbell">Dumbbell</option>
                <option value="cable">Cable</option>
                <option value="machine">Machine</option>
                <option value="bodyweight">Bodyweight</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsCreatingCustom(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold shadow-md"
              >
                Save & Add
              </button>
            </div>
          </form>
        ) : (
          <div className="px-4 py-2">
            <button
              onClick={() => setIsCreatingCustom(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-slate-700 hover:border-emerald-500 text-slate-300 hover:text-emerald-400 text-xs font-semibold active-press"
            >
              <Plus className="w-4 h-4" />
              <span>Create Custom Exercise</span>
            </button>
          </div>
        )}

        {/* Exercises List */}
        <div className="flex-1 overflow-y-auto px-4 divide-y divide-slate-800/60">
          {displayedExercises.length > 0 ? (
            displayedExercises.map((ex) => (
              <button
                key={ex.id}
                onClick={() => {
                  onSelectExercise(ex);
                  onClose();
                }}
                className="w-full py-3.5 flex items-center justify-between text-left hover:bg-slate-800/30 active-press rounded-xl px-2 transition-colors"
              >
                <div>
                  <div className="text-sm font-semibold text-white">{ex.name}</div>
                  <div className="text-[11px] text-slate-400 capitalize mt-0.5">
                    {ex.category} • {ex.equipment}
                  </div>
                </div>
                <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400">
                  <Plus className="w-4 h-4" />
                </div>
              </button>
            ))
          ) : (
            <div className="py-12 text-center text-slate-400 text-sm">
              <Dumbbell className="w-8 h-8 mx-auto text-slate-600 mb-2" />
              No exercises match your search.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
