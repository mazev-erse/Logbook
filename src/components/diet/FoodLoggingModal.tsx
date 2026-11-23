import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  X,
  Plus,
  Utensils,
  Flame,
  Search,
  Sliders,
  Check,
  Loader2,
  Sparkles,
  Scale,
} from 'lucide-react';
import type { MealCategory } from '../../types/database';
import { foodLogSchema, type FoodLogFormData } from '../../lib/validationSchemas';
import { FormFieldError } from '../common/FormFieldError';
import {
  searchNutritionApi,
  FITNESS_STAPLES,
  type NutritionFoodItem,
} from '../../services/nutritionApi';
import { useMealCategories } from '../../hooks/useMealCategories';
import { CategoryIcon } from './CategoryIcon';
import { useAuth } from '../auth/ProtectedRoute';
import { useSwipeToDismiss } from '../../hooks/useSwipeToDismiss';
import { SheetHandle } from '../common/SheetHandle';

interface FoodLoggingModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories?: MealCategory[];
  initialCategoryId?: string | null;
  onLogFood: (entry: {
    food_name: string;
    meal_type: string;
    category_id?: string | null;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  }) => void;
}

const WEIGHT_PRESETS = [50, 100, 150, 200, 250];

export const FoodLoggingModal: React.FC<FoodLoggingModalProps> = ({
  isOpen,
  onClose,
  categories,
  initialCategoryId,
  onLogFood,
}) => {
  const { categories: hookCategories } = useMealCategories();
  const { requireAuth } = useAuth();
  const availableCategories = categories && categories.length > 0 ? categories : hookCategories;

  // Modal mode: 'search' (API + Auto-Calc) vs 'custom' (Manual inputs)
  const [activeTab, setActiveTab] = useState<'search' | 'custom'>('search');

  // Search API & Auto-calculator state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NutritionFoodItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedFood, setSelectedFood] = useState<NutritionFoodItem | null>(null);
  const [weightGrams, setWeightGrams] = useState<number | string>(100);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>('Breakfast');
  const [apiError, setApiError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const { sheetRef, handleProps } = useSwipeToDismiss({ onDismiss: onClose, isOpen });

  // Manual Custom Entry Form (React Hook Form + Zod)
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FoodLogFormData>({
    resolver: zodResolver(foodLogSchema),
    mode: 'onTouched',
    defaultValues: {
      food_name: '',
      meal_type: 'Breakfast',
      category_id: null,
      calories: 0,
      protein: 0,
      carbs: 0,
      fats: 0,
    },
  });

  const customMealType = watch('meal_type');

  // Reset modal state on open
  useEffect(() => {
    if (isOpen) {
      setActiveTab('search');
      setSearchQuery('');
      // Preload initial popular fitness staples for instant suggestion
      setSearchResults(FITNESS_STAPLES.slice(0, 8));
      setSelectedFood(null);
      setWeightGrams(100);
      setApiError(null);

      // Determine initial category
      const targetCat = initialCategoryId
        ? availableCategories.find((c) => c.id === initialCategoryId)
        : availableCategories[0];

      const initialName = targetCat?.name || 'Breakfast';
      const initialId = targetCat?.id || null;

      setSelectedCategoryId(initialId);
      setSelectedCategoryName(initialName);

      reset({
        food_name: '',
        meal_type: initialName,
        category_id: initialId,
        calories: 0,
        protein: 0,
        carbs: 0,
        fats: 0,
      });
    }
  }, [isOpen, initialCategoryId, availableCategories, reset]);

  // Debounced Search Query (300ms) with AbortController
  useEffect(() => {
    if (!isOpen || activeTab !== 'search') return;

    const trimmed = searchQuery.trim();

    if (trimmed.length < 2) {
      setSearchResults(FITNESS_STAPLES.slice(0, 8));
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setApiError(null);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timeoutId = setTimeout(async () => {
      try {
        const results = await searchNutritionApi(trimmed, controller.signal);
        setSearchResults(results);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Nutrition search error:', err);
        }
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [searchQuery, isOpen, activeTab]);

  // Real-Time Scaled Macro Calculations: (base_macro / 100) * entered_weight
  const numericWeight = typeof weightGrams === 'number' ? weightGrams : parseFloat(weightGrams) || 0;

  const scaledMacros = useMemo(() => {
    if (!selectedFood || numericWeight <= 0) {
      return { calories: 0, protein: 0, carbs: 0, fats: 0 };
    }
    const ratio = numericWeight / 100;
    return {
      calories: Math.round(selectedFood.caloriesPer100g * ratio),
      protein: Math.round(selectedFood.proteinPer100g * ratio * 10) / 10,
      carbs: Math.round(selectedFood.carbsPer100g * ratio * 10) / 10,
      fats: Math.round(selectedFood.fatsPer100g * ratio * 10) / 10,
    };
  }, [selectedFood, numericWeight]);

  if (!isOpen) return null;

  // Handle API Auto-Calculated Form Submission
  const handleLogCalculatedFood = () => {
    requireAuth(() => {
      if (!selectedFood) {
        setApiError('Please select a food item from the database.');
        return;
      }
      if (numericWeight <= 0) {
        setApiError('Please enter a valid weight in grams greater than 0.');
        return;
      }
  
      const foodTitle = selectedFood.brand
        ? `${selectedFood.name} (${selectedFood.brand})`
        : selectedFood.name;
  
      const payload = {
        food_name: foodTitle.trim(),
        meal_type: selectedCategoryName,
        category_id: selectedCategoryId,
        calories: scaledMacros.calories,
        protein: scaledMacros.protein,
        carbs: scaledMacros.carbs,
        fats: scaledMacros.fats,
      };
  
      // Strict Zod schema validation
      const validation = foodLogSchema.safeParse(payload);
      if (!validation.success) {
        const issueMsg = validation.error.issues[0]?.message || 'Invalid nutrition data.';
        setApiError(issueMsg);
        return;
      }
  
      onLogFood(validation.data);
      onClose();
    });
  };

  // Handle Manual Custom Entry Submission
  const onSubmitCustom = (data: FoodLogFormData) => {
    requireAuth(() => {
      onLogFood({
        food_name: data.food_name.trim(),
        meal_type: selectedCategoryName || data.meal_type,
        category_id: selectedCategoryId || data.category_id || null,
        calories: Number(data.calories) || 0,
        protein: Number(data.protein) || 0,
        carbs: Number(data.carbs) || 0,
        fats: Number(data.fats) || 0,
      });
      onClose();
    });
  };

  // Transfer calculated data to custom entry when user switches tab
  const handleSwitchTab = (tab: 'search' | 'custom') => {
    if (tab === 'custom' && selectedFood) {
      const foodTitle = selectedFood.brand
        ? `${selectedFood.name} (${selectedFood.brand})`
        : selectedFood.name;
      setValue('food_name', foodTitle);
      setValue('meal_type', selectedCategoryName);
      setValue('category_id', selectedCategoryId);
      setValue('calories', scaledMacros.calories);
      setValue('protein', scaledMacros.protein);
      setValue('carbs', scaledMacros.carbs);
      setValue('fats', scaledMacros.fats);
    }
    setActiveTab(tab);
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div
        ref={sheetRef}
        className="relative w-full max-w-md bg-zinc-950 border-t sm:border border-zinc-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden z-10 max-h-[88dvh] sm:max-h-[88vh] flex flex-col pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] sm:pb-0 will-change-transform"
      >
        <SheetHandle handleProps={handleProps} />
        {/* Header */}
        <div {...handleProps} className="p-4 pt-2 pb-3 border-b border-zinc-800/80 flex items-center justify-between cursor-grab">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-400/10 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-tight">Log Food & Macros</h2>
              <p className="text-[11px] text-zinc-400">Automated nutrition calculator & food logbook</p>
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

        {/* 2-Segment Tab Switcher: "Search Database (Auto)" vs "Custom Entry (Manual)" */}
        <div className="p-3 pb-0">
          <div className="grid grid-cols-2 p-1 rounded-2xl bg-zinc-900 border border-zinc-800">
            <button
              type="button"
              onClick={() => handleSwitchTab('search')}
              className={`h-11 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 active-press transition-all ${
                activeTab === 'search'
                  ? 'bg-zinc-800 text-emerald-400 shadow-md border border-emerald-500/20'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Search className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Search Database</span>
            </button>
            <button
              type="button"
              onClick={() => handleSwitchTab('custom')}
              className={`h-11 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 active-press transition-all ${
                activeTab === 'custom'
                  ? 'bg-zinc-800 text-emerald-400 shadow-md border border-emerald-500/20'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Custom Entry</span>
            </button>
          </div>
        </div>

        {/* Tab 1: SEARCH DATABASE & AUTO-CALCULATOR */}
        {activeTab === 'search' && (
          <div className="p-4 space-y-4 overflow-y-auto flex-1 pb-24">
            {/* Step 1: Autocomplete Search Input */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Food Name / Database Search
              </label>
              <div className="relative flex items-center">
                <Search className="absolute left-3.5 w-4 h-4 text-zinc-500 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g. Chicken breast, White rice, Oats..."
                  className="w-full h-13 pl-10 pr-10 rounded-2xl bg-zinc-900 border border-zinc-800 focus:border-emerald-500 text-white placeholder-zinc-500 text-sm font-medium focus:outline-none transition-colors"
                />
                {isSearching ? (
                  <Loader2 className="absolute right-3.5 w-4 h-4 text-emerald-400 animate-spin" />
                ) : searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center active-press"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : null}
              </div>
            </div>

            {/* Selected Food Badge Card */}
            {selectedFood && (
              <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-600/40">
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>Selected Food</span>
                    </div>
                    <h3 className="text-sm font-black text-white mt-1">{selectedFood.name}</h3>
                    {selectedFood.brand && (
                      <p className="text-[11px] text-zinc-400 font-medium">{selectedFood.brand}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedFood(null)}
                    className="text-[11px] text-zinc-400 hover:text-rose-400 font-semibold active-press px-2 py-1"
                  >
                    Change
                  </button>
                </div>

                {/* Base per 100g preview pill */}
                <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-300 bg-black/40 p-2 rounded-xl border border-zinc-800/80 flex-wrap">
                  <span className="font-bold text-zinc-400 uppercase">Per 100g:</span>
                  <span className="text-amber-300 font-bold">{selectedFood.caloriesPer100g} kcal</span>
                  <span>•</span>
                  <span className="text-sky-300 font-bold">{selectedFood.proteinPer100g}g P</span>
                  <span>•</span>
                  <span className="text-emerald-300 font-bold">{selectedFood.carbsPer100g}g C</span>
                  <span>•</span>
                  <span className="text-amber-300 font-bold">{selectedFood.fatsPer100g}g F</span>
                </div>
              </div>
            )}

            {/* Autocomplete Results Dropdown List (Minimum 48px height per row for mobile thumbs) */}
            {!selectedFood && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    {searchQuery.trim().length >= 2 ? 'Search Results' : 'Suggested Fitness Staples'}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {searchResults.length} {searchResults.length === 1 ? 'item' : 'items'}
                  </span>
                </div>

                <div className="max-h-56 overflow-y-auto space-y-1.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 p-1.5">
                  {searchResults.length === 0 ? (
                    <div className="py-6 text-center text-xs text-zinc-500">
                      No matching foods found. Switch to "Custom Entry" to log manually.
                    </div>
                  ) : (
                    searchResults.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setSelectedFood(item);
                          setApiError(null);
                        }}
                        className="w-full min-h-[52px] p-2.5 px-3 rounded-xl bg-zinc-950/80 hover:bg-zinc-900 border border-zinc-800/70 hover:border-emerald-500/40 text-left active-press transition-all flex items-center justify-between gap-2 group"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <div className="text-xs font-bold text-zinc-100 group-hover:text-emerald-300 truncate transition-colors">
                              {item.name}
                            </div>
                            {item.source === 'local' && (
                              <span className="px-1.5 py-0.5 rounded-sm bg-emerald-950/40 text-[9px] font-bold text-emerald-500/80 uppercase tracking-wider border border-emerald-900/50 shrink-0">
                                Local
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-zinc-400 font-mono mt-0.5 flex items-center gap-1.5 flex-wrap">
                            {item.brand && (
                              <span className="text-zinc-500 truncate max-w-[120px]">
                                {item.brand} •
                              </span>
                            )}
                            <span className="text-amber-400/90">{item.caloriesPer100g} kcal</span>
                            <span>•</span>
                            <span className="text-sky-400/90">{item.proteinPer100g}g P</span>
                            <span>•</span>
                            <span className="text-emerald-400/90">{item.carbsPer100g}g C</span>
                            <span>•</span>
                            <span className="text-amber-400/90">{item.fatsPer100g}g F</span>
                          </div>
                        </div>

                        <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 group-hover:text-emerald-400 shrink-0 transition-colors">
                          <Plus className="w-4 h-4 stroke-[2.5]" />
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Weight (Grams) Input & Quick Presets */}
            {selectedFood && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Weight / Portion (Grams)</span>
                  </label>
                  <span className="text-[10px] text-zinc-500 font-mono">100g = standard base</span>
                </div>

                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    min="1"
                    inputMode="decimal"
                    value={weightGrams}
                    onChange={(e) => {
                      setWeightGrams(e.target.value);
                      setApiError(null);
                    }}
                    placeholder="100"
                    className="w-full h-14 text-center font-mono font-black text-2xl bg-zinc-900 border border-zinc-800 focus:border-emerald-500 rounded-2xl text-white placeholder-zinc-600 focus:outline-none transition-colors"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-zinc-500">
                    grams
                  </span>
                </div>

                {/* Quick Weight Presets */}
                <div className="grid grid-cols-5 gap-1.5">
                  {WEIGHT_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setWeightGrams(preset)}
                      className={`py-1.5 rounded-xl text-xs font-mono font-bold active-press transition-colors ${
                        numericWeight === preset
                          ? 'bg-emerald-400 text-black shadow-md'
                          : 'bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white'
                      }`}
                    >
                      {preset}g
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: REAL-TIME DYNAMIC MACRO CALCULATION DISPLAY */}
            {selectedFood && (
              <div className="rounded-3xl bg-zinc-900/90 border border-zinc-800/90 p-4 space-y-3 shadow-xl">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                    Scaled Macros for {numericWeight}g
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold">
                    Real-time Auto-Calculated
                  </span>
                </div>

                {/* Calories Display (Flame / Orange) */}
                <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-400">
                    <Flame className="w-5 h-5 fill-amber-400" />
                    <span className="text-xs font-black uppercase tracking-wider">Calories</span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-amber-300 font-mono tracking-tight">
                      {scaledMacros.calories}
                    </span>
                    <span className="text-xs text-amber-400/80 font-mono ml-1">kcal</span>
                  </div>
                </div>

                {/* 3 Macro Display Cards with designated semantic colors */}
                <div className="grid grid-cols-3 gap-2">
                  {/* Protein (Sky Blue) */}
                  <div className="rounded-2xl bg-sky-950/30 border border-sky-500/30 p-2.5 text-center space-y-0.5">
                    <div className="text-[10px] font-black uppercase tracking-wider text-sky-400">
                      Protein
                    </div>
                    <div className="text-xl font-black text-white font-mono tracking-tight">
                      {scaledMacros.protein}
                      <span className="text-xs text-sky-400 font-normal ml-0.5">g</span>
                    </div>
                  </div>

                  {/* Carbs (Emerald Green) */}
                  <div className="rounded-2xl bg-emerald-950/30 border border-emerald-500/30 p-2.5 text-center space-y-0.5">
                    <div className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                      Carbs
                    </div>
                    <div className="text-xl font-black text-white font-mono tracking-tight">
                      {scaledMacros.carbs}
                      <span className="text-xs text-emerald-400 font-normal ml-0.5">g</span>
                    </div>
                  </div>

                  {/* Fats (Amber / Yellow) */}
                  <div className="rounded-2xl bg-amber-950/30 border border-amber-500/30 p-2.5 text-center space-y-0.5">
                    <div className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                      Fats
                    </div>
                    <div className="text-xl font-black text-white font-mono tracking-tight">
                      {scaledMacros.fats}
                      <span className="text-xs text-amber-400 font-normal ml-0.5">g</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Meal Category Selector */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  Meal Category
                </label>
                <span className="text-[10px] text-zinc-500 font-mono">
                  {selectedCategoryName}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {availableCategories.map((opt) => {
                  const isSelected = selectedCategoryId === opt.id || selectedCategoryName === opt.name;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setSelectedCategoryId(opt.id);
                        setSelectedCategoryName(opt.name);
                        setValue('meal_type', opt.name, { shouldValidate: true });
                        setValue('category_id', opt.id);
                      }}
                      className={`h-11 px-2.5 rounded-xl border flex items-center justify-center gap-1.5 active-press transition-all ${
                        isSelected
                          ? 'bg-emerald-400 text-black font-black border-emerald-400 shadow-md shadow-emerald-950/50'
                          : 'bg-zinc-900/80 border-zinc-800 text-zinc-300 hover:text-white'
                      }`}
                    >
                      <CategoryIcon iconKey={opt.icon} categoryName={opt.name} className="w-3.5 h-3.5 shrink-0" />
                      <span className="text-[11px] font-bold truncate">{opt.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Validation Error Banner */}
            {apiError && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-900/60 text-xs text-rose-300 font-medium">
                {apiError}
              </div>
            )}

            {/* Save / Submit Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleLogCalculatedFood}
                disabled={!selectedFood}
                className="w-full h-14 rounded-2xl bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 text-black font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-950/80 active-press transition-all"
              >
                <Check className="w-5 h-5 stroke-[3]" />
                <span>
                  {selectedFood
                    ? `Log ${selectedFood.name} (${numericWeight}g)`
                    : 'Select a Food to Log'}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: CUSTOM ENTRY (MANUAL OVERRIDE) */}
        {activeTab === 'custom' && (
          <form
            onSubmit={handleSubmit(onSubmitCustom)}
            className="p-4 space-y-4 overflow-y-auto flex-1 pb-24"
            noValidate
          >
            {/* Food Name Input */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                Food Item Name
              </label>
              <input
                {...register('food_name')}
                type="text"
                placeholder="e.g., Homemade Chicken Tikka & Rice"
                className={`w-full h-13 px-4 rounded-xl bg-zinc-900 border text-white placeholder-zinc-500 text-sm font-medium focus:outline-none transition-colors ${
                  errors.food_name
                    ? 'border-rose-500/80 focus:border-rose-400'
                    : 'border-zinc-800 focus:border-emerald-500'
                }`}
              />
              <FormFieldError error={errors.food_name?.message} />
            </div>

            {/* Meal Type Chip Selector */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  Meal Category
                </label>
                <span className="text-[10px] text-zinc-500 font-mono">
                  {selectedCategoryName}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {availableCategories.map((opt) => {
                  const isSelected = selectedCategoryId === opt.id || selectedCategoryName === opt.name || customMealType === opt.name;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setSelectedCategoryId(opt.id);
                        setSelectedCategoryName(opt.name);
                        setValue('meal_type', opt.name, { shouldValidate: true });
                        setValue('category_id', opt.id);
                      }}
                      className={`h-11 px-2.5 rounded-xl border flex items-center justify-center gap-1.5 active-press transition-all ${
                        isSelected
                          ? 'bg-emerald-400 text-black font-black border-emerald-400 shadow-md shadow-emerald-950/50'
                          : 'bg-zinc-900/80 border-zinc-800 text-zinc-300 hover:text-white'
                      }`}
                    >
                      <CategoryIcon iconKey={opt.icon} categoryName={opt.name} className="w-3.5 h-3.5 shrink-0" />
                      <span className="text-[11px] font-bold truncate">{opt.name}</span>
                    </button>
                  );
                })}
              </div>
              <FormFieldError error={errors.meal_type?.message} />
            </div>

            {/* Calories Input */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                <span className="flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  <span>Calories (kcal)</span>
                </span>
              </label>
              <input
                {...register('calories', { valueAsNumber: true })}
                type="number"
                step="any"
                inputMode="decimal"
                placeholder="0"
                className={`w-full h-14 text-center font-mono font-black text-2xl bg-zinc-900 border rounded-2xl text-white placeholder-zinc-600 focus:outline-none transition-colors ${
                  errors.calories
                    ? 'border-rose-500/80 focus:border-rose-400'
                    : 'border-zinc-800 focus:border-emerald-500'
                }`}
              />
              <FormFieldError error={errors.calories?.message} />
            </div>

            {/* 3 Macro Inputs: Protein, Carbs, Fats */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                Macronutrients (Grams)
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {/* Protein Input (Sky Blue) */}
                <div className="rounded-2xl bg-zinc-900/90 border border-sky-500/30 p-2.5 space-y-1">
                  <div className="text-[10px] font-black uppercase tracking-wider text-sky-400 text-center">
                    Protein
                  </div>
                  <div className="relative flex items-center">
                    <input
                      {...register('protein', { valueAsNumber: true })}
                      type="number"
                      step="any"
                      inputMode="decimal"
                      placeholder="0"
                      className={`w-full h-12 text-center font-mono font-black text-lg bg-zinc-950 border rounded-xl text-white placeholder-zinc-600 focus:outline-none transition-colors ${
                        errors.protein
                          ? 'border-rose-500/80 focus:border-rose-400'
                          : 'border-zinc-800 focus:border-sky-400'
                      }`}
                    />
                    <span className="absolute right-2 text-[10px] font-mono text-zinc-500 pointer-events-none">
                      g
                    </span>
                  </div>
                  <FormFieldError error={errors.protein?.message} />
                </div>

                {/* Carbs Input (Emerald Green) */}
                <div className="rounded-2xl bg-zinc-900/90 border border-emerald-500/30 p-2.5 space-y-1">
                  <div className="text-[10px] font-black uppercase tracking-wider text-emerald-400 text-center">
                    Carbs
                  </div>
                  <div className="relative flex items-center">
                    <input
                      {...register('carbs', { valueAsNumber: true })}
                      type="number"
                      step="any"
                      inputMode="decimal"
                      placeholder="0"
                      className={`w-full h-12 text-center font-mono font-black text-lg bg-zinc-950 border rounded-xl text-white placeholder-zinc-600 focus:outline-none transition-colors ${
                        errors.carbs
                          ? 'border-rose-500/80 focus:border-rose-400'
                          : 'border-zinc-800 focus:border-emerald-400'
                      }`}
                    />
                    <span className="absolute right-2 text-[10px] font-mono text-zinc-500 pointer-events-none">
                      g
                    </span>
                  </div>
                  <FormFieldError error={errors.carbs?.message} />
                </div>

                {/* Fats Input (Amber) */}
                <div className="rounded-2xl bg-zinc-900/90 border border-amber-500/30 p-2.5 space-y-1">
                  <div className="text-[10px] font-black uppercase tracking-wider text-amber-400 text-center">
                    Fats
                  </div>
                  <div className="relative flex items-center">
                    <input
                      {...register('fats', { valueAsNumber: true })}
                      type="number"
                      step="any"
                      inputMode="decimal"
                      placeholder="0"
                      className={`w-full h-12 text-center font-mono font-black text-lg bg-zinc-950 border rounded-xl text-white placeholder-zinc-600 focus:outline-none transition-colors ${
                        errors.fats
                          ? 'border-rose-500/80 focus:border-rose-400'
                          : 'border-zinc-800 focus:border-amber-400'
                      }`}
                    />
                    <span className="absolute right-2 text-[10px] font-mono text-zinc-500 pointer-events-none">
                      g
                    </span>
                  </div>
                  <FormFieldError error={errors.fats?.message} />
                </div>
              </div>
            </div>

            {/* Submit Action Button */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full h-14 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-black font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-950/80 active-press transition-all"
              >
                <Plus className="w-5 h-5 stroke-[3]" />
                <span>Log Custom Food</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};

export default FoodLoggingModal;
