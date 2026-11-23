import React, { useState, useMemo } from 'react';
import {
  Utensils,
  Plus,
  Flame,
  Trash2,
  Pill,
  Check,
  SlidersHorizontal,
} from 'lucide-react';
import { useDietLogs } from '../../hooks/useDietLogs';
import { useSupplementLogs } from '../../hooks/useSupplementLogs';
import { useActiveRecovery } from '../../hooks/useActiveRecovery';
import { useFitnessGoal } from '../../hooks/useFitnessGoal';
import { useMealCategories } from '../../hooks/useMealCategories';
import { FoodLoggingModal } from './FoodLoggingModal';
import { DietLogSkeleton } from '../common/Skeleton';
import { AddSupplementModal } from './AddSupplementModal';
import { MealCategoryManagerModal } from './MealCategoryManagerModal';
import { CategoryIcon } from './CategoryIcon';
import type { DietLog, SupplementLog } from '../../types/database';
import { useToast } from '../../context/ToastContext';

export const DietOrganizer: React.FC = () => {
  const { logs, summary, isLoading, logFood, deleteFood } = useDietLogs();
  const {
    supplements,
    isLoading: isSupplementsLoading,
    addSupplement,
    toggleTaken,
    deleteSupplement,
  } = useSupplementLogs();
  const { todayCaloriesBurned } = useActiveRecovery();
  const { activeGoal } = useFitnessGoal();
  const {
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
  } = useMealCategories();
  const { showUndoToast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSupplementModalOpen, setIsSupplementModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [selectedCategoryForAdd, setSelectedCategoryForAdd] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingSuppId, setDeletingSuppId] = useState<string | null>(null);

  // Dynamic targets: from active goal (Mifflin-St Jeor / custom targets) or fallback to defaults
  const calorieGoal = activeGoal?.daily_calorie_goal || summary.calorieGoal;
  const proteinGoal = activeGoal?.protein_goal || summary.proteinGoal;
  const carbsGoal = activeGoal?.carbs_goal || summary.carbsGoal;
  const fatsGoal = activeGoal?.fats_goal || summary.fatsGoal;

  // Calculations for progress bars
  const calPercent = Math.min(100, Math.round((summary.calories / calorieGoal) * 100));
  const proPercent = Math.min(100, Math.round((summary.protein / proteinGoal) * 100));
  const carbPercent = Math.min(100, Math.round((summary.carbs / carbsGoal) * 100));
  const fatPercent = Math.min(100, Math.round((summary.fats / fatsGoal) * 100));

  const caloriesRemaining = calorieGoal - summary.calories;

  // Dynamic Grouping of diet_logs by user's custom meal_categories with localized sub-totals
  const categoryGroups = useMemo(() => {
    const matchedLogIds = new Set<string>();

    const groups = categories.map((cat) => {
      const mealLogs = logs.filter((log) => {
        // Direct category_id match
        if (log.category_id && log.category_id === cat.id) return true;
        // Fallback matching by name or legacy key if category_id not yet populated
        if (!log.category_id) {
          const logType = (log.meal_type || '').trim().toLowerCase();
          const catName = cat.name.trim().toLowerCase();
          const catKey = cat.id.replace('cat_', '').trim().toLowerCase();
          return logType === catName || logType === catKey;
        }
        return false;
      });

      mealLogs.forEach((l) => matchedLogIds.add(l.id));

      const subtotal = mealLogs.reduce(
        (acc, item) => ({
          calories: acc.calories + item.calories,
          protein: acc.protein + item.protein,
          carbs: acc.carbs + item.carbs,
          fats: acc.fats + item.fats,
        }),
        { calories: 0, protein: 0, carbs: 0, fats: 0 }
      );

      return {
        category: cat,
        logs: mealLogs,
        subtotal: {
          calories: Math.round(subtotal.calories),
          protein: Math.round(subtotal.protein * 10) / 10,
          carbs: Math.round(subtotal.carbs * 10) / 10,
          fats: Math.round(subtotal.fats * 10) / 10,
        },
      };
    });

    // Capture any legacy or uncategorized entries so no user food items are hidden
    const unmatchedLogs = logs.filter((l) => !matchedLogIds.has(l.id));
    const otherSubtotal = unmatchedLogs.reduce(
      (acc, item) => ({
        calories: acc.calories + item.calories,
        protein: acc.protein + item.protein,
        carbs: acc.carbs + item.carbs,
        fats: acc.fats + item.fats,
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );

    return {
      groups,
      unmatched: {
        logs: unmatchedLogs,
        subtotal: {
          calories: Math.round(otherSubtotal.calories),
          protein: Math.round(otherSubtotal.protein * 10) / 10,
          carbs: Math.round(otherSubtotal.carbs * 10) / 10,
          fats: Math.round(otherSubtotal.fats * 10) / 10,
        },
      },
    };
  }, [categories, logs]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const itemToRestore = logs.find((l) => l.id === id);
    await deleteFood(id);
    if (itemToRestore) {
      showUndoToast(`Deleted ${itemToRestore.food_name}`, async () => {
        await logFood({
          food_name: itemToRestore.food_name,
          meal_type: itemToRestore.meal_type,
          category_id: itemToRestore.category_id,
          calories: itemToRestore.calories,
          protein: itemToRestore.protein,
          carbs: itemToRestore.carbs,
          fats: itemToRestore.fats,
        });
      });
    }
    setDeletingId(null);
  };

  return (
    <div className="pb-36 px-4 pt-4 space-y-5">
      {/* 1. TOP HEADER & TITLE */}
      <div className="px-1 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight">Diet & Macros</h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
            })}
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black text-xs font-black active-press shadow-lg shadow-emerald-950/60 transition-all"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Log Food</span>
        </button>
      </div>

      {/* 2. DAILY MACRO DASHBOARD */}
      <div className="rounded-3xl bg-zinc-900/90 border border-zinc-800/90 p-5 space-y-4 shadow-xl">
        {/* Calories Overview */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-400" />
                <span>Calories</span>
              </span>
              {activeGoal?.goal_type && (
                <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 uppercase tracking-wider">
                  {activeGoal.goal_type}
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-white font-mono tracking-tight">
                {summary.calories}
              </span>
              <span className="text-xs font-mono text-zinc-400 font-semibold">
                / {calorieGoal} kcal
              </span>
            </div>
            {todayCaloriesBurned > 0 && (
              <div className="text-[10px] text-amber-400 font-mono flex items-center gap-1 font-semibold pt-0.5">
                <Flame className="w-3 h-3 text-amber-400" />
                <span>
                  -{todayCaloriesBurned} kcal burned (Net:{' '}
                  {Math.max(0, summary.calories - todayCaloriesBurned)} kcal)
                </span>
              </div>
            )}
          </div>

          <div className="text-right">
            <div
              className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full border ${
                caloriesRemaining >= 0
                  ? 'bg-emerald-950/70 border-emerald-800/50 text-emerald-300'
                  : 'bg-rose-950/70 border-rose-800/50 text-rose-300'
              }`}
            >
              {caloriesRemaining >= 0 ? `${caloriesRemaining} kcal left` : `${Math.abs(caloriesRemaining)} kcal over`}
            </div>
            <div className="text-[10px] text-zinc-500 font-mono mt-1">{calPercent}% of goal</div>
          </div>
        </div>

        {/* Overall Calorie Progress Bar */}
        <div className="h-2.5 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
          <div
            className={`h-full transition-all duration-500 ease-out rounded-full ${
              caloriesRemaining >= 0
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                : 'bg-gradient-to-r from-rose-500 to-amber-500'
            }`}
            style={{ width: `${Math.min(100, calPercent)}%` }}
          />
        </div>

        {/* 3 Distinct Macronutrient Progress Bars: Protein (Blue), Carbs (Green), Fats (Yellow) */}
        <div className="grid grid-cols-3 gap-3 pt-1">
          {/* Protein (Blue) */}
          <div className="rounded-2xl bg-zinc-950/80 border border-sky-500/20 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-sky-400">
                Protein
              </span>
              <span className="text-[10px] font-mono font-bold text-sky-300">{proPercent}%</span>
            </div>
            <div className="text-base font-black text-white font-mono leading-none">
              {summary.protein}
              <span className="text-[10px] text-zinc-400 font-sans font-semibold ml-0.5">
                / {proteinGoal}g
              </span>
            </div>
            <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-sky-400 transition-all duration-500 ease-out rounded-full"
                style={{ width: `${proPercent}%` }}
              />
            </div>
          </div>

          {/* Carbs (Green) */}
          <div className="rounded-2xl bg-zinc-950/80 border border-emerald-500/20 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                Carbs
              </span>
              <span className="text-[10px] font-mono font-bold text-emerald-300">{carbPercent}%</span>
            </div>
            <div className="text-base font-black text-white font-mono leading-none">
              {summary.carbs}
              <span className="text-[10px] text-zinc-400 font-sans font-semibold ml-0.5">
                / {carbsGoal}g
              </span>
            </div>
            <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-400 transition-all duration-500 ease-out rounded-full"
                style={{ width: `${carbPercent}%` }}
              />
            </div>
          </div>

          {/* Fats (Yellow) */}
          <div className="rounded-2xl bg-zinc-950/80 border border-amber-500/20 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                Fats
              </span>
              <span className="text-[10px] font-mono font-bold text-amber-300">{fatPercent}%</span>
            </div>
            <div className="text-base font-black text-white font-mono leading-none">
              {summary.fats}
              <span className="text-[10px] text-zinc-400 font-sans font-semibold ml-0.5">
                / {fatsGoal}g
              </span>
            </div>
            <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 transition-all duration-500 ease-out rounded-full"
                style={{ width: `${fatPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. DAILY FEED: Dynamic Meal Categories with Manage Meals settings button */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400">
              Today's Logged Meals
            </h3>
            <span className="text-[10px] font-mono text-zinc-500">{logs.length} items logged</span>
          </div>

          {/* Manage Meals Settings Button */}
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-bold active-press transition-colors shadow-sm"
            title="Manage custom meal categories"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
            <span>Manage Meals</span>
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-3.5">
            <DietLogSkeleton />
            <DietLogSkeleton />
            <DietLogSkeleton />
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 px-6 rounded-3xl bg-zinc-900/40 border border-dashed border-zinc-800 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-zinc-900 mx-auto flex items-center justify-center text-zinc-500">
              <Utensils className="w-7 h-7 text-emerald-400" />
            </div>
            <div>
              <div className="text-base font-bold text-zinc-200">No meals logged today yet</div>
              <div className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto leading-relaxed">
                Log your custom meals to track your calories and hit your daily macro targets.
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
              <button
                onClick={() => {
                  setSelectedCategoryForAdd(null);
                  setIsModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-5 py-3 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-black text-xs font-extrabold shadow-lg shadow-emerald-950/60 active-press transition-all"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Log Your First Meal</span>
              </button>
              <button
                onClick={() => setIsCategoryModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-300 hover:text-white text-xs font-bold active-press transition-all"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
                <span>Manage Categories</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {categoryGroups.groups.map(({ category: cat, logs: mealLogs, subtotal }) => (
              <div
                key={cat.id}
                className="rounded-3xl bg-zinc-900/60 border border-zinc-800/80 overflow-hidden shadow-md space-y-0"
              >
                {/* Meal Category Header */}
                <div className="p-3.5 px-4 flex items-center justify-between border-b border-zinc-800/50 bg-zinc-900/40">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-emerald-400">
                      <CategoryIcon iconKey={cat.icon} categoryName={cat.name} className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-sm font-black text-white tracking-tight">{cat.name}</span>
                      {mealLogs.length > 0 && (
                        <span className="text-[10px] text-zinc-500 font-mono ml-2">
                          ({mealLogs.length} {mealLogs.length === 1 ? 'item' : 'items'})
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-black text-zinc-300">
                      {subtotal.calories} <span className="text-[10px] text-zinc-500 font-sans font-normal">kcal</span>
                    </span>

                    {/* Quick "+ Add" to this specific category */}
                    <button
                      onClick={() => {
                        setSelectedCategoryForAdd(cat.id);
                        setIsModalOpen(true);
                      }}
                      className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-emerald-400 hover:text-black border border-zinc-700/60 text-zinc-300 flex items-center justify-center active-press transition-colors"
                      title={`Log food to ${cat.name}`}
                      aria-label={`Add food to ${cat.name}`}
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  </div>
                </div>

                {/* Meal Items List (unlimited items supported) */}
                {mealLogs.length === 0 ? (
                  <div className="p-4 text-center">
                    <p className="text-[11px] text-zinc-500 font-medium italic">
                      No foods logged in {cat.name.toLowerCase()} yet
                    </p>
                    <button
                      onClick={() => {
                        setSelectedCategoryForAdd(cat.id);
                        setIsModalOpen(true);
                      }}
                      className="mt-1.5 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1 active-press"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Log {cat.name}</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-2 space-y-1.5">
                    {mealLogs.map((item: DietLog) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2.5 px-3 rounded-2xl bg-zinc-950/70 border border-zinc-800/60 hover:border-zinc-700/80 transition-colors group"
                      >
                        <div className="space-y-1 flex-1 pr-2">
                          <div className="text-xs font-bold text-zinc-100 tracking-tight">
                            {item.food_name}
                          </div>
                          {/* Macro pills */}
                          <div className="flex items-center gap-1.5 text-[10px] font-mono flex-wrap">
                            <span className="px-1.5 py-0.2 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold">
                              {item.calories} kcal
                            </span>
                            <span className="px-1.5 py-0.2 rounded-md bg-sky-500/10 border border-sky-500/30 text-sky-300">
                              P: {item.protein}g
                            </span>
                            <span className="px-1.5 py-0.2 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                              C: {item.carbs}g
                            </span>
                            <span className="px-1.5 py-0.2 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300">
                              F: {item.fats}g
                            </span>
                          </div>
                        </div>

                        {/* Delete Action Button */}
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={deletingId === item.id}
                          className="w-8 h-8 rounded-xl bg-zinc-900 hover:bg-rose-950/60 border border-zinc-800 hover:border-rose-900/60 flex items-center justify-center text-zinc-500 hover:text-rose-400 active-press transition-colors"
                          title="Delete food entry"
                          aria-label={`Delete ${item.food_name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Localized Subtotal Macro Summary Banner (visually distinct, muted/compact font) */}
                {mealLogs.length > 0 && (
                  <div className="px-3.5 py-2 border-t border-zinc-800/60 bg-zinc-950/50 flex items-center justify-between text-[11px] font-mono text-zinc-400">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">
                      {cat.name} Subtotal
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-300 font-bold">{subtotal.calories} kcal</span>
                      <span className="text-zinc-600">•</span>
                      <span className="text-sky-400/90 font-medium">P: {subtotal.protein}g</span>
                      <span className="text-zinc-600">•</span>
                      <span className="text-emerald-400/90 font-medium">C: {subtotal.carbs}g</span>
                      <span className="text-zinc-600">•</span>
                      <span className="text-amber-400/90 font-medium">F: {subtotal.fats}g</span>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Unmatched / Legacy Logs Section (if any exist) */}
            {categoryGroups.unmatched.logs.length > 0 && (
              <div className="rounded-3xl bg-zinc-900/60 border border-zinc-800/80 overflow-hidden shadow-md space-y-0">
                <div className="p-3.5 px-4 flex items-center justify-between border-b border-zinc-800/50 bg-zinc-900/40">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-400">
                      <Utensils className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-sm font-black text-white tracking-tight">Other Meals</span>
                      <span className="text-[10px] text-zinc-500 font-mono ml-2">
                        ({categoryGroups.unmatched.logs.length} items)
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-black text-zinc-300">
                    {categoryGroups.unmatched.subtotal.calories}{' '}
                    <span className="text-[10px] text-zinc-500 font-sans font-normal">kcal</span>
                  </span>
                </div>

                <div className="p-2 space-y-1.5">
                  {categoryGroups.unmatched.logs.map((item: DietLog) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2.5 px-3 rounded-2xl bg-zinc-950/70 border border-zinc-800/60 hover:border-zinc-700/80 transition-colors group"
                    >
                      <div className="space-y-1 flex-1 pr-2">
                        <div className="text-xs font-bold text-zinc-100 tracking-tight">
                          {item.food_name}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-mono flex-wrap">
                          <span className="px-1.5 py-0.2 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold">
                            {item.calories} kcal
                          </span>
                          <span className="px-1.5 py-0.2 rounded-md bg-sky-500/10 border border-sky-500/30 text-sky-300">
                            P: {item.protein}g
                          </span>
                          <span className="px-1.5 py-0.2 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                            C: {item.carbs}g
                          </span>
                          <span className="px-1.5 py-0.2 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300">
                            F: {item.fats}g
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={deletingId === item.id}
                        className="w-8 h-8 rounded-xl bg-zinc-900 hover:bg-rose-950/60 border border-zinc-800 hover:border-rose-900/60 flex items-center justify-center text-zinc-500 hover:text-rose-400 active-press transition-colors"
                        title="Delete food entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="px-3.5 py-2 border-t border-zinc-800/60 bg-zinc-950/50 flex items-center justify-between text-[11px] font-mono text-zinc-400">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">
                    Other Subtotal
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-300 font-bold">{categoryGroups.unmatched.subtotal.calories} kcal</span>
                    <span className="text-zinc-600">•</span>
                    <span className="text-sky-400/90 font-medium">P: {categoryGroups.unmatched.subtotal.protein}g</span>
                    <span className="text-zinc-600">•</span>
                    <span className="text-emerald-400/90 font-medium">C: {categoryGroups.unmatched.subtotal.carbs}g</span>
                    <span className="text-zinc-600">•</span>
                    <span className="text-amber-400/90 font-medium">F: {categoryGroups.unmatched.subtotal.fats}g</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 4. DAILY SUPPLEMENTS SECTION (Interactive Checklist) */}
      <div className="space-y-3 pt-2">
        {/* Visual Separation Divider */}
        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-800/80" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-[#0b0e0b] px-3 text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
              Daily Regimen
            </span>
          </div>
        </div>

        {/* Supplements Card Container */}
        <div className="rounded-3xl bg-zinc-900/60 border border-zinc-800/80 p-4 space-y-3.5 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-400">
              <div className="w-7 h-7 rounded-xl bg-emerald-400/10 flex items-center justify-center">
                <Pill className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-zinc-200">
                  Daily Supplements
                </h3>
                <p className="text-[10px] text-zinc-500 font-medium">
                  {supplements.length === 0
                    ? 'Track your daily stack'
                    : `${supplements.filter((s) => s.taken).length} of ${supplements.length} taken today`}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsSupplementModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-xs font-bold active-press transition-colors"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3] text-emerald-400" />
              <span>Add Supplement</span>
            </button>
          </div>

          {/* Supplement Checklist */}
          {isSupplementsLoading ? (
            <div className="space-y-2.5">
              <DietLogSkeleton />
              <DietLogSkeleton />
            </div>
          ) : supplements.length === 0 ? (
            <div className="py-8 px-4 rounded-2xl bg-zinc-950/40 border border-dashed border-zinc-800/80 text-center space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-zinc-900 mx-auto flex items-center justify-center text-zinc-600">
                <Pill className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="text-xs font-bold text-zinc-300">No supplements added today</div>
              <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">
                Keep your daily stack on track (Creatine, Whey, Vitamins) with one-tap checkboxes.
              </p>
              <button
                onClick={() => setIsSupplementModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black text-xs font-black active-press shadow-md transition-all mt-1"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>Add Your First Supplement</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {supplements.map((supp: SupplementLog) => (
                <div
                  key={supp.id}
                  className={`flex items-center justify-between p-2.5 px-3 rounded-2xl border transition-all ${
                    supp.taken
                      ? 'bg-emerald-950/20 border-emerald-900/40'
                      : 'bg-zinc-950/70 border-zinc-800/60 hover:border-zinc-700/80'
                  }`}
                >
                  {/* Left: Oversized 48px Checkbox/Toggle */}
                  <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                    <button
                      type="button"
                      onClick={() => toggleTaken(supp.id, supp.taken)}
                      className={`w-12 h-12 min-w-[48px] min-h-[48px] rounded-xl flex items-center justify-center transition-all active-press ${
                        supp.taken
                          ? 'bg-emerald-400 text-black shadow-lg shadow-emerald-950/60'
                          : 'bg-zinc-900 text-zinc-600 hover:text-zinc-400 border border-zinc-700'
                      }`}
                      aria-label={`Mark ${supp.name} as ${supp.taken ? 'not taken' : 'taken'}`}
                    >
                      <Check
                        className={`w-6 h-6 stroke-[3.5] ${
                          supp.taken ? 'text-black' : 'text-zinc-600'
                        }`}
                      />
                    </button>

                    {/* Middle: Name & Dosage */}
                    <div className="min-w-0">
                      <div
                        className={`text-sm font-bold tracking-tight truncate ${
                          supp.taken ? 'text-zinc-500 line-through' : 'text-zinc-100'
                        }`}
                      >
                        {supp.name}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="px-2 py-0.5 rounded-md bg-zinc-900/90 border border-zinc-800 text-[10px] font-mono text-zinc-400 font-semibold">
                          {supp.dosage}
                        </span>
                        {supp.taken && (
                          <span className="text-[10px] font-bold text-emerald-400 font-mono">
                            ✓ Taken
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Delete Button */}
                  <button
                    onClick={async () => {
                      setDeletingSuppId(supp.id);
                      const suppToRestore = supp;
                      await deleteSupplement(supp.id);
                      showUndoToast(`Deleted ${suppToRestore.name}`, async () => {
                        await addSupplement(suppToRestore.name, suppToRestore.dosage);
                      });
                      setDeletingSuppId(null);
                    }}
                    disabled={deletingSuppId === supp.id}
                    className="w-8 h-8 rounded-xl bg-zinc-900 hover:bg-rose-950/60 border border-zinc-800 hover:border-rose-900/60 flex items-center justify-center text-zinc-500 hover:text-rose-400 active-press transition-colors shrink-0"
                    title="Delete supplement"
                    aria-label={`Delete ${supp.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 5. FOOD LOGGING MODAL */}
      <FoodLoggingModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedCategoryForAdd(null);
        }}
        categories={categories}
        initialCategoryId={selectedCategoryForAdd}
        onLogFood={logFood}
      />

      {/* 6. MEAL CATEGORY MANAGER MODAL */}
      <MealCategoryManagerModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categories={categories}
        onAddCategory={addCategory}
        onUpdateCategory={updateCategory}
        onDeleteCategory={deleteCategory}
        onReorderCategories={reorderCategories}
      />

      {/* 7. ADD SUPPLEMENT MODAL */}
      <AddSupplementModal
        isOpen={isSupplementModalOpen}
        onClose={() => setIsSupplementModalOpen(false)}
        onAddSupplement={addSupplement}
      />
    </div>
  );
};

export default DietOrganizer;
