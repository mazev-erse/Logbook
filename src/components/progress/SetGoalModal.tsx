import React, { useState, useEffect } from 'react';
import {
  X,
  Target,
  Calendar,
  Weight,
  Sparkles,
  Flame,
  Activity,
  Scale,
  RotateCcw,
} from 'lucide-react';
import type { GoalType, FitnessGoal, BiologicalSex } from '../../types/database';
import { fitnessGoalSchema } from '../../lib/validationSchemas';
import { useSwipeToDismiss } from '../../hooks/useSwipeToDismiss';
import { SheetHandle } from '../common/SheetHandle';

interface SetGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentGoal: FitnessGoal | null;
  latestWeight: number | null;
  onSaveGoal: (goalData: {
    goal_type: GoalType;
    target_weight: number;
    target_date: string;
    age: number;
    biological_sex: BiologicalSex;
    height: number;
    activity_level: number;
    bmr: number;
    tdee: number;
    daily_calorie_goal: number;
    protein_goal: number;
    carbs_goal: number;
    fats_goal: number;
  }) => Promise<void>;
}

const ACTIVITY_LEVELS: { value: number; label: string; description: string }[] = [
  { value: 1.2, label: 'Sedentary', description: 'Desk job, little or no exercise' },
  { value: 1.375, label: 'Lightly Active', description: 'Light exercise 1–3 days/week' },
  { value: 1.55, label: 'Moderately Active', description: 'Moderate training 3–5 days/week' },
  { value: 1.725, label: 'Very Active', description: 'Heavy training 6–7 days/week' },
  { value: 1.9, label: 'Extremely Active', description: 'Physical job & intense 2x/day training' },
];

export const SetGoalModal: React.FC<SetGoalModalProps> = ({
  isOpen,
  onClose,
  currentGoal,
  latestWeight,
  onSaveGoal,
}) => {
  // Goal and target weight states
  const [goalType, setGoalType] = useState<GoalType>('Cutting');
  const [targetWeight, setTargetWeight] = useState<string>('75.0');
  const [targetDate, setTargetDate] = useState<string>('');

  // BMR & TDEE user profile inputs
  const [age, setAge] = useState<number>(22);
  const [biologicalSex, setBiologicalSex] = useState<BiologicalSex>('male');
  const [height, setHeight] = useState<number>(175);
  const [activityLevel, setActivityLevel] = useState<number>(1.55);

  // Computed BMR & TDEE states
  const [bmr, setBmr] = useState<number>(1750);
  const [tdee, setTdee] = useState<number>(2700);

  // Custom Daily Macro Targets
  const [dailyCalories, setDailyCalories] = useState<number>(2200);
  const [proteinGoal, setProteinGoal] = useState<number>(165);
  const [carbsGoal, setCarbsGoal] = useState<number>(220);
  const [fatsGoal, setFatsGoal] = useState<number>(65);

  // Track if user has manually overwritten macro targets
  const [isManuallyOverridden, setIsManuallyOverridden] = useState<boolean>(false);
  const { sheetRef, handleProps } = useSwipeToDismiss({ onDismiss: onClose, isOpen });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Today's date string in YYYY-MM-DD for min date
  const todayStr = new Date().toISOString().split('T')[0];
  const userWeight = latestWeight || currentGoal?.start_weight || 75.0;

  // Initialize or restore state when modal opens
  useEffect(() => {
    if (isOpen) {
      if (currentGoal) {
        setGoalType(currentGoal.goal_type);
        setTargetWeight(String(currentGoal.target_weight));
        setTargetDate(currentGoal.target_date);
        setAge(currentGoal.age ?? 22);
        setBiologicalSex(currentGoal.biological_sex ?? 'male');
        setHeight(currentGoal.height ?? 175);
        setActivityLevel(currentGoal.activity_level ?? 1.55);

        if (currentGoal.daily_calorie_goal) {
          setDailyCalories(currentGoal.daily_calorie_goal);
          setProteinGoal(currentGoal.protein_goal ?? 160);
          setCarbsGoal(currentGoal.carbs_goal ?? 260);
          setFatsGoal(currentGoal.fats_goal ?? 70);
          setIsManuallyOverridden(true);
        } else {
          setIsManuallyOverridden(false);
        }
      } else {
        setGoalType('Cutting');
        setTargetWeight(latestWeight ? (latestWeight - 5).toFixed(1) : '75.0');
        const futureDate = new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0];
        setTargetDate(futureDate);
        setAge(22);
        setBiologicalSex('male');
        setHeight(175);
        setActivityLevel(1.55);
        setIsManuallyOverridden(false);
      }
      setError(null);
    }
  }, [currentGoal, latestWeight, isOpen]);

  // Automated BMR & TDEE calculation via Mifflin-St Jeor equation
  useEffect(() => {
    const w = parseFloat(String(userWeight)) || 75;
    const h = parseFloat(String(height)) || 175;
    const a = parseInt(String(age), 10) || 22;

    // Mifflin-St Jeor Formula
    let calculatedBmr = 10 * w + 6.25 * h - 5 * a;
    if (biologicalSex === 'male') {
      calculatedBmr += 5;
    } else {
      calculatedBmr -= 161;
    }

    const finalBmr = Math.max(800, Math.round(calculatedBmr));
    const finalTdee = Math.max(1000, Math.round(finalBmr * Number(activityLevel)));

    setBmr(finalBmr);
    setTdee(finalTdee);

    // Auto-fill macro recommendations if user hasn't locked custom overrides
    if (!isManuallyOverridden) {
      autoCalculateMacros(finalTdee, goalType, w);
    }
  }, [age, biologicalSex, height, activityLevel, userWeight, goalType, isManuallyOverridden]);

  // Helper to auto-calculate macros based on TDEE, Goal, and Weight
  const autoCalculateMacros = (baseTdee: number, type: GoalType, weight: number) => {
    let targetCals = baseTdee;
    let targetPro = Math.round(weight * 2.0); // 2g/kg base

    if (type === 'Cutting') {
      targetCals = Math.round(baseTdee - 500); // 500 kcal deficit
      targetPro = Math.round(weight * 2.2); // 2.2g/kg to preserve lean mass
    } else if (type === 'Bulking') {
      targetCals = Math.round(baseTdee + 350); // 350 kcal surplus
      targetPro = Math.round(weight * 2.0);
    } else {
      // Maintaining
      targetCals = baseTdee;
      targetPro = Math.round(weight * 2.0);
    }

    targetCals = Math.max(1200, targetCals);

    // Fats: 25% of total calories (9 kcal/g)
    const targetFat = Math.max(30, Math.round((targetCals * 0.25) / 9));

    // Carbs: Remainder of calories (4 kcal/g)
    const proCalories = targetPro * 4;
    const fatCalories = targetFat * 9;
    const targetCarb = Math.max(50, Math.round((targetCals - (proCalories + fatCalories)) / 4));

    setDailyCalories(targetCals);
    setProteinGoal(targetPro);
    setCarbsGoal(targetCarb);
    setFatsGoal(targetFat);
  };

  const handleResetToAuto = () => {
    setIsManuallyOverridden(false);
    autoCalculateMacros(tdee, goalType, userWeight);
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const weightNum = parseFloat(targetWeight);

    const payload = {
      goal_type: goalType,
      target_weight: weightNum,
      target_date: targetDate,
      age: Number(age),
      biological_sex: biologicalSex,
      height: Number(height),
      activity_level: Number(activityLevel),
      bmr,
      tdee,
      daily_calorie_goal: Number(dailyCalories),
      protein_goal: Number(proteinGoal),
      carbs_goal: Number(carbsGoal),
      fats_goal: Number(fatsGoal),
    };

    // Strict Zod schema validation
    const validation = fitnessGoalSchema.safeParse(payload);
    if (!validation.success) {
      setError(validation.error.issues[0]?.message || 'Please check your inputs.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await onSaveGoal(validation.data);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save goal');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Bottom Sheet Modal Container */}
      <div
        ref={sheetRef}
        className="relative w-full max-w-md bg-zinc-950 border-t sm:border border-zinc-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden z-10 max-h-[92vh] flex flex-col pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:pb-0 will-change-transform"
      >
        <SheetHandle handleProps={handleProps} />
        {/* Header */}
        <div {...handleProps} className="p-4 pt-2 pb-3 border-b border-zinc-800/80 flex items-center justify-between cursor-grab">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-400/10 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-tight">
                {currentGoal ? 'Update BMR & Goals' : 'Dynamic BMR & Goal Setter'}
              </h2>
              <p className="text-[11px] text-zinc-400">Mifflin-St Jeor TDEE & macro targets</p>
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
        <form onSubmit={handleSubmit} className="p-4 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-900/60 text-xs text-rose-300 font-semibold">
              {error}
            </div>
          )}

          {/* SECTION 1: BMR & TDEE PROFILE INPUTS */}
          <div className="space-y-3 p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" />
                <span>Metabolic Profile (Mifflin-St Jeor)</span>
              </span>
              <span className="text-[10px] text-zinc-400 font-mono">
                Current Wt: <strong className="text-white">{userWeight}kg</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {/* Biological Sex (Native Select) */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Biological Sex
                </label>
                <select
                  value={biologicalSex}
                  onChange={(e) => setBiologicalSex(e.target.value as BiologicalSex)}
                  className="w-full h-12 px-3 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-emerald-500 text-white text-xs font-bold focus:outline-none transition-colors"
                >
                  <option value="male">Male (+5 kcal)</option>
                  <option value="female">Female (-161 kcal)</option>
                </select>
              </div>

              {/* Age Input */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Age (Years)
                </label>
                <input
                  type="number"
                  min="12"
                  max="120"
                  value={age}
                  onChange={(e) => setAge(parseInt(e.target.value, 10) || 0)}
                  placeholder="22"
                  className="w-full h-12 text-center font-mono font-bold text-sm bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-xl text-white placeholder-zinc-600 focus:outline-none transition-colors"
                />
              </div>

              {/* Height Input (cm) */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Height (cm)
                </label>
                <input
                  type="number"
                  min="100"
                  max="250"
                  value={height}
                  onChange={(e) => setHeight(parseFloat(e.target.value) || 0)}
                  placeholder="175"
                  className="w-full h-12 text-center font-mono font-bold text-sm bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-xl text-white placeholder-zinc-600 focus:outline-none transition-colors"
                />
              </div>

              {/* Activity Level (Native Select) */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Activity Level
                </label>
                <select
                  value={activityLevel}
                  onChange={(e) => setActivityLevel(parseFloat(e.target.value))}
                  className="w-full h-12 px-2 text-xs rounded-xl bg-zinc-950 border border-zinc-800 focus:border-emerald-500 text-white font-bold focus:outline-none transition-colors"
                >
                  {ACTIVITY_LEVELS.map((level) => (
                    <option key={level.value} value={level.value}>
                      {level.label} ({level.value}x)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* AUTOMATED TDEE & BMR DISPLAY IN DISTINCT ACCENT COLOR */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/5 border border-amber-500/40 space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-amber-400">
                  <Flame className="w-4 h-4 fill-amber-400" />
                  <span className="text-[11px] font-black uppercase tracking-wider">
                    Total Daily Energy (TDEE)
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-amber-300 font-mono tracking-tight">
                    {tdee.toLocaleString()}
                  </span>
                  <span className="text-xs font-mono text-amber-400/80 ml-1">kcal/day</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 pt-1 border-t border-amber-500/20">
                <span>Basal Metabolic Rate (BMR):</span>
                <span className="text-zinc-200 font-bold">{bmr.toLocaleString()} kcal</span>
              </div>
            </div>
          </div>

          {/* SECTION 2: GOAL TRAJECTORY (TYPE, TARGET WEIGHT, DATE) */}
          <div className="space-y-3">
            {/* Goal Type Dropdown */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Primary Goal Type</span>
              </label>
              <select
                value={goalType}
                onChange={(e) => {
                  setGoalType(e.target.value as GoalType);
                  setIsManuallyOverridden(false);
                }}
                className="w-full h-13 px-4 rounded-2xl bg-zinc-900 border border-zinc-800 focus:border-emerald-500 text-white text-sm font-bold focus:outline-none transition-colors"
              >
                <option value="Cutting">Cutting (Fat Loss / 500 kcal Deficit)</option>
                <option value="Bulking">Bulking (Hypertrophy / 350 kcal Surplus)</option>
                <option value="Maintaining">Maintaining (Body Recomposition / Maintenance)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {/* Target Weight Input */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                  <Weight className="w-3 h-3 text-emerald-400" />
                  <span>Target Weight</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    required
                    value={targetWeight}
                    onChange={(e) => setTargetWeight(e.target.value)}
                    placeholder="75.0"
                    className="w-full h-12 text-center font-mono font-black text-lg bg-zinc-900 border border-zinc-800 focus:border-emerald-500 rounded-xl text-white placeholder-zinc-600 focus:outline-none transition-colors"
                  />
                  <span className="absolute right-3 text-xs font-mono text-zinc-500 pointer-events-none">
                    kg
                  </span>
                </div>
              </div>

              {/* Target Date Input */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-emerald-400" />
                  <span>Target Date</span>
                </label>
                <input
                  type="date"
                  required
                  min={todayStr}
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full h-12 px-3 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-emerald-500 text-white text-xs font-semibold focus:outline-none transition-colors"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: CUSTOMIZE DAILY TARGETS (MACRO OVERRIDE UI) */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Customize Daily Targets</span>
                </label>
                <p className="text-[10px] text-zinc-500">Auto-filled via TDEE — edit any number manually</p>
              </div>

              {isManuallyOverridden && (
                <button
                  type="button"
                  onClick={handleResetToAuto}
                  className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 active-press"
                  title="Reset to recommended macros"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Auto</span>
                </button>
              )}
            </div>

            {/* Daily Calories Numeric Input (Min 48px height) */}
            <div className="rounded-2xl bg-zinc-900/90 border border-amber-500/30 p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5" />
                  <span>Daily Calorie Target</span>
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">kcal / day</span>
              </div>
              <input
                type="number"
                min="800"
                max="10000"
                value={dailyCalories}
                onChange={(e) => {
                  setDailyCalories(parseInt(e.target.value, 10) || 0);
                  setIsManuallyOverridden(true);
                }}
                className="w-full h-13 text-center font-mono font-black text-2xl bg-zinc-950 border border-zinc-800 focus:border-amber-400 rounded-xl text-amber-300 focus:outline-none transition-colors"
              />
            </div>

            {/* 3 Macro Inputs: Protein, Carbs, Fats (Min 48px height) */}
            <div className="grid grid-cols-3 gap-2">
              {/* Protein (Sky Blue) */}
              <div className="rounded-2xl bg-zinc-900/90 border border-sky-500/30 p-2.5 space-y-1">
                <div className="text-[10px] font-black uppercase tracking-wider text-sky-400 text-center">
                  Protein
                </div>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    min="10"
                    max="600"
                    value={proteinGoal}
                    onChange={(e) => {
                      setProteinGoal(parseInt(e.target.value, 10) || 0);
                      setIsManuallyOverridden(true);
                    }}
                    className="w-full h-12 text-center font-mono font-black text-lg bg-zinc-950 border border-zinc-800 focus:border-sky-400 rounded-xl text-white focus:outline-none transition-colors"
                  />
                  <span className="absolute right-2 text-[10px] font-mono text-zinc-500 pointer-events-none">
                    g
                  </span>
                </div>
              </div>

              {/* Carbs (Emerald Green) */}
              <div className="rounded-2xl bg-zinc-900/90 border border-emerald-500/30 p-2.5 space-y-1">
                <div className="text-[10px] font-black uppercase tracking-wider text-emerald-400 text-center">
                  Carbs
                </div>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    min="0"
                    max="1200"
                    value={carbsGoal}
                    onChange={(e) => {
                      setCarbsGoal(parseInt(e.target.value, 10) || 0);
                      setIsManuallyOverridden(true);
                    }}
                    className="w-full h-12 text-center font-mono font-black text-lg bg-zinc-950 border border-zinc-800 focus:border-emerald-400 rounded-xl text-white focus:outline-none transition-colors"
                  />
                  <span className="absolute right-2 text-[10px] font-mono text-zinc-500 pointer-events-none">
                    g
                  </span>
                </div>
              </div>

              {/* Fats (Amber) */}
              <div className="rounded-2xl bg-zinc-900/90 border border-amber-500/30 p-2.5 space-y-1">
                <div className="text-[10px] font-black uppercase tracking-wider text-amber-400 text-center">
                  Fats
                </div>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    min="5"
                    max="400"
                    value={fatsGoal}
                    onChange={(e) => {
                      setFatsGoal(parseInt(e.target.value, 10) || 0);
                      setIsManuallyOverridden(true);
                    }}
                    className="w-full h-12 text-center font-mono font-black text-lg bg-zinc-950 border border-zinc-800 focus:border-amber-400 rounded-xl text-white focus:outline-none transition-colors"
                  />
                  <span className="absolute right-2 text-[10px] font-mono text-zinc-500 pointer-events-none">
                    g
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-14 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-black font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-950/80 active-press transition-all disabled:opacity-50"
            >
              <Target className="w-5 h-5 stroke-[3]" />
              <span>{isSubmitting ? 'Saving Goals...' : 'Save Goals & Macro Targets'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SetGoalModal;
